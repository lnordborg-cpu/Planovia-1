from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Emergent Object Storage integration
# ------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "planovia"

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
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
    """Initialise the Emergent Object Storage session. Session-scoped key."""
    global storage_key
    if storage_key and not force:
        return storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing in backend/.env")
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
            data=data,
            timeout=120,
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
            headers={"X-Storage-Key": key},
            timeout=60,
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
# Models
# ------------------------------------------------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class UploadResponse(BaseModel):
    id: str
    name: str
    path: str
    size: int
    content_type: str
    url: str
    created_at: str


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Planovia backend"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


@api_router.post("/uploads", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Fil för stor (max {MAX_UPLOAD_BYTES // (1024*1024)} MB)")

    filename = file.filename or "file.bin"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    content_type = guess_content_type(filename, file.content_type)

    file_id = str(uuid.uuid4())
    # No auth yet – all files share a common bucket. When auth arrives, replace 'shared' with user_id.
    path = f"{APP_NAME}/uploads/shared/{file_id}.{ext}"

    try:
        result = put_object(path, data, content_type)
    except requests.HTTPError as e:
        logger.error(f"Storage put failed: {e}")
        raise HTTPException(status_code=502, detail="Kunde inte spara filen") from e

    canonical_path = result.get("path", path)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": file_id,
        "storage_path": canonical_path,
        "original_filename": filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": now,
    }
    await db.files.insert_one(doc)

    return UploadResponse(
        id=file_id,
        name=filename,
        path=canonical_path,
        size=doc["size"],
        content_type=content_type,
        url=f"/api/files/{file_id}",
        created_at=now,
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
        content=data,
        media_type=ct,
        headers={"Content-Disposition": disposition, "Cache-Control": "private, max-age=3600"},
    )


@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    res = await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fil hittades inte")
    return {"ok": True}


# ------------------------------------------------------------------
# App wiring
# ------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    try:
        init_storage()
        logger.info("Emergent Object Storage initialised")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Storage init failed at startup: {e}")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
