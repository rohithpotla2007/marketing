StockFlow WMS — Full-Stack Warehouse Management System
StockFlow WMS is a full-stack, real-time, database-driven Warehouse Management System designed for precision inventory control, order fulfillment workflows, shipment tracking, damaged/missing stock verification, stock replenishment, and operational analytics.

Table of Contents
Core Features & Workflow
System Architecture
Database Schema
Tech Stack
Demo Credentials
Quickstart & Installation
API Endpoints
Testing
Step-by-Step Hackathon Demo Scenario
Docker Deployment
Design Principles & Known Limitations
1. Core Features & Workflow
🔄 Central Source of Truth
Single Source of Truth: All modules (Inventory, Restocking, Order Placement, Tracking, Damage/Missing, Analytics) read and mutate the same central database.
Stock Reservation & Atomic Transactions:
available_quantity = quantity - reserved_quantity
Placing an order reserves quantity atomically (reserved_quantity increases).
Shipping an order deducts physical stock and releases reservation.
Damaged/missing replacements immediately verify available inventory and deduct replacement units.
Negative inventory is strictly prevented at both the database and business logic layer.
📦 Complete Warehouse Lifecycle
[ USER LOGIN ]
      │
      ▼
[ DASHBOARD ] (Real-time KPI cards, Stock Alerts, Activity Log, Quick Actions)
      │
      ├──► [ INVENTORY ] (Categorized browse, Search, Stock Status Badges)
      │
      ├──► [ RESTOCKING ] (Search item, Restock +N, Historical transaction log)
      │
      ├──► [ ORDER PLACEMENT ] (Select product, Set qty, Atomically reserve inventory)
      │         │
      │         ▼
      ├──► [ ORDERS ] (Availability-based Fulfillment Prioritization: Priority Score = min(1.0, Avail/Requested))
      │         │
      │         ▼ [ ACCEPT ORDER ]
      │
      ├──► [ ORDER TRACKING & VERIFICATION ]
      │         │
      │         ├──► [ Good = Expected Qty ] ──► [ SHIP ORDER ] ──► [ SHIPPED ]
      │         │
      │         └──► [ Damaged/Missing Detected ]
      │                   │
      │                   ▼ [ Strict Validation: Good + Damaged + Missing == Expected ]
      │              [ REPLACE STOCK ]
      │                   │ (Deducts replacement stock from inventory)
      │                   ▼
      │              [ SHIP ORDER ] ──► [ SHIPPED ]
      │
      ├──► [ DAMAGED & MISSING ] (Audit log of damaged/missing units, statuses, and totals)
      ├──► [ LOW STOCK & OUT OF STOCK ] (Active alerts + 1-click Restock shortcuts)
      └──► [ ANALYSIS ] (Interactive Recharts: Demand, Stock Health, Restock Trends, Damage Breakdown)
2. System Architecture
┌─────────────────────────────────────────────────────────────────────────┐
│                          StockFlow WMS Client                           │
│     React 18 + TypeScript + Vite + Tailwind CSS + Lucide + Recharts     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST / JSON + JWT Bearer
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Backend                               │
│  ├── Auth & JWT Middleware (bcrypt hashing, role-based claims)         │
│  ├── Order Prioritization Engine (Fulfillment Ratio Prioritization)     │
│  ├── Atomic Inventory Manager (Row-level Locking with with_for_update)  │
│  ├── Activity & Audit Logger (System-wide event tracking)               │
│  └── Analytics & Aggregations Service                                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ SQLAlchemy ORM
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Relational Database Layer                          │
│     SQLite (Local Development Fallback) / PostgreSQL (Production)       │
│  ├── users                   ├── order_verifications                    │
│  ├── categories              ├── damage_missing_records                 │
│  ├── products                ├── replacement_transactions               │
│  ├── orders                  ├── shipments                              │
│  ├── order_items             └── activity_logs                          │
│  ├── restock_transactions                                               │
│  └── inventory_transactions                                             │
└─────────────────────────────────────────────────────────────────────────┘
3. Database Schema
Table Name	Primary Purpose	Key Fields
users	User credentials & roles	id, username, email, role, hashed_password
categories	Product classification	id, name, code, description
products	Central inventory catalog	id, product_code, name, category_id, image_url, quantity, reserved_quantity, low_stock_threshold
orders	Customer/Internal orders	id, order_number, user_id, status, priority_score, notes, created_at
order_items	Products per order	id, order_id, product_id, quantity_ordered
restock_transactions	Restock audit history	id, product_id, quantity_added, previous_quantity, new_quantity, user_id, created_at
inventory_transactions	Universal ledger of all stock mutations	id, product_id, transaction_type, quantity, previous_qty, new_qty, order_id, user_id
order_verifications	Item inspection results	id, order_id, product_id, expected_quantity, good_quantity, damaged_quantity, missing_quantity
damage_missing_records	Damage/missing items backlog	id, order_id, product_id, damaged_quantity, missing_quantity, status (REPORTED/REPLACED)
replacement_transactions	Inventory issued for replacements	id, order_id, product_id, quantity_replaced, previous_qty, new_qty, replaced_at
shipments	Final dispatched orders	id, order_id, tracking_number, shipped_at, user_id
activity_logs	Audit trail of all system events	id, action, entity, entity_id, user_name, details, created_at
4. Tech Stack
Frontend:
React 18, TypeScript, Vite
Tailwind CSS (Dark theme warehouse UI)
Lucide React Icons
Recharts (Interactive charts & real-time analytics)
Axios + React Router v6
Backend:
Python 3.11+, FastAPI, Uvicorn
SQLAlchemy 2.0 ORM, Pydantic v2
Passlib (bcrypt password hashing)
Python-Jose (JWT authentication)
Database:
SQLite (Zero-config local development)
PostgreSQL (Production container support via Docker Compose)
5. Demo Credentials
The database comes pre-seeded with realistic products across 8 categories, orders, transactions, and the following accounts:

Username	Password	Role	Access Level
admin	admin123	Admin	Full Warehouse & Management Access
warehouse	warehouse123	Warehouse Staff	Operations, Restocking, Packing & Verification
6. Quickstart & Installation
Option A: Local Development (Fast & Zero Config)
1. Backend Setup:
# Navigate to project root
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database seeder (seeds users, categories, products, orders, history)
python seed.py

# Start FastAPI server (Runs on http://localhost:8000)
python -m uvicorn app.main:app --reload --port 8000
2. Frontend Setup:
# In a new terminal from project root
cd frontend

# Install dependencies
npm install

# Start Vite dev server (Runs on http://localhost:5173)
npm run dev
Visit http://localhost:5173 and log in with admin / admin123.

7. API Endpoints
Authentication
POST /api/auth/login — Login with username & password, returns JWT token and user details.
GET /api/auth/me — Retrieve current authenticated session profile.
Products & Categories
GET /api/categories — List all 8 product categories.
GET /api/products — Filter products by category, status (IN STOCK, LOW STOCK, OUT OF STOCK), and search query.
GET /api/products/{id} — Get single product details.
POST /api/products — Create a new product.
PUT /api/products/{id} — Update product attributes and low-stock threshold.
Restocking
POST /api/restocks — Restock product by quantity. Atomic inventory increment + activity log.
GET /api/restocks — View full restocking audit history.
Orders & Priority
POST /api/orders — Place order and atomically reserve stock.
GET /api/orders — List orders sorted by Fulfillment Ratio priority score, creation date, and status filter.
GET /api/orders/{id} — Get order details.
POST /api/orders/{id}/accept — Transition order from PENDING to ACCEPTED.
Verification, Replacement & Shipment
POST /api/orders/{id}/verify — Validate item condition (good + damaged + missing == expected).
POST /api/orders/{id}/replace — Deduct replacement stock from available inventory and record replacement transaction.
POST /api/orders/{id}/ship — Deduct physical stock, release reservation, generate tracking number, and mark as SHIPPED.
Monitoring & Analytics
GET /api/inventory/low-stock — Products with stock 
≤
 threshold.
GET /api/inventory/out-of-stock — Products with available quantity 
=
0
.
GET /api/damaged-missing — Damaged and missing items audit log.
GET /api/analytics — Real-time aggregated statistics for all charts.
GET /api/activity — Real-time warehouse activity timeline.
8. Testing
Run the automated backend test suite covering authentication, stock transactions, order placement, order prioritization, verification, replacement, and shipment:

python -m pytest backend/tests -v
All 8 comprehensive test cases validate:

test_login_success
test_get_categories_and_products
test_restock_product
test_place_order_and_reserve
test_order_prioritization
test_order_verification_and_replacement
test_ship_order
test_analytics_and_monitoring
9. Step-by-Step Hackathon Demo Scenario
Follow this live demo sequence to showcase the system:

Login: Sign in as admin (admin123).
Dashboard Overview: Inspect live summary cards (Total Units, Low Stock, Pending Orders, Damaged Items) and recent activity stream.
Inventory: Browse categories (e.g. Electronics, Mobiles, Groceries), use the search bar, and inspect dynamic status badges (IN STOCK, LOW STOCK, OUT OF STOCK).
Restocking:
Navigate to Restocking (or click RESTOCK shortcut on any low-stock item).
Search for a low-stock item (e.g. USB-C Cable).
Add 20 units 
→
 click RESTOCK PRODUCT.
Notice immediate status update from LOW STOCK 
→
 IN STOCK, updated transaction log, and refreshed dashboard stats.
Order Placement:
Navigate to Order Placement.
Select product and quantity (e.g. 5 units of Mechanical Gaming Keyboard).
Click PLACE ORDER. Stock is immediately reserved in inventory atomically.
Orders & Prioritization:
Navigate to Orders.
Observe the Fulfillment Ratio Priority Score badges (orders with 100% available stock get highest priority).
Click ACCEPT ORDER on the pending order. The order moves to ACCEPTED.
Order Tracking & Verification:
Navigate to Order Tracking.
Inspect the accepted order items.
Enter a verification with a defect: e.g. for 5 units 
→
 Good: 3, Damaged: 1, Missing: 1 (
3
+
1
+
1
=
5
).
Click SAVE VERIFICATION.
Click REPLACE DEFECTS: System checks available inventory, deducts replacement stock, records transaction, and clears the replacement backlog.
Click SHIP ORDER: Generates tracking number TRK-ORD-... and marks order as SHIPPED.
Damaged & Missing:
Open Damaged & Missing page.
Review the newly reported and resolved damage/missing incident logs with aggregated totals.
Low Stock & Out of Stock:
Open Low Stock & Out of Stock page.
Toggle between Low Stock and Out of Stock tabs to view items needing replenishment.
Analysis:
Open Analysis page.
Inspect real-time charts populated dynamically from DB:
Products by Category (Bar chart)
Inventory Status Distribution (Donut chart)
Orders Over Time (Line chart)
Most Ordered Products (Bar chart)
Damaged vs Missing by Category (Bar chart)
Restocking Activity (Bar chart)
10. Docker Deployment
To launch the entire stack (PostgreSQL + FastAPI + React Vite frontend) in Docker:

docker-compose up --build
Frontend: http://localhost:5173 (or http://localhost)
Backend API: http://localhost:8000
API Docs (Swagger): http://localhost:8000/docs
11. Design Principles & Known Limitations
No AI dependencies: The system is 100% deterministic, robust, and fast, built specifically for practical warehouse logistics.
Transaction Safety: All stock-modifying endpoints execute within atomic database transactions with row-level locks where applicable.
Configurable Application Name: Set APP_NAME in backend/app/config.py or via .env.
Extensible: Ready for Barcode/QR scanning hardware integration via the product search and tracking APIs.
