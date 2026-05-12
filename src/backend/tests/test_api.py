"""
Unit tests for API endpoints.
"""
def test_status():
    # Example test for /status endpoint
    from api.routes import status
    assert status() == {"status": "Backend is running"}
