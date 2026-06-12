"""Tests for email OTP auth endpoints."""

from fastapi.testclient import TestClient

from backend.server import app

client = TestClient(app)

SIGNUP_EMAIL = "newuser@example.com"
LOGIN_EMAIL = "existing@example.com"


def test_login_send_otp_unknown_account():
    res = client.post(
        "/api/auth/send-otp",
        json={"email": "unknown@example.com", "purpose": "login"},
    )
    assert res.status_code == 404
    assert res.json()["error"] == "account_not_found"


def test_signup_send_otp_new_account():
    res = client.post(
        "/api/auth/send-otp",
        json={"email": SIGNUP_EMAIL, "purpose": "signup"},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_signup_verify_creates_account():
    send = client.post(
        "/api/auth/send-otp",
        json={"email": SIGNUP_EMAIL, "purpose": "signup"},
    )
    dev_otp = send.json().get("devOtp")
    assert dev_otp

    ok = client.post(
        "/api/auth/verify-otp",
        json={
            "email": SIGNUP_EMAIL,
            "otp": dev_otp,
            "purpose": "signup",
            "displayName": "Test User",
        },
    )
    assert ok.status_code == 200
    assert ok.json()["user"]["email"] == SIGNUP_EMAIL


def test_login_send_otp_existing_account():
    res = client.post(
        "/api/auth/send-otp",
        json={"email": SIGNUP_EMAIL, "purpose": "login"},
    )
    assert res.status_code == 200


def test_signup_send_otp_existing_account_rejected():
    res = client.post(
        "/api/auth/send-otp",
        json={"email": SIGNUP_EMAIL, "purpose": "signup"},
    )
    assert res.status_code == 409
    assert res.json()["error"] == "account_exists"


def test_send_otp_invalid_email():
    res = client.post(
        "/api/auth/send-otp",
        json={"email": "not-an-email", "purpose": "signup"},
    )
    assert res.status_code == 422
