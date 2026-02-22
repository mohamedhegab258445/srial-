"""Seed script - adds sample product and serials for testing."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import Product, Serial, User, AdminUser
from auth import hash_password
import uuid

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Admin
if not db.query(AdminUser).filter(AdminUser.username == "admin").first():
    db.add(AdminUser(username="admin", password_hash=hash_password("admin123")))
    print("Created admin: admin / admin123")

# Sample Product
product = db.query(Product).filter(Product.name == "Smart Air Fryer Pro").first()
if not product:
    product = Product(
        name="Smart Air Fryer Pro",
        image_url=None,
        specs='{"capacity": "5L", "power": "1500W", "color": "Black"}',
        warranty_months=24,
    )
    db.add(product)
    db.flush()
    print(f"Created product: {product.name}")

# Sample Serials
for i in range(5):
    sn = f"SRL-DEMO{str(i+1).zfill(4)}"
    if not db.query(Serial).filter(Serial.serial_number == sn).first():
        s = Serial(
            serial_number=sn,
            product_id=product.id,
            qr_code_url=f"/api/serials/{sn}/qr",
            warranty_status="inactive",
        )
        db.add(s)
        print(f"  Created serial: {sn}")

# Sample Customer + Active Warranty
from datetime import date, datetime, timezone
user = db.query(User).filter(User.phone == "01012345678").first()
if not user:
    user = User(name="Ahmed Mohamed", phone="01012345678", email="ahmed@example.com")
    db.add(user)
    db.flush()

activated_serial = db.query(Serial).filter(Serial.serial_number == "SRL-DEMO0001").first()
if activated_serial and activated_serial.warranty_status == "inactive":
    activated_serial.user_id = user.id
    activated_serial.purchase_date = date(2025, 6, 1)
    activated_serial.activation_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
    activated_serial.warranty_status = "active"
    print("Activated SRL-DEMO0001 for Ahmed Mohamed")

db.commit()
db.close()
print("\n✅ Seed complete! Test serial: SRL-DEMO0001")
