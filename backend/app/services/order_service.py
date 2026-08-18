import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.verification import OrderVerification
from app.models.transaction import InventoryTransaction
from app.services.audit_service import log_activity
from app.schemas.order import OrderCreateRequest, OrderOut, OrderItemOut, OrderListResponse
from typing import Optional

def generate_order_number(db: Session) -> str:
    count = db.query(Order).count()
    return f"ORD-{1001 + count}"

def calculate_order_priority(order: Order) -> tuple[float, str]:
    """
    Calculate availability score / fulfillment ratio for prioritization.
    fulfillment_ratio = available_quantity / requested_quantity (capped at 1.0)
    """
    if not order.items:
        return 0.0, "Empty (0%)"
    
    ratios = []
    for item in order.items:
        avail = item.product.available_quantity if item.product else 0
        req = item.quantity_requested
        if req <= 0:
            ratio = 1.0
        else:
            ratio = min(1.0, avail / req)
        ratios.append(ratio)
        
    avg_ratio = sum(ratios) / len(ratios)
    percent = int(avg_ratio * 100)
    
    if avg_ratio >= 0.999:
        label = "High Priority (100% Available)"
    elif avg_ratio >= 0.5:
        label = f"Medium Priority ({percent}% Available)"
    elif avg_ratio > 0:
        label = f"Low Priority ({percent}% Available)"
    else:
        label = "Unavailable (0% Stock)"
        
    return round(avg_ratio, 3), label

def create_order(
    db: Session,
    request: OrderCreateRequest,
    user_id: int,
    username: str
) -> OrderOut:
    if not request.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item"
        )
        
    total_items = len(request.items)
    total_qty = 0
    
    # Pre-validate all items and stock
    for item in request.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested quantity must be greater than 0"
            )
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product ID {item.product_id} not found"
            )
        if product.available_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient available stock for '{product.name}'. Available: {product.available_quantity}, Requested: {item.quantity}"
            )
        total_qty += item.quantity
        
    order_number = generate_order_number(db)
    
    # Create the Order
    order = Order(
        order_number=order_number,
        user_id=user_id,
        status="PENDING",
        total_items=total_items,
        total_quantity=total_qty,
        notes=request.notes
    )
    db.add(order)
    db.flush()
    
    # Process items and reserve stock
    for item in request.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        
        # Reserve stock
        product.reserved_quantity += item.quantity
        
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity_requested=item.quantity,
            quantity_fulfilled=0
        )
        db.add(order_item)
        
        # Record inventory transaction for reservation
        inv_tx = InventoryTransaction(
            product_id=product.id,
            transaction_type="ORDER_RESERVED",
            quantity_change=0,  # Physical stock unchanged, reservation increased
            previous_quantity=product.quantity,
            new_quantity=product.quantity,
            reference_id=order.order_number,
            reference_type="Order",
            user_id=user_id,
            notes=f"Reserved {item.quantity} units for Order {order.order_number}"
        )
        db.add(inv_tx)
        
    log_activity(
        db,
        action="ORDER_CREATED",
        username=username,
        user_id=user_id,
        entity="Order",
        entity_id=order.order_number,
        details=f"Created order {order.order_number} with {total_items} items (Total: {total_qty} units) - Status: PENDING"
    )
    
    db.commit()
    db.refresh(order)
    
    return format_order_out(order)

def get_orders(
    db: Session,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> OrderListResponse:
    query = db.query(Order)
    
    if status_filter:
        query = query.filter(Order.status == status_filter.upper())
        
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.join(Order.user).filter(
            or_(
                Order.order_number.ilike(search_pattern),
                Order.notes.ilike(search_pattern)
            )
        )
        
    orders = query.all()
    
    # Calculate priority and prepare list
    order_items_list = []
    for o in orders:
        ratio, label = calculate_order_priority(o)
        order_items_list.append((o, ratio, label))
        
    # Sort orders:
    # 1. Fulfillment ratio descending (higher ratio first)
    # 2. Created_at ascending (FIFO for same ratio)
    # 3. ID ascending
    order_items_list.sort(
        key=lambda x: (
            -x[1],
            x[0].created_at,
            x[0].id
        )
    )
    
    total = len(order_items_list)
    paged = order_items_list[skip : skip + limit]
    
    formatted_orders = [format_order_out(o, ratio, label) for o, ratio, label in paged]
    return OrderListResponse(total=total, items=formatted_orders)

def get_order_by_id(db: Session, order_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found"
        )
    return order

def accept_order(
    db: Session,
    order_id: int,
    user_id: int,
    username: str
) -> OrderOut:
    order = get_order_by_id(db, order_id)
    
    if order.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order {order.order_number} cannot be accepted because it is in '{order.status}' status"
        )
        
    order.status = "ACCEPTED"
    order.updated_at = datetime.datetime.utcnow()
    
    # Initialize verifications for tracking module if not already created
    for item in order.items:
        existing_ver = db.query(OrderVerification).filter(
            OrderVerification.order_id == order.id,
            OrderVerification.product_id == item.product_id
        ).first()
        if not existing_ver:
            verification = OrderVerification(
                order_id=order.id,
                product_id=item.product_id,
                expected_quantity=item.quantity_requested,
                good_quantity=item.quantity_requested,
                damaged_quantity=0,
                missing_quantity=0,
                is_replaced=False,
                verified_by_user_id=user_id,
                notes="Initial verification ready for inspection"
            )
            db.add(verification)
            
    log_activity(
        db,
        action="ORDER_ACCEPTED",
        username=username,
        user_id=user_id,
        entity="Order",
        entity_id=order.order_number,
        details=f"Order {order.order_number} accepted and moved to Order Placement & Tracking for verification"
    )
    
    db.commit()
    db.refresh(order)
    return format_order_out(order)

def format_order_out(order: Order, ratio: Optional[float] = None, label: Optional[str] = None) -> OrderOut:
    if ratio is None or label is None:
        ratio, label = calculate_order_priority(order)
        
    items_out = []
    for item in order.items:
        p = item.product
        items_out.append(OrderItemOut(
            id=item.id,
            product_id=item.product_id,
            product_name=p.name if p else "Unknown Product",
            product_code=p.product_code if p else "N/A",
            product_image=p.image_url if p else None,
            category_name=p.category.name if (p and p.category) else "General",
            quantity_requested=item.quantity_requested,
            quantity_fulfilled=item.quantity_fulfilled,
            available_quantity=p.available_quantity if p else 0
        ))
        
    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        user_id=order.user_id,
        username=order.user.username if order.user else "System",
        status=order.status,
        total_items=order.total_items,
        total_quantity=order.total_quantity,
        fulfillment_ratio=ratio,
        priority_label=label,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items_out
    )
