"""Auth + sync smoke tests. Requires backend to be running behind REACT_APP_BACKEND_URL."""
import os
import uuid
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/") + "/api"


def _fresh_email():
    return f"pytest.{uuid.uuid4().hex[:8]}@example.com"


def test_register_login_me_logout_flow():
    email = _fresh_email()
    s = requests.Session()

    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "Pytest"})
    assert r.status_code == 200, r.text
    user = r.json()
    assert user["email"] == email
    assert user["provider"] == "email"
    user_id = user["user_id"]

    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200 and me.json()["user_id"] == user_id

    lo = s.post(f"{API}/auth/logout")
    assert lo.status_code == 200

    me2 = s.get(f"{API}/auth/me")
    assert me2.status_code == 401

    # login again with same credentials
    r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "Secret123!"})
    assert r2.status_code == 200 and r2.json()["user_id"] == user_id


def test_register_duplicate_email_rejected():
    email = _fresh_email()
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "A"})
    assert r.status_code == 200
    r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "B"})
    assert r2.status_code == 409


def test_login_wrong_password_401():
    email = _fresh_email()
    requests.post(f"{API}/auth/register", json={"email": email, "password": "GoodPass1", "name": "X"})
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": "WrongPass1"})
    assert r.status_code == 401


def test_short_password_400():
    r = requests.post(f"{API}/auth/register", json={"email": _fresh_email(), "password": "short", "name": "S"})
    assert r.status_code == 400


def test_sync_state_roundtrip():
    email = _fresh_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "Sync"})

    # initially empty
    r = s.get(f"{API}/sync/state")
    assert r.status_code == 200
    assert r.json()["state"] == {}

    payload = {"classes": [{"id": "c1", "name": "6A"}], "userName": "Sync"}
    r2 = s.put(f"{API}/sync/state", json={"state": payload})
    assert r2.status_code == 200
    assert r2.json()["state"] == payload
    assert r2.json()["updated_at"]

    # Fetch from a fresh session — must still return state (cookie-based)
    r3 = s.get(f"{API}/sync/state")
    assert r3.status_code == 200 and r3.json()["state"] == payload


def test_sync_requires_auth():
    r = requests.get(f"{API}/sync/state")
    assert r.status_code == 401
    r2 = requests.put(f"{API}/sync/state", json={"state": {}})
    assert r2.status_code == 401


def test_upload_attributed_to_user():
    email = _fresh_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "U"})
    r = s.post(f"{API}/uploads", files={"file": ("auth.txt", b"hello auth", "text/plain")})
    assert r.status_code == 200
    up = r.json()
    # Path should include user_id (not "shared")
    assert "/shared/" not in up["path"]
    assert up["path"].startswith("planovia/uploads/user_")
