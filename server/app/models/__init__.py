"""
All SQLAlchemy ORM models — matches the Kiloric API schema exactly.
Every table has:
  - id (UUID string primary key, like Kiloric API's $id)
  - owner_id (FK to users.id) — enforced at the DB level
  - created_at / updated_at auto-timestamps
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, DateTime, Double, ForeignKey, Integer, LargeBinary,
    String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4()).replace("-", "")[:20]


# ──────────────────────────────────────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────────────────────────────────────

class User(Base):
    """Auth identity + profile (merged into one table)."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    # Auth fields
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Profile fields (mirrors Kiloric API users collection)
    date_of_birth: Mapped[str] = mapped_column(String(32), nullable=True)  # ISO-8601 date
    weight: Mapped[float | None] = mapped_column(Double, nullable=True)
    height: Mapped[float | None] = mapped_column(Double, nullable=True)
    bio: Mapped[str | None] = mapped_column(String(512), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    race: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resides_in_asia: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False)
    last_login: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Nutrition targets
    target_kcal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_protein: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_carbs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_fat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_fluid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tdee: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Goal fields
    goal_plain: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    goal_pace_kg_per_week: Mapped[float | None] = mapped_column(Double, nullable=True)
    goal_start_weight_kg: Mapped[float | None] = mapped_column(Double, nullable=True)
    goal_target_weight_kg: Mapped[float | None] = mapped_column(Double, nullable=True)
    goal_start_date: Mapped[str | None] = mapped_column(String(64), nullable=True)
    goal_estimated_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weekly_deficit: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Formula v5 fields
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    body_fat_pct: Mapped[float | None] = mapped_column(Double, nullable=True)
    diet_style: Mapped[str | None] = mapped_column(String(32), nullable=True)
    goal_pace: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bmr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    formula_version: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Plan preferences stored as JSON blob
    plan_preferences_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Password reset token (hashed)
    reset_token_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    # Relationships
    contribution_uploads: Mapped[list["ContributionUpload"]] = relationship("ContributionUpload", back_populates="user", cascade="all, delete-orphan")
    food_contributions: Mapped[list["FoodContribution"]] = relationship("FoodContribution", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    meals: Mapped[list["Meal"]] = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    water_logs: Mapped[list["WaterLog"]] = relationship("WaterLog", back_populates="user", cascade="all, delete-orphan")
    food_entries: Mapped[list["FoodEntry"]] = relationship("FoodEntry", back_populates="user", cascade="all, delete-orphan")
    saved_meals: Mapped[list["SavedMeal"]] = relationship("SavedMeal", back_populates="user", cascade="all, delete-orphan")
    meal_plan_entries: Mapped[list["MealPlanEntry"]] = relationship("MealPlanEntry", back_populates="user", cascade="all, delete-orphan")
    prep_sessions: Mapped[list["PrepSession"]] = relationship("PrepSession", back_populates="user", cascade="all, delete-orphan")
    grocery_items: Mapped[list["GroceryItem"]] = relationship("GroceryItem", back_populates="user", cascade="all, delete-orphan")
    workouts: Mapped[list["Workout"]] = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    workout_sets: Mapped[list["WorkoutSet"]] = relationship("WorkoutSet", back_populates="user", cascade="all, delete-orphan")
    weight_logs: Mapped[list["WeightLog"]] = relationship("WeightLog", back_populates="user", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


# ──────────────────────────────────────────────────────────────────────────────
# Meals
# ──────────────────────────────────────────────────────────────────────────────

class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    friendlyname: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str | None] = mapped_column(String(32), nullable=True)   # Breakfast|Lunch|Dinner|Snack|Other
    kcal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carbs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nutrient_density_score: Mapped[float | None] = mapped_column(Double, nullable=True)
    fluid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    items_json: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON array of barcodes

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="meals")


# ──────────────────────────────────────────────────────────────────────────────
# Water logs
# ──────────────────────────────────────────────────────────────────────────────

class WaterLog(Base):
    __tablename__ = "water_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    consumed_at: Mapped[str] = mapped_column(String(64), nullable=False)  # ISO-8601

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="water_logs")


# ──────────────────────────────────────────────────────────────────────────────
# Food entries (individual items logged per meal type per day)
# ──────────────────────────────────────────────────────────────────────────────

class FoodEntry(Base):
    __tablename__ = "food_entries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(256), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    serving_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    serving_grams: Mapped[float | None] = mapped_column(Double, nullable=True)
    servings: Mapped[float] = mapped_column(Double, nullable=False)
    kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    protein: Mapped[float | None] = mapped_column(Double, nullable=True)
    carbs: Mapped[float | None] = mapped_column(Double, nullable=True)
    fat: Mapped[float | None] = mapped_column(Double, nullable=True)
    day: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # YYYY-MM-DD
    logged_at: Mapped[str] = mapped_column(String(64), nullable=False)          # ISO-8601
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    meal_doc_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="food_entries")


# ──────────────────────────────────────────────────────────────────────────────
# Saved meals
# ──────────────────────────────────────────────────────────────────────────────

class SavedMeal(Base):
    __tablename__ = "saved_meals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    items_json: Mapped[str] = mapped_column(Text, nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False)
    kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    protein: Mapped[float | None] = mapped_column(Double, nullable=True)
    carbs: Mapped[float | None] = mapped_column(Double, nullable=True)
    fat: Mapped[float | None] = mapped_column(Double, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="saved_meals")


# ──────────────────────────────────────────────────────────────────────────────
# Meal plan entries
# ──────────────────────────────────────────────────────────────────────────────

class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    protein: Mapped[float | None] = mapped_column(Double, nullable=True)
    carbs: Mapped[float | None] = mapped_column(Double, nullable=True)
    fat: Mapped[float | None] = mapped_column(Double, nullable=True)
    prepped: Mapped[bool] = mapped_column(Boolean, default=False)
    logged: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(String(512), nullable=True)
    serving_label: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="meal_plan_entries")


# ──────────────────────────────────────────────────────────────────────────────
# Prep sessions
# ──────────────────────────────────────────────────────────────────────────────

class PrepSession(Base):
    __tablename__ = "prep_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start: Mapped[str] = mapped_column(String(16), nullable=False)
    scheduled_at: Mapped[str] = mapped_column(String(64), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    items_json: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="prep_sessions")


# ──────────────────────────────────────────────────────────────────────────────
# Grocery items
# ──────────────────────────────────────────────────────────────────────────────

class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    quantity: Mapped[str | None] = mapped_column(String(128), nullable=True)
    checked: Mapped[bool] = mapped_column(Boolean, default=False)
    meal: Mapped[str | None] = mapped_column(String(64), nullable=True)
    day: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="grocery_items")


# ──────────────────────────────────────────────────────────────────────────────
# Workouts
# ──────────────────────────────────────────────────────────────────────────────

class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    day: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    scheduled_at: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)     # planned|active|done
    focus: Mapped[str | None] = mapped_column(String(64), nullable=True)
    planned_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    finished_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kcal_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="workouts")
    sets: Mapped[list["WorkoutSet"]] = relationship("WorkoutSet", back_populates="workout", cascade="all, delete-orphan")


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workout_id: Mapped[str] = mapped_column(ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_name: Mapped[str] = mapped_column(String(256), nullable=False)
    exercise_order: Mapped[int] = mapped_column(Integer, nullable=False)
    muscle_group: Mapped[str | None] = mapped_column(String(64), nullable=True)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    target_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    target_weight: Mapped[float] = mapped_column(Double, nullable=False)
    weight: Mapped[float | None] = mapped_column(Double, nullable=True)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="workout_sets")
    workout: Mapped["Workout"] = relationship("Workout", back_populates="sets")


# ──────────────────────────────────────────────────────────────────────────────
# Weight logs
# ──────────────────────────────────────────────────────────────────────────────

class WeightLog(Base):
    __tablename__ = "weight_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    weight_kg: Mapped[float] = mapped_column(Double, nullable=False)
    day: Mapped[str] = mapped_column(String(16), nullable=False)
    logged_at: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="weight_logs")


# ──────────────────────────────────────────────────────────────────────────────
# Tasks
# ──────────────────────────────────────────────────────────────────────────────

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship("User", back_populates="tasks")


class ContributionUpload(Base):
    """Private image uploads persisted with the API database and account lifecycle."""
    __tablename__ = "contribution_uploads"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    user: Mapped["User"] = relationship("User", back_populates="contribution_uploads")


class FoodContribution(Base):
    __tablename__ = "food_contributions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    user: Mapped["User"] = relationship("User", back_populates="food_contributions")
