import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.verification import OrderVerification, DamageMissingRecord
from app.models.transaction import ReplacementTransaction, InventoryTransaction
from app.models.shipment import Shipment
from app.services.audit_service import log_activity
from app.schemas.tracking import (
    OrderVerificationRequest,
    OrderTrackingOut,
    VerificationItemOut,
    ReplacementResponse,
    ShipmentOut
)
from typing import Optional

def get_tracking_orders(db: Session, search: Optional[str] = None) -> list[OrderTrackingOut]:
    """Get all orders currently in ACCEPTED or PROCESSING verification status."""
    query = db.query(Order).filter(Order.status.in_(["ACCEPTED", "PROCESSING"]))
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(Order.order_number.ilike(search_pattern))
    orders = query.order_by(Order.updated_at.desc()).all()
    return [format_tracking_order_out(db, o) for o in orders]

def get_tracking_order_by_id(db: Session, order_id: int) -> OrderTrackingOut:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found"
        )
    return format_tracking_order_out(db, order)

def format_tracking_order_out(db: Session, order: Order) -> OrderTrackingOut:
    items_out: list[VerificationItemOut] = []
    
    total_expected = 0
    total_good = 0
    total_damaged = 0
    total_missing = 0
    has_unreplaced_issues = False
    
    for item in order.items:
        p = item.product
        expected = item.quantity_requested
        total_expected += expected
        
        verification = db.query(OrderVerification).filter(
            OrderVerification.order_id == order.id,
            OrderVerification.product_id == item.product_id
        ).first()
        
        if verification:
            good = verification.good_quantity
            damaged = verification.damaged_quantity
            missing = verification.missing_quantity
            is_replaced = verification.is_replaced
            v_id = verification.id
        else:
            good = expected
            damaged = 0
            missing = 0
            is_replaced = False
            v_id = None
            
        total_good += good
        total_damaged += damaged
        total_missing += missing
        
        replacement_needed = (damaged + missing) if not is_replaced else 0
        needs_replacement = (damaged + missing > 0) and not is_replaced
        if needs_replacement:
            has_unreplaced_issues = True
            
        items_out.append(VerificationItemOut(
            id=v_id,
            product_id=item.product_id,
            product_name=p.name if p else "Unknown",
            product_code=p.product_code if p else "N/A",
            product_image=p.image_url if p else None,
            expected_quantity=expected,
            good_quantity=good,
            damaged_quantity=damaged,
            missing_quantity=missing,
            is_replaced=is_replaced,
            needs_replacement=needs_replacement,
            replacement_quantity_needed=replacement_needed,
            available_stock_in_warehouse=p.available_quantity if p else 0
        ))
        
    is_verified = (len(items_out) > 0 and all(i.id is not None for i in items_out))
    # Can ship if verified and no unresolved damaged/missing items without replacement
    can_ship = (order.status in ["ACCEPTED", "PROCESSING"]) and not has_unreplaced_issues
    
    return OrderTrackingOut(
        order_id=order.id,
        order_number=order.order_number,
        status=order.status,
        created_at=order.created_at,
        total_expected=total_expected,
        total_good=total_good,
        total_damaged=total_damaged,
        total_missing=total_missing,
        is_verified=is_verified,
        can_ship=can_ship,
        has_pending_replacement=has_unreplaced_issues,
        items=items_out
    )

def verify_order_items(
    db: Session,
    order_id: int,
    request: OrderVerificationRequest,
    user_id: int,
    username: str
) -> OrderTrackingOut:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if order.status not in ["ACCEPTED", "PROCESSING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be verified in status '{order.status}'"
        )
        
    for item_input in request.items:
        order_item = db.query(OrderItem).filter(
            OrderItem.order_id == order.id,
            OrderItem.product_id == item_input.product_id
        ).first()
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product ID {item_input.product_id} does not belong to order {order.order_number}"
            )
            
        expected = order_item.quantity_requested
        damaged = item_input.damaged_quantity
        missing = item_input.missing_quantity
        
        # Strict validation
        if damaged < 0 or missing < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Damaged and missing quantities must be non-negative"
            )
        if damaged + missing > expected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation failed for '{order_item.product.name}': Damaged ({damaged}) + Missing ({missing}) = {damaged + missing}, which exceeds expected quantity ({expected})."
            )
            
        good = expected - (damaged + missing)
        
        # Check existing verification
        ver = db.query(OrderVerification).filter(
            OrderVerification.order_id == order.id,
            OrderVerification.product_id == item_input.product_id
        ).first()
        
        if not ver:
            ver = OrderVerification(
                order_id=order.id,
                product_id=item_input.product_id,
                expected_quantity=expected,
                good_quantity=good,
                damaged_quantity=damaged,
                missing_quantity=missing,
                is_replaced=False,
                verified_by_user_id=user_id,
                notes=item_input.notes
            )
            db.add(ver)
        else:
            ver.expected_quantity = expected
            ver.good_quantity = good
            ver.damaged_quantity = damaged
            ver.missing_quantity = missing
            # If changed, reset is_replaced if new damage/missing introduced
            if damaged + missing == 0:
                ver.is_replaced = False
            ver.verified_by_user_id = user_id
            ver.notes = item_input.notes
            ver.updated_at = datetime.datetime.utcnow()
            
        # Update or create DamageMissingRecord
        dm_record = db.query(DamageMissingRecord).filter(
            DamageMissingRecord.order_id == order.id,
            DamageMissingRecord.product_id == item_input.product_id
        ).first()
        
        total_affected = damaged + missing
        if total_affected > 0:
            if not dm_record:
                dm_record = DamageMissingRecord(
                    order_id=order.id,
                    product_id=item_input.product_id,
                    damaged_quantity=damaged,
                    missing_quantity=missing,
                    total_affected=total_affected,
                    status="REPORTED",
                    reported_by_user_id=user_id,
                    notes=item_input.notes
                )
                db.add(dm_record)
            else:
                dm_record.damaged_quantity = damaged
                dm_record.missing_quantity = missing
                dm_record.total_affected = total_affected
                if not ver.is_replaced:
                    dm_record.status = "REPORTED"
                dm_record.notes = item_input.notes
        elif dm_record:
            dm_record.damaged_quantity = 0
            dm_record.missing_quantity = 0
            dm_record.total_affected = 0
            dm_record.status = "RESOLVED"
            
    log_activity(
        db,
        action="VERIFICATION_DONE",
        username=username,
        user_id=user_id,
        entity="OrderVerification",
        entity_id=order.order_number,
        details=f"Completed product verification for Order {order.order_number}"
    )
    
    db.commit()
    db.refresh(order)
    return format_tracking_order_out(db, order)

def replace_damaged_missing_item(
    db: Session,
    order_id: int,
    product_id: int,
    user_id: int,
    username: str,
    reason: Optional[str] = None
) -> ReplacementResponse:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    verification = db.query(OrderVerification).filter(
        OrderVerification.order_id == order.id,
        OrderVerification.product_id == product_id
    ).first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No verification record found for this product")
        
    needed = verification.damaged_quantity + verification.missing_quantity
    if needed <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No damaged or missing units to replace")
        
    if verification.is_replaced:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Replacement has already been issued for this item")
        
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    # Check replacement availability in warehouse
    if product.available_quantity < needed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient replacement stock. Required: {needed} units, Available in warehouse: {product.available_quantity} units."
        )
        
    prev_qty = product.quantity
    new_qty = prev_qty - needed
    
    # Deduct replacement from physical inventory
    product.quantity = new_qty
    verification.is_replaced = True
    verification.good_quantity = verification.expected_quantity  # Fulfilled with replacements
    verification.updated_at = datetime.datetime.utcnow()
    
    # Update damage/missing status
    dm_record = db.query(DamageMissingRecord).filter(
        DamageMissingRecord.order_id == order.id,
        DamageMissingRecord.product_id == product.id
    ).first()
    if dm_record:
        dm_record.status = "REPLACED"
        
    # Record Replacement Transaction
    rep_tx = ReplacementTransaction(
        order_id=order.id,
        product_id=product.id,
        quantity_replaced=needed,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        user_id=user_id,
        reason=reason or f"Replaced {verification.damaged_quantity} damaged and {verification.missing_quantity} missing items for Order {order.order_number}"
    )
    db.add(rep_tx)
    
    # Record Inventory Transaction
    inv_tx = InventoryTransaction(
        product_id=product.id,
        transaction_type="REPLACEMENT_ISSUED",
        quantity_change=-needed,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reference_id=order.order_number,
        reference_type="Order",
        user_id=user_id,
        notes=f"Issued {needed} replacement units for Order {order.order_number}"
    )
    db.add(inv_tx)
    
    log_activity(
        db,
        action="REPLACEMENT_ISSUED",
        username=username,
        user_id=user_id,
        entity="Inventory",
        entity_id=str(product.id),
        details=f"Issued {needed} replacement units of '{product.name}' for Order {order.order_number}. Warehouse stock: {prev_qty} -> {new_qty}."
    )
    
    db.commit()
    db.refresh(product)
    
    return ReplacementResponse(
        success=True,
        order_id=order.id,
        product_id=product.id,
        product_name=product.name,
        quantity_replaced=needed,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        message=f"Successfully issued {needed} replacement units for {product.name}. Warehouse stock updated from {prev_qty} to {new_qty}."
    )

def ship_order(
    db: Session,
    order_id: int,
    user_id: int,
    username: str,
    notes: Optional[str] = None
) -> ShipmentOut:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if order.status == "SHIPPED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has already been shipped")
        
    if order.status not in ["ACCEPTED", "PROCESSING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be shipped from status '{order.status}'. Order must be ACCEPTED first."
        )
        
    # Check if there are unreplaced damaged or missing units
    verifications = db.query(OrderVerification).filter(OrderVerification.order_id == order.id).all()
    for ver in verifications:
        if (ver.damaged_quantity + ver.missing_quantity > 0) and not ver.is_replaced:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot ship order: Item '{ver.product.name}' has unreplaced damaged/missing units. Please issue replacement first."
            )
            
    # Process final shipment deduction
    for item in order.items:
        product = item.product
        qty = item.quantity_requested
        
        # Deduct total quantity and release reserved quantity
        prev_qty = product.quantity
        new_qty = max(0, product.quantity - qty)
        product.quantity = new_qty
        product.reserved_quantity = max(0, product.reserved_quantity - qty)
        item.quantity_fulfilled = qty
        
        # Record inventory transaction
        inv_tx = InventoryTransaction(
            product_id=product.id,
            transaction_type="ORDER_FULFILLED",
            quantity_change=-qty,
            previous_quantity=prev_qty,
            new_quantity=new_qty,
            reference_id=order.order_number,
            reference_type="Shipment",
            user_id=user_id,
            notes=f"Dispatched {qty} units for Order {order.order_number}"
        )
        db.add(inv_tx)
        
    order.status = "SHIPPED"
    order.updated_at = datetime.datetime.utcnow()
    
    tracking_no = f"TRK-{order.id:04d}-{int(datetime.datetime.utcnow().timestamp())}"
    shipment = Shipment(
        order_id=order.id,
        tracking_number=tracking_no,
        shipped_by_user_id=user_id,
        shipped_at=datetime.datetime.utcnow(),
        notes=notes
    )
    db.add(shipment)
    
    log_activity(
        db,
        action="ORDER_SHIPPED",
        username=username,
        user_id=user_id,
        entity="Order",
        entity_id=order.order_number,
        details=f"Order {order.order_number} shipped with Tracking #{tracking_no}. Inventory updated."
    )
    
    db.commit()
    db.refresh(shipment)
    
    return ShipmentOut(
        id=shipment.id,
        order_id=order.id,
        order_number=order.order_number,
        tracking_number=shipment.tracking_number,
        shipped_by=username,
        shipped_at=shipment.shipped_at,
        notes=shipment.notes
    )

def get_shipped_orders_history(db: Session, limit: int = 50) -> list[ShipmentOut]:
    shipments = db.query(Shipment).order_by(Shipment.shipped_at.desc()).limit(limit).all()
    results = []
    for s in shipments:
        results.append(ShipmentOut(
            id=s.id,
            order_id=s.order_id,
            order_number=s.order.order_number if s.order else f"ORD-{s.order_id}",
            tracking_number=s.tracking_number,
            shipped_by=s.shipped_by.username if s.shipped_by else "Staff",
            shipped_at=s.shipped_at,
            notes=s.notes
        ))
    return results
