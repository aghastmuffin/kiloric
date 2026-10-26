"""
/v1/me — current user profile read + update + delete + export data collection.
"""
import json

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    ContributionUpload,
    FoodContribution,
    FoodEntry,
    GroceryItem,
    Meal,
    MealPlanEntry,
    PrepSession,
    SavedMeal,
    Task,
    User,
    WaterLog,
    WeightLog,
    Workout,
    WorkoutSet,
)
from app.routers.crud import _model_to_dict
from app.routers.contributions import contribution_document, upload_metadata
from app.schemas import ProfilePatch, UserResponse

router = APIRouter(prefix="/v1/me", tags=["me"])


@router.get("", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse.from_orm_user(user)


@router.get("/prefs")
def get_prefs(user: User = Depends(get_current_user)):
    return json.loads(user.plan_preferences_json or "{}")


@router.patch("/prefs")
def update_prefs(
    body: dict = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prefs = body.get("prefs")
    if not isinstance(prefs, dict) or len(json.dumps(prefs)) > 60000:
        raise HTTPException(status_code=422, detail="Invalid preferences or preferences too large.")
    user.plan_preferences_json = json.dumps(prefs)
    db.commit()
    return prefs


def _export_user_collections(db: Session, user: User) -> dict:
    return {
        "food_contributions": [contribution_document(row) for row in db.query(FoodContribution).filter(FoodContribution.owner_id == user.id).all()],
        "uploaded_files": [upload_metadata(row) for row in db.query(ContributionUpload).filter(ContributionUpload.owner_id == user.id).all()],
        "profile": UserResponse.from_orm_user(user).model_dump(mode="json", by_alias=True),
        "meals": [_model_to_dict(m) for m in db.query(Meal).filter(Meal.owner_id == user.id).all()],
        "water_logs": [_model_to_dict(w) for w in db.query(WaterLog).filter(WaterLog.owner_id == user.id).all()],
        "food_entries": [_model_to_dict(f) for f in db.query(FoodEntry).filter(FoodEntry.owner_id == user.id).all()],
        "saved_meals": [_model_to_dict(s) for s in db.query(SavedMeal).filter(SavedMeal.owner_id == user.id).all()],
        "meal_plan_entries": [_model_to_dict(mp) for mp in db.query(MealPlanEntry).filter(MealPlanEntry.owner_id == user.id).all()],
        "prep_sessions": [_model_to_dict(p) for p in db.query(PrepSession).filter(PrepSession.owner_id == user.id).all()],
        "grocery_items": [_model_to_dict(g) for g in db.query(GroceryItem).filter(GroceryItem.owner_id == user.id).all()],
        "workouts": [_model_to_dict(w) for w in db.query(Workout).filter(Workout.owner_id == user.id).all()],
        "workout_sets": [_model_to_dict(ws) for ws in db.query(WorkoutSet).filter(WorkoutSet.owner_id == user.id).all()],
        "weight_logs": [_model_to_dict(wl) for wl in db.query(WeightLog).filter(WeightLog.owner_id == user.id).all()],
        "tasks": [_model_to_dict(t) for t in db.query(Task).filter(Task.owner_id == user.id).all()],
    }


@router.get("/export")
@router.get("/data")
def export_me_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Package and return all user collections into a single export file/payload."""
    data = jsonable_encoder(_export_user_collections(db, user))
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="kiloric_user_data_{user.id}.json"'},
    )


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
