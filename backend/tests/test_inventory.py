def test_list_products_and_categories(client):
    # Test categories
    res_cats = client.get("/api/categories")
    assert res_cats.status_code == 200
    cats = res_cats.json()
    assert len(cats) >= 8

    # Test products
    res_prods = client.get("/api/products")
    assert res_prods.status_code == 200
    data = res_prods.json()
    assert data["total"] >= 20
    assert len(data["items"]) > 0

def test_restock_atomic_transaction(client, admin_token):
    # Get USB-C Cable (SKU-ELEC-001)
    res = client.get("/api/products?search=USB-C Cable")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) > 0
    usb_cable = items[0]
    initial_qty = usb_cable["quantity"]
    initial_status = usb_cable["status"]

    # Restock +20 units
    restock_res = client.post(
        "/api/restocks",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": usb_cable["id"], "quantity_added": 20, "notes": "Demo restock test"}
    )
    assert restock_res.status_code == 200
    res_data = restock_res.json()
    assert res_data["new_quantity"] == initial_qty + 20
    assert res_data["new_status"] == "IN STOCK"

    # Verify directly from products endpoint
    check_res = client.get(f"/api/products/{usb_cable['id']}")
    assert check_res.status_code == 200
    assert check_res.json()["quantity"] == initial_qty + 20
    assert check_res.json()["status"] == "IN STOCK"

def test_restock_negative_or_zero_rejected(client, admin_token):
    res = client.post(
        "/api/restocks",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": 1, "quantity_added": -5}
    )
    assert res.status_code == 422 or res.status_code == 400

def test_low_and_out_of_stock_endpoints(client):
    res_low = client.get("/api/inventory/low-stock")
    assert res_low.status_code == 200
    low_items = res_low.json()
    for item in low_items:
        assert 0 < item["quantity"] <= item["low_stock_threshold"]

    res_out = client.get("/api/inventory/out-of-stock")
    assert res_out.status_code == 200
    out_items = res_out.json()
    for item in out_items:
        assert item["quantity"] == 0
