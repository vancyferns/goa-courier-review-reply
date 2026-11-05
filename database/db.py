"""SQLite Database Layer for Goa Courier Services™ Review Reply System."""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = Path("data")
DB_PATH = DB_DIR / "app.db"

def get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and seed defaults if empty."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Configs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 2. Locations table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS business_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 3. Reviews table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            resource_name TEXT,
            reviewer_name TEXT,
            rating INTEGER NOT NULL,
            comment TEXT,
            location TEXT NOT NULL,
            created_date TEXT,
            reply_status TEXT DEFAULT 'unanswered',
            existing_reply_text TEXT,
            existing_reply_time TEXT,
            last_draft_text TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 4. Audit logs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            review_id TEXT,
            status TEXT NOT NULL,
            message TEXT NOT NULL
        )
        """)

        conn.commit()

    # Seed default data
    seed_initial_data()

def seed_initial_data():
    with get_connection() as conn:
        cursor = conn.cursor()

        # Seed Locations
        default_locations = [
            ("Margao – Head Office", "Margao (Head Office)", 1),
            ("Agassaim", "Agassaim Branch", 1),
            ("Porvorim", "Porvorim Branch", 1),
            ("Canacona", "Canacona Branch", 1),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO business_locations (location_name, display_name, is_enabled)
        VALUES (?, ?, ?)
        """, default_locations)

        # Seed Default Configs
        default_configs = {
            "google_client_id": "",
            "google_client_secret": "",
            "google_redirect_uri": "http://127.0.0.1:7860/oauth2callback",
            "model_provider": "huggingface",
            "model_repo_id": "Qwen/Qwen3-4B-Instruct-2507",
            "model_api_base_url": "https://api-inference.huggingface.co/models/Qwen/Qwen3-4B-Instruct-2507",
            "model_api_key": "",
            "model_temperature": "0.35",
            "model_max_tokens": "220",
            "company_name": "Goa Courier Services™",
            "company_email": "inquiry@goacourierservices.com",
            "company_website": "www.goacourierservices.com",
            "seo_phrases": "courier service in Goa, professional packing services, secure parcel delivery, worldwide shipping from Goa, domestic courier service in Goa"
        }
        for k, v in default_configs.items():
            cursor.execute("""
            INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)
            """, (k, v))

        # Seed Reviews if table is empty
        cursor.execute("SELECT COUNT(*) as cnt FROM reviews")
        if cursor.fetchone()["cnt"] == 0:
            from services.mock_data import MOCK_REVIEWS
            for r in MOCK_REVIEWS:
                reply_text = r["existing_reply"]["comment"] if r.get("existing_reply") else None
                reply_time = r["existing_reply"]["update_time"] if r.get("existing_reply") else None
                cursor.execute("""
                INSERT INTO reviews (
                    id, reviewer_name, rating, comment, location, created_date,
                    reply_status, existing_reply_text, existing_reply_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    r["id"], r["reviewer_name"], r["rating"], r["comment"],
                    r["location"], r["created_date"], r["reply_status"],
                    reply_text, reply_time
                ))
            
            # Log initial seed event
            cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, review_id, status, message)
            VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "SYSTEM_INIT",
                None,
                "SUCCESS",
                "Database initialized with standard Goa Courier Services locations and sample review fixtures."
            ))

        conn.commit()

# ================= DATABASE ACCESS METHODS =================

class DatabaseService:
    @staticmethod
    def get_config(key: str, default: str = "") -> str:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    @staticmethod
    def set_config(key: str, value: str):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO system_config (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """, (key, value))
            conn.commit()

    @staticmethod
    def get_all_configs() -> Dict[str, str]:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_config")
            return {row["key"]: row["value"] for row in cursor.fetchall()}

    @staticmethod
    def get_reviews(location: str = "All Locations", status: str = "All", search: str = "") -> List[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM reviews WHERE 1=1"
            params = []

            if location and location != "All Locations":
                query += " AND location LIKE ?"
                params.append(f"%{location}%")

            if status and status.lower() != "all":
                query += " AND reply_status = ?"
                params.append(status.lower())

            if search:
                query += " AND (reviewer_name LIKE ? OR comment LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])

            query += " ORDER BY CASE WHEN reply_status = 'unanswered' THEN 0 ELSE 1 END, created_date DESC"
            cursor.execute(query, params)
            
            reviews = []
            for row in cursor.fetchall():
                r = dict(row)
                existing_reply = None
                if r["existing_reply_text"]:
                    existing_reply = {
                        "comment": r["existing_reply_text"],
                        "update_time": r["existing_reply_time"] or "Published"
                    }
                r["existing_reply"] = existing_reply
                reviews.append(r)
            return reviews

    @staticmethod
    def get_review_by_id(review_id: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reviews WHERE id = ?", (review_id,))
            row = cursor.fetchone()
            if not row:
                return None
            r = dict(row)
            existing_reply = None
            if r["existing_reply_text"]:
                existing_reply = {
                    "comment": r["existing_reply_text"],
                    "update_time": r["existing_reply_time"] or "Published"
                }
            r["existing_reply"] = existing_reply
            return r

    @staticmethod
    def publish_reply(review_id: str, reply_text: str) -> bool:
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE reviews
            SET reply_status = 'replied',
                existing_reply_text = ?,
                existing_reply_time = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (reply_text.strip(), "Just now", review_id))

            cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, review_id, status, message)
            VALUES (?, 'PUBLISH_REPLY', ?, 'SUCCESS', ?)
            """, (timestamp_str, review_id, f"Published owner reply: {reply_text[:60]}..."))

            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def save_draft(review_id: str, draft_text: str):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE reviews SET last_draft_text = ? WHERE id = ?", (draft_text, review_id))
            conn.commit()

    @staticmethod
    def log_audit(action: str, review_id: Optional[str], status: str, message: str):
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, review_id, status, message)
            VALUES (?, ?, ?, ?, ?)
            """, (timestamp_str, action, review_id, status, message))
            conn.commit()

    @staticmethod
    def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_locations() -> List[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM business_locations ORDER BY id ASC")
            return [dict(row) for row in cursor.fetchall()]

# Auto-initialize database on module import
init_db()
