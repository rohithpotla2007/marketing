from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryOut, CategoryCreate
from app.models.user import User
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=list[CategoryOut])
def get_all_categories(db: Session = Depends(get_db)):
    """List all product categories with their product counts."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    results = []
    for c in categories:
        results.append(CategoryOut(
            id=c.id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            icon_name=c.icon_name,
            product_count=len(c.products),
            created_at=c.created_at
        ))
    return results

@router.post("", response_model=CategoryOut)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new product category."""
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    category = Category(
        name=data.name,
        slug=data.slug,
        description=data.description,
        icon_name=data.icon_name
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryOut(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        icon_name=category.icon_name,
        product_count=0,
        created_at=category.created_at
    )
