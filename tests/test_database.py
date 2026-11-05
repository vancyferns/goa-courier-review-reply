"""Unit tests for SQLite Database operations."""

import pytest
from database.db import DatabaseService, init_db

def test_database_initialization_and_configs():
    init_db()
    configs = DatabaseService.get_all_configs()
    assert "company_name" in configs
    assert "model_repo_id" in configs
    assert configs["model_repo_id"] == "Qwen/Qwen3-4B-Instruct-2507"

    # Test set and get config
    DatabaseService.set_config("test_custom_key", "custom_val_123")
    val = DatabaseService.get_config("test_custom_key")
    assert val == "custom_val_123"

def test_database_reviews_query():
    reviews = DatabaseService.get_reviews(location="Margao", status="All")
    assert len(reviews) > 0
    first = reviews[0]
    assert "Margao" in first["location"]

def test_database_publish_and_audit():
    reviews = DatabaseService.get_reviews(status="unanswered")
    assert len(reviews) > 0
    target_id = reviews[0]["id"]

    success = DatabaseService.publish_reply(target_id, "Thank you from Goa Courier Services!")
    assert success

    updated = DatabaseService.get_review_by_id(target_id)
    assert updated["reply_status"] == "replied"
    assert "Thank you from Goa Courier Services!" in updated["existing_reply"]["comment"]

    logs = DatabaseService.get_audit_logs(limit=5)
    assert len(logs) > 0
    assert any(log["action"] == "PUBLISH_REPLY" for log in logs)
