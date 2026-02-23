"""Main FastAPI application entry point."""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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

# ERP Routers
from routers.erp_wallets import router as erp_wallets_router
from routers.erp_suppliers import router as erp_suppliers_router
from routers.erp_expenses import router as erp_expenses_router
from routers.erp_purchases import router as erp_purchases_router
from routers.erp_sales import router as erp_sales_router
from routers.erp_stock import router as erp_stock_router


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


from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter

app = FastAPI(
    title="مودرن هوم - Warranty API",
    description="API for managing product warranties, serials, QR codes, and support tickets.",
    version="1.0.0",
    lifespan=lifespan,
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ────────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Build allowed origins list
_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    FRONTEND_URL,
]
# Also add any extra origins from EXTRA_ORIGINS env var (comma-separated)
_extra = os.getenv("EXTRA_ORIGINS", "")
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── GZip Compression ───────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Security Headers ────────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

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

# ERP
app.include_router(erp_wallets_router)
app.include_router(erp_suppliers_router)
app.include_router(erp_expenses_router)
app.include_router(erp_purchases_router)
app.include_router(erp_sales_router)
app.include_router(erp_stock_router)


@app.get("/")
def root():
    return {
        "message": "مودرن هوم - Warranty API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
