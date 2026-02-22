from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ─── User Schemas ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Product Schemas ─────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    specs: Optional[str] = None
    warranty_months: int = 12


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    specs: Optional[str] = None
    warranty_months: Optional[int] = None


class ProductOut(BaseModel):
    id: int
    name: str
    image_url: Optional[str]
    specs: Optional[str]
    warranty_months: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Maintenance Schemas ─────────────────────────────────────────────────────────

class MaintenanceOut(BaseModel):
    id: int
    technician_name: Optional[str]
    fault_type: Optional[str]
    parts_replaced: Optional[str]
    report_date: date
    resolved_date: Optional[date]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceCreate(BaseModel):
    serial_id: int
    ticket_id: Optional[int] = None
    technician_name: Optional[str] = None
    fault_type: Optional[str] = None
    parts_replaced: Optional[str] = None  # JSON array string
    report_date: date
    resolved_date: Optional[date] = None
    notes: Optional[str] = None


# ─── Serial Schemas ──────────────────────────────────────────────────────────────

class SerialLookupResult(BaseModel):
    serial_number: str
    warranty_status: str
    product: ProductOut
    customer_name: Optional[str]
    purchase_date: Optional[date]
    activation_date: Optional[datetime]
    warranty_months: int
    days_total: int
    days_remaining: int
    days_used: int
    progress_percent: float
    maintenance_history: List[MaintenanceOut]

    model_config = {"from_attributes": True}


class SerialCreate(BaseModel):
    product_id: int
    count: int = 1  # how many serials to generate
    notes: Optional[str] = None


class SerialActivate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    purchase_date: date


class SerialOut(BaseModel):
    id: int
    serial_number: str
    warranty_status: str
    product_id: int
    user_id: Optional[int]
    purchase_date: Optional[date]
    activation_date: Optional[datetime]
    qr_code_url: Optional[str]
    notes: Optional[str]
    created_at: datetime
    product: Optional[ProductOut]
    user: Optional[UserOut]

    model_config = {"from_attributes": True}


# ─── Ticket Schemas ──────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    serial_number: str
    title: str
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: str  # open | in_progress | resolved | closed


class AttachmentOut(BaseModel):
    id: int
    file_url: str
    uploaded_at: datetime
    model_config = {"from_attributes": True}


class TicketOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    serial: Optional[SerialOut]
    user: Optional[UserOut]
    attachments: List[AttachmentOut] = []

    model_config = {"from_attributes": True}


# ─── Auth Schemas ────────────────────────────────────────────────────────────────

class AdminLoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OTPRequest(BaseModel):
    contact: str  # phone or email


class OTPVerify(BaseModel):
    contact: str
    code: str
    name: Optional[str] = None  # required on first-time login
