export const targetLanguages = ["en", "de"] as const;
export type TargetLanguage = (typeof targetLanguages)[number];

export const ageBands = ["child", "teen", "adult"] as const;
export type AgeBand = (typeof ageBands)[number];

export const cefrBands = ["pre-a1", "a1", "a2", "b1", "b2", "c1"] as const;
export type CefrBand = (typeof cefrBands)[number];

export const userRoles = ["owner", "branch_manager", "registrar", "finance", "academic_supervisor", "instructor", "student", "guardian"] as const;
export type UserRole = (typeof userRoles)[number];

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
  todaySchedule: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    classCode: string;
    level: string;
    language: TargetLanguage;
    instructorName: string | null;
    roomName: string | null;
  }>;
  recentApplicants: Array<{ id: string; name: string; language: TargetLanguage; status: string }>;
}

export interface StudentSummary {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  gender: "female" | "male" | "other" | null;
  birthDateJalali: string | null;
  status: "lead" | "active" | "frozen" | "inactive";
  joinedAt: string;
  guardianName: string | null;
  guardianMobile: string | null;
}

export interface StudentDetail extends StudentSummary {
  email: string | null;
  nationalId: string | null;
  guardianRelationship: string | null;
}

export interface InstructorSummary {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  bio: Record<string, unknown>;
  status: string;
}

export interface ClassSummary {
  id: string;
  code: string;
  level: string;
  language: TargetLanguage;
  ageBand: AgeBand;
  branchName: string;
  instructorName: string | null;
  roomName: string | null;
  capacity: number;
  feeRials: number;
  status: string;
  classType: "in_person" | "online" | "hybrid";
}

export interface ClassOptions {
  branches: Array<{ id: string; name: string }>;
  levels: Array<{ id: string; label: string; language: TargetLanguage; ageBand: AgeBand }>;
  rooms: Array<{ id: string; name: string; branchId: string }>;
  instructors: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string }>;
}

export interface ClassSessionSummary {
  id: string;
  classId: string;
  classCode: string;
  level: string;
  language: TargetLanguage;
  startsAt: string;
  endsAt: string;
  instructorName: string | null;
  roomName: string | null;
  status: string;
  recurrenceRule: "none" | "weekly";
  meetingProvider: "none" | "google_meet" | "skyroom" | "other";
  meetingUrl: string | null;
  instructorId?: string | null;
  roomId?: string | null;
}

export interface ClassEnrollmentSummary {
  id: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  status: "pending" | "active" | "frozen" | "transferred" | "cancelled" | "completed";
  enrolledAt: string;
}

export interface AttendanceEntry {
  enrollmentId: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: "present" | "absent" | "late" | "excused" | null;
  note: string | null;
  recordedAt: string | null;
}

export interface InvoiceSummary {
  id: string;
  number: string;
  studentId: string;
  studentName: string;
  totalRials: number;
  balanceRials: number;
  status: "draft" | "issued" | "partial" | "paid" | "void" | "refunded";
  dueOn: string | null;
  createdAt: string;
}

export interface ReportOverview {
  generatedAt: string;
  activeStudents: number;
  activeClasses: number;
  scheduledSessions: number;
  outstandingRials: number;
  attendance: { present: number; absent: number; late: number; excused: number; rate: number };
}

export interface PaymentGatewayStatus {
  provider: "manual" | "zarinpal";
  configured: boolean;
  label: string;
}

export interface AssessmentAttemptSummary {
  id: string;
  candidateName: string;
  candidateMobile: string | null;
  language: TargetLanguage;
  ageBand: AgeBand;
  score: number | null;
  recommendedBand: CefrBand | null;
  confidence: "low" | "medium" | "high" | null;
  overrideBand?: CefrBand | null;
  overrideReason?: string | null;
  studentId?: string | null;
  submittedAt: string | null;
  createdAt: string;
}
