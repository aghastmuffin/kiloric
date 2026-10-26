"""
/v1/me — current user profile read + update + delete.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import ProfilePatch, UserResponse

router = APIRouter(prefix="/v1/me", tags=["me"])


@router.get("", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse.from_orm_user(user)


@router.patch("", response_model=UserResponse)
def patch_me(
    body: ProfilePatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = body.model_dump(exclude_unset=True)
    # Map camelCase fields from schema to snake_case ORM columns
    _field_map = {
        "dateOfBirth": "date_of_birth",
        "TDEE": "tdee",
        "lastLogin": "last_login",
    }
    for src, dst in _field_map.items():
        if src in data:
            data[dst] = data.pop(src)

    if "username" in data:
        existing = db.query(User).filter(User.username == data["username"], User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Username already taken.")

    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return UserResponse.from_orm_user(user)


@router.delete("", status_code=204)
def delete_me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete the account and all associated data (CASCADE handles child rows)."""
    db.delete(user)
    db.commit()
