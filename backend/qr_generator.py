import io
import os
import qrcode
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/qrcodes", exist_ok=True)


def generate_qr_code(serial_number: str) -> str:
    """Generate a QR PNG for a serial number. Returns the file path."""
    check_url = f"{FRONTEND_URL}/check/{serial_number}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(check_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1e1b4b", back_color="white")

    filename = f"{serial_number}.png"
    filepath = os.path.join(UPLOAD_DIR, "qrcodes", filename)
    img.save(filepath)

    return filepath


def get_qr_bytes(serial_number: str) -> bytes:
    """Return QR code image as bytes for streaming response."""
    check_url = f"{FRONTEND_URL}/check/{serial_number}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(check_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1e1b4b", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()
