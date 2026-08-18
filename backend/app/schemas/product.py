from pydantic import BaseModel, Field
from typing import Optional
import datetime

class ProductBase(BaseModel):
    product_code: str = Field(..., min_length=2)
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    category_id: int
    image_url: Optional[str] = None
    low_stock_threshold: int = Field(10, ge=1)

class ProductCreate(ProductBase):
    quantity: int = Field(0, ge=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    low_stock_threshold: Optional[int] = Field(None, ge=1)

class ProductOut(BaseModel):
    id: int
    product_code: str
    name: str
    description: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    image_url: Optional[str] = None
    quantity: int
    reserved_quantity: int
    available_quantity: int
    low_stock_threshold: int
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    total: int
    items: list[ProductOut]
