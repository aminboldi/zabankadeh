export const targetLanguages = ["en", "de"] as const;
export type TargetLanguage = (typeof targetLanguages)[number];

export const ageBands = ["child", "teen", "adult"] as const;
export type AgeBand = (typeof ageBands)[number];

export const cefrBands = ["pre-a1", "a1", "a2", "b1", "b2", "c1"] as const;
export type CefrBand = (typeof cefrBands)[number];

export type LocalizedText = { fa: string; en: string };

export interface InstituteBrand {
  slug: string;
  name: LocalizedText;
  tagline: LocalizedText;
  primaryColor: string;
  phone: string;
  address: LocalizedText;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  passage?: string;
  audioUrl?: string;
  options: Array<{ id: string; label: string }>;
  skill: "grammar" | "vocabulary" | "reading" | "listening";
}

export interface AssessmentAttempt {
  id: string;
  language: TargetLanguage;
  ageBand: AgeBand;
  questions: AssessmentQuestion[];
  expiresAt: string;
}

export interface AssessmentResult {
  attemptId: string;
  recommendedBand: CefrBand;
  confidence: "low" | "medium" | "high";
  score: number;
  skillScores: Record<string, number>;
  provisional: true;
}

export interface DashboardSummary {
  activeStudents: number;
  activeClasses: number;
  todaySessions: number;
  outstandingRials: number;
  recentApplicants: Array<{ id: string; name: string; language: TargetLanguage; status: string }>;
}
