from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Response, Request, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import uuid
import secrets
import bcrypt
import requests
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta

# ------------------------------------------------------------------
# App wiring
# ------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Emergent Object Storage integration (kept from previous milestone)
# ------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "planovia"

# Emergent Auth
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MIME_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "json": "application/json",
    "csv": "text/csv",
    "txt": "text/plain",
    "md": "text/markdown",
}

storage_key: Optional[str] = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    for attempt in (0, 1):
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
        if resp.status_code == 404 and attempt == 0:
            key = init_storage(force=True)
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("put_object failed after retry")


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    for attempt in (0, 1):
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
        )
        if resp.status_code == 404 and attempt == 0:
            key = init_storage(force=True)
            continue
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    raise HTTPException(status_code=404, detail="File not found")


def guess_content_type(filename: str, provided: Optional[str]) -> str:
    if provided and provided != "application/octet-stream":
        return provided
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return MIME_BY_EXT.get(ext, "application/octet-stream")


# ------------------------------------------------------------------
# Password hashing
# ------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


PASSWORD_MIN_LEN = 8
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))


# ------------------------------------------------------------------
# Session helpers
# ------------------------------------------------------------------
SESSION_COOKIE = "session_token"
SESSION_TTL_DAYS = 7


def new_session_token() -> str:
    return secrets.token_urlsafe(48)


async def create_session(user_id: str, token: Optional[str] = None) -> tuple[str, datetime]:
    token = token or new_session_token()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    })
    return token, expires_at


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_TTL_DAYS * 24 * 60 * 60,
    )


def clear_session_cookie(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")


async def get_optional_user(request: Request) -> Optional[dict]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


async def require_user(request: Request) -> dict:
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Ej inloggad")
    return user


# ------------------------------------------------------------------
# Brute-force protection (simple per-email counter, 5 fails → 15 min)
# ------------------------------------------------------------------
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCK_MINUTES = 15


async def check_login_lockout(email: str):
    doc = await db.login_attempts.find_one({"identifier": email}, {"_id": 0})
    if not doc:
        return
    count = doc.get("count", 0)
    first = doc.get("first_attempt")
    if isinstance(first, str):
        first = datetime.fromisoformat(first)
    if first and first.tzinfo is None:
        first = first.replace(tzinfo=timezone.utc)
    if count >= LOGIN_MAX_ATTEMPTS and first and (datetime.now(timezone.utc) - first) < timedelta(minutes=LOGIN_LOCK_MINUTES):
        raise HTTPException(status_code=429, detail="För många inloggningsförsök. Försök igen om 15 minuter.")


async def register_failed_login(email: str):
    now = datetime.now(timezone.utc).isoformat()
    await db.login_attempts.update_one(
        {"identifier": email},
        {"$inc": {"count": 1}, "$setOnInsert": {"first_attempt": now}},
        upsert=True,
    )


async def clear_failed_logins(email: str):
    await db.login_attempts.delete_one({"identifier": email})


# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------
class UserOut(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: str


class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UploadResponse(BaseModel):
    id: str
    name: str
    path: str
    size: int
    content_type: str
    url: str
    created_at: str


class SyncStateOut(BaseModel):
    state: Dict[str, Any]
    updated_at: Optional[str] = None


class SyncStateIn(BaseModel):
    state: Dict[str, Any]


# ---- Week share (vikarie) ----
class ShareWeekIn(BaseModel):
    week_data: Dict[str, Any]  # Snapshot payload rendered by /vikarie/{token}
    label: Optional[str] = None  # e.g. "Vecka 12 · 2026"


class ShareWeekOut(BaseModel):
    token: str
    revoke_secret: str
    label: Optional[str] = None
    expires_at: str
    created_at: str


class SharedWeekOut(BaseModel):
    token: str
    label: Optional[str] = None
    week_data: Dict[str, Any]
    created_at: str
    expires_at: str


SHARE_TTL_DAYS = 7


# ------------------------------------------------------------------
# Auth endpoints
# ------------------------------------------------------------------
@api_router.post("/auth/register", response_model=UserOut)
async def register(input: RegisterInput, response: Response):
    email = normalize_email(input.email)
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Ogiltig e-postadress")
    if len(input.password) < PASSWORD_MIN_LEN:
        raise HTTPException(status_code=400, detail=f"Lösenordet måste vara minst {PASSWORD_MIN_LEN} tecken")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="E-postadressen är redan registrerad")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": (input.name or "").strip() or None,
        "picture": None,
        "password_hash": hash_password(input.password),
        "provider": "email",
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(user_doc)

    token, _ = await create_session(user_id)
    set_session_cookie(response, token)

    return UserOut(user_id=user_id, email=email, name=user_doc["name"], picture=None, provider="email")


@api_router.post("/auth/login", response_model=UserOut)
async def login(input: LoginInput, response: Response):
    email = normalize_email(input.email)
    await check_login_lockout(email)
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(input.password, user["password_hash"]):
        await register_failed_login(email)
        raise HTTPException(status_code=401, detail="Fel e-post eller lösenord")
    await clear_failed_logins(email)

    token, _ = await create_session(user["user_id"])
    set_session_cookie(response, token)
    return UserOut(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name"),
        picture=user.get("picture"),
        provider=user.get("provider", "email"),
    )


@api_router.post("/auth/session", response_model=UserOut)
async def emergent_google_session(response: Response, x_session_id: str = Header(..., alias="X-Session-ID")):
    """Exchange an Emergent OAuth session_id (from URL fragment) for a Planovia session cookie."""
    try:
        r = requests.get(EMERGENT_AUTH_SESSION_URL, headers={"X-Session-ID": x_session_id}, timeout=20)
    except Exception as e:
        raise HTTPException(status_code=502, detail="Auth-service otillgänglig") from e
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Ogiltig eller utgången Google-session")
    data = r.json()
    email = normalize_email(data.get("email", ""))
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token") or new_session_token()
    if not email:
        raise HTTPException(status_code=400, detail="Google returnerade ingen e-post")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    if user:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": name or user.get("name"), "picture": picture or user.get("picture"), "updated_at": now}},
        )
        user_id = user["user_id"]
        provider = user.get("provider", "google")
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "provider": "google",
            "created_at": now,
            "updated_at": now,
        })
        provider = "google"

    await create_session(user_id, token=session_token)
    set_session_cookie(response, session_token)
    return UserOut(user_id=user_id, email=email, name=name, picture=picture, provider=provider)


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(require_user)):
    return UserOut(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name"),
        picture=user.get("picture"),
        provider=user.get("provider", "email"),
    )


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    clear_session_cookie(response)
    return {"ok": True}


# ------------------------------------------------------------------
# Sync endpoints
# ------------------------------------------------------------------
@api_router.get("/sync/state", response_model=SyncStateOut)
async def get_state(user: dict = Depends(require_user)):
    doc = await db.user_snapshots.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        return SyncStateOut(state={}, updated_at=None)
    return SyncStateOut(state=doc.get("state") or {}, updated_at=doc.get("updated_at"))


@api_router.put("/sync/state", response_model=SyncStateOut)
async def put_state(payload: SyncStateIn, user: dict = Depends(require_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.user_snapshots.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"user_id": user["user_id"], "state": payload.state, "updated_at": now}},
        upsert=True,
    )
    return SyncStateOut(state=payload.state, updated_at=now)


# ------------------------------------------------------------------
# Share endpoints (public week snapshots for substitute teachers)
# ------------------------------------------------------------------
def _short_token(n: int = 20) -> str:
    # URL-safe, no padding; short enough to fit nicely in a link
    return secrets.token_urlsafe(n).replace("_", "").replace("-", "")[:n]


@api_router.post("/share/week", response_model=ShareWeekOut)
async def create_week_share(payload: ShareWeekIn, request: Request):
    user = await get_optional_user(request)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SHARE_TTL_DAYS)
    token = _short_token(20)
    revoke_secret = secrets.token_urlsafe(24)
    doc = {
        "token": token,
        "revoke_secret_hash": hash_password(revoke_secret),
        "owner_user_id": user["user_id"] if user else None,
        "label": (payload.label or "").strip() or None,
        "week_data": payload.week_data,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "revoked": False,
    }
    await db.week_shares.insert_one(doc)
    return ShareWeekOut(
        token=token,
        revoke_secret=revoke_secret,
        label=doc["label"],
        expires_at=doc["expires_at"],
        created_at=doc["created_at"],
    )


@api_router.get("/share/week/{token}", response_model=SharedWeekOut)
async def get_week_share(token: str):
    doc = await db.week_shares.find_one({"token": token}, {"_id": 0})
    if not doc or doc.get("revoked"):
        raise HTTPException(status_code=404, detail="Länken finns inte längre.")
    expires = doc.get("expires_at")
    if isinstance(expires, str):
        expires_dt = datetime.fromisoformat(expires)
    else:
        expires_dt = expires
    if expires_dt and expires_dt.tzinfo is None:
        expires_dt = expires_dt.replace(tzinfo=timezone.utc)
    if expires_dt and expires_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Länken har gått ut.")
    return SharedWeekOut(
        token=doc["token"],
        label=doc.get("label"),
        week_data=doc.get("week_data") or {},
        created_at=doc.get("created_at"),
        expires_at=doc.get("expires_at"),
    )


@api_router.delete("/share/week/{token}")
async def revoke_week_share(token: str, request: Request, x_revoke_secret: Optional[str] = Header(None, alias="X-Revoke-Secret")):
    doc = await db.week_shares.find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Länken hittades inte")
    # Authorised if: signed-in owner OR correct revoke secret
    user = await get_optional_user(request)
    authorised = False
    if user and doc.get("owner_user_id") and doc["owner_user_id"] == user["user_id"]:
        authorised = True
    elif x_revoke_secret and verify_password(x_revoke_secret, doc.get("revoke_secret_hash", "")):
        authorised = True
    if not authorised:
        raise HTTPException(status_code=403, detail="Saknar behörighet att återkalla länken.")
    await db.week_shares.update_one({"token": token}, {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True}


# ------------------------------------------------------------------
# Upload / File endpoints (per-user path; guests fall back to "shared")
# ------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Planovia backend"}


@api_router.post("/uploads", response_model=UploadResponse)
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await get_optional_user(request)
    bucket = user["user_id"] if user else "shared"

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Fil för stor (max {MAX_UPLOAD_BYTES // (1024*1024)} MB)")

    filename = file.filename or "file.bin"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    content_type = guess_content_type(filename, file.content_type)

    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{bucket}/{file_id}.{ext}"

    try:
        result = put_object(path, data, content_type)
    except requests.HTTPError as e:
        logger.error(f"Storage put failed: {e}")
        raise HTTPException(status_code=502, detail="Kunde inte spara filen") from e

    canonical_path = result.get("path", path)
    now = datetime.now(timezone.utc).isoformat()
    await db.files.insert_one({
        "id": file_id,
        "storage_path": canonical_path,
        "original_filename": filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "user_id": user["user_id"] if user else None,
        "created_at": now,
    })

    return UploadResponse(
        id=file_id, name=filename, path=canonical_path,
        size=result.get("size", len(data)), content_type=content_type,
        url=f"/api/files/{file_id}", created_at=now,
    )


@api_router.get("/files/{file_id}")
async def download_file(file_id: str):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Fil hittades inte")
    try:
        data, content_type = get_object(record["storage_path"])
    except requests.HTTPError as e:
        logger.error(f"Storage get failed: {e}")
        raise HTTPException(status_code=502, detail="Kunde inte hämta filen") from e
    ct = record.get("content_type") or content_type or "application/octet-stream"
    filename = record.get("original_filename", "file")
    disposition = "inline" if (ct.startswith("image/") or ct == "application/pdf") else f'attachment; filename="{filename}"'
    return Response(
        content=data, media_type=ct,
        headers={"Content-Disposition": disposition, "Cache-Control": "private, max-age=3600"},
    )


@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    res = await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fil hittades inte")
    return {"ok": True}


# ------------------------------------------------------------------
# Legacy status endpoints (kept for compatibility)
# ------------------------------------------------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check["timestamp"], str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])
    return status_checks


# ------------------------------------------------------------------
# App wiring + startup
# ------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    try:
        init_storage()
        logger.info("Emergent Object Storage initialised")
    except Exception as e:
        logger.error(f"Storage init failed at startup: {e}")
    try:
        await db.users.create_index("email", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_snapshots.create_index("user_id", unique=True)
        await db.login_attempts.create_index("identifier")
        await db.week_shares.create_index("token", unique=True)
        await db.week_shares.create_index("owner_user_id")
        logger.info("Auth indexes ready")
    except Exception as e:
        logger.warning(f"Index setup: {e}")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
