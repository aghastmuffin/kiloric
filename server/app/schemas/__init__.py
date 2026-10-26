"""
Pydantic schemas — request bodies and response models.
All response models expose `$id`, `$createdAt`, `$updatedAt` so the Expo app
can swap in this backend with minimal field-name changes.
"""
from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator


# ── helpers ───────────────────────────────────────────────────────────────────

class APIModel(BaseModel):
    model_config = {"from_attributes": True}


def _dt(d: datetime | None) -> str | None:
    return d.isoformat() if d else None


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)


class LoginRequest(BaseModel):
    """Accept email OR username."""
    identity: str = Field(description="Email or username")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=256)


# ── User / Profile ────────────────────────────────────────────────────────────

class UserResponse(APIModel):
    dollar_id: str = Field(alias="$id")
    email: str
    username: str
    prefs: dict[str, Any] = Field(default_factory=dict)
    date_of_birth: Optional[str] = Field(None, alias="dateOfBirth")
    weight: Optional[float] = None
    height: Optional[float] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    race: Optional[str] = None
    resides_in_asia: Optional[bool] = None
    role: str = "user"
    last_login: Optional[str] = Field(None, alias="lastLogin")
    target_kcal: Optional[int] = None
    target_protein: Optional[int] = None
    target_carbs: Optional[int] = None
    target_fat: Optional[int] = None
    daily_fluid: Optional[int] = None
    tdee: Optional[int] = Field(None, alias="TDEE")
    goal_plain: Optional[str] = None
    goal_type: Optional[str] = None
    goal_pace_kg_per_week: Optional[float] = None
    goal_start_weight_kg: Optional[float] = None
    goal_target_weight_kg: Optional[float] = None
    goal_start_date: Optional[str] = None
    goal_estimated_weeks: Optional[int] = None
    target_weight: Optional[int] = None
    weekly_deficit: Optional[int] = None
    sex: Optional[str] = None
    activity_level: Optional[str] = None
    body_fat_pct: Optional[float] = None
    diet_style: Optional[str] = None
    goal_pace: Optional[str] = None
    bmr: Optional[int] = None
    formula_version: Optional[int] = None
    plan_preferences_json: Optional[str] = None
    dollar_created_at: Optional[str] = Field(None, alias="$createdAt")
    dollar_updated_at: Optional[str] = Field(None, alias="$updatedAt")

    @classmethod
    def from_orm_user(cls, u: Any) -> "UserResponse":
        return cls.model_validate({
            "$id": u.id,
            "email": u.email,
            "username": u.username,
            "prefs": json.loads(u.plan_preferences_json or "{}"),
            "dateOfBirth": u.date_of_birth,
            "weight": u.weight,
            "height": u.height,
            "bio": u.bio,
            "country": u.country,
            "race": u.race,
            "resides_in_asia": u.resides_in_asia,
            "role": u.role,
            "lastLogin": u.last_login,
            "target_kcal": u.target_kcal,
            "target_protein": u.target_protein,
            "target_carbs": u.target_carbs,
            "target_fat": u.target_fat,
            "daily_fluid": u.daily_fluid,
            "TDEE": u.tdee,
            "goal_plain": u.goal_plain,
            "goal_type": u.goal_type,
            "goal_pace_kg_per_week": u.goal_pace_kg_per_week,
            "goal_start_weight_kg": u.goal_start_weight_kg,
            "goal_target_weight_kg": u.goal_target_weight_kg,
            "goal_start_date": u.goal_start_date,
            "goal_estimated_weeks": u.goal_estimated_weeks,
            "target_weight": u.target_weight,
            "weekly_deficit": u.weekly_deficit,
            "sex": u.sex,
            "activity_level": u.activity_level,
            "body_fat_pct": u.body_fat_pct,
            "diet_style": u.diet_style,
            "goal_pace": u.goal_pace,
            "bmr": u.bmr,
            "formula_version": u.formula_version,
            "plan_preferences_json": u.plan_preferences_json,
            "$createdAt": _dt(u.created_at),
            "$updatedAt": _dt(u.updated_at),
        })

    model_config = {"populate_by_name": True}


class ProfilePatch(BaseModel):
    username: Optional[str] = Field(None, max_length=64)
    dateOfBirth: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0, le=1000)
    height: Optional[float] = Field(None, ge=0, le=300)
    bio: Optional[str] = Field(None, max_length=512)
    country: Optional[str] = Field(None, max_length=2)
    race: Optional[str] = Field(None, max_length=64)
    resides_in_asia: Optional[bool] = None
    target_kcal: Optional[int] = Field(None, ge=0)
    target_protein: Optional[int] = Field(None, ge=0)
    target_carbs: Optional[int] = Field(None, ge=0)
    target_fat: Optional[int] = Field(None, ge=0)
    daily_fluid: Optional[int] = Field(None, ge=0)
    TDEE: Optional[int] = None
    goal_plain: Optional[str] = None
    goal_type: Optional[str] = None
    goal_pace_kg_per_week: Optional[float] = Field(None, ge=-10, le=10)
    goal_start_weight_kg: Optional[float] = Field(None, ge=0, le=1000)
    goal_target_weight_kg: Optional[float] = Field(None, ge=0, le=1000)
    goal_start_date: Optional[str] = None
    goal_estimated_weeks: Optional[int] = Field(None, ge=0)
    target_weight: Optional[int] = Field(None, ge=0)
    weekly_deficit: Optional[int] = None
    sex: Optional[str] = None
    activity_level: Optional[str] = None
    body_fat_pct: Optional[float] = Field(None, ge=3, le=60)
    diet_style: Optional[str] = None
    goal_pace: Optional[str] = None
    bmr: Optional[int] = Field(None, ge=0, le=10000)
    formula_version: Optional[int] = Field(None, ge=0, le=1000)
    plan_preferences_json: Optional[str] = None


# ── Generic record response ───────────────────────────────────────────────────

def record_response(obj: Any, extra: dict | None = None) -> dict:
    """Builds Kiloric API-compatible response dict from any ORM row."""
    d: dict = {
        "$id": obj.id,
        "$createdAt": _dt(obj.created_at),
        "$updatedAt": _dt(obj.updated_at),
        "owner": obj.owner_id,
    }
    if extra:
        d.update(extra)
    return d


# ── Meals ─────────────────────────────────────────────────────────────────────

class MealCreate(BaseModel):
    friendlyname: Optional[str] = None
    type: Optional[str] = None
    kcal: Optional[int] = Field(None, ge=0, le=50000)
    protein: Optional[int] = Field(None, ge=0)
    carbs: Optional[int] = Field(None, ge=0)
    fat: Optional[int] = Field(None, ge=0)
    nutrient_density_score: Optional[float] = Field(None, ge=0, le=100)
    fluid: Optional[int] = Field(None, ge=0)
    items: Optional[list[str]] = None


class MealPatch(MealCreate):
    pass


# ── Water ─────────────────────────────────────────────────────────────────────

class WaterCreate(BaseModel):
    amount_ml: int = Field(ge=25, le=4000)
    consumed_at: str


class WaterPatch(BaseModel):
    amount_ml: Optional[int] = Field(None, ge=25, le=4000)
    consumed_at: Optional[str] = None


# ── Food entries ──────────────────────────────────────────────────────────────

class FoodEntryCreate(BaseModel):
    meal_type: str
    name: str = Field(max_length=256)
    brand: Optional[str] = Field(None, max_length=256)
    barcode: Optional[str] = Field(None, max_length=64)
    serving_label: Optional[str] = Field(None, max_length=128)
    serving_grams: Optional[float] = Field(None, ge=0, le=10000)
    servings: float = Field(ge=0, le=100)
    kcal: int = Field(ge=0, le=20000)
    protein: Optional[float] = Field(None, ge=0, le=5000)
    carbs: Optional[float] = Field(None, ge=0, le=5000)
    fat: Optional[float] = Field(None, ge=0, le=5000)
    day: str
    logged_at: str
    source: Optional[str] = None
    meal_doc_id: Optional[str] = None


class FoodEntryPatch(BaseModel):
    meal_type: Optional[str] = None
    name: Optional[str] = Field(None, max_length=256)
    brand: Optional[str] = None
    barcode: Optional[str] = None
    serving_label: Optional[str] = None
    serving_grams: Optional[float] = None
    servings: Optional[float] = None
    kcal: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    day: Optional[str] = None
    logged_at: Optional[str] = None
    source: Optional[str] = None
    meal_doc_id: Optional[str] = None


# ── Saved meals ───────────────────────────────────────────────────────────────

class SavedMealCreate(BaseModel):
    name: str = Field(max_length=256)
    meal_type: str
    items_json: str
    item_count: int = Field(ge=0, le=100)
    kcal: int = Field(ge=0, le=20000)
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None


class SavedMealPatch(BaseModel):
    name: Optional[str] = None
    meal_type: Optional[str] = None
    items_json: Optional[str] = None
    item_count: Optional[int] = None
    kcal: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None


# ── Meal plan entries ─────────────────────────────────────────────────────────

class MealPlanEntryCreate(BaseModel):
    day: str
    meal_type: str
    name: str = Field(max_length=256)
    kcal: int = Field(ge=0, le=20000)
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    prepped: bool = False
    logged: bool = False
    note: Optional[str] = None
    serving_label: Optional[str] = None


class MealPlanEntryPatch(BaseModel):
    day: Optional[str] = None
    meal_type: Optional[str] = None
    name: Optional[str] = None
    kcal: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    prepped: Optional[bool] = None
    logged: Optional[bool] = None
    note: Optional[str] = None
    serving_label: Optional[str] = None


# ── Prep sessions ─────────────────────────────────────────────────────────────

class PrepSessionCreate(BaseModel):
    week_start: str
    scheduled_at: str
    duration_min: int = Field(ge=0, le=1440)
    title: str = Field(max_length=256)
    items_json: str


class PrepSessionPatch(BaseModel):
    week_start: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration_min: Optional[int] = None
    title: Optional[str] = None
    items_json: Optional[str] = None


# ── Grocery items ─────────────────────────────────────────────────────────────

class GroceryItemCreate(BaseModel):
    week_start: str
    name: str = Field(max_length=256)
    quantity: Optional[str] = Field(None, max_length=128)
    checked: bool = False


class GroceryItemPatch(BaseModel):
    week_start: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[str] = None
    checked: Optional[bool] = None


# ── Workouts ──────────────────────────────────────────────────────────────────

class WorkoutCreate(BaseModel):
    name: str = Field(max_length=256)
    day: str
    scheduled_at: str
    status: str = "planned"
    focus: Optional[str] = Field(None, max_length=64)
    planned_minutes: Optional[int] = Field(None, ge=0, le=1440)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_min: Optional[int] = None
    kcal_burned: Optional[int] = None


class WorkoutPatch(BaseModel):
    name: Optional[str] = None
    day: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    focus: Optional[str] = None
    planned_minutes: Optional[int] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_min: Optional[int] = None
    kcal_burned: Optional[int] = None


# ── Workout sets ──────────────────────────────────────────────────────────────

class WorkoutSetCreate(BaseModel):
    workout_id: str
    exercise_name: str = Field(max_length=256)
    exercise_order: int = Field(ge=0, le=100)
    muscle_group: Optional[str] = Field(None, max_length=64)
    set_number: int = Field(ge=1, le=100)
    target_reps: int = Field(ge=0, le=1000)
    target_weight: float = Field(ge=0, le=2000)
    weight: Optional[float] = None
    reps: Optional[int] = None
    done: bool = False
    completed_at: Optional[str] = None


class WorkoutSetPatch(BaseModel):
    exercise_name: Optional[str] = None
    exercise_order: Optional[int] = None
    muscle_group: Optional[str] = None
    set_number: Optional[int] = None
    target_reps: Optional[int] = None
    target_weight: Optional[float] = None
    weight: Optional[float] = None
    reps: Optional[int] = None
    done: Optional[bool] = None
    completed_at: Optional[str] = None


# ── Weight logs ───────────────────────────────────────────────────────────────

class WeightLogCreate(BaseModel):
    weight_kg: float = Field(ge=20, le=400)
    day: str
    logged_at: str


class WeightLogPatch(BaseModel):
    weight_kg: Optional[float] = None
    day: Optional[str] = None
    logged_at: Optional[str] = None


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(max_length=512)
    description: Optional[str] = None
    done: bool = False


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    done: Optional[bool] = None
