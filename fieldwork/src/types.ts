export type TrackId =
  | "data"
  | "pretraining"
  | "midtraining"
  | "posttraining"
  | "agentic"
  | "evaluation"
  | "serving"
  | "systems"
  | "foundations";
export interface Article {
  slug: string;
  title: string;
  subtitle: string;
  track: TrackId;
  order: number;
  minutes: number;
  difficulty: string;
  description: string;
  prerequisites: string[];
  learningGoals: string[];
  sources: string[];
  lab?: string;
  body: string;
}
export interface Source {
  id: string;
  title: string;
  organization: string;
  type: string;
  url: string;
  published: string;
  accessed: string;
  repository?: string | null;
  version?: string | null;
  license: string;
  supports: string[];
  chapters: string[];
  evidence: string;
  file?: string;
  symbol?: string;
  notes?: string;
  excerpt?: string;
  excerptStart?: number;
  callChain?: string;
  inputOutput?: string;
}
