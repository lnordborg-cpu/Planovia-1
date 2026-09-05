"""Tests for /api/share/week endpoints (public week snapshots for substitute teachers)."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/") + "/api"


def _fresh_email():
    return f"pytest.{uuid.uuid4().hex[:8]}@example.com"


def _sample_week():
    return {
        "week_number": 12,
        "year": 2026,
        "days": [
            {"name": "Måndag", "events": [{"title": "Matte", "time": "08:15"}]},
            {"name": "Tisdag", "events": []},
        ],
        "teacher_name": "Testläraren",
    }


# ---- Create share (anonymous) ----

def test_create_share_anonymous_returns_token_and_secret():
    r = requests.post(f"{API}/share/week", json={"week_data": _sample_week(), "label": "Vecka 12 · 2026"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data["token"], str) and len(data["token"]) == 20
    assert isinstance(data["revoke_secret"], str) and len(data["revoke_secret"]) > 10
    assert data["label"] == "Vecka 12 · 2026"
    # expires ~7 days from now
    exp = datetime.fromisoformat(data["expires_at"])
    created = datetime.fromisoformat(data["created_at"])
    delta = exp - created
    assert timedelta(days=6, hours=23) <= delta <= timedelta(days=7, hours=1)


def test_create_share_authenticated_works():
    email = _fresh_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "Owner"})
    r = s.post(f"{API}/share/week", json={"week_data": _sample_week(), "label": "V.10"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["token"]
    assert data["revoke_secret"]


# ---- Read share (public) ----

def test_get_share_returns_same_week_data_public():
    week = _sample_week()
    created = requests.post(f"{API}/share/week", json={"week_data": week, "label": "V.42"}).json()
    token = created["token"]

    # Public: no session/cookie
    r = requests.get(f"{API}/share/week/{token}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["token"] == token
    assert data["label"] == "V.42"
    assert data["week_data"] == week
    assert data["created_at"] == created["created_at"]
    assert data["expires_at"] == created["expires_at"]


def test_get_share_unknown_token_returns_404_swedish():
    r = requests.get(f"{API}/share/week/does-not-exist-token")
    assert r.status_code == 404
    detail = r.json().get("detail", "")
    # Response should contain a Swedish message
    assert any(word in detail.lower() for word in ["länk", "finns", "hittades"]), detail


# ---- Revoke (DELETE with X-Revoke-Secret) ----

def test_revoke_with_correct_secret_returns_200_then_404():
    created = requests.post(f"{API}/share/week", json={"week_data": _sample_week()}).json()
    token = created["token"]
    secret = created["revoke_secret"]

    r = requests.delete(f"{API}/share/week/{token}", headers={"X-Revoke-Secret": secret})
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    # GET after revoke -> 404
    after = requests.get(f"{API}/share/week/{token}")
    assert after.status_code == 404


def test_revoke_without_secret_returns_403():
    created = requests.post(f"{API}/share/week", json={"week_data": _sample_week()}).json()
    token = created["token"]
    r = requests.delete(f"{API}/share/week/{token}")
    assert r.status_code == 403
    # And the share still exists
    still = requests.get(f"{API}/share/week/{token}")
    assert still.status_code == 200


def test_revoke_with_wrong_secret_returns_403():
    created = requests.post(f"{API}/share/week", json={"week_data": _sample_week()}).json()
    token = created["token"]
    r = requests.delete(f"{API}/share/week/{token}", headers={"X-Revoke-Secret": "not-the-real-secret"})
    assert r.status_code == 403
    still = requests.get(f"{API}/share/week/{token}")
    assert still.status_code == 200


# ---- Regression: existing endpoints still work ----

def test_regression_auth_register_login_me_still_work():
    email = _fresh_email()
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "Reg"})
    assert r.status_code == 200
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200 and me.json()["email"] == email
    s.post(f"{API}/auth/logout")
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "Secret123!"})
    assert lr.status_code == 200


def test_regression_sync_state_roundtrip():
    email = _fresh_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "Secret123!", "name": "Sync"})
    r = s.get(f"{API}/sync/state")
    assert r.status_code == 200 and r.json()["state"] == {}
    payload = {"classes": [{"id": "c1", "name": "6A"}]}
    r2 = s.put(f"{API}/sync/state", json={"state": payload})
    assert r2.status_code == 200 and r2.json()["state"] == payload


def test_regression_upload_still_works():
    r = requests.post(f"{API}/uploads", files={"file": ("share.txt", b"planovia", "text/plain")}, timeout=30)
    assert r.status_code == 200
    assert r.json()["url"].startswith("/api/files/")
