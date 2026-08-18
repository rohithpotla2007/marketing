from pydantic import BaseModel
from typing import Optional

class CategoryDistribution(BaseModel):
    category: str
    count: int
    total_units: int

class StockStatusDistribution(BaseModel):
    status: str
    count: int
    total_units: int

class OrderTimelinePoint(BaseModel):
    date: str
    order_count: int
    total_units: int

class TopOrderedProduct(BaseModel):
    product_id: int
    product_name: str
    category_name: str
    total_ordered_quantity: int
    order_count: int

class DamageVsMissingByCategory(BaseModel):
    category_name: str
    damaged_units: int
    missing_units: int
    total_affected: int

class RestockingTrendPoint(BaseModel):
    date: str
    restocked_units: int
    transaction_count: int

class OrderStatusDistribution(BaseModel):
    status: str
    count: int

class DashboardSummary(BaseModel):
    total_products: int
    total_units: int
    low_stock_items: int
    out_of_stock_items: int
    pending_orders: int
    ready_orders: int
    shipped_orders: int
    damaged_items: int
    missing_items: int

class AnalyticsDashboardResponse(BaseModel):
    summary: DashboardSummary
    categories_distribution: list[CategoryDistribution]
    stock_status_distribution: list[StockStatusDistribution]
    orders_over_time: list[OrderTimelinePoint]
    most_ordered_products: list[TopOrderedProduct]
    damage_vs_missing: list[DamageVsMissingByCategory]
    damage_missing_totals: dict[str, int]
    restocking_activity: list[RestockingTrendPoint]
    orders_by_status: list[OrderStatusDistribution]
