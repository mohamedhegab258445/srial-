"""Admin auth router - login + dashboard stats."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AdminUser, Serial, Ticket, Product, User
from schemas import AdminLoginIn, TokenOut
from auth import verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])


@router.post("/login", response_model=TokenOut)
def admin_login(payload: AdminLoginIn, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": str(admin.id), "role": "admin", "username": admin.username})
    return TokenOut(access_token=token)


@router.get("/dashboard")
def dashboard_stats(db: Session = Depends(get_db), _: dict = Depends(get_current_admin)):
    """Admin dashboard overview stats."""
    total_products = db.query(Product).count()
    total_serials = db.query(Serial).count()
    active_warranties = db.query(Serial).filter(Serial.warranty_status == "active").count()
    expired_warranties = db.query(Serial).filter(Serial.warranty_status == "expired").count()
    total_customers = db.query(User).count()
    open_tickets = db.query(Ticket).filter(Ticket.status == "open").count()
    in_progress_tickets = db.query(Ticket).filter(Ticket.status == "in_progress").count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == "resolved").count()

    recent_tickets = (
        db.query(Ticket)
        .order_by(Ticket.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "products": total_products,
        "serials": {
            "total": total_serials,
            "active": active_warranties,
            "expired": expired_warranties,
            "inactive": total_serials - active_warranties - expired_warranties,
        },
        "customers": total_customers,
        "tickets": {
            "open": open_tickets,
            "in_progress": in_progress_tickets,
            "resolved": resolved_tickets,
        },
        "recent_tickets": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            }
            for t in recent_tickets
        ],
    }
