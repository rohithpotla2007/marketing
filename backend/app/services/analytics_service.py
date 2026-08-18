from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.verification import DamageMissingRecord
from app.models.transaction import RestockTransaction
from app.schemas.analytics import (
    DashboardSummary,
    CategoryDistribution,
    StockStatusDistribution,
    OrderTimelinePoint,
    TopOrderedProduct,
    DamageVsMissingByCategory,
    RestockingTrendPoint,
    OrderStatusDistribution,
    AnalyticsDashboardResponse
)

def get_dashboard_summary(db: Session) -> DashboardSummary:
    total_products = db.query(Product).count()
    total_units = db.query(func.coalesce(func.sum(Product.quantity), 0)).scalar() or 0
    
    # Low stock & out of stock
    all_products = db.query(Product).all()
    low_stock_count = sum(1 for p in all_products if p.quantity > 0 and p.quantity <= p.low_stock_threshold)
    out_of_stock_count = sum(1 for p in all_products if p.quantity == 0)
    
    # Orders counters
    pending_orders = db.query(Order).filter(Order.status == "PENDING").count()
    ready_orders = db.query(Order).filter(Order.status.in_(["ACCEPTED", "PROCESSING"])).count()
    shipped_orders = db.query(Order).filter(Order.status == "SHIPPED").count()
    
    # Damaged & missing sums
    damaged_sum = db.query(func.coalesce(func.sum(DamageMissingRecord.damaged_quantity), 0)).scalar() or 0
    missing_sum = db.query(func.coalesce(func.sum(DamageMissingRecord.missing_quantity), 0)).scalar() or 0
    
    return DashboardSummary(
        total_products=total_products,
        total_units=int(total_units),
        low_stock_items=low_stock_count,
        out_of_stock_items=out_of_stock_count,
        pending_orders=pending_orders,
        ready_orders=ready_orders,
        shipped_orders=shipped_orders,
        damaged_items=int(damaged_sum),
        missing_items=int(missing_sum)
    )

def get_analytics_data(db: Session) -> AnalyticsDashboardResponse:
    summary = get_dashboard_summary(db)
    
    # 1. Products by Category
    categories = db.query(Category).all()
    cat_dist = []
    for c in categories:
        prods = [p for p in c.products]
        count = len(prods)
        units = sum(p.quantity for p in prods)
        cat_dist.append(CategoryDistribution(
            category=c.name,
            count=count,
            total_units=units
        ))
        
    # 2. Stock Status Distribution
    all_products = db.query(Product).all()
    status_counts = {"IN STOCK": 0, "LOW STOCK": 0, "OUT OF STOCK": 0}
    status_units = {"IN STOCK": 0, "LOW STOCK": 0, "OUT OF STOCK": 0}
    for p in all_products:
        st = p.status
        status_counts[st] = status_counts.get(st, 0) + 1
        status_units[st] = status_units.get(st, 0) + p.quantity
        
    stock_status_dist = [
        StockStatusDistribution(status=k, count=status_counts[k], total_units=status_units[k])
        for k in ["IN STOCK", "LOW STOCK", "OUT OF STOCK"]
    ]
    
    # 3. Orders Over Time (Group by YYYY-MM-DD)
    orders = db.query(Order).order_by(Order.created_at.asc()).all()
    timeline_map: dict[str, dict[str, int]] = {}
    for o in orders:
        date_str = o.created_at.strftime("%Y-%m-%d")
        if date_str not in timeline_map:
            timeline_map[date_str] = {"count": 0, "units": 0}
        timeline_map[date_str]["count"] += 1
        timeline_map[date_str]["units"] += o.total_quantity
        
    orders_over_time = [
        OrderTimelinePoint(date=k, order_count=v["count"], total_units=v["units"])
        for k, v in timeline_map.items()
    ]
    
    # 4. Top Most Ordered Products
    top_items_query = db.query(
        OrderItem.product_id,
        func.sum(OrderItem.quantity_requested).label("total_qty"),
        func.count(OrderItem.id).label("order_count")
    ).group_by(OrderItem.product_id).order_by(func.sum(OrderItem.quantity_requested).desc()).limit(7).all()
    
    most_ordered = []
    for pid, total_qty, ord_count in top_items_query:
        prod = db.query(Product).filter(Product.id == pid).first()
        if prod:
            most_ordered.append(TopOrderedProduct(
                product_id=prod.id,
                product_name=prod.name,
                category_name=prod.category.name if prod.category else "General",
                total_ordered_quantity=int(total_qty or 0),
                order_count=int(ord_count or 0)
            ))
            
    # 5. Damaged vs Missing by Category
    dm_records = db.query(DamageMissingRecord).all()
    dm_cat_map: dict[str, dict[str, int]] = {}
    for dm in dm_records:
        cat_name = dm.product.category.name if (dm.product and dm.product.category) else "General"
        if cat_name not in dm_cat_map:
            dm_cat_map[cat_name] = {"damaged": 0, "missing": 0, "total": 0}
        dm_cat_map[cat_name]["damaged"] += dm.damaged_quantity
        dm_cat_map[cat_name]["missing"] += dm.missing_quantity
        dm_cat_map[cat_name]["total"] += dm.total_affected
        
    damage_vs_missing = [
        DamageVsMissingByCategory(
            category_name=k,
            damaged_units=v["damaged"],
            missing_units=v["missing"],
            total_affected=v["total"]
        )
        for k, v in dm_cat_map.items()
    ]
    
    # If empty, add placeholder categories with 0 values for clean chart display
    if not damage_vs_missing:
        for c in categories[:4]:
            damage_vs_missing.append(DamageVsMissingByCategory(
                category_name=c.name,
                damaged_units=0,
                missing_units=0,
                total_affected=0
            ))
            
    # 6. Restocking Activity Over Time
    restocks = db.query(RestockTransaction).order_by(RestockTransaction.created_at.asc()).all()
    restock_map: dict[str, dict[str, int]] = {}
    for r in restocks:
        date_str = r.created_at.strftime("%Y-%m-%d")
        if date_str not in restock_map:
            restock_map[date_str] = {"units": 0, "count": 0}
        restock_map[date_str]["units"] += r.quantity_added
        restock_map[date_str]["count"] += 1
        
    restocking_activity = [
        RestockingTrendPoint(date=k, restocked_units=v["units"], transaction_count=v["count"])
        for k, v in restock_map.items()
    ]
    
    # 7. Orders by Status
    status_order_counts = {"PENDING": 0, "ACCEPTED": 0, "SHIPPED": 0, "CANCELLED": 0}
    for o in orders:
        st = o.status
        status_order_counts[st] = status_order_counts.get(st, 0) + 1
        
    orders_by_status = [
        OrderStatusDistribution(status=k, count=v)
        for k, v in status_order_counts.items()
    ]
    
    return AnalyticsDashboardResponse(
        summary=summary,
        categories_distribution=cat_dist,
        stock_status_distribution=stock_status_dist,
        orders_over_time=orders_over_time,
        most_ordered_products=most_ordered,
        damage_vs_missing=damage_vs_missing,
        damage_missing_totals={
            "total_damaged": summary.damaged_items,
            "total_missing": summary.missing_items,
            "total_affected": summary.damaged_items + summary.missing_items
        },
        restocking_activity=restocking_activity,
        orders_by_status=orders_by_status
    )
