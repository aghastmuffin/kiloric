"""Authenticated contribution metadata and private, bounded photo uploads."""
import json
from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import ContributionUpload, FoodContribution, User

router = APIRouter(prefix="/v1", tags=["food-contributions"])
MAX_FILE = 10_000_000
MAX_ACCOUNT = 200_000_000


def upload_metadata(row):
    return {"$id": row.id, "name": row.name, "mimeType": row.content_type,
            "sizeOriginal": len(row.content), "$createdAt": row.created_at.isoformat()}


@router.post("/files", status_code=201)
async def upload_photo(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        content = await file.read(MAX_FILE + 1)
    finally:
        await file.close()
    if len(content) > MAX_FILE:
        raise HTTPException(413, "Each photo must be 10 MB or smaller.")
    content_type = "image/png" if content.startswith(b"\x89PNG\r\n\x1a\n") else "image/jpeg" if content.startswith(b"\xff\xd8\xff") else None
    if not content_type or content_type != file.content_type:
        raise HTTPException(422, "Photos must be JPG or PNG with a matching content type.")
    # Serialize account uploads so concurrent requests cannot exceed the quota.
    db.query(User).filter(User.id == user.id).with_for_update().first()
    used = db.query(func.coalesce(func.sum(func.length(ContributionUpload.content)), 0)).filter(ContributionUpload.owner_id == user.id).scalar()
    if used + len(content) > MAX_ACCOUNT:
        raise HTTPException(413, "Photo storage limit reached. Remove unused photos first.")
    row = ContributionUpload(owner_id=user.id, name=(file.filename or "photo")[:128], content_type=content_type, content=content)
    db.add(row); db.commit(); db.refresh(row)
    return upload_metadata(row)


@router.delete("/files/{file_id}", status_code=204)
def delete_photo(file_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(ContributionUpload, file_id)
    if not row or row.owner_id != user.id:
        raise HTTPException(404, "Not found.")
    db.delete(row); db.commit()


@router.post("/food-contributions", status_code=201)
def create_contribution(body: dict = Body(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if len(json.dumps(body)) > 100_000 or not isinstance(body.get("product_name"), str) or not body["product_name"].strip():
        raise HTTPException(422, "Invalid food contribution.")
    ids = [body.get(key) for key in ("photo_file_id", "front_file_id", "barcode_file_id", "ingredients_file_id", "nutrition_file_id")]
    extra = body.get("extra_file_ids") or []
    if not isinstance(extra, list) or len(extra) > 20:
        raise HTTPException(422, "Invalid photo references.")
    ids = [value for value in ids + extra if value]
    if any(not isinstance(value, str) for value in ids):
        raise HTTPException(422, "Invalid photo references.")
    for file_id in set(ids):
        file = db.get(ContributionUpload, file_id)
        if not file or file.owner_id != user.id:
            raise HTTPException(422, "Photo not found in your account.")
    payload = {
        key: value for key, value in body.items()
        if not key.startswith("$") and key not in ("owner", "status", "admin_review")
    }
    row = FoodContribution(owner_id=user.id, payload_json=json.dumps(payload))
    db.add(row); db.commit(); db.refresh(row)
    return {"$id": row.id, "status": "received"}
