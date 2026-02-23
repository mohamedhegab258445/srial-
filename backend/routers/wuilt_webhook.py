"""
Wuilt Store → Warranty System Integration
==========================================
Webhook receiver: When a Wuilt order's shippingStatus = DELIVERED,
auto-create the customer (upsert) and a serial number per order item.

Also exposes a one-time sync endpoint to import existing delivered orders.

Env vars needed (add to Render and local .env):
  WUILT_API_KEY        = your Wuilt GraphQL API key
  WUILT_STORE_ID       = Store_cmay4m0ec02e001m564hm76f4
  WUILT_WEBHOOK_SECRET = any random string you set in Wuilt dashboard
  WUILT_DEFAULT_PRODUCT_ID = fallback product id if no match found (integer)
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

# ─── Config ──────────────────────────────────────────────────────────────────
WUILT_API_KEY        = os.getenv("WUILT_API_KEY", "")
WUILT_STORE_ID       = os.getenv("WUILT_STORE_ID", "")
WUILT_WEBHOOK_SECRET = os.getenv("WUILT_WEBHOOK_SECRET", "")
WUILT_DEFAULT_PRODUCT_ID = int(os.getenv("WUILT_DEFAULT_PRODUCT_ID", "1"))
WUILT_GQL_ENDPOINT   = "https://api.wuilt.com/v3/graphql"

HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": WUILT_API_KEY,
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _upsert_customer(db: Session, name: str, phone: str, email: str) -> User:
    """Find existing customer by phone or email, or create new one."""
    user = None
    if phone:
        user = db.query(User).filter(User.phone == phone).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(name=name or "عميل Wuilt", phone=phone or None, email=email or None)
        db.add(user)
        db.flush()
    return user


def _find_product(db: Session, wuilt_title: str) -> Optional[Product]:
    """Try to match Wuilt product title to a local product by name (case-insensitive partial match)."""
    if not wuilt_title:
        return None
    products = db.query(Product).all()
    wuilt_lower = wuilt_title.lower()
    for p in products:
        if p.name.lower() in wuilt_lower or wuilt_lower in p.name.lower():
            return p
    return None


def _make_serial_number(order_serial: str, item_index: int) -> str:
    """Generate a traceable serial: SRL-{ORDER}-{INDEX} or fallback to random."""
    if order_serial:
        clean = order_serial.upper().replace("#", "").replace("-", "")[:8]
        return f"SRL-{clean}-{item_index + 1}"
    return f"SRL-{uuid.uuid4().hex[:8].upper()}"


def _process_delivered_order(order: dict, db: Session) -> dict:
    """
    Core logic: given a Wuilt order dict (from webhook or sync),
    upsert the customer and create serials for each item.
    Exact Wuilt API field names confirmed from store-docs.wuilt.com.
    """
    # Customer: payload.order.customer.{name, phone, email}
    customer_data = order.get("customer") or {}
    name  = customer_data.get("name", "").strip()
    phone = customer_data.get("phone", "").strip()
    email = customer_data.get("email", "").strip()

    # Order serial: payload.order.orderSerial (e.g. "418")
    order_serial = str(order.get("orderSerial") or order.get("_id") or "")

    # Items: payload.order.items => [{title, quantity, productId, price}]
    items = order.get("items") or []

    user = _upsert_customer(db, name, phone, email)

    created_serials = []
    for idx, item in enumerate(items):
        qty = int(item.get("quantity") or 1)
        # title: from item.title (confirmed field name from Wuilt docs)
        title = (item.get("title") or "").strip()
        # productId is available if we want to do exact matching later
        wuilt_product_id = item.get("productId", "")

        product = _find_product(db, title)
        product_id = product.id if product else WUILT_DEFAULT_PRODUCT_ID

        for q in range(qty):
            # If multiple quantities, suffix with _q
            sn = _make_serial_number(order_serial, idx)
            if qty > 1:
                sn = f"{sn}-{q + 1}"

            # Skip if already exists (idempotent)
            if db.query(Serial).filter(Serial.serial_number == sn).first():
                continue

            serial = Serial(
                serial_number=sn,
                product_id=product_id,
                user_id=user.id,
                purchase_date=date.today(),
                activation_date=datetime.now(timezone.utc),
                warranty_status="active",
                notes=f"تم الاستيراد تلقائياً من متجر Wuilt - طلب رقم {order_serial}",
            )
            db.add(serial)
            db.flush()

            # Generate QR
            try:
                qr_url = generate_qr_code(sn)
                serial.qr_code_url = qr_url
            except Exception as e:
                logger.warning(f"QR generation failed for {sn}: {e}")
                serial.qr_code_url = f"/api/serials/{sn}/qr"

            created_serials.append(sn)

    db.commit()
    return {
        "customer": user.name,
        "order": order_serial,
        "serials_created": created_serials,
    }


# ─── Webhook Endpoint ─────────────────────────────────────────────────────────

@router.post("/wuilt")
async def wuilt_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Wuilt calls this URL every time an order is updated.
    We only act when shippingStatus == DELIVERED.
    """
    # 1. Verify secret header
    secret = request.headers.get("x-webhook-secret", "")
    if WUILT_WEBHOOK_SECRET and secret != WUILT_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    body = await request.json()
    logger.info(f"[Wuilt Webhook] Received: {body}")

    # 2. Extract the order from the payload
    payload = body.get("payload") or body
    order   = payload.get("order") or payload

    # 3. Only process DELIVERED orders
    shipping_status = order.get("shippingStatus", "")
    if shipping_status != "DELIVERED":
        return {"status": "ignored", "reason": f"shippingStatus={shipping_status}"}

    # 4. Process
    try:
        result = _process_delivered_order(order, db)
        logger.info(f"[Wuilt] Created {len(result['serials_created'])} serial(s) for order {result['order']}")
        return {"status": "ok", **result}
    except Exception as e:
        logger.error(f"[Wuilt Webhook] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GraphQL Queries ─────────────────────────────────────────────────────────
# Confirmed field names from Wuilt store-docs.wuilt.com API reference

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
      items {
        title
        quantity
        productId
      }
    }
    pageInfo { hasNextPage }
    totalCount
  }
}
"""


def _fetch_delivered_orders_page(first: int, offset: int) -> dict:
    """Fetch one page of DELIVERED orders from Wuilt GraphQL."""
    resp = httpx.post(
        WUILT_GQL_ENDPOINT,
        headers=HEADERS,
        json={
            "query": LIST_ORDERS_QUERY,
            "variables": {
                "storeId": WUILT_STORE_ID,
                "first": first,
                "offset": offset,
            },
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _sync_all_delivered(db: Session) -> dict:
    """Pull ALL delivered orders from Wuilt and import them (background task)."""
    offset = 0
    page_size = 50
    total_synced = 0
    total_created = 0

    while True:
        data = _fetch_delivered_orders_page(page_size, offset)
        nodes = data.get("data", {}).get("ListStoreOrders", {}).get("nodes", [])
        if not nodes:
            break

        for order in nodes:
            result = _process_delivered_order(order, db)
            total_created += len(result["serials_created"])
            total_synced += 1

        has_next = data["data"]["ListStoreOrders"]["pageInfo"]["hasNextPage"]
        if not has_next:
            break
        offset += page_size

    return {"orders_synced": total_synced, "serials_created": total_created}


# ─── Admin: Sync Existing Orders ─────────────────────────────────────────────

_sync_running = False
_sync_result: dict = {}


@router.post("/wuilt/sync", dependencies=[Depends(get_current_admin)])
def sync_wuilt_orders(background_tasks: BackgroundTasks):
    """
    Admin endpoint: trigger a one-time sync of all historical DELIVERED orders from Wuilt.
    Runs in the background; poll /wuilt/sync/status to check progress.
    """
    global _sync_running, _sync_result

    if _sync_running:
        return {"status": "already_running"}

    def _run():
        global _sync_running, _sync_result
        _sync_running = True
        _sync_result = {}
        db = SessionLocal()
        try:
            _sync_result = _sync_all_delivered(db)
        except Exception as e:
            _sync_result = {"error": str(e)}
        finally:
            db.close()
            _sync_running = False

    background_tasks.add_task(_run)
    return {"status": "started"}


@router.get("/wuilt/sync/status", dependencies=[Depends(get_current_admin)])
def sync_status():
    """Check the status of the Wuilt sync background task."""
    return {
        "running": _sync_running,
        "result": _sync_result,
    }
