"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, me, contributions, review
from app.routers.crud import make_crud_router
from app.models import (
    FoodEntry,
    GroceryItem,
    Meal,
    MealPlanEntry,
    PrepSession,
    SavedMeal,
    Task,
    WaterLog,
    WeightLog,
    Workout,
    WorkoutSet,
)
from app.schemas import (
    FoodEntryCreate, FoodEntryPatch,
    GroceryItemCreate, GroceryItemPatch,
    MealCreate, MealPatch,
    MealPlanEntryCreate, MealPlanEntryPatch,
    PrepSessionCreate, PrepSessionPatch,
    SavedMealCreate, SavedMealPatch,
    TaskCreate, TaskPatch,
    WaterCreate, WaterPatch,
    WeightLogCreate, WeightLogPatch,
    WorkoutCreate, WorkoutPatch,
    WorkoutSetCreate, WorkoutSetPatch,
)

# ── create tables (dev convenience; production uses alembic) ──────────────────
Base.metadata.create_all(bind=engine)

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kiloric Server",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── auth + profile ────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(contributions.router)
app.include_router(review.router)
app.include_router(me.router)

# ── user data collections ─────────────────────────────────────────────────────
app.include_router(make_crud_router(
    prefix="/v1/meals", tag="meals",
    model_cls=Meal, create_schema=MealCreate, patch_schema=MealPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/water", tag="water",
    model_cls=WaterLog, create_schema=WaterCreate, patch_schema=WaterPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/food-entries", tag="food-entries",
    model_cls=FoodEntry, create_schema=FoodEntryCreate, patch_schema=FoodEntryPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/saved-meals", tag="saved-meals",
    model_cls=SavedMeal, create_schema=SavedMealCreate, patch_schema=SavedMealPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/meal-plan-entries", tag="meal-plan",
    model_cls=MealPlanEntry, create_schema=MealPlanEntryCreate, patch_schema=MealPlanEntryPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/prep-sessions", tag="prep",
    model_cls=PrepSession, create_schema=PrepSessionCreate, patch_schema=PrepSessionPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/grocery-items", tag="grocery",
    model_cls=GroceryItem, create_schema=GroceryItemCreate, patch_schema=GroceryItemPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/workouts", tag="workouts",
    model_cls=Workout, create_schema=WorkoutCreate, patch_schema=WorkoutPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/workout-sets", tag="workout-sets",
    model_cls=WorkoutSet, create_schema=WorkoutSetCreate, patch_schema=WorkoutSetPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/weight-logs", tag="weight",
    model_cls=WeightLog, create_schema=WeightLogCreate, patch_schema=WeightLogPatch,
))
app.include_router(make_crud_router(
    prefix="/v1/tasks", tag="tasks",
    model_cls=Task, create_schema=TaskCreate, patch_schema=TaskPatch,
))


@app.get("/health")
def health():
    return {"status": "ok"}
