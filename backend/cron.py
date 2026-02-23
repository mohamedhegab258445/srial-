"""
Standalone script to notify users via WhatsApp about upcoming warranty expirations.
Should be run daily via a Cron Job (e.g., using Render's Cron Job feature).
"""

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
import logging

from database import SessionLocal
from models import Serial
from utils import send_whatsapp_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_expiration_check():
    db: Session = SessionLocal()
    try:
        # Find exactly 30 days from today
        target_date = date.today() + timedelta(days=30)
        logger.info(f"Looking for warranties expiring around: {target_date}")

        # Active serials
        serials = db.query(Serial).filter(
            Serial.warranty_status == "active",
            Serial.user_id.isnot(None),
            Serial.activation_date.isnot(None)
        ).all()

        count = 0
        for serial in serials:
            # Reconstruct expiration date
            exp_date = (serial.activation_date + relativedelta(months=serial.product.warranty_months)).date()
            
            # If expiration date matches exactly target_date (30 days from now)
            if exp_date == target_date:
                if serial.user and serial.user.phone:
                    phone = serial.user.phone
                    msg = (
                        f"مرحباً {serial.user.name} 👋\n\n"
                        f"نود تذكيرك بأن ضمان منتجك ({serial.product.name}) ذو الرقم التسلسلي ({serial.serial_number}) "
                        f"سينتهي بعد شهر من الآن (بتاريخ {exp_date.strftime('%Y-%m-%d')}).\n"
                        f"نتمنى لك يوماً سعيداً!"
                    )
                    success = send_whatsapp_message(phone, msg)
                    if success:
                        logger.info(f"Sent expiration notice to {phone} for serial {serial.serial_number}")
                        count += 1
                    else:
                        logger.error(f"Failed to send expiration notice to {phone}")

        logger.info(f"Cron job finished. Sent {count} notifications.")

    except Exception as e:
        logger.error(f"Error running cron job: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_expiration_check()
