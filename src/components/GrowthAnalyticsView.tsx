import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  MessageSquareText,
  RefreshCw,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  type DateRangeFilter,
  buildReviewsCsv,
  computeBusinessAnalytics,
  filterReviewsForAnalytics,
} from "../analytics";
import type { ReviewRecord } from "../types";

interface GrowthAnalyticsViewProps {
  reviews: ReviewRecord[];
  locations: string[];
  isConnected: boolean;
  isSyncing: boolean;
  onSyncReviews: () => void;
  onNavigateConfig: () => void;
  onDrillDownToWorkstation: (filters: {
    location?: string;
    status?: string;
    search?: string;
  }) => void;
}

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeFilter; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "365d", label: "12 Months" },
];

export function GrowthAnalyticsView({
  reviews,
  locations,
  isConnected,
  isSyncing,
  onSyncReviews,
  onNavigateConfig,
  onDrillDownToWorkstation,
}: GrowthAnalyticsViewProps) {
  const [branchFilter, setBranchFilter] = useState("All Locations");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const scopedReviews = useMemo(
    () => filterReviewsForAnalytics(reviews, branchFilter, dateRange),
    [reviews, branchFilter, dateRange]
  );

  const analytics = useMemo(
    () => computeBusinessAnalytics(scopedReviews),
    [scopedReviews]
  );

  const maxMonthlyCount = useMemo(
    () => Math.max(1, ...analytics.monthlyTrend.map((m) => m.count)),
    [analytics.monthlyTrend]
  );

  const handleDownloadCsv = () => {
    const csv = buildReviewsCsv(scopedReviews);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `goa-courier-reviews-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls Toolbar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 m-0">
            Business Growth Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-0">
            Live customer sentiment, branch benchmarks, service bottlenecks, and local SEO reply coverage derived directly from your Google Business Profile reviews.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            aria-label="Filter analytics by branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#155eef] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Locations">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <div
            className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
            role="group"
            aria-label="Date range filter"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDateRange(opt.value)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  dateRange === opt.value
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={scopedReviews.length === 0}
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {isConnected ? (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncReviews}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>{isSyncing ? "Syncing..." : "Sync Google Reviews"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNavigateConfig}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Connect Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State when 0 reviews match */}
      {analytics.totalReviews === 0 ? (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#155eef] flex items-center justify-center mx-auto">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 m-0">
            No Reviews in Current Analytics Scope
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto m-0">
            {reviews.length === 0
              ? "Sync your live Google Business Profile reviews to generate branch benchmarks, customer topic sentiment, and growth actions."
              : "Try widening your date window or switching back to All Locations."}
          </p>
          <div className="pt-1 flex items-center justify-center gap-3">
            {reviews.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setBranchFilter("All Locations");
                  setDateRange("all");
                }}
                className="px-4 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold cursor-pointer"
              >
                Reset Analytics Filters
              </button>
            ) : !isConnected ? (
              <button
                type="button"
                onClick={onNavigateConfig}
                className="px-4 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold cursor-pointer"
              >
                Connect Google Business Profile
              </button>
            ) : (
              <button
                type="button"
                disabled={isSyncing}
                onClick={onSyncReviews}
                className="px-4 py-2 rounded-lg bg-[#155eef] hover:bg-[#0d47d1] text-white text-xs font-semibold cursor-pointer"
              >
                Sync Google Reviews Now
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* 4-Column Executive Reputation KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Customer Satisfaction (4–5★)
              </div>
              <div className="font-display text-2xl font-bold text-emerald-700 tabular-nums">
                {analytics.positiveShare}%
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {analytics.positiveCount} of {analytics.totalReviews} reviews ·{" "}
                {analytics.avgRating}★ avg
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Owner Reply Rate
              </div>
              <div className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                {analytics.replyRate}%
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {analytics.repliedCount} replied · {analytics.unansweredCount}{" "}
                awaiting reply
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Low-Rating Risk (1–2★)
              </div>
              <div
                className={`font-display text-2xl font-bold tabular-nums ${
                  analytics.unansweredDetractorCount > 0
                    ? "text-red-700"
                    : "text-slate-900"
                }`}
              >
                {analytics.detractorCount}
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {analytics.unansweredDetractorCount > 0
                  ? `${analytics.unansweredDetractorCount} unanswered requiring urgent recovery`
                  : "All low-rating reviews answered"}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Local SEO Keyword Coverage
              </div>
              <div className="font-display text-2xl font-bold text-[#155eef] tabular-nums">
                {analytics.seoKeywordReplyShare}%
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                Published replies with local logistics keywords
              </div>
            </div>
          </div>

          {/* Charts Row: Rating Breakdown + Monthly Review Velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Star Rating Breakdown */}
            <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h3 className="font-display text-base font-bold text-slate-900 m-0">
                    Star Rating Distribution
                  </h3>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  {analytics.totalReviews} Total
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {analytics.ratingBreakdown.map((bucket) => {
                  const barColor =
                    bucket.stars >= 4
                      ? "bg-emerald-500"
                      : bucket.stars === 3
                      ? "bg-amber-400"
                      : "bg-red-500";
                  return (
                    <div
                      key={bucket.stars}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="w-10 font-semibold text-slate-700 tabular-nums shrink-0">
                        {bucket.stars} ★
                      </span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-md overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-md transition-all`}
                          style={{ width: `${bucket.percentage}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-mono-tabular text-slate-600 shrink-0">
                        {bucket.count} ({bucket.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Monthly Velocity & Sentiment Trend */}
            <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#155eef]" />
                  <h3 className="font-display text-base font-bold text-slate-900 m-0">
                    Monthly Review Velocity &amp; Average Score
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    4–5★
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
                    3★
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-red-500 inline-block" />
                    1–2★
                  </span>
                </div>
              </div>

              {analytics.monthlyTrend.length === 0 ? (
                <p className="text-sm text-slate-500 m-0 py-8 text-center">
                  Monthly trend requires dated Google reviews.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2 items-end">
                  {analytics.monthlyTrend.map((pt) => {
                    const neutralCount =
                      pt.count - pt.positiveCount - pt.negativeCount;
                    const barHeightPct = Math.max(
                      12,
                      Math.round((pt.count / maxMonthlyCount) * 100)
                    );
                    const posPct = Math.round((pt.positiveCount / pt.count) * 100);
                    const neuPct = Math.round((neutralCount / pt.count) * 100);
                    const negPct = Math.max(0, 100 - posPct - neuPct);

                    return (
                      <div
                        key={pt.month}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span className="text-[11px] font-mono-tabular font-semibold text-slate-700">
                          {pt.avgRating}★
                        </span>
                        <div className="w-full h-28 bg-slate-50 border border-slate-100 rounded-lg p-1.5 flex items-end justify-center">
                          <div
                            className="w-7 rounded-sm overflow-hidden flex flex-col-reverse"
                            style={{ height: `${barHeightPct}%` }}
                            title={`${pt.label}: ${pt.count} reviews (${pt.avgRating}★ avg)`}
                          >
                            {posPct > 0 && (
                              <div
                                className="bg-emerald-500 w-full"
                                style={{ height: `${posPct}%` }}
                              />
                            )}
                            {neuPct > 0 && (
                              <div
                                className="bg-amber-400 w-full"
                                style={{ height: `${neuPct}%` }}
                              />
                            )}
                            {negPct > 0 && (
                              <div
                                className="bg-red-500 w-full"
                                style={{ height: `${negPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-center leading-tight">
                          <div className="text-[11px] font-medium text-slate-700">
                            {pt.label}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400">
                            {pt.count} rev
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Branch Performance Leaderboard */}
          <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 m-0">
                  Branch Performance Comparison
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-0">
                  Spot top-performing counters and branches needing operational follow-up.
                </p>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {analytics.branchMetrics.length} Location
                {analytics.branchMetrics.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Branch Location</th>
                    <th className="px-4 py-3 text-right">Reviews</th>
                    <th className="px-4 py-3 text-right">Avg Rating</th>
                    <th className="px-4 py-3 text-right">5★ Share</th>
                    <th className="px-4 py-3 text-right">Reply Rate</th>
                    <th className="px-4 py-3 text-right">Unanswered</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {analytics.branchMetrics.map((b) => (
                    <tr key={b.location} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        <div>{b.location}</div>
                        {b.urgentLowStar > 0 && (
                          <div className="text-xs font-medium text-red-600 mt-0.5">
                            {b.urgentLowStar} unanswered 1–2★ review
                            {b.urgentLowStar > 1 ? "s" : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                        {b.total}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-slate-900">
                        {b.avgRating} ★
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                        {b.fiveStarShare}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular">
                        <span
                          className={
                            b.replyRate >= 80
                              ? "text-emerald-700 font-semibold"
                              : b.replyRate >= 40
                              ? "text-amber-700 font-semibold"
                              : "text-red-700 font-semibold"
                          }
                        >
                          {b.replyRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                        {b.unanswered}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onDrillDownToWorkstation({ location: b.location })
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#155eef] hover:text-[#0d47d1] whitespace-nowrap cursor-pointer"
                        >
                          <span>Open Queue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bottom Split: Customer Voice Topics + Actionable Growth Playbook */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Customer Voice & Operational Drivers */}
            <section className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-[#155eef]" />
                <h3 className="font-display text-base font-bold text-slate-900 m-0">
                  What Customers Talk About (Service Drivers)
                </h3>
              </div>

              {analytics.topicInsights.length === 0 ? (
                <p className="text-sm text-slate-500 m-0 py-4">
                  Written customer comments will be grouped here into operational themes (delivery speed, packing, staff, customs, tracking, pricing) as reviews accumulate.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {analytics.topicInsights.map((topic) => {
                    const posWidth = Math.round(
                      (topic.positiveMentions / topic.totalMentions) * 100
                    );
                    const neuWidth = Math.round(
                      (topic.neutralMentions / topic.totalMentions) * 100
                    );
                    const negWidth = Math.max(0, 100 - posWidth - neuWidth);

                    return (
                      <div key={topic.id} className="py-3.5 first:pt-1 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {topic.label}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {topic.totalMentions} mention
                              {topic.totalMentions > 1 ? "s" : ""} ·{" "}
                              {topic.avgRating}★ avg · {topic.positiveMentions}{" "}
                              positive / {topic.negativeMentions} negative
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onDrillDownToWorkstation({
                                search: topic.searchHint,
                              })
                            }
                            className="text-xs font-semibold text-[#155eef] hover:text-[#0d47d1] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Filter Reviews
                          </button>
                        </div>

                        <div className="h-2 w-full bg-slate-100 rounded-md overflow-hidden flex">
                          {posWidth > 0 && (
                            <div
                              className="bg-emerald-500 h-full"
                              style={{ width: `${posWidth}%` }}
                            />
                          )}
                          {neuWidth > 0 && (
                            <div
                              className="bg-amber-400 h-full"
                              style={{ width: `${neuWidth}%` }}
                            />
                          )}
                          {negWidth > 0 && (
                            <div
                              className="bg-red-500 h-full"
                              style={{ width: `${negWidth}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Actionable Business Growth Playbook */}
            <section className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-display text-base font-bold text-slate-900 m-0">
                  Prioritized Growth Actions
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {analytics.recommendations.map((rec) => {
                  const priorityColor =
                    rec.priority === "High"
                      ? "text-red-700"
                      : rec.priority === "Medium"
                      ? "text-amber-700"
                      : "text-emerald-700";

                  return (
                    <div
                      key={rec.id}
                      className="py-3.5 first:pt-1 last:pb-0 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${priorityColor}`}
                        >
                          {rec.priority === "High" ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5" />
                          )}
                          <span>{rec.priority} Priority</span>
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-slate-900">
                        {rec.title}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600 m-0">
                        {rec.summary}
                      </p>

                      {rec.filterTarget && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              onDrillDownToWorkstation(rec.filterTarget!)
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#155eef] hover:text-[#0d47d1] cursor-pointer"
                          >
                            <span>{rec.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
