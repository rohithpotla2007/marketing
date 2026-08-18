import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "StockFlow WMS"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stockflow.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "stockflow-warehouse-jwt-secret-key-2026-secure")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    LOW_STOCK_DEFAULT_THRESHOLD: int = 10
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
