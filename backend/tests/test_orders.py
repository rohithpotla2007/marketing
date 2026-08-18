def test_order_creation_and_reservation(client, warehouse_token):
    # Find a product with available stock
    res = client.get("/api/products?search=Wireless Mouse")
    assert res.status_code == 200
    prod = res.json()["items"][0]
    initial_avail = prod["available_quantity"]
    initial_reserved = prod["reserved_quantity"]

    # Place order for 3 units
    order_res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [{"product_id": prod["id"], "quantity": 3}],
            "notes": "Automated order test"
        }
    )
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["status"] == "PENDING"
    assert order_data["total_quantity"] == 3

    # Check product stock reservation
    p_check = client.get(f"/api/products/{prod['id']}")
    assert p_check.status_code == 200
    p_data = p_check.json()
    assert p_data["reserved_quantity"] == initial_reserved + 3
    assert p_data["available_quantity"] == initial_avail - 3

def test_order_accept_flow(client, warehouse_token):
    # Place a pending order
    res = client.get("/api/products?search=Power Bank")
    prod = res.json()["items"][0]
    
    order_res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [{"product_id": prod["id"], "quantity": 2}],
            "notes": "Acceptance test order"
        }
    )
    order_id = order_res.json()["id"]

    # Accept the order
    accept_res = client.post(
        f"/api/orders/{order_id}/accept",
        headers={"Authorization": f"Bearer {warehouse_token}"}
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"

    # Verify it now appears in tracking endpoint
    tracking_res = client.get(f"/api/tracking/{order_id}")
    assert tracking_res.status_code == 200
    assert tracking_res.json()["status"] == "ACCEPTED"
