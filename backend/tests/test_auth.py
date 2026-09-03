def test_register_creates_driver(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "driver@example.com",
            "nic": "991234567V",
            "password": "supersecret",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "driver@example.com"
    assert body["role"] == "DRIVER"
    assert "password" not in body
    assert "password_hash" not in body


def test_register_rejects_client_supplied_role(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "sneaky@example.com",
            "nic": "991234568V",
            "password": "supersecret",
            "role": "ADMIN",
        },
    )
    assert response.status_code == 201
    assert response.json()["role"] == "DRIVER"


def test_duplicate_email_rejected(client):
    payload = {
        "email": "dup@example.com",
        "nic": "991234569V",
        "password": "supersecret",
    }
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post(
        "/auth/register",
        json={**payload, "nic": "991234570V"},
    )
    assert second.status_code == 409


def test_login_and_me(client):
    client.post(
        "/auth/register",
        json={
            "email": "login@example.com",
            "nic": "991234571V",
            "password": "supersecret",
        },
    )

    login_response = client.post(
        "/auth/login",
        json={"identifier": "login@example.com", "password": "supersecret"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "login@example.com"


def test_login_wrong_password_rejected(client):
    client.post(
        "/auth/register",
        json={
            "email": "wrong@example.com",
            "nic": "991234572V",
            "password": "supersecret",
        },
    )

    response = client.post(
        "/auth/login", json={"identifier": "wrong@example.com", "password": "incorrect"}
    )
    assert response.status_code == 401


def test_me_requires_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_health_and_ready(client):
    assert client.get("/health").status_code == 200
    assert client.get("/ready").json()["status"] == "ready"
