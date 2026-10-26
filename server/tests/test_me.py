import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.deps import get_current_user
from app.main import app
from app.models import Meal, Task, User, WaterLog

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class MeRouterTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        self.user = User(
            id="test-user-123",
            email="test@example.com",
            password_hash="hashed_pwd",
            username="testuser",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.clear()

    def test_get_me(self):
        resp = self.client.get("/v1/me")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["$id"], "test-user-123")
        self.assertEqual(data["email"], "test@example.com")

    def test_export_me_data(self):
        meal = Meal(id="meal-1", owner_id=self.user.id, friendlyname="Lunch")
        water = WaterLog(id="water-1", owner_id=self.user.id, amount_ml=500, consumed_at="2026-10-25T12:00:00Z")
        task = Task(id="task-1", owner_id=self.user.id, title="Log calories", done=False)
        self.db.add_all([meal, water, task])
        self.db.commit()

        resp = self.client.get("/v1/me/export")
        self.assertEqual(resp.status_code, 200)
        self.assertIn('attachment; filename="kiloric_user_data_test-user-123.json"', resp.headers["Content-Disposition"])

        data = resp.json()
        self.assertEqual(data["profile"]["$id"], "test-user-123")
        self.assertEqual(len(data["meals"]), 1)
        self.assertEqual(data["meals"][0]["$id"], "meal-1")
        self.assertEqual(data["meals"][0]["friendlyname"], "Lunch")
        self.assertEqual(len(data["water_logs"]), 1)
        self.assertEqual(data["water_logs"][0]["amount_ml"], 500)
        self.assertEqual(len(data["tasks"]), 1)
        self.assertEqual(data["tasks"][0]["title"], "Log calories")

        expected_keys = {
            "profile", "meals", "water_logs", "food_entries", "saved_meals",
            "meal_plan_entries", "prep_sessions", "grocery_items", "workouts",
            "workout_sets", "weight_logs", "tasks",
        }
        self.assertEqual(set(data.keys()), expected_keys)

        resp_data = self.client.get("/v1/me/data")
        self.assertEqual(resp_data.status_code, 200)
        self.assertEqual(resp_data.json()["profile"]["$id"], "test-user-123")


if __name__ == "__main__":
    unittest.main()
