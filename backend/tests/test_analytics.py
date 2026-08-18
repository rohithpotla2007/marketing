def test_analytics_and_summary_endpoints(client):
    res = client.get("/api/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "categories_distribution" in data
    assert "stock_status_distribution" in data
    assert "most_ordered_products" in data
    assert "damage_vs_missing" in data

    summary = data["summary"]
    assert summary["total_products"] >= 20
    assert summary["total_units"] > 0

    # Summary endpoint
    res_sum = client.get("/api/analytics/summary")
    assert res_sum.status_code == 200
    assert res_sum.json()["total_products"] == summary["total_products"]

def test_activity_log_endpoint(client):
    res = client.get("/api/activity")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    assert "action" in logs[0]
    assert "username" in logs[0]
