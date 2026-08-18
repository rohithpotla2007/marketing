from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import (
    auth,
    categories,
    products,
    restocks,
    orders,
    tracking,
    damaged_missing,
    inventory,
    analytics,
    activity,
    health
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockflow")

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Professional Warehouse Management System (WMS) API",
    version="1.0.0"
)

# CORS middleware for seamless frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(products.router, prefix=settings.API_PREFIX)
app.include_router(restocks.router, prefix=settings.API_PREFIX)
app.include_router(orders.router, prefix=settings.API_PREFIX)
app.include_router(tracking.router, prefix=settings.API_PREFIX)
app.include_router(damaged_missing.router, prefix=settings.API_PREFIX)
app.include_router(inventory.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(activity.router, prefix=settings.API_PREFIX)
app.include_router(health.router, prefix=settings.API_PREFIX)

@app.on_event("startup")
def startup_event():
    """Auto-seed demo data if database is fresh."""
    db = SessionLocal()
    try:
        from app.seed import seed_database
        seed_database(db)
    except Exception as e:
        logger.error(f"Error during startup seed: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs_url": "/docs",
        "status": "online"
    }
