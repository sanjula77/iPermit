from app.core.geo import haversine_km


def test_same_point_distance_is_zero():
    assert haversine_km(6.9271, 79.8612, 6.9271, 79.8612) == 0.0


def test_colombo_to_london_is_thousands_of_km():
    # Colombo, Sri Lanka -> London, UK -- sanity check against a known
    # rough real-world distance (~8600 km great-circle).
    distance = haversine_km(6.9271, 79.8612, 51.5074, -0.1278)
    assert 8000 < distance < 9200
