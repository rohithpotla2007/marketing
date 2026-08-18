def test_verification_math_and_validation(client, warehouse_token):
    # Create and accept a dedicated order for testing
    res_p = client.get("/api/products?search=Mechanical Keyboard")
    prod = res_p.json()["items"][0]
    
    order_res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [{"product_id": prod["id"], "quantity": 4}],
            "notes": "Verification test order"
        }
    )
    order_id = order_res.json()["id"]
    client.post(f"/api/orders/{order_id}/accept", headers={"Authorization": f"Bearer {warehouse_token}"})

    # Test invalid breakdown (exceeds expected quantity of 4: damaged 3 + missing 3 = 6 > 4)
    invalid_res = client.post(
        f"/api/tracking/{order_id}/verify",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [
                {
                    "product_id": prod["id"],
                    "damaged_quantity": 3,
                    "missing_quantity": 3,
                    "notes": "Invalid count test"
                }
            ]
        }
    )
    assert invalid_res.status_code == 400
    assert "exceeds expected quantity" in invalid_res.json()["detail"]

    # Test valid breakdown (good 2 + damaged 1 + missing 1 = 4)
    valid_res = client.post(
        f"/api/tracking/{order_id}/verify",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [
                {
                    "product_id": prod["id"],
                    "damaged_quantity": 1,
                    "missing_quantity": 1,
                    "notes": "Valid breakdown"
                }
            ]
        }
    )
    assert valid_res.status_code == 200
    track_data = valid_res.json()
    assert track_data["total_damaged"] == 1
    assert track_data["total_missing"] == 1
    assert track_data["total_good"] == 2
    assert track_data["can_ship"] is False  # Cannot ship until replacement is issued

def test_replacement_and_shipment_workflow(client, warehouse_token):
    # Create and accept a dedicated order for testing
    res_p = client.get("/api/products?search=HDMI 2.1 Cable")
    prod = res_p.json()["items"][0]
    prod_id = prod["id"]
    
    order_res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [{"product_id": prod_id, "quantity": 5}],
            "notes": "Replacement & shipment test order"
        }
    )
    order_id = order_res.json()["id"]
    client.post(f"/api/orders/{order_id}/accept", headers={"Authorization": f"Bearer {warehouse_token}"})

    # Verify with 1 damaged unit
    client.post(
        f"/api/tracking/{order_id}/verify",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={
            "items": [
                {
                    "product_id": prod_id,
                    "damaged_quantity": 1,
                    "missing_quantity": 0,
                    "notes": "1 damaged cable found"
                }
            ]
        }
    )

    # Check warehouse stock before replacement
    p_before = client.get(f"/api/products/{prod_id}").json()
    qty_before = p_before["quantity"]

    # Issue replacement
    rep_res = client.post(
        f"/api/tracking/{order_id}/replace",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={"product_id": prod_id, "reason": "Damaged cable exchange"}
    )
    assert rep_res.status_code == 200
    assert rep_res.json()["success"] is True

    # Warehouse stock should decrease by replacement amount (1 unit)
    p_after = client.get(f"/api/products/{prod_id}").json()
    assert p_after["quantity"] == qty_before - 1

    # Check that Damaged & Missing records updated to REPLACED
    dm_res = client.get("/api/damaged-missing")
    assert dm_res.status_code == 200
    assert dm_res.json()["total_affected_items"] >= 1

    # Ship the order
    ship_res = client.post(
        f"/api/tracking/{order_id}/ship",
        headers={"Authorization": f"Bearer {warehouse_token}"},
        json={"notes": "Order shipped after replacement"}
    )
    assert ship_res.status_code == 200
    assert "TRK-" in ship_res.json()["tracking_number"]
