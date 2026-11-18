export interface ModelConfig {
  repo_id: string;
  display_name: string;
  temperature: number;
  top_p: number;
  max_output_tokens: number;
  request_timeout_seconds: number;
  retry_count: number;
  target_min_words: number;
  target_max_words: number;
  hard_max_words: number;
}

export const MODEL_CONFIG: ModelConfig = {
  repo_id: "Qwen/Qwen3-4B-Instruct-2507",
  display_name: "Qwen3-4B-Instruct-2507",
  temperature: 0.35,
  top_p: 0.85,
  max_output_tokens: 220,
  request_timeout_seconds: 45,
  retry_count: 1,
  target_min_words: 35,
  target_max_words: 75,
  hard_max_words: 100,
};

export const LOCATIONS = [
  "Margao – Head Office",
  "Agassaim",
  "Porvorim",
  "Canacona",
];

export const COMPANY_FACTS = {
  business_name: "Goa Courier Services™",
  website: "www.goacourierservices.com",
  email: "inquiry@goacourierservices.com",
  head_office: "Margao",
  branches: ["Margao", "Agassaim", "Porvorim", "Canacona"],
  services: [
    "Domestic and international courier services",
    "Worldwide shipping from Goa",
    "Serving India and 220+ global destinations",
    "Professional packing and shipment tracking",
  ],
  restrictions: [
    "Do NOT claim international fresh/frozen seafood shipping is available.",
  ],
};

export const SYSTEM_INSTRUCTION =
  "You write public Google review replies for Goa Courier Services™.\n" +
  "Write one concise, courteous, professional reply to the supplied review.\n" +
  "Use Indian business English. Address the reviewer politely without assuming their gender.\n" +
  "Acknowledge the actual review and its star rating.\n" +
  "Use only the supplied facts. Never invent shipment status, delay reasons, customs events,\n" +
  "delivery commitments, compensation, refunds or investigations.\n" +
  "Do not disclose private shipment information or argue with the reviewer.\n" +
  "For negative feedback, acknowledge the concern and apologise for inconvenience where appropriate,\n" +
  "without admitting unverified liability.\n" +
  "Use at most one relevant SEO phrase from the approved phrase library, and a second only if it fits naturally.\n" +
  "Never keyword-stuff. Do not insert a branch keyword unless the review is about that branch.\n" +
  "If the review contains no written comment, respond briefly to the rating.\n" +
  "Do not mention services unrelated to the review. Do not claim fresh/frozen seafood international shipping is available.\n" +
  "Return only the final reply, normally 35–75 words and never more than 100 words.";

export const SEO_PHRASES = {
  brand: "Goa Courier Services",
  general: "courier service in Goa",
  international: "international courier service from Goa",
  domestic: "domestic courier service in Goa",
  worldwide: "worldwide shipping from Goa",
  packing: "professional packing services",
  secure_delivery: "secure parcel delivery",
  branches: {
    Margao: "courier service in Margao",
    Agassaim: "courier service in Agassaim",
    Porvorim: "courier service in Porvorim",
    Canacona: "courier service in Canacona",
  } as Record<string, string>,
};

export function selectSeoPhrases(
  rating: number,
  comment: string,
  locationName: string
): string[] {
  const commentLower = (comment || "").toLowerCase();
  const selected: string[] = [];

  for (const [branch, phrase] of Object.entries(SEO_PHRASES.branches)) {
    if (locationName.toLowerCase().includes(branch.toLowerCase())) {
      selected.push(phrase);
      break;
    }
  }

  if (
    ["international", "abroad", "foreign", "uk", "usa", "dubai", "gulf", "overseas"].some(
      (k) => commentLower.includes(k)
    )
  ) {
    selected.push(SEO_PHRASES.international);
  } else if (["pack", "box", "bubble", "wrap"].some((k) => commentLower.includes(k))) {
    selected.push(SEO_PHRASES.packing);
  } else if (["safe", "secure", "care"].some((k) => commentLower.includes(k))) {
    selected.push(SEO_PHRASES.secure_delivery);
  } else if (
    ["domestic", "india", "mumbai", "delhi", "bangalore", "kerala"].some((k) =>
      commentLower.includes(k)
    )
  ) {
    selected.push(SEO_PHRASES.domestic);
  }

  if (selected.length === 0) {
    selected.push(SEO_PHRASES.general);
  }

  return selected.slice(0, 2);
}
