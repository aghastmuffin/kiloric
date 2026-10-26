"""
Generic CRUD factory — every user-owned collection uses this.
Returns a FastAPI router with list / get / create / patch / delete endpoints.

All responses use Appwrite-compatible field names ($id, $createdAt, owner, …).
"""
from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Callable, Optional, Type

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ValidationError
from sqlalchemy import asc, desc, or_, DateTime
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User


def _model_to_dict(obj: Any) -> dict:
    """Convert ORM row → Appwrite-style dict."""
    d: dict = {
        "$id": obj.id,
        "$createdAt": obj.created_at.isoformat() if obj.created_at else None,
        "$updatedAt": obj.updated_at.isoformat() if obj.updated_at else None,
        "owner": obj.owner_id,
    }
    # Add all non-private, non-relationship columns
    for col in obj.__table__.columns:
        if col.name in ("id", "owner_id", "created_at", "updated_at"):
            continue
        d[col.name] = getattr(obj, col.name, None)
    if obj.__tablename__ == "tasks":
        d["userId"] = obj.owner_id
    # items_json → items (array) — for meals and saved_meals
    if "items_json" in d and obj.__tablename__ in ("meals",):
        try:
            d["items"] = json.loads(d["items_json"]) if d["items_json"] else []
        except Exception:
            d["items"] = []
    return d


def make_crud_router(
    *,
    prefix: str,
    tag: str,
    model_cls: Any,
    create_schema: Type[BaseModel],
    patch_schema: Type[BaseModel],
    owner_field: str = "owner_id",
    extra_filters: Optional[Callable[[Any, dict], None]] = None,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    @router.get("")
    def list_records(
        queries: Optional[str] = Query(None, max_length=20000),
        day: Optional[str] = Query(None),
        day_from: Optional[str] = Query(None),
        day_to: Optional[str] = Query(None),
        week_start: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        workout_id: Optional[str] = Query(None),
        since: Optional[str] = Query(None, description="logged_at >= since (ISO-8601)"),
        limit: int = Query(100, ge=1, le=5000),
        offset: int = Query(0, ge=0),
        order: str = Query("created_at"),
        desc_order: bool = Query(False),
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        q = db.query(model_cls).filter(getattr(model_cls, owner_field) == user.id)
        if day and hasattr(model_cls, "day"):
            q = q.filter(model_cls.day == day)
        if day_from and hasattr(model_cls, "day"):
            q = q.filter(model_cls.day >= day_from)
        if day_to and hasattr(model_cls, "day"):
            q = q.filter(model_cls.day <= day_to)
        if week_start and hasattr(model_cls, "week_start"):
            q = q.filter(model_cls.week_start == week_start)
        if status and hasattr(model_cls, "status"):
            q = q.filter(model_cls.status == status)
        if workout_id and hasattr(model_cls, "workout_id"):
            q = q.filter(model_cls.workout_id == workout_id)
        if since and hasattr(model_cls, "logged_at"):
            q = q.filter(model_cls.logged_at >= since)

        # Translate the feature stores' legacy query representation at the boundary.
        field_map = {"$id": "id", "$createdAt": "created_at", "$updatedAt": "updated_at",
                     "owner": owner_field, "userId": owner_field}
        cursor = None
        if queries:
            try:
                clauses = json.loads(queries)
                if not isinstance(clauses, list) or len(clauses) > 100:
                    raise ValueError()
                for clause in clauses:
                    clause = json.loads(clause) if isinstance(clause, str) else clause
                    if not isinstance(clause, dict):
                        raise ValueError()
                    method, values = clause["method"], clause.get("values", [])
                    if not isinstance(values, list):
                        raise ValueError()
                    field = field_map.get(clause.get("attribute"), clause.get("attribute"))
                    if method == "limit":
                        limit = max(1, min(int(values[0]), 5000))
                    elif method == "offset":
                        offset = max(0, int(values[0]))
                    elif method == "cursorAfter":
                        cursor = str(values[0])
                    elif method in ("orderAsc", "orderDesc"):
                        if field not in model_cls.__table__.columns:
                            raise ValueError()
                        order, desc_order = field, method == "orderDesc"
                    elif method == "select":
                        continue
                    else:
                        if field not in model_cls.__table__.columns or not values:
                            raise ValueError()
                        column = getattr(model_cls, field)
                        if isinstance(model_cls.__table__.columns[field].type, DateTime):
                            values = [datetime.fromisoformat(v.replace("Z", "+00:00")) for v in values]
                        if method == "equal":
                            q = q.filter(column.in_(values))
                        elif method == "greaterThanEqual":
                            q = q.filter(column >= values[0])
                        elif method == "lessThan":
                            q = q.filter(column < values[0])
                        elif method == "lessThanEqual":
                            q = q.filter(column <= values[0])
                        else:
                            raise ValueError()
            except (ValueError, TypeError, KeyError, IndexError, AttributeError):
                raise HTTPException(status_code=422, detail="Invalid query.")
        if order not in model_cls.__table__.columns:
            raise HTTPException(status_code=422, detail="Invalid sort field.")
        col = getattr(model_cls, order)
        if cursor:
            anchor = db.get(model_cls, cursor)
            if not anchor or getattr(anchor, owner_field) != user.id:
                raise HTTPException(status_code=422, detail="Invalid cursor.")
            value = getattr(anchor, order)
            q = q.filter(or_(col < value, (col == value) & (model_cls.id < cursor)) if desc_order
                         else or_(col > value, (col == value) & (model_cls.id > cursor)))
        total = q.count()
        q = q.order_by(desc(col) if desc_order else asc(col),
                       desc(model_cls.id) if desc_order else asc(model_cls.id))
        rows = q.offset(offset).limit(limit).all()
        return {"documents": [_model_to_dict(r) for r in rows], "total": total}

    @router.get("/{record_id}")
    def get_record(
        record_id: str,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        row = db.get(model_cls, record_id)
        if not row or getattr(row, owner_field) != user.id:
            raise HTTPException(status_code=404, detail="Not found.")
        return _model_to_dict(row)

    @router.post("", status_code=201)
    def create_record(
        body: dict = Body(...),
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        try:
            parsed = create_schema.model_validate(body)
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=json.loads(exc.json()))
        data = parsed.model_dump(exclude_unset=False)
        # items list → items_json for meals
        if "items" in data and hasattr(model_cls, "items_json"):
            data["items_json"] = json.dumps(data.pop("items") or [])
        elif "items" in data:
            data.pop("items", None)

        row = model_cls(**{owner_field: user.id}, **data)
        db.add(row)
        db.commit()
        db.refresh(row)
        return _model_to_dict(row)

    @router.patch("/{record_id}")
    def patch_record(
        record_id: str,
        body: dict = Body(...),
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        row = db.get(model_cls, record_id)
        if not row or getattr(row, owner_field) != user.id:
            raise HTTPException(status_code=404, detail="Not found.")
        try:
            parsed = patch_schema.model_validate(body)
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=json.loads(exc.json()))
        data = parsed.model_dump(exclude_unset=True)
        # items list → items_json
        if "items" in data and hasattr(model_cls, "items_json"):
            data["items_json"] = json.dumps(data.pop("items") or [])
        elif "items" in data:
            data.pop("items", None)
        for k, v in data.items():
            setattr(row, k, v)
        db.commit()
        db.refresh(row)
        return _model_to_dict(row)

    @router.delete("/{record_id}", status_code=204)
    def delete_record(
        record_id: str,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        row = db.get(model_cls, record_id)
        if not row or getattr(row, owner_field) != user.id:
            raise HTTPException(status_code=404, detail="Not found.")
        db.delete(row)
        db.commit()

    return router
