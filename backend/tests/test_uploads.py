"""Smoke tests for /api/uploads and /api/files/{id} endpoints (Emergent Object Storage)."""
import io
import os
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/") + "/api"


def test_upload_and_download_roundtrip():
    content = b"Planova test payload"
    files = {"file": ("smoke.txt", io.BytesIO(content), "text/plain")}
    r = requests.post(f"{API}/uploads", files=files, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == "smoke.txt"
    assert data["size"] == len(content)
    assert data["url"].startswith("/api/files/")
    file_id = data["id"]

    dl = requests.get(f"{API}/files/{file_id}", timeout=30)
    assert dl.status_code == 200
    assert dl.content == content
    assert dl.headers["content-type"].startswith("text/plain")


def test_empty_file_rejected():
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    r = requests.post(f"{API}/uploads", files=files, timeout=30)
    assert r.status_code == 400


def test_missing_file_404():
    r = requests.get(f"{API}/files/does-not-exist", timeout=30)
    assert r.status_code == 404


def test_soft_delete_makes_file_unavailable():
    files = {"file": ("del.txt", io.BytesIO(b"temp"), "text/plain")}
    up = requests.post(f"{API}/uploads", files=files, timeout=30).json()
    fid = up["id"]
    d = requests.delete(f"{API}/files/{fid}", timeout=30)
    assert d.status_code == 200
    after = requests.get(f"{API}/files/{fid}", timeout=30)
    assert after.status_code == 404
