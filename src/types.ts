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

export interface Kpis {
  total: number;
  unanswered: number;
  replied: number;
  avg_rating: number;
}

export interface ValidationStats {
  word_count: number;
  char_count: number;
  in_target_range: boolean;
  exceeds_hard_limit: boolean;
}

export interface SystemConfig {
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
  model_provider: string;
  model_repo_id: string;
  model_api_base_url: string;
  model_api_key: string;
  model_temperature: string;
  model_max_tokens: string;
  company_name: string;
  company_email: string;
  company_website: string;
  seo_phrases: string;
}

export interface BootstrapData {
  isConnected: boolean;
  syncError?: string | null;
  modelDisplayName: string;
  modelRepoId: string;
  locations: string[];
  kpis: Kpis;
  reviews: ReviewRecord[];
}
