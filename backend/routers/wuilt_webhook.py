"""
Wuilt Store → Warranty System Integration
==========================================
Endpoints:
  POST /api/webhooks/wuilt               — Wuilt calls this on any order update
  POST /api/webhooks/wuilt/sync-products — Admin: pull all products from Wuilt & save to DB
  POST /api/webhooks/wuilt/sync-customers— Admin: pull all customers from Wuilt & save to DB
  POST /api/webhooks/wuilt/sync-orders   — Admin: pull all DELIVERED orders & create serials
  GET  /api/webhooks/wuilt/sync/status   — Check background sync progress

Rules:
  - Only register customer + serial when shippingStatus == DELIVERED
  - Product matching uses wuilt_product_id (exact) then falls back to name partial match
  - Customer upserted by phone → email → create new
  - All syncs are idempotent (safe to run multiple times)
"""

import os
import uuid
import logging
from datetime import date, datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import Serial, User, Product
from auth import get_current_admin
from qr_generator import generate_qr_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["Wuilt Integration"])

# ─── Config ────────────────────────────────────────────────────────────────────
WUILT_API_KEY        = os.getenv("WUILT_API_KEY", "")
WUILT_STORE_ID       = os.getenv("WUILT_STORE_ID", "")
WUILT_WEBHOOK_SECRET = os.getenv("WUILT_WEBHOOK_SECRET", "")
WUILT_DEFAULT_PRODUCT_ID = int(os.getenv("WUILT_DEFAULT_PRODUCT_ID", "1"))
WUILT_GQL_ENDPOINT   = "https://api.wuilt.com/v3/graphql"

def _headers():
    """Always read from env in case it was set after module load."""
    return {
        "Content-Type": "application/json",
        "x-api-key": os.getenv("WUILT_API_KEY", WUILT_API_KEY),
    }

def _gql(query: str, variables: dict) -> dict:
    """Execute a Wuilt GraphQL query and return the data dict."""
    resp = httpx.post(
        WUILT_GQL_ENDPOINT,
        headers=_headers(),
        json={"query": query, "variables": variables},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if "errors" in result:
        raise RuntimeError(f"Wuilt GraphQL error: {result['errors']}")
    return result.get("data", {})


# ─── Customer Helpers ─────────────────────────────────────────────────────────

def _upsert_customer(db: Session, name: str, phone: str, email: str) -> User:
    """Find existing customer by phone or email, or create new one."""
    user = None
    if phone:
        user = db.query(User).filter(User.phone == phone).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name or "عميل Wuilt",
            phone=phone or None,
            email=email or None,
        )
        db.add(user)
        db.flush()
    elif name and not user.name:
        user.name = name
    return user


# ─── Product Helpers ──────────────────────────────────────────────────────────

def _find_product_by_wuilt_id(db: Session, wuilt_product_id: str) -> Optional[Product]:
    """Exact match by Wuilt productId stored in Product.wuilt_product_id."""
    if not wuilt_product_id:
        return None
    return db.query(Product).filter(Product.wuilt_product_id == wuilt_product_id).first()


def _find_product_by_title(db: Session, title: str) -> Optional[Product]:
    """Fallback: partial name match (case-insensitive)."""
    if not title:
        return None
    lower = title.lower()
    for p in db.query(Product).all():
        if p.name.lower() in lower or lower in p.name.lower():
            return p
    return None


def _resolve_product(db: Session, wuilt_product_id: str, title: str) -> int:
    """Return local product_id for a Wuilt item — use exact ID first, then name, then default."""
    p = _find_product_by_wuilt_id(db, wuilt_product_id)
    if not p:
        p = _find_product_by_title(db, title)
    return p.id if p else WUILT_DEFAULT_PRODUCT_ID


# ─── Serial Helpers ───────────────────────────────────────────────────────────

def _make_serial_number(order_serial: str, item_index: int, qty_index: int = 0) -> str:
    """Generate: SRL-{ORDER_SERIAL}-{ITEM+1}[-{QTY_INDEX}]"""
    clean = str(order_serial).upper().replace("#", "").replace("-", "")[:8]
    base = f"SRL-{clean}-{item_index + 1}" if clean else f"SRL-{uuid.uuid4().hex[:8].upper()}"
    return f"{base}-{qty_index + 1}" if qty_index > 0 else base


# ─── Core Order Processor ─────────────────────────────────────────────────────

def _process_delivered_order(order: dict, db: Session) -> dict:
    """
    Given a Wuilt order dict (shippingStatus must be DELIVERED):
    1. Upsert the customer
    2. Per order item × quantity: create a serial + QR code
    Always idempotent — skips serials that already exist.
    """
    customer_data = order.get("customer") or {}
    name  = (customer_data.get("name")  or "").strip()
    phone = (customer_data.get("phone") or "").strip()
    email = (customer_data.get("email") or "").strip()
    order_serial = str(order.get("orderSerial") or order.get("_id") or "")
    items = order.get("items") or []

    user = _upsert_customer(db, name, phone, email)

    created_serials = []
    for idx, item in enumerate(items):
        qty            = int(item.get("quantity") or 1)
        title          = (item.get("title") or "").strip()
        wuilt_prod_id  = item.get("productId") or ""
        product_id     = _resolve_product(db, wuilt_prod_id, title)

        for q in range(qty):
            sn = _make_serial_number(order_serial, idx, q)

            if db.query(Serial).filter(Serial.serial_number == sn).first():
                continue  # idempotent skip

            serial = Serial(
                serial_number=sn,
                product_id=product_id,
                user_id=user.id,
                purchase_date=date.today(),
                activation_date=datetime.now(timezone.utc),
                warranty_status="active",
                notes=f"Wuilt - طلب #{order_serial}",
            )
            db.add(serial)
            db.flush()

            try:
                serial.qr_code_url = generate_qr_code(sn)
            except Exception as e:
                logger.warning(f"QR failed for {sn}: {e}")
                serial.qr_code_url = f"/api/serials/{sn}/qr"

            created_serials.append(sn)

    db.commit()
    return {
        "customer": user.name,
        "order": order_serial,
        "serials_created": created_serials,
    }


# ─── Webhook Endpoint (called by Wuilt) ──────────────────────────────────────

@router.post("/wuilt")
async def wuilt_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Wuilt sends a POST here on every order update.
    We only act when shippingStatus == DELIVERED.
    """
    secret = request.headers.get("x-webhook-secret", "")
    whs = os.getenv("WUILT_WEBHOOK_SECRET", WUILT_WEBHOOK_SECRET)
    if whs and secret != whs:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    body = await request.json()
    logger.info(f"[Wuilt Webhook] event={body.get('event')} store={body.get('metadata', {}).get('storeId')}")

    payload = body.get("payload") or body
    order   = payload.get("order") or payload

    if order.get("shippingStatus") != "DELIVERED":
        return {"status": "ignored", "shippingStatus": order.get("shippingStatus")}

    try:
        result = _process_delivered_order(order, db)
        logger.info(f"[Wuilt] ✅ {len(result['serials_created'])} serials for order {result['order']}")
        return {"status": "ok", **result}
    except Exception as e:
        logger.error(f"[Wuilt Webhook] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GraphQL Queries ──────────────────────────────────────────────────────────

LIST_PRODUCTS_QUERY = """
query ListProducts($storeId: ID!, $first: Int!, $offset: Int!) {
  ListStoreProducts(
    storeId: $storeId
    connection: { first: $first, offset: $offset }
  ) {
    nodes {
      _id
      title
      images { src }
    }
    pageInfo { hasNextPage }
    totalCount
  }
}
"""

LIST_CUSTOMERS_QUERY = """
query ListCustomers($storeId: ID!, $first: Int!, $offset: Int!) {
  ListStoreCustomers(
    storeId: $storeId
    connection: { first: $first, offset: $offset }
  ) {
    nodes {
      name
      phone
      email
    }
    pageInfo { hasNextPage }
    totalCount
  }
}
"""

LIST_ORDERS_QUERY = """
query ListOrders($storeId: ID!, $first: Int!, $offset: Int!) {
  ListStoreOrders(
    storeId: $storeId
    connection: { first: $first, offset: $offset, sortBy: createdAt, sortOrder: desc }
    filter: { shippingStatus: DELIVERED, isArchived: false }
  ) {
    nodes {
      _id
      orderSerial
      shippingStatus
      createdAt
      customer { name phone email }
      items { title quantity productId }
    }
    pageInfo { hasNextPage }
    totalCount
  }
}
"""


# ─── Background Sync State ────────────────────────────────────────────────────

_sync_state: dict = {"running": False, "result": {}, "task": ""}


# ─── Product Sync ─────────────────────────────────────────────────────────────

def _sync_products_task():
    _sync_state.update({"running": True, "task": "products", "result": {}})
    db = SessionLocal()
    created = updated = 0
    try:
        offset, page_size = 0, 50
        while True:
            data   = _gql(LIST_PRODUCTS_QUERY, {"storeId": WUILT_STORE_ID, "first": page_size, "offset": offset})
            nodes  = data.get("ListStoreProducts", {}).get("nodes", [])
            if not nodes:
                break

            for p in nodes:
                wuilt_id = p.get("_id", "")
                title    = (p.get("title") or "").strip()
                images   = p.get("images") or []
                img_url  = images[0].get("src") if images else None

                existing = db.query(Product).filter(Product.wuilt_product_id == wuilt_id).first()
                if existing:
                    existing.name = title
                    if img_url: existing.image_url = img_url
                    updated += 1
                else:
                    db.add(Product(
                        name=title,
                        wuilt_product_id=wuilt_id,
                        image_url=img_url,
                        warranty_months=12,
                    ))
                    created += 1

            db.commit()
            if not data["ListStoreProducts"]["pageInfo"]["hasNextPage"]:
                break
            offset += page_size

        _sync_state["result"] = {"products_created": created, "products_updated": updated}
    except Exception as e:
        _sync_state["result"] = {"error": str(e)}
        logger.error(f"[Wuilt] Product sync error: {e}")
    finally:
        db.close()
        _sync_state["running"] = False


@router.post("/wuilt/sync-products", dependencies=[Depends(get_current_admin)])
def sync_wuilt_products(background_tasks: BackgroundTasks):
    """Import all Wuilt products into the warranty system."""
    if _sync_state["running"]:
        return {"status": "already_running", "task": _sync_state["task"]}
    background_tasks.add_task(_sync_products_task)
    return {"status": "started", "task": "products"}


# ─── Customer Sync ────────────────────────────────────────────────────────────

def _sync_customers_task():
    _sync_state.update({"running": True, "task": "customers", "result": {}})
    db = SessionLocal()
    created = skipped = 0
    try:
        offset, page_size = 0, 50
        while True:
            data  = _gql(LIST_CUSTOMERS_QUERY, {"storeId": WUILT_STORE_ID, "first": page_size, "offset": offset})
            nodes = data.get("ListStoreCustomers", {}).get("nodes", [])
            if not nodes:
                break

            for c in nodes:
                name  = (c.get("name")  or "").strip()
                phone = (c.get("phone") or "").strip()
                email = (c.get("email") or "").strip()

                existing = None
                if phone:
                    existing = db.query(User).filter(User.phone == phone).first()
                if not existing and email:
                    existing = db.query(User).filter(User.email == email).first()

                if existing:
                    skipped += 1
                else:
                    db.add(User(name=name or "عميل Wuilt", phone=phone or None, email=email or None))
                    created += 1

            db.commit()
            if not data["ListStoreCustomers"]["pageInfo"]["hasNextPage"]:
                break
            offset += page_size

        _sync_state["result"] = {"customers_created": created, "customers_skipped": skipped}
    except Exception as e:
        _sync_state["result"] = {"error": str(e)}
        logger.error(f"[Wuilt] Customer sync error: {e}")
    finally:
        db.close()
        _sync_state["running"] = False


@router.post("/wuilt/sync-customers", dependencies=[Depends(get_current_admin)])
def sync_wuilt_customers(background_tasks: BackgroundTasks):
    """Import all Wuilt customers into the warranty system."""
    if _sync_state["running"]:
        return {"status": "already_running", "task": _sync_state["task"]}
    background_tasks.add_task(_sync_customers_task)
    return {"status": "started", "task": "customers"}


# ─── Orders Sync (DELIVERED only) ────────────────────────────────────────────

def _sync_orders_task():
    _sync_state.update({"running": True, "task": "orders", "result": {}})
    db = SessionLocal()
    orders_done = serials_done = 0
    try:
        offset, page_size = 0, 50
        while True:
            data  = _gql(LIST_ORDERS_QUERY, {"storeId": WUILT_STORE_ID, "first": page_size, "offset": offset})
            nodes = data.get("ListStoreOrders", {}).get("nodes", [])
            if not nodes:
                break

            for order in nodes:
                result      = _process_delivered_order(order, db)
                serials_done += len(result["serials_created"])
                orders_done  += 1

            if not data["ListStoreOrders"]["pageInfo"]["hasNextPage"]:
                break
            offset += page_size

        _sync_state["result"] = {"orders_synced": orders_done, "serials_created": serials_done}
    except Exception as e:
        _sync_state["result"] = {"error": str(e)}
        logger.error(f"[Wuilt] Orders sync error: {e}")
    finally:
        db.close()
        _sync_state["running"] = False


@router.post("/wuilt/sync-orders", dependencies=[Depends(get_current_admin)])
def sync_wuilt_orders(background_tasks: BackgroundTasks):
    """Import all historical DELIVERED orders — creates customers + serials."""
    if _sync_state["running"]:
        return {"status": "already_running", "task": _sync_state["task"]}
    background_tasks.add_task(_sync_orders_task)
    return {"status": "started", "task": "orders"}


# ─── Sync Status ──────────────────────────────────────────────────────────────

@router.get("/wuilt/sync/status", dependencies=[Depends(get_current_admin)])
def sync_status():
    """Poll this to check if a background sync is running and get its result."""
    return _sync_state
