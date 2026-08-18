import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.verification import OrderVerification, DamageMissingRecord
from app.models.transaction import RestockTransaction, InventoryTransaction, ReplacementTransaction
from app.models.shipment import Shipment
from app.models.audit import AuditLog
from app.auth.security import get_password_hash

def get_product_svg(name: str, category_name: str, color_primary: str, color_secondary: str) -> str:
    """Generate a clean, high-resolution SVG data URI for local offline rendering."""
    short_name = name[:18]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{color_primary}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="{color_secondary}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="box" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{color_primary}"/>
      <stop offset="100%" stop-color="{color_secondary}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#g)"/>
  <circle cx="200" cy="120" r="58" fill="url(#box)" opacity="0.9"/>
  <path d="M175 105 L200 90 L225 105 L225 135 L200 150 L175 135 Z" fill="#ffffff" opacity="0.95"/>
  <path d="M200 90 L200 150 M175 105 L200 120 L225 105" stroke="{color_primary}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <rect x="60" y="210" width="280" height="28" rx="6" fill="#0f172a" opacity="0.08"/>
  <text x="200" y="228" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1e293b" text-anchor="middle">{short_name}</text>
  <text x="200" y="255" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle" letter-spacing="1">{category_name.upper()}</text>
</svg>"""
    import urllib.parse
    return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"

def seed_database(db: Session):
    """Seed initial demo users, categories, products, orders and transactions."""
    # Check if already seeded
    if db.query(User).first():
        return

    print("Seeding StockFlow WMS database with realistic demo dataset...")

    # 1. Users
    admin_user = User(
        username="admin",
        email="admin@stockflow.internal",
        full_name="Operations Director (Admin)",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    warehouse_user = User(
        username="warehouse",
        email="specialist@stockflow.internal",
        full_name="Warehouse Specialist",
        hashed_password=get_password_hash("warehouse123"),
        role="warehouse",
        is_active=True
    )
    db.add(admin_user)
    db.add(warehouse_user)
    db.flush()

    # 2. Categories
    categories_data = [
        {"name": "Electronics", "slug": "electronics", "desc": "Cables, peripherals, audio, and hardware", "icon": "Cpu", "c1": "#3b82f6", "c2": "#1d4ed8"},
        {"name": "Mobiles", "slug": "mobiles", "desc": "Smartphones, tablets, and mobile accessories", "icon": "Smartphone", "c1": "#8b5cf6", "c2": "#6d28d9"},
        {"name": "Groceries", "slug": "groceries", "desc": "Packaged food, beverages, and organic dry goods", "icon": "ShoppingBag", "c1": "#10b981", "c2": "#047857"},
        {"name": "Furniture", "slug": "furniture", "desc": "Office desks, ergonomic chairs, and storage racks", "icon": "Armchair", "c1": "#f59e0b", "c2": "#b45309"},
        {"name": "Toys", "slug": "toys", "desc": "STEM kits, puzzles, drones, and hobby sets", "icon": "Gamepad2", "c1": "#ec4899", "c2": "#be185d"},
        {"name": "Fashion", "slug": "fashion", "desc": "Safety apparel, boots, workwear, and gear", "icon": "Shirt", "c1": "#6366f1", "c2": "#4338ca"},
        {"name": "Home Appliances", "slug": "home-appliances", "desc": "Air purifiers, microwaves, and climate devices", "icon": "Tv", "c1": "#06b6d4", "c2": "#0e7490"},
        {"name": "Sports", "slug": "sports", "desc": "Fitness gear, dumbbells, mats, and accessories", "icon": "Trophy", "c1": "#14b8a6", "c2": "#0f766e"}
    ]

    cat_map = {}
    for cd in categories_data:
        c = Category(
            name=cd["name"],
            slug=cd["slug"],
            description=cd["desc"],
            icon_name=cd["icon"]
        )
        db.add(c)
        db.flush()
        cat_map[cd["name"]] = (c, cd["c1"], cd["c2"])

    # 3. Products
    # Ensure USB-C Cable has quantity=5 (LOW STOCK) for the exact demo flow
    products_raw = [
        # Electronics
        ("SKU-ELEC-001", "USB-C Cable", "Heavy-duty 100W braided USB-C fast charging cable 2m", "Electronics", 5, 10),
        ("SKU-ELEC-002", "Wireless Mouse", "2.4GHz ergonomic optical mouse with rechargeable battery", "Electronics", 35, 10),
        ("SKU-ELEC-003", "Mechanical Keyboard", "RGB compact hot-swappable mechanical typing keyboard", "Electronics", 18, 10),
        ("SKU-ELEC-004", "HDMI 2.1 Cable", "Ultra High Speed 48Gbps 8K HDR braided HDMI cord", "Electronics", 42, 10),
        ("SKU-ELEC-005", "Power Bank 20000mAh", "Dual USB-C PD fast-charge portable battery pack", "Electronics", 24, 10),
        ("SKU-ELEC-006", "Bluetooth Speaker", "IPX7 waterproof rugged portable wireless sound system", "Electronics", 12, 10),

        # Mobiles
        ("SKU-MOBL-001", "Smartphone Pro Max", "6.7-inch OLED 120Hz display with 256GB storage", "Mobiles", 15, 10),
        ("SKU-MOBL-002", "Smartphone Neo 5G", "Sleek 5G Android phone with triple camera array", "Mobiles", 8, 10),  # Low stock
        ("SKU-MOBL-003", "Smartphone Lite", "Entry level 6.1-inch reliable smartphone", "Mobiles", 0, 10),           # Out of stock
        ("SKU-MOBL-004", "Foldable Flagship Z", "Dual screen flexible folding OLED device", "Mobiles", 9, 10),        # Low stock
        ("SKU-MOBL-005", "Rugged Outdoor Phone", "IP68 drop-resistant reinforced construction mobile", "Mobiles", 14, 10),

        # Groceries
        ("SKU-GROC-001", "Organic Rolled Oats 1kg", "100% whole grain certified organic breakfast oats", "Groceries", 60, 15),
        ("SKU-GROC-002", "Arabica Coffee Beans", "Medium dark roast single-origin whole bean coffee 500g", "Groceries", 30, 10),
        ("SKU-GROC-003", "Extra Virgin Olive Oil", "Cold pressed Mediterranean pure olive oil 1L bottle", "Groceries", 22, 10),
        ("SKU-GROC-004", "Whole Grain Pasta 500g", "Durum wheat semolina artisan penne pasta", "Groceries", 45, 12),
        ("SKU-GROC-005", "Natural Honey Jar 500g", "Raw unprocessed wildflower natural liquid honey", "Groceries", 18, 10),

        # Furniture
        ("SKU-FURN-001", "Ergonomic Mesh Chair", "Adjustable lumbar support breathable office executive chair", "Furniture", 14, 10),
        ("SKU-FURN-002", "Motorized Standing Desk", "Dual motor height-adjustable solid bamboo workstation", "Furniture", 6, 8),   # Low stock
        ("SKU-FURN-003", "3-Tier Metal Shelf", "Heavy-duty industrial powder coated storage rack", "Furniture", 20, 10),
        ("SKU-FURN-004", "Office Filing Cabinet", "3-drawer lockable steel document storage unit", "Furniture", 7, 8),             # Low stock
        ("SKU-FURN-005", "Acoustic Desk Divider", "Sound absorbing fabric desk partition panel", "Furniture", 16, 10),

        # Toys
        ("SKU-TOYS-001", "STEM Robot Kit", "Programmable coding robot vehicle with sensor suite", "Toys", 25, 10),
        ("SKU-TOYS-002", "RC High-Speed Drone", "4K camera quadcopter with auto-hover stability", "Toys", 4, 10),                  # Low stock
        ("SKU-TOYS-003", "Building Blocks Architect", "1200-piece creative engineering brick set", "Toys", 32, 10),
        ("SKU-TOYS-004", "Wooden Puzzle Set", "Natural hardwood educational 3D geometric puzzle", "Toys", 19, 10),
        ("SKU-TOYS-005", "3D Magnetic Tiles", "100-piece translucent magnetic construction tiles", "Toys", 28, 10),

        # Fashion
        ("SKU-FASH-001", "Steel-Toe Work Boots", "Waterproof slip-resistant industrial protective boots", "Fashion", 16, 10),
        ("SKU-FASH-002", "High-Visibility Vest", "Class 2 reflective neon warehouse safety vest", "Fashion", 50, 15),
        ("SKU-FASH-003", "Thermal Grip Work Gloves", "Cut-resistant nitrile coated breathable gloves", "Fashion", 40, 15),
        ("SKU-FASH-004", "Heavy Duty Cargo Pants", "Ripstop fabric reinforced multi-pocket work trousers", "Fashion", 25, 10),
        ("SKU-FASH-005", "Fleece Warehouse Jacket", "Insulated windproof heavy zipper work jacket", "Fashion", 15, 10),

        # Home Appliances
        ("SKU-APPL-001", "HEPA Air Purifier", "True HEPA filtration with real-time PM2.5 air sensor", "Home Appliances", 12, 10),
        ("SKU-APPL-002", "Digital Air Fryer 5L", "Rapid convection oil-free touch screen fryer", "Home Appliances", 15, 10),
        ("SKU-APPL-003", "Smart Inverter Microwave", "1000W precision sensor reheating kitchen microwave", "Home Appliances", 5, 8), # Low stock
        ("SKU-APPL-004", "Ultrasonic Humidifier", "Cool mist quiet 4L top-fill aroma room humidifier", "Home Appliances", 22, 10),
        ("SKU-APPL-005", "Compact Dehumidifier", "Energy-star moisture extractor with auto-drain hose", "Home Appliances", 3, 6),    # Low stock

        # Sports
        ("SKU-SPRT-001", "Pro Foam Yoga Mat", "Non-slip 6mm high-density cushioned exercise mat", "Sports", 35, 10),
        ("SKU-SPRT-002", "Adjustable Dumbbell Set", "Quick-dial selector 24kg dumbbell pair", "Sports", 11, 10),
        ("SKU-SPRT-003", "Deep Tissue Massage Gun", "High-torque percussive therapy muscle recovery gun", "Sports", 18, 10),
        ("SKU-SPRT-004", "High-Bounce Basketball", "Indoor outdoor composite leather regulation size 7 ball", "Sports", 26, 10),
        ("SKU-SPRT-005", "Resistance Band Kit", "5-level stackable latex workout exercise bands with handles", "Sports", 40, 12)
    ]

    prod_map = {}
    for code, name, desc, cat_name, qty, threshold in products_raw:
        cat_obj, c1, c2 = cat_map[cat_name]
        svg_url = get_product_svg(name, cat_name, c1, c2)
        prod = Product(
            product_code=code,
            name=name,
            description=desc,
            category_id=cat_obj.id,
            image_url=svg_url,
            quantity=qty,
            reserved_quantity=0,
            low_stock_threshold=threshold
        )
        db.add(prod)
        db.flush()
        prod_map[code] = prod

    # 4. Initial Restock Transactions & Initial Audit Logs
    initial_restocks = [
        ("SKU-ELEC-002", 20, 15, 35, "Standard weekly warehouse inbound"),
        ("SKU-GROC-001", 30, 30, 60, "Direct supplier freight replenishment"),
        ("SKU-FASH-002", 25, 25, 50, "Safety equipment bulk receipt"),
        ("SKU-SPRT-001", 15, 20, 35, "Inbound fitness restocking")
    ]
    for code, added, prev, new_q, notes in initial_restocks:
        p = prod_map[code]
        rtx = RestockTransaction(
            product_id=p.id,
            quantity_added=added,
            previous_quantity=prev,
            new_quantity=new_q,
            user_id=admin_user.id,
            notes=notes,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
        )
        db.add(rtx)

    # 5. Initial Orders
    # Order 1: ORD-1001 (PENDING) - Wireless Mouse (qty 4), Mechanical Keyboard (qty 2)
    p_mouse = prod_map["SKU-ELEC-002"]
    p_kb = prod_map["SKU-ELEC-003"]
    p_mouse.reserved_quantity += 4
    p_kb.reserved_quantity += 2

    order1 = Order(
        order_number="ORD-1001",
        user_id=warehouse_user.id,
        status="PENDING",
        total_items=2,
        total_quantity=6,
        notes="High-priority customer IT department bulk workstation bundle",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=4)
    )
    db.add(order1)
    db.flush()

    db.add(OrderItem(order_id=order1.id, product_id=p_mouse.id, quantity_requested=4, quantity_fulfilled=0))
    db.add(OrderItem(order_id=order1.id, product_id=p_kb.id, quantity_requested=2, quantity_fulfilled=0))

    # Order 2: ORD-1002 (ACCEPTED) - HDMI 2.1 Cable (qty 6), Power Bank (qty 4)
    p_hdmi = prod_map["SKU-ELEC-004"]
    p_pb = prod_map["SKU-ELEC-005"]
    p_hdmi.reserved_quantity += 6
    p_pb.reserved_quantity += 4

    order2 = Order(
        order_number="ORD-1002",
        user_id=warehouse_user.id,
        status="ACCEPTED",
        total_items=2,
        total_quantity=10,
        notes="Retail store display inventory dispatch",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6),
        updated_at=datetime.datetime.utcnow() - datetime.timedelta(hours=3)
    )
    db.add(order2)
    db.flush()

    db.add(OrderItem(order_id=order2.id, product_id=p_hdmi.id, quantity_requested=6, quantity_fulfilled=0))
    db.add(OrderItem(order_id=order2.id, product_id=p_pb.id, quantity_requested=4, quantity_fulfilled=0))

    # Add verification record for Order 2 with 1 damaged HDMI cable ready for demo replacement!
    ver1 = OrderVerification(
        order_id=order2.id,
        product_id=p_hdmi.id,
        expected_quantity=6,
        good_quantity=5,
        damaged_quantity=1,
        missing_quantity=0,
        is_replaced=False,
        verified_by_user_id=warehouse_user.id,
        notes="1 outer jacket torn during dock transfer"
    )
    ver2 = OrderVerification(
        order_id=order2.id,
        product_id=p_pb.id,
        expected_quantity=4,
        good_quantity=4,
        damaged_quantity=0,
        missing_quantity=0,
        is_replaced=False,
        verified_by_user_id=warehouse_user.id,
        notes="All units verified in perfect condition"
    )
    db.add(ver1)
    db.add(ver2)

    dm1 = DamageMissingRecord(
        order_id=order2.id,
        product_id=p_hdmi.id,
        damaged_quantity=1,
        missing_quantity=0,
        total_affected=1,
        status="REPORTED",
        reported_by_user_id=warehouse_user.id,
        notes="1 outer jacket torn during dock transfer"
    )
    db.add(dm1)

    # Order 3: ORD-1003 (SHIPPED) - HEPA Air Purifier (qty 2)
    p_air = prod_map["SKU-APPL-001"]
    order3 = Order(
        order_number="ORD-1003",
        user_id=admin_user.id,
        status="SHIPPED",
        total_items=1,
        total_quantity=2,
        notes="Corporate clinic wellness ventilation order",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        updated_at=datetime.datetime.utcnow() - datetime.timedelta(hours=12)
    )
    db.add(order3)
    db.flush()

    db.add(OrderItem(order_id=order3.id, product_id=p_air.id, quantity_requested=2, quantity_fulfilled=2))

    shipment3 = Shipment(
        order_id=order3.id,
        tracking_number="TRK-1003-8842109",
        shipped_by_user_id=warehouse_user.id,
        shipped_at=datetime.datetime.utcnow() - datetime.timedelta(hours=12),
        notes="Dispatched via Express Logistics Freight"
    )
    db.add(shipment3)

    # 6. Audit Trail Logs
    audit_events = [
        ("RESTOCK", admin_user.id, "admin", "Inventory", "SKU-ELEC-002", "Restocked 20 units of Wireless Mouse (15 -> 35)", datetime.timedelta(days=2)),
        ("ORDER_CREATED", warehouse_user.id, "warehouse", "Order", "ORD-1003", "Created order ORD-1003 with 1 item (Total: 2 units)", datetime.timedelta(days=1)),
        ("ORDER_ACCEPTED", warehouse_user.id, "warehouse", "Order", "ORD-1003", "Order ORD-1003 accepted for shipment verification", datetime.timedelta(hours=18)),
        ("ORDER_SHIPPED", warehouse_user.id, "warehouse", "Order", "ORD-1003", "Order ORD-1003 shipped with Tracking #TRK-1003-8842109", datetime.timedelta(hours=12)),
        ("ORDER_CREATED", warehouse_user.id, "warehouse", "Order", "ORD-1002", "Created order ORD-1002 with 2 items (Total: 10 units)", datetime.timedelta(hours=6)),
        ("ORDER_ACCEPTED", warehouse_user.id, "warehouse", "Order", "ORD-1002", "Order ORD-1002 accepted for verification", datetime.timedelta(hours=3)),
        ("VERIFICATION_DONE", warehouse_user.id, "warehouse", "OrderVerification", "ORD-1002", "Reported 1 damaged unit on SKU-ELEC-004 in ORD-1002", datetime.timedelta(hours=2)),
        ("ORDER_CREATED", warehouse_user.id, "warehouse", "Order", "ORD-1001", "Created order ORD-1001 with 2 items (Total: 6 units) - Status: PENDING", datetime.timedelta(hours=1))
    ]

    for action, uid, uname, entity, eid, details, delta in audit_events:
        db.add(AuditLog(
            action=action,
            user_id=uid,
            username=uname,
            entity=entity,
            entity_id=eid,
            details=details,
            created_at=datetime.datetime.utcnow() - delta
        ))

    db.commit()
    print("Database successfully seeded with realistic products, categories, orders, and audit logs!")
