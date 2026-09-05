"""Shared fixtures/env loading for backend tests. Loads REACT_APP_BACKEND_URL from
/app/frontend/.env so that tests always hit the public ingress (where session
cookies are set as Secure; SameSite=None and won't survive localhost)."""
import os
from pathlib import Path


def _load_frontend_env():
    p = Path("/app/frontend/.env")
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k == "REACT_APP_BACKEND_URL" and v and not os.environ.get(k):
            os.environ[k] = v


_load_frontend_env()
