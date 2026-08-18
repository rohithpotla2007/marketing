from pydantic import BaseModel, Field
from typing import Optional
import datetime

class ItemVerificationInput(BaseModel):
    product_id: int
    damaged_quantity: int = Field(0, ge=0)
    missing_quantity: int = Field(0, ge=0)
    notes: Optional[str] = None

class OrderVerificationRequest(BaseModel):
    items: list[ItemVerificationInput] = Field(..., min_length=1)

class VerificationItemOut(BaseModel):
    id: Optional[int] = None
    product_id: int
    product_name: str
    product_code: str
    product_image: Optional[str] = None
    expected_quantity: int
    good_quantity: int
    damaged_quantity: int
    missing_quantity: int
    is_replaced: bool
    needs_replacement: bool
    replacement_quantity_needed: int
    available_stock_in_warehouse: int

class OrderTrackingOut(BaseModel):
    order_id: int
    order_number: str
    status: str
    created_at: datetime.datetime
    total_expected: int
    total_good: int
    total_damaged: int
    total_missing: int
    is_verified: bool
    can_ship: bool
    has_pending_replacement: bool
    items: list[VerificationItemOut]

class ReplacementRequest(BaseModel):
    product_id: int
    reason: Optional[str] = None

class ReplacementResponse(BaseModel):
    success: bool
    order_id: int
    product_id: int
    product_name: str
    quantity_replaced: int
    previous_quantity: int
    new_quantity: int
    message: str

class ShipmentRequest(BaseModel):
    notes: Optional[str] = None

class ShipmentOut(BaseModel):
    id: int
    order_id: int
    order_number: str
    tracking_number: str
    shipped_by: str
    shipped_at: datetime.datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True
