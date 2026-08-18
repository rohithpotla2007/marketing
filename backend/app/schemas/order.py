from pydantic import BaseModel, Field
from typing import Optional
import datetime

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity must be greater than 0")

class OrderCreateRequest(BaseModel):
    items: list[OrderItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_code: str
    product_image: Optional[str] = None
    category_name: Optional[str] = None
    quantity_requested: int
    quantity_fulfilled: int
    available_quantity: int

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    order_number: str
    user_id: int
    username: str
    status: str
    total_items: int
    total_quantity: int
    fulfillment_ratio: float
    priority_label: str  # "Ready (100%)", "Partial (75%)", "Unavailable (0%)"
    notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items: list[OrderItemOut] = []

    class Config:
        from_attributes = True

class OrderListResponse(BaseModel):
    total: int
    items: list[OrderOut]
