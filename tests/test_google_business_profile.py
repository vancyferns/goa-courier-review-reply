"""Unit tests for Google Business Profile client normalization and safeguards."""

import pytest
from services.google_business_profile import GoogleBusinessProfileClient

def test_review_normalization():
    client = GoogleBusinessProfileClient()
    raw = {
        "reviewId": "rev_123",
        "name": "accounts/111/locations/222/reviews/rev_123",
        "reviewer": {"displayName": "Priya Sharma"},
        "starRating": "FIVE",
        "comment": "Outstanding courier service from Margao!",
        "createTime": "2026-11-01T10:00:00Z",
        "reviewReply": None
    }
    normalized = client._normalize_review(raw, fallback_location="Margao – Head Office")
    assert normalized["id"] == "rev_123"
    assert normalized["reviewer_name"] == "Priya Sharma"
    assert normalized["rating"] == 5
    assert normalized["reply_status"] == "unanswered"
    assert normalized["existing_reply"] is None

def test_existing_reply_detected():
    client = GoogleBusinessProfileClient()
    raw = {
        "reviewId": "rev_456",
        "name": "accounts/111/locations/222/reviews/rev_456",
        "reviewer": {"displayName": "Carlos Dias"},
        "starRating": "FOUR",
        "comment": "Good packing.",
        "createTime": "2026-10-20T12:00:00Z",
        "reviewReply": {
            "comment": "Thank you Carlos!",
            "updateTime": "2026-10-21T10:00:00Z"
        }
    }
    normalized = client._normalize_review(raw, fallback_location="Porvorim")
    assert normalized["reply_status"] == "replied"
    assert normalized["existing_reply"]["comment"] == "Thank you Carlos!"
