export type FactCheckItem = {
  id: number;
  content: string;
  confidence: number | null;
  status: "verified" | "debunked" | "flagged" | "pending";
  timestamp: string | null;
  source: string;
  speaker?: string | null;
  api_processed?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  video_url?: string | null;
  transcript_status?: string | null;
  video_title?: string | null;
};

export type FactCheck = {
  id: number;
  broadcast_id: number | null;
  verification_source: string;
  explanation: string;
  confidence_score: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BroadcastWithFactChecks = FactCheckItem & {
  factChecks?: FactCheck[];
};