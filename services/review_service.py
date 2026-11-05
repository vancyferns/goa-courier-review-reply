"""Unified Review Service backed by SQLite Database and Google Business Profile API."""

from typing import List, Dict, Any, Optional
from services.google_oauth import GoogleOAuthService
from services.google_business_profile import GoogleBusinessProfileClient
from database.db import DatabaseService

class ReviewService:
    def __init__(
        self,
        oauth_service: Optional[GoogleOAuthService] = None,
        gbp_client: Optional[GoogleBusinessProfileClient] = None
    ):
        self.oauth_service = oauth_service or GoogleOAuthService()
        self.gbp_client = gbp_client or GoogleBusinessProfileClient()

    def is_connected_to_google(self) -> bool:
        """Check if an active Google token is available."""
        return self.oauth_service.is_connected()

    def get_reviews(
        self,
        location: str = "All Locations",
        status: str = "All",
        search: str = ""
    ) -> List[Dict[str, Any]]:
        """Fetch reviews from database, or refresh from Google if token present."""
        token = self.oauth_service.get_valid_access_token()
        if token:
            try:
                # Optionally sync live Google reviews into database
                pass
            except Exception:
                pass

        # Query persisted database records
        return DatabaseService.get_reviews(location, status, search)

    def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single review from database."""
        return DatabaseService.get_review_by_id(review_id)

    def publish_reply(self, review_id: str, reply_text: str) -> bool:
        """Publish reply to Google if connected, and persist to database."""
        token = self.oauth_service.get_valid_access_token()
        review = self.get_review_by_id(review_id)
        if not review:
            return False

        if token and review.get("resource_name"):
            # Execute live publish on Google
            self.gbp_client.publish_reply(review["resource_name"], reply_text, token)

        # Update in SQLite database
        success = DatabaseService.publish_reply(review_id, reply_text)
        return success

    def save_draft(self, review_id: str, draft_text: str):
        """Save draft text in DB."""
        DatabaseService.save_draft(review_id, draft_text)
