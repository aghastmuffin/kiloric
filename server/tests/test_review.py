import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import json

from app.database import Base, get_db
from app.main import app
from app.models import ContributionUpload, FoodContribution, User


class ReviewPortalTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        def database():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)

        # Create a user with a contribution and photo
        with self.sessions() as db:
            user = User(id="user_1", email="u1@test.co", username="user1", password_hash="hash")
            db.add(user)
            upload = ContributionUpload(
                id="photo_123",
                owner_id="user_1",
                name="cereal.jpg",
                content_type="image/jpeg",
                content=b"\xff\xd8\xfffakeimagebytes",
            )
            db.add(upload)
            contrib = FoodContribution(
                id="contrib_abc",
                owner_id="user_1",
                payload_json=json.dumps({
                    "product_name": "Organic Oat Cereal",
                    "photo_file_id": "photo_123",
                    "energy_kcal_100g": 380,
                    "proteins_100g": 12.5,
                    "carbohydrates_100g": 68.0,
                    "fat_100g": 6.0,
                }),
            )
            db.add(contrib)
            db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()
        self.engine.dispose()

    def test_unauthenticated_review_shows_login_form(self):
        res = self.client.get("/review")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Review login", res.text)
        self.assertIn("username", res.text)
        self.assertIn("password", res.text)

    def test_invalid_login_fails(self):
        # Case sensitive: 'admin' vs 'Admin'
        res = self.client.post("/review/login", data={"username": "admin", "password": "7ur2472b"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("Invalid username or password", res.text)

        # Wrong password
        res = self.client.post("/review/login", data={"username": "Admin", "password": "wrongpassword"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("Invalid username or password", res.text)

    def test_valid_login_and_review_flow(self):
        res = self.client.post("/review/login", data={"username": "Admin", "password": "7ur2472b"}, follow_redirects=False)
        self.assertEqual(res.status_code, 303)
        self.assertIn("kiloric_review", res.cookies)
        cookie = res.cookies["kiloric_review"]

        # View review portal
        portal = self.client.get("/review", cookies={"kiloric_review": cookie})
        self.assertEqual(portal.status_code, 200)
        self.assertIn("Organic Oat Cereal", portal.text)
        self.assertIn("Submitted macro suggestions", portal.text)
        self.assertIn("Admin reviewed macros", portal.text)
        self.assertIn("/review/photos/photo_123", portal.text)

        # View photo
        photo_res = self.client.get("/review/photos/photo_123", cookies={"kiloric_review": cookie})
        self.assertEqual(photo_res.status_code, 200)
        self.assertEqual(photo_res.content, b"\xff\xd8\xfffakeimagebytes")

        # Admin updates macros
        update_res = self.client.post(
            "/review/contributions/contrib_abc",
            cookies={"kiloric_review": cookie},
            data={
                "energy_kcal_100g": "375",
                "proteins_100g": "13",
                "carbohydrates_100g": "65",
                "fat_100g": "5.5",
            },
            follow_redirects=True,
        )
        self.assertEqual(update_res.status_code, 200)
        # Should now show updated admin macros
        self.assertIn("375", update_res.text)
        self.assertIn("13", update_res.text)

        # Logout
        logout = self.client.post("/review/logout", cookies={"kiloric_review": cookie}, follow_redirects=False)
        self.assertEqual(logout.status_code, 303)
