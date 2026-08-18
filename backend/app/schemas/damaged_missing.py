from pydantic import BaseModel
from typing import Optional
import datetime

class DamageMissingOut(BaseModel):
    id: int
    order_id: int
    order_number: str
    product_id: int
    product_name: str
    product_code: str
    product_image: Optional[str] = None
    category_name: Optional[str] = None
    damaged_quantity: int
    missing_quantity: int
    total_affected: int
    status: str
    reported_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DamageMissingSummary(BaseModel):
    total_damaged_items: int
    total_missing_items: int
    total_affected_items: int
    total_records: int
    items: list[DamageMissingOut] = []
