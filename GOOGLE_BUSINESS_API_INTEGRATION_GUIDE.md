# Goa Courier Services™ — Google Business Profile API & AI Integration Guide

This guide walks you step-by-step through setting up Google Cloud, connecting official Google Business Profile APIs, fetching customer reviews, generating AI drafts with Qwen, and safely publishing responses to Google Maps.

---

## 📋 Table of Contents
1. [Phase 0: Google Cloud Project Setup & Prerequisites](#1-phase-0-google-cloud-project-setup--prerequisites)
2. [Phase 1: OAuth 2.0 Credentials & Testing Access](#2-phase-1-oauth-20-credentials--testing-access)
3. [Phase 2: One-Click Token Exchange in the Dashboard](#3-phase-2-one-click-token-exchange-in-the-dashboard)
4. [Phase 3: Discovering Accounts & Branch Locations](#4-phase-3-discovering-accounts--branch-locations)
5. [Phase 4: Fetching Reviews with Pagination](#5-phase-4-fetching-reviews-with-pagination)
6. [Phase 5: Grounded AI Reply Generation (Qwen3-4B-Instruct-2507)](#6-phase-5-grounded-ai-reply-generation-qwen3-4b-instruct-2507)
7. [Phase 6: Safe Google Review Reply Publishing](#7-phase-6-safe-google-review-reply-publishing)
8. [Phase 7: Production Deployment on Hugging Face Spaces](#8-phase-7-production-deployment-on-hugging-face-spaces)

---

## 1. Phase 0: Google Cloud Project Setup & Prerequisites

Google Business Profile API access is **100% free of charge** and does **not** require a paid billing account.

### Step 1.1: Create a Free Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top left &rarr; **New Project**.
3. Name your project: `Goa-Courier-Review-Reply`.
4. Click **Create** and select the new project.
5. Note down your **Project Number** (displayed on the Project Dashboard).

### Step 1.2: Request Google Business Profile API Access
Because Google protects business reviews against spam bots, access to the Business Profile API is granted through a short approval form:
1. Open the [Google Business Profile API Access Request Form](https://developers.google.com/my-business/content/prereqs#request-access).
2. Enter:
   * **Project Number:** (from Step 1.1)
   * **Application Type:** Internal company management tool.
   * **Company Name:** Goa Courier Services™.
   * **Use Case:** Retrieving customer reviews across company branches and publishing verified owner replies.
3. Submit the form. Google usually whitelists your project within 24–72 hours.

---

## 2. Phase 1: OAuth 2.0 Credentials & Testing Access

### Step 2.1: Configure the OAuth Consent Screen
1. In Google Cloud Console, navigate to **APIs & Services** &rarr; **OAuth consent screen**.
2. Select User Type: **External** &rarr; Click **Create**.
3. Fill in:
   * **App name:** `Goa Courier Review Workstation`
   * **User support email:** Your email (or `inquiry@goacourierservices.com`)
   * **Developer contact email:** Your email
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes**, and add:
   * `https://www.googleapis.com/auth/business.manage`
6. Click **Save and Continue**.
7. Under **Test Users**, click **Add Users**:
   * Add **your Google email address** (and the business owner's email address if different).
   * *This allows you to authenticate immediately in "Testing" mode without waiting for public app verification!*
8. Click **Save and Continue**.

### Step 2.2: Generate OAuth Client ID & Secret
1. Go to **APIs & Services** &rarr; **Credentials**.
2. Click **Create Credentials** &rarr; **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Goa Courier Web Workstation`.
5. Under **Authorized redirect URIs**, add:
   * `http://127.0.0.1:7860/oauth2callback`
   * (If deploying to Hugging Face: `https://your-space-name.hf.space/oauth2callback`)
6. Click **Create**.
7. Copy your **Client ID** (e.g. `123456...apps.googleusercontent.com`) and **Client Secret** (`GOCSPX-...`).

---

## 3. Phase 2: One-Click Token Exchange in the Dashboard

Our workstation includes a built-in token exchanger:

1. Open the workstation at **[http://127.0.0.1:7860](http://127.0.0.1:7860)**.
2. Click on the **⚙️ Manage Configuration** tab.
3. Under **Google Cloud OAuth 2.0 Credentials**:
   * Paste your **Google Client ID**.
   * Paste your **Google Client Secret**.
   * Set Redirect URI to `http://127.0.0.1:7860/oauth2callback`.
   * Click **💾 Save Configurations to SQLite Database**.
4. Click **🔗 Generate Sign-in URL**.
5. Copy the generated URL and open it in a browser tab:
   * Log in with your authorized Google account.
   * Google will ask for permission to manage your Business Profiles. Click **Allow**.
   * Google will provide an authorization code (starting with `4/0AW...`).
6. Copy that authorization code, paste it into the **Paste Google Authorization Code** box in the dashboard, and click **Authorize Token**.
7. **Success:** The application encrypts and stores the refresh token in `security/token_store.py` (`.credentials.enc`), so it persists across restarts!

---

## 4. Phase 3: Discovering Accounts & Branch Locations

Once connected, the backend discovers all branch locations:

### 1. List Accounts:
```http
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
Authorization: Bearer <ACCESS_TOKEN>
```
*Returns your Google Business account resource name (e.g., `accounts/10982347192837`).*

### 2. List Locations:
```http
GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations?readMask=name,title,storefrontAddress
Authorization: Bearer <ACCESS_TOKEN>
```
*Returns each verified branch location (`Margao – Head Office`, `Agassaim`, `Porvorim`, `Canacona`).*

---

## 5. Phase 4: Fetching Reviews with Pagination

### 1. Requesting Reviews:
```http
GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews?pageSize=50&pageToken={nextPageToken}
Authorization: Bearer <ACCESS_TOKEN>
```

### 2. Normalizing the Response:
Google returns reviews in this format:
```json
{
  "reviews": [
    {
      "reviewId": "Ab89...Xy12",
      "reviewer": { "displayName": "Rohan Deshmukh" },
      "starRating": "FIVE",
      "comment": "Super fast delivery and good packing for my parcel sent to Mumbai!",
      "createTime": "2026-11-03T14:22:10Z",
      "reviewReply": null
    }
  ],
  "nextPageToken": "CAESBAgBEA..."
}
```
* The backend converts `FIVE` &rarr; `5`, extracts the reviewer name, verifies existing replies, and saves the records directly to the local SQLite `reviews` table.

---

## 6. Phase 5: Grounded AI Reply Generation (Qwen3-4B-Instruct-2507)

The model identity is strictly pinned to **`Qwen/Qwen3-4B-Instruct-2507`** per SRS requirements.

### Prompt Assembly Architecture:
1. **System Instruction:** Injects Goa Courier Services approved facts, tone rules, and restrictions (no international frozen/fresh seafood claims).
2. **Context Grounding:**
   * Branch Location: (e.g., Margao, Porvorim)
   * Star Rating guidance:
     * **5 Stars:** Warm gratitude, reflect compliments, natural SEO phrase.
     * **4 Stars:** Acknowledge constructive feedback.
     * **3 Stars:** Respectful follow-up invite to `inquiry@goacourierservices.com`.
     * **1–2 Stars:** Apologize for inconvenience without admitting legal fault or promising refunds.
3. **SEO Phrase Selection:** Injects at most 1–2 approved keywords (`professional packing services`, `courier service in Margao`).
4. **Prompt Injection Defense:** Customer reviews are isolated inside `<customer_review> ... </customer_review>` as untrusted input.
5. **Length Enforcement:** Strict target of 35–75 words (hard max: 100 words).

---

## 7. Phase 6: Safe Google Review Reply Publishing

### 1. Pre-Flight Verification:
Before publishing, the system re-queries Google or SQLite to ensure an owner reply was not already published in the interim. **Silent overwriting is strictly prohibited.**

### 2. Publishing the Reply:
```http
PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "comment": "Dear Rohan Deshmukh, thank you for your kind words! We are delighted that you appreciated our professional packing services and prompt handling. At Goa Courier Services, our team in Margao takes great pride in ensuring secure parcel delivery for every shipment. We look forward to assisting you again soon!"
}
```

### 3. Verification & Audit Logging:
* The response status `200 OK` confirms publication.
* The local SQLite database updates the review's status to **Replied**.
* The transaction is logged with timestamp, reviewer ID, and status in the `audit_logs` table.

---

## 8. Phase 7: Production Deployment on Hugging Face Spaces

1. Create a **Private Hugging Face Space** with the **Gradio** SDK.
2. In your Space settings, add your **Space Secrets**:
   * `GOOGLE_CLIENT_ID`
   * `GOOGLE_CLIENT_SECRET`
   * `MODEL_API_KEY` (Your Hugging Face token or OpenRouter key)
3. Push your repository:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
   git push space main
   ```
4. The dashboard will launch securely with full persistence!
