import express from "express";
import { MODEL_CONFIG } from "./config.ts";
import { DatabaseService } from "./db.ts";
import {
  GoogleBusinessProfileClient,
  GoogleOAuthService,
  OutputValidator,
  generateDraftForReview,
} from "./services.ts";
import { commitSessionCookie, sessionMiddleware } from "./session.ts";

export function createApiApp() {
  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware);

  // Bootstrap endpoint (auto-syncs live GBP reviews when authorized)
  app.get("/api/bootstrap", async (req, res) => {
    const isConnected = await GoogleOAuthService.isConnected();
    let syncError: string | null = null;

    if (isConnected) {
      try {
        await GoogleBusinessProfileClient.syncAllReviews();
      } catch (err) {
        syncError = err instanceof Error ? err.message : String(err);
        DatabaseService.logAudit("GBP_SYNC", null, "ERROR", syncError);
      }
    }

    commitSessionCookie(req, res);
    res.json({
      isConnected,
      syncError,
      modelDisplayName: MODEL_CONFIG.display_name,
      modelRepoId: MODEL_CONFIG.repo_id,
      locations: DatabaseService.getLocations().map((l) => l.location_name),
      kpis: DatabaseService.getKpis(),
      reviews: DatabaseService.getReviews(),
    });
  });

  // Reviews list with filtering (auto-hydrates cold serverless instances when connected)
  app.get("/api/reviews", async (req, res) => {
    const location = String(req.query.location || "All Locations");
    const status = String(req.query.status || "All");
    const search = String(req.query.search || "");
    let syncError: string | null = null;

    if (!DatabaseService.hasReviews() && (await GoogleOAuthService.isConnected())) {
      try {
        await GoogleBusinessProfileClient.syncAllReviews();
      } catch (err) {
        syncError = err instanceof Error ? err.message : String(err);
        DatabaseService.logAudit("GBP_SYNC", null, "ERROR", syncError);
      }
    }

    commitSessionCookie(req, res);
    const reviews = DatabaseService.getReviews(location, status, search);
    res.json({
      reviews,
      syncError,
      kpis: DatabaseService.getKpis(),
      locations: DatabaseService.getLocations().map((l) => l.location_name),
    });
  });

  // Sync live reviews from Google Business Profile
  app.post("/api/reviews/sync", async (req, res) => {
    const location = String(req.body?.location || req.query.location || "All Locations");
    const status = String(req.body?.status || req.query.status || "All");
    const search = String(req.body?.search || req.query.search || "");
    try {
      const syncResult = await GoogleBusinessProfileClient.syncAllReviews();
      commitSessionCookie(req, res);
      return res.json({
        success: true,
        ...syncResult,
        reviews: DatabaseService.getReviews(location, status, search),
        kpis: DatabaseService.getKpis(),
        locations: DatabaseService.getLocations().map((l) => l.location_name),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      DatabaseService.logAudit("GBP_SYNC", null, "ERROR", msg);
      return res.status(400).json({ error: msg });
    }
  });

  // Single review
  app.get("/api/reviews/:id", (req, res) => {
    const review = DatabaseService.getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }
    return res.json({ review });
  });

  // Generate AI draft reply
  app.post("/api/reviews/:id/draft", async (req, res) => {
    let review = DatabaseService.getReviewById(req.params.id);
    if (!review && req.body?.review && req.body.review.id === req.params.id) {
      review = DatabaseService.upsertReview(req.body.review);
    }
    if (!review && (await GoogleOAuthService.isConnected())) {
      try {
        await GoogleBusinessProfileClient.syncAllReviews();
        review = DatabaseService.getReviewById(req.params.id);
      } catch {
        // handled below as 404
      }
    }
    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }
    try {
      const result = await generateDraftForReview(review);
      commitSessionCookie(req, res);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to generate draft.",
      });
    }
  });

  // Validate draft text
  app.post("/api/validate", (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const validation = OutputValidator.validate(text);
    const stats = OutputValidator.getStats(text);
    res.json({ ...validation, stats });
  });

  // Publish reply
  app.post("/api/reviews/:id/publish", async (req, res) => {
    const { replyText, confirmed, review: reviewSnapshot } = req.body ?? {};
    if (!confirmed) {
      return res.status(400).json({
        error: "Publish aborted: Confirmation checkbox must be checked.",
      });
    }
    if (!replyText || typeof replyText !== "string" || !replyText.trim()) {
      return res.status(400).json({
        error: "Publish aborted: Reply text cannot be empty.",
      });
    }

    let review = DatabaseService.getReviewById(req.params.id);
    if (!review && reviewSnapshot && reviewSnapshot.id === req.params.id) {
      review = DatabaseService.upsertReview(reviewSnapshot);
    }
    if (!review && (await GoogleOAuthService.isConnected())) {
      try {
        await GoogleBusinessProfileClient.syncAllReviews();
        review = DatabaseService.getReviewById(req.params.id);
      } catch {
        // handled below as 404
      }
    }
    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }
    if (review.existing_reply) {
      return res.status(409).json({
        error:
          "Notice: Review already has an owner reply. Overwrite prevented.",
      });
    }

    try {
      const token = await GoogleOAuthService.getValidAccessToken();
      if (!token || !review.resource_name) {
        return res.status(400).json({
          error:
            "Cannot publish: Google Business Profile OAuth connection and live review resource name are required.",
        });
      }

      await GoogleBusinessProfileClient.publishReply(
        review.resource_name,
        replyText,
        token
      );

      const success = DatabaseService.publishReply(review.id, replyText);
      if (!success) {
        return res.status(500).json({ error: "Failed to publish reply." });
      }

      commitSessionCookie(req, res);
      const updatedReview = DatabaseService.getReviewById(review.id);
      return res.json({
        success: true,
        review: updatedReview,
        kpis: DatabaseService.getKpis(),
        message: `Published Successfully! Response published to Google Business Profile for ${review.location} · Status updated to Replied.`,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to publish reply.",
      });
    }
  });

  // Configurations
  app.get("/api/config", (_req, res) => {
    res.json({ configs: DatabaseService.getAllConfigs() });
  });

  app.post("/api/config", (req, res) => {
    const body = req.body ?? {};
    const keys = [
      "google_client_id",
      "google_client_secret",
      "google_redirect_uri",
      "model_provider",
      "model_api_base_url",
      "model_api_key",
      "model_temperature",
      "model_max_tokens",
      "company_name",
      "company_email",
      "company_website",
      "seo_phrases",
    ];

    for (const k of keys) {
      if (body[k] !== undefined) {
        DatabaseService.setConfig(k, String(body[k]).trim());
      }
    }

    DatabaseService.logAudit(
      "CONFIG_UPDATE",
      null,
      "SUCCESS",
      "All system configurations saved to store."
    );
    commitSessionCookie(req, res);
    res.json({
      success: true,
      message: "All configurations successfully saved!",
      configs: DatabaseService.getAllConfigs(),
    });
  });

  // OAuth helpers
  app.post("/api/oauth/url", (req, res) => {
    try {
      const body = req.body ?? {};
      if (typeof body.google_client_id === "string" && body.google_client_id.trim()) {
        DatabaseService.setConfig("google_client_id", body.google_client_id.trim());
      }
      if (typeof body.google_client_secret === "string" && body.google_client_secret.trim()) {
        DatabaseService.setConfig("google_client_secret", body.google_client_secret.trim());
      }
      if (typeof body.google_redirect_uri === "string" && body.google_redirect_uri.trim()) {
        DatabaseService.setConfig("google_redirect_uri", body.google_redirect_uri.trim());
      }
      const { url } = GoogleOAuthService.generateAuthorizationUrl();
      commitSessionCookie(req, res);
      res.json({ url });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Error generating URL",
      });
    }
  });

  app.post("/api/oauth/exchange", async (req, res) => {
    const body = req.body ?? {};
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return res
        .status(400)
        .json({ error: "Please enter the authorization code." });
    }
    if (typeof body.google_client_id === "string" && body.google_client_id.trim()) {
      DatabaseService.setConfig("google_client_id", body.google_client_id.trim());
    }
    if (typeof body.google_client_secret === "string" && body.google_client_secret.trim()) {
      DatabaseService.setConfig("google_client_secret", body.google_client_secret.trim());
    }
    if (typeof body.google_redirect_uri === "string" && body.google_redirect_uri.trim()) {
      DatabaseService.setConfig("google_redirect_uri", body.google_redirect_uri.trim());
    }
    try {
      await GoogleOAuthService.exchangeCodeForTokens(code);
      DatabaseService.logAudit(
        "OAUTH_AUTH",
        null,
        "SUCCESS",
        "Google OAuth token exchanged and stored."
      );

      let syncMessage = "";
      let syncError: string | null = null;
      try {
        const syncRes = await GoogleBusinessProfileClient.syncAllReviews();
        syncMessage = ` Fetched ${syncRes.reviewsCount} live review(s) across ${syncRes.locationsCount} location(s).`;
      } catch (syncErr) {
        syncError =
          syncErr instanceof Error ? syncErr.message : String(syncErr);
        DatabaseService.logAudit("GBP_SYNC", null, "ERROR", syncError);
        syncMessage = ` Connected, but review sync returned: ${syncError}`;
      }

      commitSessionCookie(req, res);
      return res.json({
        success: true,
        isConnected: true,
        syncError,
        message: `Successfully connected to Google Business Profile!${syncMessage}`,
        reviews: DatabaseService.getReviews(),
        kpis: DatabaseService.getKpis(),
        locations: DatabaseService.getLocations().map((l) => l.location_name),
      });
    } catch (err) {
      return res.status(400).json({
        error: `Connection failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  });

  // OAuth callback helper page
  app.get("/oauth2callback", (req, res) => {
    const code = String(req.query.code || "");
    const error = String(req.query.error || "");
    res.send(`<!doctype html>
<html>
  <head><title>Google OAuth Callback</title></head>
  <body style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background: #f4f7fb; color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
      <h2>Goa Courier Services™ — OAuth Callback</h2>
      ${
        error
          ? `<p style="color: #dc2626;">Authorization failed: ${error}</p>`
          : code
          ? `<p>Copy this authorization code and paste it in the <strong>Manage Configuration</strong> tab:</p>
             <pre style="background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto;">${code}</pre>`
          : `<p>No authorization code received.</p>`
      }
    </div>
  </body>
</html>`);
  });

  // Audit logs
  app.get("/api/audit-logs", (req, res) => {
    const limit = Number(req.query.limit || 50);
    res.json({ logs: DatabaseService.getAuditLogs(limit) });
  });

  return app;
}
