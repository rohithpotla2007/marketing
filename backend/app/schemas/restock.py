from pydantic import BaseModel, Field
from typing import Optional
import datetime

class RestockRequest(BaseModel):
    product_id: int
    quantity_added: int = Field(..., gt=0, description="Quantity to add must be greater than 0")
    notes: Optional[str] = None

class RestockResponse(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    previous_quantity: int
    quantity_added: int
    new_quantity: int
    previous_status: str
    new_status: str
    message: str

class RestockTransactionOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_code: str
    quantity_added: int
    previous_quantity: int
    new_quantity: int
    username: str
    notes: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
