"""
Generic CRUD factory — every user-owned collection uses this.
Returns a FastAPI router with list / get / create / patch / delete endpoints.

All responses use Appwrite-compatible field names ($id, $createdAt, owner, …).
"""
from __future__ import annotations
import json
from typing import Any, Callable, Optional, Type

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import asc, desc
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
        day: Optional[str] = Query(None),
        day_from: Optional[str] = Query(None),
        day_to: Optional[str] = Query(None),
        week_start: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        workout_id: Optional[str] = Query(None),
        since: Optional[str] = Query(None, description="logged_at >= since (ISO-8601)"),
        limit: int = Query(100, le=500),
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

        col = getattr(model_cls, order, model_cls.created_at)
        q = q.order_by(desc(col) if desc_order else asc(col))
        rows = q.offset(offset).limit(limit).all()
        return {"documents": [_model_to_dict(r) for r in rows], "total": len(rows)}

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
        parsed = create_schema.model_validate(body)
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
        parsed = patch_schema.model_validate(body)
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
