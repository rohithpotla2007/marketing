from pydantic import BaseModel
from typing import Optional
import datetime

class AuditLogOut(BaseModel):
    id: int
    action: str
    user_id: Optional[int] = None
    username: str
    entity: str
    entity_id: Optional[str] = None
    details: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DashboardSummaryOut(BaseModel):
    total_products: int
    total_units: int
    low_stock_items: int
    out_of_stock_items: int
    pending_orders: int
    ready_orders: int
    shipped_orders: int
    damaged_items: int
    missing_items: int
    recent_activities: list[AuditLogOut] = []
