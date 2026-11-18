import type { ReviewRecord } from "./types";

export type DateRangeFilter = "all" | "30d" | "90d" | "365d";

export interface RatingBucket {
  stars: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  count: number;
  avgRating: number;
  positiveCount: number;
  negativeCount: number;
}

export interface BranchMetric {
  location: string;
  total: number;
  avgRating: number;
  replied: number;
  unanswered: number;
  replyRate: number;
  urgentLowStar: number;
  fiveStarShare: number;
}

export interface TopicInsight {
  id: string;
  label: string;
  searchHint: string;
  totalMentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  avgRating: number;
  branches: string[];
}

export interface GrowthRecommendation {
  id: string;
  priority: "High" | "Medium" | "Opportunity";
  title: string;
  summary: string;
  actionLabel: string;
  filterTarget?: {
    location?: string;
    status?: string;
    search?: string;
  };
}

export interface BusinessAnalytics {
  totalReviews: number;
  avgRating: number;
  positiveCount: number;
  positiveShare: number;
  repliedCount: number;
  unansweredCount: number;
  replyRate: number;
  detractorCount: number;
  unansweredDetractorCount: number;
  seoKeywordReplyShare: number;
  ratingBreakdown: RatingBucket[];
  monthlyTrend: MonthlyTrendPoint[];
  branchMetrics: BranchMetric[];
  topicInsights: TopicInsight[];
  recommendations: GrowthRecommendation[];
}

const TOPIC_DEFINITIONS: Array<{
  id: string;
  label: string;
  searchHint: string;
  patterns: RegExp[];
}> = [
  {
    id: "speed",
    label: "Delivery Speed & Timeliness",
    searchHint: "fast",
    patterns: [
      /\bfast\b/i,
      /\bquick\b/i,
      /\bprompt\b/i,
      /\btimely\b/i,
      /\bon[\s-]?time\b/i,
      /\bdelay(ed|s)?\b/i,
      /\blate\b/i,
      /\bslow\b/i,
      /\bexpress\b/i,
      /\bdeliver(y|ed)?\b/i,
    ],
  },
  {
    id: "staff",
    label: "Staff Conduct & Support",
    searchHint: "staff",
    patterns: [
      /\bstaff\b/i,
      /\bpolite\b/i,
      /\bhelpful\b/i,
      /\bfriendly\b/i,
      /\bcourteous\b/i,
      /\brude\b/i,
      /\battitude\b/i,
      /\bteam\b/i,
      /\bguided\b/i,
      /\bbehavior|behaviour\b/i,
    ],
  },
  {
    id: "packing",
    label: "Packing & Parcel Safety",
    searchHint: "pack",
    patterns: [
      /\bpack(ing|ed|age)?\b/i,
      /\bbox(es)?\b/i,
      /\bsafe(ly)?\b/i,
      /\bsecure(ly)?\b/i,
      /\bdamage(d)?\b/i,
      /\bcrushed\b/i,
      /\bbroken\b/i,
      /\bintact\b/i,
      /\bfragile\b/i,
    ],
  },
  {
    id: "international",
    label: "International & Customs",
    searchHint: "international",
    patterns: [
      /\binternational\b/i,
      /\boverseas\b/i,
      /\babroad\b/i,
      /\bworldwide\b/i,
      /\bcustoms\b/i,
      /\bexport\b/i,
      /\b(uk|usa|dubai|canada|australia|europe|germany|london)\b/i,
    ],
  },
  {
    id: "tracking",
    label: "Tracking & Communication",
    searchHint: "track",
    patterns: [
      /\btrack(ing)?\b/i,
      /\bupdate(s|d)?\b/i,
      /\bcommunicat(ion|e|ed)\b/i,
      /\bcall(s|ed)?\b/i,
      /\bphone\b/i,
      /\bresponse\b/i,
      /\binform(ed|ation)?\b/i,
    ],
  },
  {
    id: "pricing",
    label: "Pricing & Value",
    searchHint: "price",
    patterns: [
      /\bprice(s|d)?\b/i,
      /\bpricing\b/i,
      /\brate(s)?\b/i,
      /\bcost(s|ly)?\b/i,
      /\bcharge(s|d)?\b/i,
      /\bexpensive\b/i,
      /\breasonable\b/i,
      /\baffordable\b/i,
      /\bcheap\b/i,
    ],
  },
];

const SEO_KEYWORDS = [
  "courier",
  "packing",
  "parcel",
  "shipping",
  "goa",
  "margao",
  "porvorim",
  "agassaim",
  "canacona",
  "delivery",
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const year = Number(y);
  const monthIdx = Number(m) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return ym;
  }
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[monthIdx]} '${String(year).slice(-2)}`;
}

export function filterReviewsForAnalytics(
  reviews: ReviewRecord[],
  location: string,
  dateRange: DateRangeFilter,
  now = new Date()
): ReviewRecord[] {
  const locLower = (location || "").trim().toLowerCase();
  const daysMap: Record<Exclude<DateRangeFilter, "all">, number> = {
    "30d": 30,
    "90d": 90,
    "365d": 365,
  };
  const cutoffMs =
    dateRange === "all"
      ? null
      : now.getTime() - daysMap[dateRange] * 24 * 60 * 60 * 1000;

  return reviews.filter((r) => {
    if (locLower && locLower !== "all locations") {
      if (!r.location.toLowerCase().includes(locLower)) return false;
    }
    if (cutoffMs !== null) {
      const parsed = Date.parse(r.created_date);
      if (Number.isNaN(parsed) || parsed < cutoffMs) return false;
    }
    return true;
  });
}

export function computeBusinessAnalytics(
  reviews: ReviewRecord[]
): BusinessAnalytics {
  const totalReviews = reviews.length;
  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      avgRating: 0,
      positiveCount: 0,
      positiveShare: 0,
      repliedCount: 0,
      unansweredCount: 0,
      replyRate: 0,
      detractorCount: 0,
      unansweredDetractorCount: 0,
      seoKeywordReplyShare: 0,
      ratingBreakdown: [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: 0,
        percentage: 0,
      })),
      monthlyTrend: [],
      branchMetrics: [],
      topicInsights: [],
      recommendations: [
        {
          id: "connect-gbp",
          priority: "High",
          title: "Connect & Sync Google Business Profile Reviews",
          summary:
            "No reviews are currently available in this filter window. Sync your live Google Business Profile locations to unlock rating trends, topic drivers, and branch comparisons.",
          actionLabel: "Open Review Workstation",
        },
      ],
    };
  }

  const avgRating = round1(
    reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
  );
  const positiveCount = reviews.filter((r) => r.rating >= 4).length;
  const positiveShare = pct(positiveCount, totalReviews);

  const repliedReviews = reviews.filter((r) => r.reply_status === "replied");
  const repliedCount = repliedReviews.length;
  const unansweredCount = totalReviews - repliedCount;
  const replyRate = pct(repliedCount, totalReviews);

  const detractors = reviews.filter((r) => r.rating <= 2);
  const detractorCount = detractors.length;
  const unansweredDetractorCount = detractors.filter(
    (r) => r.reply_status === "unanswered"
  ).length;

  const repliesWithSeo = repliedReviews.filter((r) => {
    const replyLower = (r.existing_reply?.comment || "").toLowerCase();
    return SEO_KEYWORDS.some((kw) => replyLower.includes(kw));
  }).length;
  const seoKeywordReplyShare = pct(repliesWithSeo, repliedCount);

  // Star breakdown 5 -> 1
  const ratingBreakdown: RatingBucket[] = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    return {
      stars,
      count,
      percentage: pct(count, totalReviews),
    };
  });

  // Monthly velocity & rating trend
  const monthBuckets = new Map<string, ReviewRecord[]>();
  for (const r of reviews) {
    const ym = /^\d{4}-\d{2}/.test(r.created_date)
      ? r.created_date.slice(0, 7)
      : "Unknown";
    if (ym === "Unknown") continue;
    const list = monthBuckets.get(ym) ?? [];
    list.push(r);
    monthBuckets.set(ym, list);
  }
  const monthlyTrend: MonthlyTrendPoint[] = Array.from(monthBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, items]) => ({
      month,
      label: formatMonthLabel(month),
      count: items.length,
      avgRating: round1(
        items.reduce((s, item) => s + item.rating, 0) / items.length
      ),
      positiveCount: items.filter((item) => item.rating >= 4).length,
      negativeCount: items.filter((item) => item.rating <= 2).length,
    }));

  // Branch leaderboard
  const branchBuckets = new Map<string, ReviewRecord[]>();
  for (const r of reviews) {
    const loc = r.location || "Primary Location";
    const list = branchBuckets.get(loc) ?? [];
    list.push(r);
    branchBuckets.set(loc, list);
  }
  const branchMetrics: BranchMetric[] = Array.from(branchBuckets.entries())
    .map(([location, items]) => {
      const total = items.length;
      const replied = items.filter((i) => i.reply_status === "replied").length;
      const unanswered = total - replied;
      const urgentLowStar = items.filter(
        (i) => i.rating <= 2 && i.reply_status === "unanswered"
      ).length;
      const fiveStarCount = items.filter((i) => i.rating >= 5).length;
      return {
        location,
        total,
        avgRating: round1(items.reduce((s, i) => s + i.rating, 0) / total),
        replied,
        unanswered,
        replyRate: pct(replied, total),
        urgentLowStar,
        fiveStarShare: pct(fiveStarCount, total),
      };
    })
    .sort((a, b) => b.total - a.total || b.avgRating - a.avgRating);

  // Customer voice & topic extraction
  const topicInsights: TopicInsight[] = TOPIC_DEFINITIONS.map((def) => {
    const matching = reviews.filter((r) => {
      const text = (r.comment || "").trim();
      return text.length > 0 && def.patterns.some((re) => re.test(text));
    });
    const totalMentions = matching.length;
    const positiveMentions = matching.filter((r) => r.rating >= 4).length;
    const neutralMentions = matching.filter((r) => r.rating === 3).length;
    const negativeMentions = matching.filter((r) => r.rating <= 2).length;
    const avgTopicRating =
      totalMentions > 0
        ? round1(matching.reduce((s, r) => s + r.rating, 0) / totalMentions)
        : 0;
    const branches = Array.from(new Set(matching.map((r) => r.location)));

    return {
      id: def.id,
      label: def.label,
      searchHint: def.searchHint,
      totalMentions,
      positiveMentions,
      neutralMentions,
      negativeMentions,
      avgRating: avgTopicRating,
      branches,
    };
  })
    .filter((t) => t.totalMentions > 0)
    .sort((a, b) => b.totalMentions - a.totalMentions);

  // Data-driven Growth Playbook recommendations
  const recommendations: GrowthRecommendation[] = [];

  if (unansweredDetractorCount > 0) {
    recommendations.push({
      id: "urgent-recovery",
      priority: "High",
      title: `Respond to ${unansweredDetractorCount} Unanswered Low-Rating Review${
        unansweredDetractorCount > 1 ? "s" : ""
      }`,
      summary:
        "Unanswered 1–2★ reviews sharply reduce customer trust on Google Maps. Publish empathetic, policy-safe responses inviting direct resolution via inquiry@goacourierservices.com.",
      actionLabel: "Inspect Unanswered Reviews",
      filterTarget: { status: "Unanswered" },
    });
  }

  if (replyRate < 90 && unansweredCount > 0) {
    recommendations.push({
      id: "local-seo-reply-rate",
      priority: replyRate < 50 ? "High" : "Medium",
      title: `Lift Owner Reply Rate from ${replyRate}% toward 95%+`,
      summary: `${unansweredCount} review${
        unansweredCount > 1 ? "s are" : " is"
      } still awaiting a reply. Consistent owner responses with natural courier & city keywords signal high engagement to Google Maps Local Pack rankings.`,
      actionLabel: "Clear Reply Queue",
      filterTarget: { status: "Unanswered" },
    });
  }

  const weakTopic = topicInsights
    .filter((t) => t.negativeMentions > 0 && t.avgRating < 4.0)
    .sort((a, b) => b.negativeMentions - a.negativeMentions)[0];
  if (weakTopic) {
    recommendations.push({
      id: `fix-topic-${weakTopic.id}`,
      priority: weakTopic.avgRating < 3.0 ? "High" : "Medium",
      title: `Address Friction in ${weakTopic.label} (${weakTopic.avgRating}★ avg)`,
      summary: `${weakTopic.negativeMentions} negative review${
        weakTopic.negativeMentions > 1 ? "s" : ""
      } mentioned ${weakTopic.label.toLowerCase()} across ${weakTopic.branches.join(
        ", "
      )}. Review these shipments to tighten branch SOPs.`,
      actionLabel: `View ${weakTopic.label}`,
      filterTarget: { search: weakTopic.searchHint },
    });
  }

  if (branchMetrics.length >= 2) {
    const sortedByScore = [...branchMetrics].sort(
      (a, b) => b.avgRating - a.avgRating
    );
    const best = sortedByScore[0];
    const lowest = sortedByScore[sortedByScore.length - 1];
    if (best.avgRating - lowest.avgRating >= 0.4) {
      recommendations.push({
        id: "branch-benchmark",
        priority: "Medium",
        title: `Replicate ${best.location} (${best.avgRating}★) Standards at ${lowest.location} (${lowest.avgRating}★)`,
        summary: `There is a ${round1(
          best.avgRating - lowest.avgRating
        )}-star gap between your top-rated and lowest-rated branch. Audit counter handoff and packing checks at ${
          lowest.location
        }.`,
        actionLabel: `Inspect ${lowest.location}`,
        filterTarget: { location: lowest.location },
      });
    }
  }

  const topPraise = topicInsights
    .filter((t) => t.positiveMentions > 0 && t.avgRating >= 4.2)
    .sort((a, b) => b.positiveMentions - a.positiveMentions)[0];
  if (topPraise) {
    recommendations.push({
      id: `amplify-${topPraise.id}`,
      priority: "Opportunity",
      title: `Promote Your #1 Strength: ${topPraise.label} (${topPraise.avgRating}★)`,
      summary: `${topPraise.positiveMentions} positive customers specifically praised ${topPraise.label.toLowerCase()}. Feature this advantage in branch signage, WhatsApp updates, and Google Business Profile posts.`,
      actionLabel: "See Matching Reviews",
      filterTarget: { search: topPraise.searchHint },
    });
  }

  if (repliedCount > 0 && seoKeywordReplyShare < 70) {
    recommendations.push({
      id: "seo-keyword-coverage",
      priority: "Opportunity",
      title: `Strengthen Local SEO Keywords in Replies (${seoKeywordReplyShare}% coverage)`,
      summary:
        "Use 'Draft with AI' to naturally weave approved local courier & packing phrases into future owner replies for stronger Google Maps search discovery.",
      actionLabel: "Draft Replies in Workstation",
      filterTarget: { status: "Unanswered" },
    });
  }

  return {
    totalReviews,
    avgRating,
    positiveCount,
    positiveShare,
    repliedCount,
    unansweredCount,
    replyRate,
    detractorCount,
    unansweredDetractorCount,
    seoKeywordReplyShare,
    ratingBreakdown,
    monthlyTrend,
    branchMetrics,
    topicInsights,
    recommendations,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildReviewsCsv(reviews: ReviewRecord[]): string {
  const headers = [
    "Review ID",
    "Reviewer Name",
    "Branch Location",
    "Rating",
    "Date",
    "Reply Status",
    "Customer Comment",
    "Owner Reply",
    "Reply Date",
  ];
  const rows = reviews.map((r) => [
    r.id,
    r.reviewer_name,
    r.location,
    r.rating,
    r.created_date,
    r.reply_status,
    r.comment,
    r.existing_reply?.comment || "",
    r.existing_reply?.update_time || "",
  ]);
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
}
