import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


class GrocerySyncTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        def database():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)

        res = self.client.post('/v1/auth/register', json={
            'email': 'grocery@kiloric.co', 'username': 'grocery_user', 'password': 'password123',
        })
        self.assertEqual(res.status_code, 201)
        self.tokens = res.json()
        self.headers = {'Authorization': 'Bearer ' + self.tokens['access_token']}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()
        self.engine.dispose()

    def test_grocery_item_sync_with_meal_and_day_tagging(self):
        # Create item with meal and day
        res = self.client.post('/v1/grocery-items', headers=self.headers, json={
            'week_start': '2026-10-26',
            'name': 'Eggs',
            'quantity': '1 dozen',
            'checked': False,
            'meal': 'Breakfast',
            'day': 'tomorrow',
        })
        self.assertEqual(res.status_code, 201, res.text)
        item = res.json()
        self.assertEqual(item['name'], 'Eggs')
        self.assertEqual(item['meal'], 'Breakfast')
        self.assertEqual(item['day'], 'tomorrow')
        self.assertEqual(item['checked'], False)

        # List with day filter
        list_res = self.client.get('/v1/grocery-items?day=tomorrow', headers=self.headers)
        self.assertEqual(list_res.status_code, 200)
        docs = list_res.json()['documents']
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0]['meal'], 'Breakfast')

        # List with meal filter
        meal_res = self.client.get('/v1/grocery-items?meal=Breakfast', headers=self.headers)
        self.assertEqual(meal_res.status_code, 200)
        self.assertEqual(len(meal_res.json()['documents']), 1)

        # Patch item
        patch_res = self.client.patch(f"/v1/grocery-items/{item['$id']}", headers=self.headers, json={
            'checked': True,
        })
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()['checked'], True)
