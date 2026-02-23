import os
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
from dotenv import load_dotenv
import logging

load_dotenv()

# Cloudinary is configured via the CLOUDINARY_URL environment variable
# Ensure it is set before starting the app.
cloudinary_url_env = os.getenv("CLOUDINARY_URL")
if not cloudinary_url_env:
    logging.warning("CLOUDINARY_URL environment variable is missing. Image uploads will fail.")
else:
    # configuring cloudinary with environment variable
    cloudinary.config()

def upload_image_to_cloudinary(file_content: bytes, folder: str, public_id: str = None) -> str:
    """
    Uploads an image (as bytes) to Cloudinary and returns the secure URL.
    
    :param file_content: The binary content of the image file.
    :param folder: The Cloudinary folder to place the image in (e.g., 'qrcodes' or 'tickets').
    :param public_id: Optional specific name for the file.
    :return: The secure URL (https) of the uploaded image.
    """
    try:
        response = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            public_id=public_id,
            resource_type="image",
            overwrite=True
        )
        return response.get("secure_url")
    except Exception as e:
        logging.error(f"Failed to upload image to Cloudinary: {str(e)}")
        raise e
