import uvicorn
import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting StockFlow WMS backend server on http://localhost:{port}...")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
