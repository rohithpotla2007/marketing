from pydantic import BaseModel
from typing import Optional
import datetime

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon_name: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    product_count: Optional[int] = 0
    created_at: datetime.datetime

    class Config:
        from_attributes = True
