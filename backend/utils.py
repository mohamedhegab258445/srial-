import httpx
import logging
import os
import re

logger = logging.getLogger(__name__)

def normalize_phone(phone: str) -> str:
    """01xxxxxxxxx → 201xxxxxxxxx"""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("0") and len(digits) == 11:
        digits = "2" + digits
    return digits


def send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Generic function to send a WhatsApp message via UltraMsg.
    """
    to = normalize_phone(phone)

    instance = os.getenv("ULTRAMSG_INSTANCE", "")
    token    = os.getenv("ULTRAMSG_TOKEN", "")

    if not instance or not token:
        logger.info(f"UltraMsg not configured. Mock sending to {to}: {message}")
        return False

    try:
        r = httpx.post(
            f"https://api.ultramsg.com/{instance}/messages/chat",
            data={"token": token, "to": to, "body": message, "priority": "10"},
            timeout=10,
        )
        result = r.json()
        if result.get("sent") == "true" or result.get("id"):
            logger.info(f"UltraMsg sent message to {to}")
            return True
        else:
            logger.warning(f"UltraMsg error: {r.text}")
            return False
    except Exception as e:
        logger.warning(f"UltraMsg request failed: {e}")
        return False
