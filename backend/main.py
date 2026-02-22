"""Main FastAPI application entry point."""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from models import AdminUser
from auth import hash_password
from database import SessionLocal

# Import all routers
from routers.serials import router as serials_router
from routers.products import router as products_router
from routers.tickets import router as tickets_router
from routers.maintenance import router as maintenance_router
from routers.users import router as users_router, products_router as customer_products_router
from routers.admin import router as admin_router
from routers.reports import router as reports_router
from routers.dealers import router as dealers_router
from routers.customers import router as customers_router
from routers.settings import router as settings_router
from routers.check import router as check_router


load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/qrcodes", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/attachments", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables and seed default admin on startup."""
    Base.metadata.create_all(bind=engine)
    _seed_default_admin()
    yield


def _seed_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.username == "admin").first()
        if not existing:
            admin = AdminUser(
                username="admin",
                password_hash=hash_password("admin123"),
            )
            db.add(admin)
            db.commit()
            print("✅ Default admin created: admin / admin123")
    finally:
        db.close()


app = FastAPI(
    title="Smart Warranty Tracker API",
    description="API for managing product warranties, serials, QR codes, and support tickets.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files (uploads) ───────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────────
app.include_router(admin_router)
app.include_router(products_router)
app.include_router(serials_router)
app.include_router(tickets_router)
app.include_router(maintenance_router)
app.include_router(users_router)
app.include_router(customer_products_router)
app.include_router(reports_router)
app.include_router(dealers_router)
app.include_router(customers_router)
app.include_router(settings_router)
app.include_router(check_router)



@app.get("/")
def root():
    return {
        "message": "Smart Warranty Tracker API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
