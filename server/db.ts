import { getSessionConfig, setSessionConfig } from "./session.ts";

export interface ExistingReply {
  comment: string;
  update_time: string;
}

export interface ReviewRecord {
  id: string;
  resource_name?: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  location: string;
  created_date: string;
  reply_status: "unanswered" | "replied";
  existing_reply: ExistingReply | null;
  last_draft_text?: string;
}

export interface AuditLogRecord {
  id: number;
  timestamp: string;
  action: string;
  review_id: string | null;
  status: string;
  message: string;
}

export interface BusinessLocation {
  id: number;
  location_name: string;
  display_name: string;
  is_enabled: number;
}

function formatTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Live data store (populated from Google Business Profile API)
const configStore = new Map<string, string>([
  ["google_client_id", ""],
  ["google_client_secret", ""],
  ["google_redirect_uri", "http://127.0.0.1:3000/oauth2callback"],
  ["model_provider", "huggingface"],
  ["model_repo_id", "Qwen/Qwen3-4B-Instruct-2507"],
  [
    "model_api_base_url",
    "https://api-inference.huggingface.co/models/Qwen/Qwen3-4B-Instruct-2507",
  ],
  ["model_api_key", ""],
  ["model_temperature", "0.35"],
  ["model_max_tokens", "220"],
  ["company_name", "Goa Courier Services™"],
  ["company_email", "inquiry@goacourierservices.com"],
  ["company_website", "www.goacourierservices.com"],
  [
    "seo_phrases",
    "courier service in Goa, professional packing services, secure parcel delivery, worldwide shipping from Goa, domestic courier service in Goa",
  ],
]);

const locationsStore: BusinessLocation[] = [];

const reviewsStore: ReviewRecord[] = [];

const auditLogsStore: AuditLogRecord[] = [
  {
    id: 1,
    timestamp: formatTimestamp(),
    action: "SYSTEM_INIT",
    review_id: null,
    status: "SUCCESS",
    message:
      "Workstation initialized in live-only mode. Connect Google Business Profile to fetch actual reviews.",
  },
];

let nextAuditId = 2;

export const DatabaseService = {
  getConfig(key: string, defaultVal = ""): string {
    const sessionVal = getSessionConfig(key);
    if (sessionVal !== undefined && sessionVal !== "") {
      return sessionVal;
    }
    const val = configStore.get(key);
    if (val !== undefined && val !== "") {
      return val;
    }
    const envKey = key.toUpperCase();
    if (process.env[envKey]) {
      return process.env[envKey] as string;
    }
    return val !== undefined ? val : defaultVal;
  },

  setConfig(key: string, value: string): void {
    configStore.set(key, value);
    setSessionConfig(key, value);
  },

  getAllConfigs(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of configStore.keys()) {
      out[k] = DatabaseService.getConfig(k, "");
    }
    return out;
  },

  getReviews(
    location = "All Locations",
    status = "All",
    search = ""
  ): ReviewRecord[] {
    const q = (search || "").trim().toLowerCase();
    const loc = (location || "").trim().toLowerCase();
    const stat = (status || "").trim().toLowerCase();

    const filtered = reviewsStore.filter((r) => {
      if (loc && loc !== "all locations") {
        if (!r.location.toLowerCase().includes(loc)) return false;
      }
      if (stat && stat !== "all") {
        if (r.reply_status !== stat) return false;
      }
      if (q) {
        const nameMatch = (r.reviewer_name || "").toLowerCase().includes(q);
        const commentMatch = (r.comment || "").toLowerCase().includes(q);
        const locMatch = (r.location || "").toLowerCase().includes(q);
        if (!nameMatch && !commentMatch && !locMatch) return false;
      }
      return true;
    });

    return filtered
      .slice()
      .sort((a, b) => {
        const aRank = a.reply_status === "unanswered" ? 0 : 1;
        const bRank = b.reply_status === "unanswered" ? 0 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return b.created_date.localeCompare(a.created_date);
      });
  },

  getReviewById(reviewId: string): ReviewRecord | null {
    return reviewsStore.find((r) => r.id === reviewId) ?? null;
  },

  publishReply(reviewId: string, replyText: string): boolean {
    const review = reviewsStore.find((r) => r.id === reviewId);
    if (!review) return false;

    review.reply_status = "replied";
    review.existing_reply = {
      comment: replyText.trim(),
      update_time: "Just now",
    };

    DatabaseService.logAudit(
      "PUBLISH_REPLY",
      reviewId,
      "SUCCESS",
      `Published owner reply: ${replyText.slice(0, 60)}...`
    );
    return true;
  },

  saveDraft(reviewId: string, draftText: string): void {
    const review = reviewsStore.find((r) => r.id === reviewId);
    if (review) {
      review.last_draft_text = draftText;
    }
  },

  logAudit(
    action: string,
    reviewId: string | null,
    status: string,
    message: string
  ): void {
    auditLogsStore.unshift({
      id: nextAuditId++,
      timestamp: formatTimestamp(),
      action,
      review_id: reviewId,
      status,
      message,
    });
  },

  getAuditLogs(limit = 50): AuditLogRecord[] {
    return auditLogsStore.slice(0, limit);
  },

  getLocations(): BusinessLocation[] {
    return locationsStore;
  },

  hasReviews(): boolean {
    return reviewsStore.length > 0;
  },

  upsertReview(review: ReviewRecord): ReviewRecord {
    const idx = reviewsStore.findIndex((r) => r.id === review.id);
    if (idx >= 0) {
      reviewsStore[idx] = { ...reviewsStore[idx], ...review };
      return reviewsStore[idx];
    }
    reviewsStore.push(review);
    return review;
  },

  replaceSyncedReviews(
    syncedReviews: ReviewRecord[],
    discoveredLocations: string[]
  ): void {
    reviewsStore.length = 0;
    reviewsStore.push(...syncedReviews);

    locationsStore.length = 0;
    discoveredLocations.forEach((locName, idx) => {
      locationsStore.push({
        id: idx + 1,
        location_name: locName,
        display_name: locName,
        is_enabled: 1,
      });
    });
  },

  getKpis() {
    const total = reviewsStore.length;
    const unanswered = reviewsStore.filter(
      (r) => r.reply_status === "unanswered"
    ).length;
    const replied = reviewsStore.filter(
      (r) => r.reply_status === "replied"
    ).length;
    const avg_rating =
      total > 0
        ? Math.round(
            (reviewsStore.reduce((acc, r) => acc + r.rating, 0) / total) * 10
          ) / 10
        : 0;
    return { total, unanswered, replied, avg_rating };
  },
};

export const AppSecrets = {
  get(key: string, defaultVal = ""): string {
    return DatabaseService.getConfig(key.toLowerCase(), defaultVal);
  },
  googleClientId(): string {
    return AppSecrets.get("GOOGLE_CLIENT_ID", "");
  },
  googleClientSecret(): string {
    return AppSecrets.get("GOOGLE_CLIENT_SECRET", "");
  },
  googleRedirectUri(): string {
    return AppSecrets.get(
      "GOOGLE_REDIRECT_URI",
      "http://127.0.0.1:3000/oauth2callback"
    );
  },
  tokenEncryptionKey(): string {
    return process.env.TOKEN_ENCRYPTION_KEY || "";
  },
  aiProviderApiKey(): string {
    return AppSecrets.get("MODEL_API_KEY", "");
  },
  aiProviderBaseUrl(): string {
    return AppSecrets.get(
      "MODEL_API_BASE_URL",
      "https://api-inference.huggingface.co/models/Qwen/Qwen3-4B-Instruct-2507"
    );
  },
  aiProviderName(): string {
    return AppSecrets.get("MODEL_PROVIDER", "huggingface");
  },
};
