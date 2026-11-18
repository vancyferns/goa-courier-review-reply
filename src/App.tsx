import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CornerUpLeft,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Home,
  Info,
  KeyRound,
  Link2,
  MapPin,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  XCircle,
} from "lucide-react";
import { GrowthAnalyticsView } from "./components/GrowthAnalyticsView";
import type {
  AuditLogRecord,
  BootstrapData,
  Kpis,
  ReviewRecord,
  SystemConfig,
  ValidationStats,
} from "./types";

type ActiveTab = "workstation" | "analytics" | "config" | "audit";

const EMPTY_STATS: ValidationStats = {
  word_count: 0,
  char_count: 0,
  in_target_range: false,
  exceeds_hard_limit: false,
};

function computeStatsLocal(text: string): ValidationStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  return {
    word_count: words.length,
    char_count: trimmed.length,
    in_target_range: words.length >= 35 && words.length <= 75,
    exceeds_hard_limit: words.length > 100,
  };
}

function CourierBrandMark() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="36" height="36" rx="10" fill="#155EEF" />
      <path
        d="M8 21.5L26.5 11L21.5 26L17.2 20.8L8 21.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M17.2 20.8L26.5 11L14.5 17.6"
        stroke="#93C5FD"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("workstation");

  // Global status
  const [isConnected, setIsConnected] = useState(false);
  const [modelDisplayName, setModelDisplayName] = useState(
    "Qwen3-4B-Instruct-2507"
  );
  const [locations, setLocations] = useState<string[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    total: 0,
    unanswered: 0,
    replied: 0,
    avg_rating: 0,
  });

  // Workstation & Analytics state
  const [allReviews, setAllReviews] = useState<ReviewRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [locFilter, setLocFilter] = useState("All Locations");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);

  const [draftText, setDraftText] = useState("");
  const [originalDraft, setOriginalDraft] = useState("");
  const [draftStats, setDraftStats] = useState<ValidationStats>(EMPTY_STATS);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [draftValid, setDraftValid] = useState(true);
  const [resetNotice, setResetNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    type: "ok" | "warn" | "err";
    text: string;
  } | null>(null);

  // Configuration state
  const [configs, setConfigs] = useState<SystemConfig>({
    google_client_id: "",
    google_client_secret: "",
    google_redirect_uri:
      typeof window !== "undefined"
        ? `${window.location.origin}/oauth2callback`
        : "http://127.0.0.1:3000/oauth2callback",
    model_provider: "huggingface",
    model_repo_id: "Qwen/Qwen3-4B-Instruct-2507",
    model_api_base_url:
      "https://api-inference.huggingface.co/models/Qwen/Qwen3-4B-Instruct-2507",
    model_api_key: "",
    model_temperature: "0.35",
    model_max_tokens: "220",
    company_name: "Goa Courier Services™",
    company_email: "inquiry@goacourierservices.com",
    company_website: "www.goacourierservices.com",
    seo_phrases:
      "courier service in Goa, professional packing services, secure parcel delivery, worldwide shipping from Goa, domestic courier service in Goa",
  });
  const [oauthUrl, setOauthUrl] = useState("");
  const [oauthCode, setOauthCode] = useState("");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [saveConfigMsg, setSaveConfigMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  const selectedReview =
    reviews.find((r) => r.id === selectedReviewId) ?? null;

  const selectReview = useCallback((review: ReviewRecord | null) => {
    if (!review) {
      setSelectedReviewId(null);
      setDraftText("");
      setOriginalDraft("");
      setDraftStats(EMPTY_STATS);
      setValidationIssues([]);
      setResetNotice("");
      setConfirmed(false);
      setPublishResult(null);
      return;
    }
    setSelectedReviewId(review.id);
    const initialDraft = review.existing_reply?.comment ?? "";
    setDraftText(initialDraft);
    setOriginalDraft(initialDraft);
    setDraftStats(computeStatsLocal(initialDraft));
    setValidationIssues([]);
    setDraftValid(true);
    setResetNotice("");
    setConfirmed(false);
    setPublishResult(null);
  }, []);

  useEffect(() => {
    setIsBootstrapping(true);
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((data: BootstrapData) => {
        setIsConnected(Boolean(data.isConnected));
        setSyncError(data.syncError ?? null);
        setModelDisplayName(data.modelDisplayName);
        setLocations(data.locations ?? []);
        setKpis(data.kpis);
        const list = data.reviews ?? [];
        setAllReviews(list);
        setReviews(list);
        if (list.length > 0) {
          selectReview(list[0]);
        } else {
          selectReview(null);
        }
      })
      .catch((err) => {
        console.error("Failed to bootstrap:", err);
        setSyncError(
          err instanceof Error ? err.message : "Failed to load reviews."
        );
      })
      .finally(() => setIsBootstrapping(false));
  }, [selectReview]);

  const applyReviewListResponse = useCallback(
    (data: {
      reviews?: ReviewRecord[];
      allReviews?: ReviewRecord[];
      kpis?: Kpis;
      locations?: string[];
      syncError?: string | null;
    }) => {
      const list: ReviewRecord[] = data.reviews ?? [];
      setReviews(list);
      if (Array.isArray(data.allReviews)) {
        setAllReviews(data.allReviews);
      }
      if (data.kpis) setKpis(data.kpis);
      if (Array.isArray(data.locations)) {
        setLocations(data.locations);
      }
      if (data.syncError !== undefined) {
        setSyncError(data.syncError);
      }

      setSelectedReviewId((prevId) => {
        const stillExists = list.find((r) => r.id === prevId);
        if (stillExists) return prevId;
        const first = list[0] ?? null;
        if (first) {
          const initialDraft = first.existing_reply?.comment ?? "";
          setDraftText(initialDraft);
          setOriginalDraft(initialDraft);
          setDraftStats(computeStatsLocal(initialDraft));
          setValidationIssues([]);
          setResetNotice("");
          setConfirmed(false);
          setPublishResult(null);
          return first.id;
        }
        setDraftText("");
        setOriginalDraft("");
        setDraftStats(EMPTY_STATS);
        setValidationIssues([]);
        return null;
      });
    },
    []
  );

  const filterLocalReviews = useCallback(
    (source: ReviewRecord[], loc: string, stat: string, search: string) => {
      const q = (search || "").trim().toLowerCase();
      const l = (loc || "").trim().toLowerCase();
      const s = (stat || "").trim().toLowerCase();
      return source
        .filter((r) => {
          if (l && l !== "all locations" && !r.location.toLowerCase().includes(l)) {
            return false;
          }
          if (s && s !== "all" && r.reply_status !== s) {
            return false;
          }
          if (q) {
            const hit =
              (r.reviewer_name || "").toLowerCase().includes(q) ||
              (r.comment || "").toLowerCase().includes(q) ||
              (r.location || "").toLowerCase().includes(q);
            if (!hit) return false;
          }
          return true;
        })
        .slice()
        .sort((a, b) => {
          const aRank = a.reply_status === "unanswered" ? 0 : 1;
          const bRank = b.reply_status === "unanswered" ? 0 : 1;
          if (aRank !== bRank) return aRank - bRank;
          return b.created_date.localeCompare(a.created_date);
        });
    },
    []
  );

  const fetchFilteredReviews = useCallback(
    async (loc = locFilter, stat = statusFilter, search = searchQuery) => {
      if (allReviews.length > 0) {
        applyReviewListResponse({
          reviews: filterLocalReviews(allReviews, loc, stat, search),
        });
        return;
      }
      const params = new URLSearchParams({
        location: loc,
        status: stat,
        search,
      });
      const resp = await fetch(`/api/reviews?${params.toString()}`);
      const data = await resp.json();
      applyReviewListResponse(data);
    },
    [
      locFilter,
      statusFilter,
      searchQuery,
      allReviews,
      filterLocalReviews,
      applyReviewListResponse,
    ]
  );

  const handleDrillDownToWorkstation = useCallback(
    (filters: { location?: string; status?: string; search?: string }) => {
      const nextLoc = filters.location ?? "All Locations";
      const nextStatus = filters.status ?? "All";
      const nextSearch = filters.search ?? "";
      setLocFilter(nextLoc);
      setStatusFilter(nextStatus);
      setSearchQuery(nextSearch);
      setActiveTab("workstation");
      applyReviewListResponse({
        reviews: filterLocalReviews(allReviews, nextLoc, nextStatus, nextSearch),
      });
    },
    [allReviews, filterLocalReviews, applyReviewListResponse]
  );

  const handleRefreshReviews = async () => {
    setSyncNotice("");
    setSyncError(null);
    if (!isConnected) {
      setActiveTab("config");
      return;
    }
    setIsSyncing(true);
    try {
      const resp = await fetch("/api/reviews/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: locFilter,
          status: statusFilter,
          search: searchQuery,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSyncNotice(
          `Synced ${data.reviewsCount} live review(s) across ${data.locationsCount} location(s).`
        );
        applyReviewListResponse({
          reviews: data.reviews,
          allReviews: data.allReviews ?? data.reviews,
          kpis: data.kpis,
          locations: data.locations,
          syncError: null,
        });
      } else {
        setSyncError(data.error || "Sync failed.");
      }
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : "Failed to sync from Google."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (activeTab === "config") {
      fetch("/api/config")
        .then((r) => r.json())
        .then((data) => {
          if (data.configs) {
            const loaded = data.configs as SystemConfig;
            if (
              typeof window !== "undefined" &&
              loaded.google_redirect_uri ===
                "http://127.0.0.1:3000/oauth2callback"
            ) {
              loaded.google_redirect_uri = `${window.location.origin}/oauth2callback`;
            }
            setConfigs(loaded);
          }
        })
        .catch(() => {});
    } else if (activeTab === "audit") {
      fetch("/api/audit-logs")
        .then((r) => r.json())
        .then((data) => {
          if (data.logs) setAuditLogs(data.logs);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const handleDraftChange = async (value: string) => {
    setDraftText(value);
    setResetNotice("");
    setDraftStats(computeStatsLocal(value));
    try {
      const resp = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await resp.json();
      setDraftValid(Boolean(data.isValid));
      setValidationIssues(data.issues ?? []);
      if (data.stats) setDraftStats(data.stats);
    } catch {
      // ignore transient validation failure
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedReviewId || !selectedReview) return;
    setIsGenerating(true);
    setResetNotice("");
    setPublishResult(null);
    try {
      const resp = await fetch(`/api/reviews/${selectedReviewId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: selectedReview }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setDraftText(data.draft);
        setOriginalDraft(data.draft);
        setDraftValid(Boolean(data.isValid));
        setValidationIssues(data.issues ?? []);
        setDraftStats(data.stats ?? computeStatsLocal(data.draft));
      } else {
        setValidationIssues([data.error || "Failed to generate draft."]);
        setDraftValid(false);
      }
    } catch (err) {
      setValidationIssues([
        err instanceof Error ? err.message : "Network error generating draft.",
      ]);
      setDraftValid(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDraft = async () => {
    setDraftText(originalDraft);
    setDraftStats(computeStatsLocal(originalDraft));
    if (originalDraft) {
      setResetNotice("Reset to original draft.");
      const resp = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalDraft }),
      });
      const data = await resp.json();
      setDraftValid(Boolean(data.isValid));
      setValidationIssues(data.issues ?? []);
    } else {
      setResetNotice("");
      setValidationIssues([]);
    }
  };

  const handlePublishReply = async () => {
    if (!confirmed) {
      setPublishResult({
        type: "err",
        text: "Publish aborted: Confirmation checkbox must be checked.",
      });
      return;
    }
    if (!selectedReviewId || !draftText.trim()) {
      setPublishResult({
        type: "err",
        text: "Publish aborted: Reply text cannot be empty.",
      });
      return;
    }
    if (selectedReview?.existing_reply) {
      setPublishResult({
        type: "warn",
        text: "Notice: Review already has an owner reply. Overwrite prevented.",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const resp = await fetch(`/api/reviews/${selectedReviewId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText: draftText,
          confirmed,
          review: selectedReview,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setPublishResult({
          type: "ok",
          text: data.message,
        });
        if (data.kpis) setKpis(data.kpis);
        if (data.review) {
          setAllReviews((prev) =>
            prev.map((item) => (item.id === data.review.id ? data.review : item))
          );
          setReviews((prev) =>
            prev.map((item) => (item.id === data.review.id ? data.review : item))
          );
          selectReview(data.review);
        } else {
          await fetchFilteredReviews();
        }
      } else {
        setPublishResult({
          type: resp.status === 409 ? "warn" : "err",
          text: data.error || "Failed to publish reply.",
        });
      }
    } catch (err) {
      setPublishResult({
        type: "err",
        text: err instanceof Error ? err.message : "Failed to publish reply.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveConfigs = async () => {
    setSaveConfigMsg(null);
    try {
      const resp = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configs),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSaveConfigMsg({
          type: "ok",
          text: data.message || "All configurations successfully saved!",
        });
      } else {
        setSaveConfigMsg({
          type: "err",
          text: data.error || "Failed to save configurations.",
        });
      }
    } catch (err) {
      setSaveConfigMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Save failed.",
      });
    }
  };

  const handleGenerateOauthUrl = async () => {
    setOauthStatus(null);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configs),
      });
      const resp = await fetch("/api/oauth/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_client_id: configs.google_client_id,
          google_client_secret: configs.google_client_secret,
          google_redirect_uri: configs.google_redirect_uri,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.url) {
        setOauthUrl(data.url);
      } else {
        setOauthStatus({
          type: "err",
          text: data.error || "Error generating authorization URL.",
        });
      }
    } catch (err) {
      setOauthStatus({
        type: "err",
        text: err instanceof Error ? err.message : "Error generating URL.",
      });
    }
  };

  const handleExchangeOauthCode = async () => {
    if (!oauthCode.trim()) {
      setOauthStatus({
        type: "err",
        text: "Please enter the authorization code.",
      });
      return;
    }
    try {
      const resp = await fetch("/api/oauth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: oauthCode,
          google_client_id: configs.google_client_id,
          google_client_secret: configs.google_client_secret,
          google_redirect_uri: configs.google_redirect_uri,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setIsConnected(true);
        setSyncError(data.syncError ?? null);
        if (Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
        if (data.kpis) setKpis(data.kpis);
        if (Array.isArray(data.reviews)) {
          setAllReviews(data.reviews);
          setReviews(data.reviews);
          selectReview(data.reviews[0] ?? null);
        }
        setOauthStatus({
          type: data.syncError ? "err" : "ok",
          text: data.message,
        });
      } else {
        setOauthStatus({
          type: "err",
          text: data.error || "Connection failed.",
        });
      }
    } catch (err) {
      setOauthStatus({
        type: "err",
        text: err instanceof Error ? err.message : "Connection failed.",
      });
    }
  };

  const refreshAuditLogs = async () => {
    const resp = await fetch("/api/audit-logs");
    const data = await resp.json();
    if (data.logs) setAuditLogs(data.logs);
  };

  const isErrorState = draftStats.exceeds_hard_limit || !draftValid;
  const isWarnState =
    !isErrorState &&
    draftStats.word_count > 0 &&
    !draftStats.in_target_range;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f4f7fb] text-slate-900">
      {/* Left Navigation Sidebar */}
      <aside className="sidebar-gradient text-white lg:w-[252px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-900/20">
        <div>
          {/* Brand Mark */}
          <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
            <CourierBrandMark />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm tracking-tight text-white truncate">
                Goa Courier Services™
              </div>
              <div className="text-[11px] text-blue-200/80 truncate">
                Courier · Logistics · Freight
              </div>
            </div>
          </div>

          {/* Primary Nav */}
          <nav
            className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto"
            aria-label="Primary Navigation"
          >
            <button
              type="button"
              onClick={() => setActiveTab("workstation")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === "workstation"
                  ? "bg-[#155eef] text-white shadow-sm"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Review Workstation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-[#155eef] text-white shadow-sm"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Growth Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === "config"
                  ? "bg-[#155eef] text-white shadow-sm"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Manage Configuration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === "audit"
                  ? "bg-[#155eef] text-white shadow-sm"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Activity &amp; Audit Logs</span>
            </button>
          </nav>
        </div>

        {/* Bottom Storefront Summary (Desktop) */}
        <div className="hidden lg:flex flex-col items-center text-center px-5 py-6 border-t border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-300/20 flex items-center justify-center mb-3 text-blue-200">
            <Store className="w-6 h-6" />
          </div>
          <p className="text-xs leading-relaxed text-blue-100/80 m-0">
            Manage &amp; Reply to Google Reviews for Goa Courier Services™
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#155eef] shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold text-slate-900 m-0 truncate">
                Google Business Profile
              </h1>
              <div className="text-xs text-slate-500 truncate">
                Review Workstation · Official Console
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 flex-wrap text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isConnected ? "Live Google GBP Sync" : "Live-Only Mode"}</span>
            </span>

            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
              |
            </span>

            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap ${
                isConnected ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>
                {isConnected
                  ? "Google GBP: Connected"
                  : "Google GBP: Not Connected"}
              </span>
            </span>

            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
              |
            </span>

            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-violet-700 font-mono-tabular">
              <Cpu className="w-3.5 h-3.5" />
              <span>{modelDisplayName}</span>
            </span>

            {!isConnected && activeTab !== "config" && (
              <button
                type="button"
                onClick={() => setActiveTab("config")}
                className="px-3.5 py-1.5 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Connect Google
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-5 lg:p-6 max-w-[1440px] w-full mx-auto">
          {/* TAB 1: WORKSTATION */}
          {activeTab === "workstation" && (
            <div className="space-y-5">
              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Total Reviews
                      </div>
                      <div className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                        {kpis.total}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <CornerUpLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Needs Reply
                      </div>
                      <div className="font-display text-2xl font-bold text-amber-700 tabular-nums mt-0.5">
                        {kpis.unanswered}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Replied
                      </div>
                      <div className="font-display text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                        {kpis.replied}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Average Score
                      </div>
                      <div className="font-display text-2xl font-bold text-violet-700 tabular-nums mt-0.5 flex items-center gap-1">
                        <span>{kpis.total > 0 ? kpis.avg_rating : "—"}</span>
                        <Star className="w-5 h-5 fill-violet-600 text-violet-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Split: Review Inbox (Left) & Review Workspace (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Review Inbox */}
                <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#155eef]" />
                      <h2 className="font-display text-base font-bold text-slate-900 m-0">
                        Review Inbox
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      {reviews.length} Reviews
                    </span>
                  </div>

                  {/* Search & Filters */}
                  <div className="py-4 border-b border-slate-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="loc-filter"
                          className="block text-xs font-medium text-slate-600 mb-1.5"
                        >
                          Branch Location
                        </label>
                        <select
                          id="loc-filter"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={locFilter}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocFilter(val);
                            fetchFilteredReviews(val, statusFilter, searchQuery);
                          }}
                        >
                          <option value="All Locations">All Locations</option>
                          {locations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-xs font-medium text-slate-600 mb-1.5">
                          Review Status
                        </span>
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                          {["All", "Unanswered", "Replied"].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                setStatusFilter(st);
                                fetchFilteredReviews(
                                  locFilter,
                                  st,
                                  searchQuery
                                );
                              }}
                              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                                statusFilter === st
                                  ? "bg-white text-slate-900 shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="search-box"
                        type="text"
                        className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Type customer name, branch, or keywords..."
                        value={searchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchQuery(val);
                          fetchFilteredReviews(locFilter, statusFilter, val);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={handleRefreshReviews}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              isSyncing ? "animate-spin" : ""
                            }`}
                          />
                          <span>
                            {isSyncing
                              ? "Syncing from Google..."
                              : isConnected
                              ? "Sync Google Reviews"
                              : "Connect to Sync"}
                          </span>
                        </button>

                        {(locFilter !== "All Locations" ||
                          statusFilter !== "All" ||
                          searchQuery !== "") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDrillDownToWorkstation({
                                location: "All Locations",
                                status: "All",
                                search: "",
                              })
                            }
                            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 whitespace-nowrap cursor-pointer transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>

                      {syncNotice && (
                        <span className="text-xs text-slate-600">
                          {syncNotice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Queue Items */}
                  <div className="pt-4 space-y-2.5 max-h-[620px] overflow-y-auto pr-0.5">
                    {isBootstrapping && (
                      <div className="py-8 text-center text-sm text-slate-500">
                        Loading live Google Business Profile reviews...
                      </div>
                    )}
                    {!isBootstrapping && syncError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 space-y-2">
                        <div className="flex items-start gap-2 font-semibold">
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Google Business Profile Sync Error</span>
                        </div>
                        <p className="m-0 leading-relaxed break-words">
                          {syncError}
                        </p>
                      </div>
                    )}
                    {!isBootstrapping && reviews.length === 0 && !syncError && (
                      <div className="py-8 px-4 text-center space-y-3">
                        {!isConnected ? (
                          <>
                            <p className="text-sm text-slate-600 m-0">
                              Connect your Google Business Profile account to fetch live customer reviews.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab("config")}
                              className="px-4 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Connect Google Business Profile
                            </button>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500 m-0">
                            {kpis.total === 0
                              ? "Connected to Google Business Profile, but no reviews were found for your locations."
                              : "No reviews match the current filter criteria."}
                          </p>
                        )}
                      </div>
                    )}
                    {reviews.map((r) => {
                      const isUnanswered = r.reply_status === "unanswered";
                      const isSelected = selectedReviewId === r.id;
                      const locClean = r.location.replace(" – Head Office", "");
                      const snippet = r.comment
                        ? r.comment.length > 52
                          ? `${r.comment.slice(0, 52)}...`
                          : r.comment
                        : "(Rating only — no written text)";

                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectReview(r)}
                          className={`w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "border-[#155eef] bg-blue-50/70 ring-1 ring-blue-500/20"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                                    isUnanswered
                                      ? "text-red-600"
                                      : "text-emerald-700"
                                  }`}
                                >
                                  {isUnanswered ? "[Needs Reply]" : "[Replied]"}
                                </span>
                                <span className="text-sm font-semibold text-slate-900 truncate">
                                  {r.reviewer_name || "Anonymous Customer"}
                                </span>
                                <span className="text-xs text-slate-400 shrink-0">
                                  · {locClean}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i <= r.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span className="truncate">&ldquo;{snippet}&rdquo;</span>
                              <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
                                {r.id}
                              </span>
                            </div>
                          </div>

                          <ChevronRight
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? "text-[#155eef]" : "text-slate-400"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Right Column: Detail Card + AI Reply Studio + Safe Publication Gate */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Selected Review Detail */}
                  {!selectedReview ? (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-sm text-slate-500">
                      Please select a review from the left queue to view details.
                    </div>
                  ) : (
                    <section className="bg-white border border-slate-200/80 rounded-2xl p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-full bg-[#155eef] text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                            {(selectedReview.reviewer_name || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <h2 className="font-display text-lg font-bold text-slate-900 m-0">
                              {selectedReview.reviewer_name ||
                                "Anonymous Customer"}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {selectedReview.location}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-mono-tabular">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {selectedReview.created_date}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-[#155eef] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Google Review
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${
                            selectedReview.reply_status === "replied"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {selectedReview.reply_status === "replied"
                            ? "Replied"
                            : "Needs Reply"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-4 mb-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i <= selectedReview.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 text-sm font-semibold text-slate-700 tabular-nums">
                          {selectedReview.rating}.0
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-[15px] leading-relaxed text-slate-800">
                        &ldquo;
                        {selectedReview.comment ? (
                          selectedReview.comment
                        ) : (
                          <em className="text-slate-500">
                            (Rating only — customer did not leave a written
                            comment)
                          </em>
                        )}
                        &rdquo;
                      </div>

                      {selectedReview.existing_reply && (
                        <div className="mt-4 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Official Owner Reply Published (
                              {selectedReview.existing_reply.update_time})
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-slate-800 m-0">
                            {selectedReview.existing_reply.comment}
                          </p>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Google AI Reply Studio */}
                  <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-display text-base font-bold text-slate-900 m-0">
                          Google AI Reply Studio
                        </h3>
                      </div>
                      <span className="text-xs font-mono-tabular text-slate-500">
                        Model: Qwen3-4B-Instruct
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        disabled={!selectedReview || isGenerating}
                        onClick={handleGenerateDraft}
                        className="btn-draft-ai flex-1 min-w-[180px] rounded-xl px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {isGenerating ? "Drafting..." : "Draft with AI"}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={!selectedReview || isGenerating}
                        onClick={handleGenerateDraft}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Regenerate</span>
                      </button>

                      <button
                        type="button"
                        disabled={!selectedReview}
                        onClick={handleResetDraft}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor="draft-editor"
                        className="block text-xs font-semibold text-slate-600 mb-1.5"
                      >
                        Approved Reply Editor (Review, customize, and polish
                        text before sending)
                      </label>
                      <textarea
                        id="draft-editor"
                        rows={5}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Click 'Draft with AI' to compose an SEO-aware response grounded in approved business rules..."
                        value={draftText}
                        onChange={(e) => handleDraftChange(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium font-mono-tabular ${
                          isErrorState
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : isWarnState
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isErrorState ? (
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                        ) : isWarnState ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          Words: {draftStats.word_count} | Characters:{" "}
                          {draftStats.char_count} | Target: 35–75 words (Max:
                          100)
                        </span>
                      </div>

                      {resetNotice && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{resetNotice}</span>
                        </div>
                      )}

                      {validationIssues.length > 0 && (
                        <div
                          className={`px-3.5 py-2.5 rounded-lg text-xs font-medium space-y-1 ${
                            isErrorState
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {validationIssues.map((iss, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{iss}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Safe Publication Gate */}
                  <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-display text-base font-bold text-slate-900 m-0">
                        Safe Publication Gate
                      </h3>
                    </div>

                    <div className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Info className="w-4 h-4 text-[#155eef] mt-0.5 shrink-0" />
                      <p className="m-0 leading-relaxed">
                        <strong className="text-slate-800">
                          Operating Rule:
                        </strong>{" "}
                        <em>
                          AI drafts; a human approves; the official Google API
                          publishes.
                        </em>{" "}
                        Publishing sends the exact text above to Google Business
                        Profile.
                      </p>
                    </div>

                    <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#155eef] focus:ring-[#155eef]"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      <span>
                        I verify this response adheres to Goa Courier Services
                        brand standards, accuracy, and SEO policies.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={!confirmed || !draftText.trim() || isPublishing}
                      onClick={handlePublishReply}
                      className="w-full rounded-xl bg-[#155eef] hover:bg-[#0d47d1] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm py-3 px-5 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isPublishing
                          ? "Publishing..."
                          : "Publish Reply to Google Maps / Search"}
                      </span>
                    </button>

                    {publishResult && (
                      <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                          publishResult.type === "ok"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : publishResult.type === "warn"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {publishResult.type === "ok" ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : publishResult.type === "warn" ? (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{publishResult.text}</span>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GROWTH ANALYTICS */}
          {activeTab === "analytics" && (
            <GrowthAnalyticsView
              reviews={allReviews}
              locations={locations}
              isConnected={isConnected}
              isSyncing={isSyncing}
              onSyncReviews={handleRefreshReviews}
              onNavigateConfig={() => setActiveTab("config")}
              onDrillDownToWorkstation={handleDrillDownToWorkstation}
            />
          )}

          {/* TAB 3: MANAGE CONFIGURATION */}
          {activeTab === "config" && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 m-0">
                  System Settings &amp; Integration Hub
                </h2>
                <p className="text-sm text-slate-500 mt-1 mb-0">
                  Configure Google Cloud OAuth 2.0 credentials to fetch live
                  Google Business Profile reviews, AI Inference Provider
                  settings, company grounding facts, and SEO rules.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Google Cloud OAuth 2.0 */}
                <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#155eef]" />
                    <h3 className="font-display text-base font-bold text-slate-900 m-0">
                      Google Cloud OAuth 2.0 Credentials
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Google Client ID
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="xxxxxxxx.apps.googleusercontent.com"
                      value={configs.google_client_id}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          google_client_id: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Google Client Secret
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showClientSecret ? "text" : "password"}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                        value={configs.google_client_secret}
                        onChange={(e) =>
                          setConfigs({
                            ...configs,
                            google_client_secret: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientSecret((v) => !v)}
                        aria-label={
                          showClientSecret
                            ? "Hide client secret"
                            : "Show client secret"
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      >
                        {showClientSecret ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {configs.google_client_secret.includes(
                      ".apps.googleusercontent.com"
                    ) && (
                      <p className="text-xs text-red-600 mt-1 mb-0">
                        This looks like your Client ID. Paste your Client Secret
                        (starts with GOCSPX-) here instead.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Authorized Redirect URI
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={configs.google_redirect_uri}
                        onChange={(e) =>
                          setConfigs({
                            ...configs,
                            google_redirect_uri: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfigs({
                            ...configs,
                            google_redirect_uri: `${window.location.origin}/oauth2callback`,
                          })
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer"
                      >
                        Use App URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleGenerateOauthUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Generate Sign-in URL</span>
                    </button>
                  </div>

                  {oauthUrl && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">
                        OAuth Authorization URL (Open in new tab to authorize)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono-tabular text-slate-700"
                          value={oauthUrl}
                        />
                        <a
                          href={oauthUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#155eef] text-white text-xs font-semibold whitespace-nowrap hover:bg-[#0d47d1]"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 items-end pt-1">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Paste Google Authorization Code
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="4/0AW..."
                        value={oauthCode}
                        onChange={(e) => setOauthCode(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExchangeOauthCode}
                      className="px-4 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Authorize Token
                    </button>
                  </div>

                  {oauthStatus && (
                    <div
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium ${
                        oauthStatus.type === "ok"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {oauthStatus.type === "ok" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{oauthStatus.text}</span>
                    </div>
                  )}
                </section>

                {/* AI Model & Inference Provider */}
                <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-600" />
                    <h3 className="font-display text-base font-bold text-slate-900 m-0">
                      AI Model &amp; Inference Provider
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Inference Provider
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={configs.model_provider}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          model_provider: e.target.value,
                        })
                      }
                    >
                      {[
                        "huggingface",
                        "openrouter",
                        "ollama_local",
                        "together_ai",
                        "custom",
                      ].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Model Identity (Fixed per SRS Specification)
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono-tabular text-slate-600"
                      value="Qwen/Qwen3-4B-Instruct-2507"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Provider API Base URL
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={configs.model_api_base_url}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          model_api_base_url: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Provider API Key
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Enter API Key (e.g. hf_...)"
                      value={configs.model_api_key}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          model_api_key: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-mono-tabular">
                        Temperature ({configs.model_temperature})
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        className="w-full accent-[#155eef]"
                        value={configs.model_temperature}
                        onChange={(e) =>
                          setConfigs({
                            ...configs,
                            model_temperature: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-mono-tabular">
                        Max Output Tokens ({configs.model_max_tokens})
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="500"
                        step="10"
                        className="w-full accent-[#155eef]"
                        value={configs.model_max_tokens}
                        onChange={(e) =>
                          setConfigs({
                            ...configs,
                            model_max_tokens: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* Company Knowledge Base */}
                <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#155eef]" />
                    <h3 className="font-display text-base font-bold text-slate-900 m-0">
                      Company Knowledge Base &amp; Grounding
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Business Legal Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={configs.company_name}
                      onChange={(e) =>
                        setConfigs({ ...configs, company_name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Customer Inquiry Email
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={configs.company_email}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          company_email: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Company Website
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={configs.company_website}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          company_website: e.target.value,
                        })
                      }
                    />
                  </div>
                </section>

                {/* Approved SEO Keywords */}
                <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#155eef]" />
                    <h3 className="font-display text-base font-bold text-slate-900 m-0">
                      Approved SEO Keywords
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      SEO Keywords (Comma-separated)
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={configs.seo_phrases}
                      onChange={(e) =>
                        setConfigs({ ...configs, seo_phrases: e.target.value })
                      }
                    />
                  </div>

                  <p className="text-xs text-slate-500 m-0">
                    <em>Policy:</em> Inject maximum 1–2 relevant phrases
                    naturally. No keyword-stuffing.
                  </p>
                </section>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveConfigs}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#155eef] hover:bg-[#0d47d1] text-white text-sm font-semibold cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configurations</span>
                </button>

                {saveConfigMsg && (
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${
                      saveConfigMsg.type === "ok"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {saveConfigMsg.type === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{saveConfigMsg.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY & AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 m-0">
                    System Activity &amp; Audit Trail
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 mb-0">
                    Chronological log of review responses published, OAuth
                    authentication events, Google review syncs, and
                    configuration updates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refreshAuditLogs}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Audit Logs</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Review ID</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No audit records recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((l) => {
                        const isSuccess = l.status === "SUCCESS";
                        return (
                          <tr key={l.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono-tabular text-xs text-slate-500 whitespace-nowrap">
                              {l.timestamp}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                              {l.action}
                            </td>
                            <td className="px-4 py-3 font-mono-tabular text-xs text-slate-500 whitespace-nowrap">
                              {l.review_id || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  isSuccess
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {isSuccess ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                <span>{l.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {l.message}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
