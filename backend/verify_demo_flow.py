import httpx
import sys

BASE_URL = "http://localhost:8000/api"

def run_e2e_verification():
    print("==================================================================")
    print("STARTING FULL END-TO-END DEMO WORKFLOW VERIFICATION (STOCKFLOW WMS)")
    print("==================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health Check
    print("\n[Step 1] Verifying System Health & Database...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"  ✓ Status: {health['status']}, App Name: {health['app_name']}, Database: {health['database']}")

    # 2. Login Authentication (Admin)
    print("\n[Step 2] Authenticating as Admin (admin / admin123)...")
    r = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    admin_data = r.json()
    token = admin_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  ✓ Logged in as: {admin_data['full_name']} (Role: {admin_data['role']})")

    # 3. Dashboard KPI Counters
    print("\n[Step 3] Fetching Live Dashboard Summary...")
    r = client.get("/analytics/summary")
    assert r.status_code == 200
    summary = r.json()
    print(f"  ✓ Total Products: {summary['total_products']}")
    print(f"  ✓ Total Units: {summary['total_units']}")
    print(f"  ✓ Low Stock: {summary['low_stock_items']}, Out of Stock: {summary['out_of_stock_items']}")
    print(f"  ✓ Pending Orders: {summary['pending_orders']}, Shipped Orders: {summary['shipped_orders']}")

    # 4. Inventory Catalog & Category Filtering
    print("\n[Step 4] Checking Inventory & Categories...")
    r = client.get("/categories")
    assert r.status_code == 200
    cats = r.json()
    print(f"  ✓ Found {len(cats)} categories: {', '.join(c['name'] for c in cats)}")

    r = client.get("/products?search=USB-C Cable")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    usb_cable = items[0]
    print(f"  ✓ Target Product: '{usb_cable['name']}' ({usb_cable['product_code']})")
    print(f"    Quantity on hand: {usb_cable['quantity']}, Status: {usb_cable['status']}")

    # 5. Restocking Workflow
    print("\n[Step 5] Restocking Product (+20 Units)...")
    r = client.post("/restocks", headers=headers, json={
        "product_id": usb_cable["id"],
        "quantity_added": 20,
        "notes": "Inbound supplier shipment PO-7712"
    })
    assert r.status_code == 200, f"Restock failed: {r.text}"
    restock_res = r.json()
    print(f"  ✓ Restock Success: {restock_res['message']}")
    print(f"    Stock: {restock_res['previous_quantity']} -> {restock_res['new_quantity']} ({restock_res['previous_status']} -> {restock_res['new_status']})")

    # 6. Order Placement Workflow
    print("\n[Step 6] Placing New Customer Order for 5 Units...")
    r = client.post("/orders", headers=headers, json={
        "items": [{"product_id": usb_cable["id"], "quantity": 5}],
        "notes": "Retail store display order"
    })
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    new_order = r.json()
    order_id = new_order["id"]
    print(f"  ✓ Created Order #{new_order['order_number']} (Status: {new_order['status']})")
    print(f"    Priority Label: {new_order['priority_label']} (Ratio: {new_order['fulfillment_ratio']})")

    # 7. Orders Queue & Acceptance
    print("\n[Step 7] Accepting Pending Order...")
    r = client.post(f"/orders/{order_id}/accept", headers=headers)
    assert r.status_code == 200, f"Accept failed: {r.text}"
    accepted = r.json()
    print(f"  ✓ Order #{accepted['order_number']} moved to status: {accepted['status']}")

    # 8. Tracking & Physical Verification (Damaged + Missing Breakdown)
    print("\n[Step 8] Conducting Physical Inspection (Good: 3, Damaged: 1, Missing: 1 = Total 5)...")
    r = client.post(f"/tracking/{order_id}/verify", headers=headers, json={
        "items": [{
            "product_id": usb_cable["id"],
            "damaged_quantity": 1,
            "missing_quantity": 1,
            "notes": "1 cable connector bent, 1 box unit missing from pallet"
        }]
    })
    assert r.status_code == 200, f"Verification failed: {r.text}"
    track = r.json()
    print(f"  ✓ Verification Saved: Good={track['total_good']}, Damaged={track['total_damaged']}, Missing={track['total_missing']}")
    print(f"    Requires Replacement: {track['has_pending_replacement']}, Can Ship: {track['can_ship']}")

    # 9. Replacement Issuance
    print("\n[Step 9] Issuing Warehouse Replacement Stock for Damaged + Missing (2 Units)...")
    r = client.post(f"/tracking/{order_id}/replace", headers=headers, json={
        "product_id": usb_cable["id"],
        "reason": "Direct dock replacement from reserve stock"
    })
    assert r.status_code == 200, f"Replacement failed: {r.text}"
    rep = r.json()
    print(f"  ✓ Replacement Success: {rep['message']}")

    # Check that tracking now permits shipment
    r = client.get(f"/tracking/{order_id}")
    track_after_rep = r.json()
    assert track_after_rep["can_ship"] is True
    print(f"  ✓ Order verified with replacements! Can Ship: {track_after_rep['can_ship']}")

    # 10. Shipment Dispatch
    print("\n[Step 10] Dispatched Order Shipment...")
    r = client.post(f"/tracking/{order_id}/ship", headers=headers, json={
        "notes": "Dispatched via Priority Express Freight"
    })
    assert r.status_code == 200, f"Ship failed: {r.text}"
    shipment = r.json()
    print(f"  ✓ Dispatched! Tracking Number: {shipment['tracking_number']} (Shipped by: {shipment['shipped_by']})")

    # 11. Damaged & Missing Records Verification
    print("\n[Step 11] Checking Damaged & Missing Audit Registry...")
    r = client.get("/damaged-missing")
    assert r.status_code == 200
    dm = r.json()
    print(f"  ✓ Total Damaged: {dm['total_damaged_items']}, Missing: {dm['total_missing_items']}, Affected: {dm['total_affected_items']}")
    print(f"  ✓ Total Discrepancy Logs: {dm['total_records']}")

    # 12. Low Stock & Out of Stock Verification
    print("\n[Step 12] Checking Low Stock & Out of Stock Endpoints...")
    r = client.get("/inventory/low-stock")
    assert r.status_code == 200
    low = r.json()
    print(f"  ✓ Low Stock Count: {len(low)} items")

    r = client.get("/inventory/out-of-stock")
    assert r.status_code == 200
    out = r.json()
    print(f"  ✓ Out of Stock Count: {len(out)} items")

    # 13. Analytics Calculations
    print("\n[Step 13] Verifying Complete Analytics Aggregation & Charts Data...")
    r = client.get("/analytics")
    assert r.status_code == 200
    analytics = r.json()
    print(f"  ✓ Category Distributions: {len(analytics['categories_distribution'])} categories")
    print(f"  ✓ Stock Status Distributions: {analytics['stock_status_distribution']}")
    print(f"  ✓ Order Timeline Data Points: {len(analytics['orders_over_time'])}")
    print(f"  ✓ Top Ordered Products: {len(analytics['most_ordered_products'])} products")
    print(f"  ✓ Restocking Activity Points: {len(analytics['restocking_activity'])}")
    print(f"  ✓ Orders by Status Breakdown: {analytics['orders_by_status']}")

    # 14. Activity Log Stream
    print("\n[Step 14] Verifying Real-Time System Activity Feed...")
    r = client.get("/activity?limit=5")
    assert r.status_code == 200
    logs = r.json()
    print(f"  ✓ Recent activity entries: {len(logs)}")
    for l in logs[:3]:
        print(f"    • [{l['action']}] by {l['username']}: {l['details']}")

    print("\n==================================================================")
    print("ALL 14 END-TO-END DEMO WORKFLOW PHASES PASSED WITH 100% SUCCESS!")
    print("==================================================================")

if __name__ == "__main__":
    try:
        run_e2e_verification()
    except Exception as e:
        print(f"VERIFICATION ERROR: {e}")
        sys.exit(1)
