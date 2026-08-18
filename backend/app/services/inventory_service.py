from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.product import Product
from app.models.category import Category
from app.models.transaction import RestockTransaction, InventoryTransaction
from app.services.audit_service import log_activity
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.restock import RestockResponse, RestockTransactionOut
from typing import Optional

def get_products(
    db: Session,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(Product)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
        
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.join(Product.category).filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.product_code.ilike(search_pattern),
                Category.name.ilike(search_pattern),
                Product.description.ilike(search_pattern)
            )
        )
    
    all_products = query.order_by(Product.id.asc()).all()
    
    # Filter by calculated status if requested
    if status_filter:
        status_filter_upper = status_filter.upper()
        all_products = [p for p in all_products if p.status == status_filter_upper]
        
    total = len(all_products)
    paged_products = all_products[skip : skip + limit]
    
    return total, paged_products

def get_product_by_id(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {product_id} not found")
    return product

def create_product(db: Session, data: ProductCreate, user_id: int, username: str) -> Product:
    # Check if product_code exists
    existing = db.query(Product).filter(Product.product_code == data.product_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product code '{data.product_code}' already exists")
    
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
    product = Product(
        product_code=data.product_code,
        name=data.name,
        description=data.description,
        category_id=data.category_id,
        image_url=data.image_url,
        quantity=data.quantity,
        reserved_quantity=0,
        low_stock_threshold=data.low_stock_threshold
    )
    db.add(product)
    db.flush()
    
    if data.quantity > 0:
        inv_tx = InventoryTransaction(
            product_id=product.id,
            transaction_type="INITIAL_STOCK",
            quantity_change=data.quantity,
            previous_quantity=0,
            new_quantity=data.quantity,
            reference_id=f"INIT-{product.id}",
            reference_type="Product",
            user_id=user_id,
            notes="Initial stock upon product creation"
        )
        db.add(inv_tx)
        
    log_activity(
        db,
        action="PRODUCT_CREATED",
        username=username,
        user_id=user_id,
        entity="Product",
        entity_id=str(product.id),
        details=f"Created product {product.name} ({product.product_code}) with initial quantity {data.quantity}"
    )
    db.commit()
    db.refresh(product)
    return product

def update_product(db: Session, product_id: int, data: ProductUpdate, user_id: int, username: str) -> Product:
    product = get_product_by_id(db, product_id)
    
    if data.name is not None:
        product.name = data.name
    if data.description is not None:
        product.description = data.description
    if data.category_id is not None:
        product.category_id = data.category_id
    if data.image_url is not None:
        product.image_url = data.image_url
    if data.low_stock_threshold is not None:
        product.low_stock_threshold = data.low_stock_threshold
        
    log_activity(
        db,
        action="PRODUCT_UPDATED",
        username=username,
        user_id=user_id,
        entity="Product",
        entity_id=str(product.id),
        details=f"Updated product details for {product.name}"
    )
    db.commit()
    db.refresh(product)
    return product

def restock_product(
    db: Session,
    product_id: int,
    quantity_added: int,
    user_id: int,
    username: str,
    notes: Optional[str] = None
) -> RestockResponse:
    if quantity_added <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restock quantity must be greater than 0"
        )
        
    product = get_product_by_id(db, product_id)
    prev_qty = product.quantity
    prev_status = product.status
    new_qty = prev_qty + quantity_added
    
    # Update inventory
    product.quantity = new_qty
    
    # Record restock transaction
    restock_tx = RestockTransaction(
        product_id=product.id,
        quantity_added=quantity_added,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        user_id=user_id,
        notes=notes
    )
    db.add(restock_tx)
    
    # Record general inventory audit transaction
    inv_tx = InventoryTransaction(
        product_id=product.id,
        transaction_type="RESTOCK",
        quantity_change=quantity_added,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reference_id=str(restock_tx.id or "RESTOCK"),
        reference_type="RestockTransaction",
        user_id=user_id,
        notes=notes or f"Restocked +{quantity_added} units"
    )
    db.add(inv_tx)
    
    # Log to audit trail
    log_activity(
        db,
        action="RESTOCK",
        username=username,
        user_id=user_id,
        entity="Inventory",
        entity_id=str(product.id),
        details=f"Restocked {quantity_added} units of {product.name} ({prev_qty} -> {new_qty})"
    )
    
    db.commit()
    db.refresh(product)
    new_status = product.status
    
    return RestockResponse(
        product_id=product.id,
        product_name=product.name,
        product_code=product.product_code,
        previous_quantity=prev_qty,
        quantity_added=quantity_added,
        new_quantity=new_qty,
        previous_status=prev_status,
        new_status=new_status,
        message=f"Successfully restocked {quantity_added} units of {product.name}. Stock updated from {prev_qty} to {new_qty} ({prev_status} -> {new_status})."
    )

def get_restock_history(db: Session, limit: int = 50) -> list[RestockTransactionOut]:
    txs = db.query(RestockTransaction).order_by(RestockTransaction.created_at.desc()).limit(limit).all()
    results = []
    for tx in txs:
        results.append(RestockTransactionOut(
            id=tx.id,
            product_id=tx.product_id,
            product_name=tx.product.name if tx.product else "Unknown",
            product_code=tx.product.product_code if tx.product else "N/A",
            quantity_added=tx.quantity_added,
            previous_quantity=tx.previous_quantity,
            new_quantity=tx.new_quantity,
            username=tx.user.username if tx.user else "System",
            notes=tx.notes,
            created_at=tx.created_at
        ))
    return results

def get_low_stock_products(db: Session) -> list[Product]:
    products = db.query(Product).filter(
        Product.quantity > 0,
        Product.quantity <= Product.low_stock_threshold
    ).order_by(Product.quantity.asc()).all()
    return products

def get_out_of_stock_products(db: Session) -> list[Product]:
    products = db.query(Product).filter(
        Product.quantity == 0
    ).order_by(Product.name.asc()).all()
    return products
