"""Official Google Business Profile REST API client."""

from typing import List, Dict, Any, Optional, Tuple
import httpx

GBP_ACCOUNT_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
GBP_BUSINESS_INFO_URL = "https://mybusinessbusinessinformation.googleapis.com/v1"
GBP_V4_URL = "https://mybusiness.googleapis.com/v4"

RATING_MAP = {
    "STAR_RATING_UNSPECIFIED": 0,
    "ONE": 1,
    "TWO": 2,
    "THREE": 3,
    "FOUR": 4,
    "FIVE": 5
}

class GoogleBusinessProfileClient:
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout

    def _headers(self, access_token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    def list_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """List accessible Google Business accounts."""
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(GBP_ACCOUNT_URL, headers=self._headers(access_token))
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to list accounts ({resp.status_code}): {resp.text}")
            data = resp.json()
            return data.get("accounts", [])

    def list_locations(self, account_name: str, access_token: str) -> List[Dict[str, Any]]:
        """
        List locations under account.
        Endpoint: /v1/{parent=accounts/*}/locations?readMask=name,title,storefrontAddress
        """
        url = f"{GBP_BUSINESS_INFO_URL}/{account_name}/locations"
        params = {"readMask": "name,title,storefrontAddress"}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(access_token), params=params)
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to list locations ({resp.status_code}): {resp.text}")
            data = resp.json()
            return data.get("locations", [])

    def list_reviews(
        self,
        location_resource_name: str,
        access_token: str,
        page_token: Optional[str] = None,
        page_size: int = 50
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        List reviews for location with pagination.
        Endpoint: /v4/{name=accounts/*/locations/*}/reviews
        """
        url = f"{GBP_V4_URL}/{location_resource_name}/reviews"
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(access_token), params=params)
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to list reviews ({resp.status_code}): {resp.text}")
            data = resp.json()

        raw_reviews = data.get("reviews", [])
        next_page_token = data.get("nextPageToken")
        
        normalized = [self._normalize_review(r, location_resource_name) for r in raw_reviews]
        return normalized, next_page_token

    def get_review(self, review_resource_name: str, access_token: str) -> Dict[str, Any]:
        """Fetch latest state of a specific review for read-back verification."""
        url = f"{GBP_V4_URL}/{review_resource_name}"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(access_token))
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to get review ({resp.status_code}): {resp.text}")
            return self._normalize_review(resp.json(), review_resource_name)

    def publish_reply(self, review_resource_name: str, comment: str, access_token: str) -> Dict[str, Any]:
        """
        Publish an owner reply to Google.
        Pre-checks that review does not already have a published reply.
        """
        # Step 1: Pre-publish refresh check
        current_review = self.get_review(review_resource_name, access_token)
        if current_review.get("existing_reply"):
            raise ValueError("Safety violation: Review already has an existing owner reply. Silent overwrite is prohibited.")

        # Step 2: Publish reply
        url = f"{GBP_V4_URL}/{review_resource_name}/reply"
        payload = {"comment": comment.strip()}

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.put(url, headers=self._headers(access_token), json=payload)
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"Google reply publication failed ({resp.status_code}): {resp.text}")
            return resp.json()

    def _normalize_review(self, raw: Dict[str, Any], fallback_location: str) -> Dict[str, Any]:
        """Normalize Google review object into consistent internal format."""
        rating_raw = raw.get("starRating", "STAR_RATING_UNSPECIFIED")
        rating_int = RATING_MAP.get(rating_raw, 5) if isinstance(rating_raw, str) else int(rating_raw)

        reviewer = raw.get("reviewer", {})
        existing_reply_raw = raw.get("reviewReply")
        existing_reply = None
        if existing_reply_raw:
            existing_reply = {
                "comment": existing_reply_raw.get("comment", ""),
                "update_time": existing_reply_raw.get("updateTime", "")
            }

        return {
            "id": raw.get("reviewId") or raw.get("name", ""),
            "resource_name": raw.get("name", ""),
            "reviewer_name": reviewer.get("displayName") or "Anonymous Reviewer",
            "rating": rating_int,
            "comment": raw.get("comment", "").strip(),
            "created_date": (raw.get("createTime") or "")[:10],
            "reply_status": "replied" if existing_reply else "unanswered",
            "existing_reply": existing_reply,
            "location": fallback_location
        }
