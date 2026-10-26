"""B-1 contracts: real bearer auth, refresh revocation, persistence and ownership."""
import json
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app


class BetaReleaseTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        def database():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)
        response = self.client.post('/v1/auth/register', json={
            'email': 'beta@kiloricdev.co', 'username': 'beta', 'password': 'beta-test-password',
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.tokens = response.json()
        self.headers = {'Authorization': 'Bearer ' + self.tokens['access_token']}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()
        self.engine.dispose()

    def test_session_profile_prefs_and_deletion(self):
        profile = self.client.patch('/v1/me', headers=self.headers, json={'dateOfBirth': '1990-01-01', 'weight': 70, 'height': 170})
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json()['dateOfBirth'], '1990-01-01')
        self.assertEqual(self.client.patch('/v1/me/prefs', headers=self.headers, json={'prefs': {'theme': 'dark'}}).status_code, 200)
        self.assertEqual(self.client.get('/v1/me', headers=self.headers).json()['prefs'], {'theme': 'dark'})
        self.assertEqual(self.client.delete('/v1/me', headers=self.headers).status_code, 204)
        self.assertEqual(self.client.get('/v1/me', headers=self.headers).status_code, 401)

    def test_refresh_rotation_and_logout(self):
        refreshed = self.client.post('/v1/auth/refresh', json={'refresh_token': self.tokens['refresh_token']})
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(self.client.post('/v1/auth/refresh', json={'refresh_token': self.tokens['refresh_token']}).status_code, 401)
        current = refreshed.json()['refresh_token']
        self.assertEqual(self.client.post('/v1/auth/logout', json={'refresh_token': current}).status_code, 204)
        self.assertEqual(self.client.post('/v1/auth/refresh', json={'refresh_token': current}).status_code, 401)

    def test_queries_validation_and_ownership(self):
        created = self.client.post('/v1/water', headers=self.headers, json={'amount_ml': 500, 'consumed_at': '2026-10-26T12:00:00Z'})
        self.assertEqual(created.status_code, 201, created.text)
        queries = json.dumps([json.dumps({'method': 'greaterThanEqual', 'attribute': 'consumed_at', 'values': ['2026-10-26T00:00:00Z']}), json.dumps({'method': 'limit', 'values': [100]})])
        result = self.client.get('/v1/water', headers=self.headers, params={'queries': queries})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(len(result.json()['documents']), 1)
        self.assertEqual(self.client.post('/v1/water', headers=self.headers, json={'amount_ml': -1}).status_code, 422)
        other = self.client.post('/v1/auth/register', json={'email': 'other@kiloricdev.co', 'username': 'other', 'password': 'beta-test-password'}).json()
        headers = {'Authorization': 'Bearer ' + other['access_token']}
        path = '/v1/water/' + created.json()['$id']
        self.assertEqual(self.client.get(path, headers=headers).status_code, 404)
        self.assertEqual(self.client.patch(path, headers=headers, json={'amount_ml': 600}).status_code, 404)
        self.assertEqual(self.client.delete(path, headers=headers).status_code, 404)
        self.assertEqual(self.client.get('/v1/water', headers=headers).json()['documents'], [])
        exported = self.client.get('/v1/me/export', headers=self.headers).json()
        self.assertEqual(len(exported['water_logs']), 1)

    def test_created_at_filter_and_cors(self):
        self.assertEqual(self.client.post('/v1/meals', headers=self.headers, json={'friendlyname': 'Lunch'}).status_code, 201)
        query = json.dumps([json.dumps({'method': 'greaterThanEqual', 'attribute': '$createdAt', 'values': ['2000-01-01T00:00:00Z']})])
        result = self.client.get('/v1/meals', headers=self.headers, params={'queries': query})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(len(result.json()['documents']), 1)
        cors = self.client.options('/v1/auth/login', headers={'Origin': 'https://kiloric.co', 'Access-Control-Request-Method': 'POST'})
        self.assertEqual(cors.headers.get('access-control-allow-origin'), 'https://kiloric.co')

    def test_photo_upload_contribution_export_and_account_cleanup(self):
        # Transport validates signature/type, size and ownership; images remain private.
        photo = b'\xff\xd8\xff' + b'example-photo-bytes'
        upload = self.client.post('/v1/files', headers=self.headers, files={'file': ('photo.jpg', photo, 'image/jpeg')})
        self.assertEqual(upload.status_code, 201, upload.text)
        file_id = upload.json()['$id']
        self.assertEqual(self.client.get('/v1/files/' + file_id, headers=self.headers).content, photo)
        bad = self.client.post('/v1/files', headers=self.headers, files={'file': ('bad.jpg', b'not-an-image', 'image/jpeg')})
        self.assertEqual(bad.status_code, 422)
        contribution = self.client.post('/v1/food-contributions', headers=self.headers, json={'product_name': 'Test food', 'photo_file_id': file_id, 'owner': 'other', 'status': 'approved'})
        self.assertEqual(contribution.status_code, 201, contribution.text)
        self.assertEqual(contribution.json()['status'], 'pending')
        self.assertEqual(contribution.json()['owner'], self.tokens['user']['$id'])
        self.assertEqual(self.client.get('/v1/food-contributions', headers=self.headers).json()['total'], 1)
        exported = self.client.get('/v1/me/export', headers=self.headers).json()
        self.assertEqual(len(exported['food_contributions']), 1)
        self.assertEqual(len(exported['uploaded_files']), 1)
        other = self.client.post('/v1/auth/register', json={'email': 'photo-other@kiloricdev.co', 'username': 'photo_other', 'password': 'beta-test-password'}).json()
        headers = {'Authorization': 'Bearer ' + other['access_token']}
        self.assertEqual(self.client.get('/v1/files/' + file_id, headers=headers).status_code, 404)
        self.assertEqual(self.client.post('/v1/food-contributions', headers=headers, json={'product_name': 'Other food', 'photo_file_id': file_id}).status_code, 422)
        self.assertEqual(self.client.delete('/v1/me', headers=self.headers).status_code, 204)
        from app.models import ContributionUpload, FoodContribution
        with self.sessions() as db:
            self.assertEqual(db.query(ContributionUpload).count(), 0)
            self.assertEqual(db.query(FoodContribution).count(), 0)

    def test_password_reset_reports_unavailable_mail_service(self):
        from unittest.mock import patch
        from app.config import settings
        with patch.object(settings, 'SMTP_HOST', None):
            response = self.client.post('/v1/auth/reset-password-request', json={'email': 'beta@kiloricdev.co'})
            self.assertEqual(response.status_code, 503)
            unknown = self.client.post('/v1/auth/reset-password-request', json={'email': 'missing@kiloricdev.co'})
            self.assertEqual(unknown.status_code, 503)
