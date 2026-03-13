export type ContactMode = "prospect" | "investor" | "advisor";

export type ProspectStage = "Lead" | "Intro" | "Met" | "Follow-up" | "Demo Scheduled" | "Pilot Agreed" | "Pilot Active" | "Customer" | "Churned" | "Pass";
export type InvestorStage = "Researching" | "Warm Intro" | "Met" | "Pitched" | "Due Diligence" | "Term Sheet" | "Committed" | "Passed";

export type PipelineStage = ProspectStage | InvestorStage;

export const PROSPECT_STAGES: ProspectStage[] = ["Lead", "Intro", "Met", "Follow-up", "Demo Scheduled", "Pilot Agreed", "Pilot Active", "Customer", "Churned", "Pass"];
export const INVESTOR_STAGES: InvestorStage[] = ["Researching", "Warm Intro", "Met", "Pitched", "Due Diligence", "Term Sheet", "Committed", "Passed"];

export function getStagesForMode(mode: ContactMode): PipelineStage[] {
  switch (mode) {
    case "prospect":
      return PROSPECT_STAGES;
    case "investor":
      return INVESTOR_STAGES;
    case "advisor":
      return [];
  }
}

export function getModeLabel(mode: ContactMode): string {
  switch (mode) {
    case "prospect":
      return "Prospects";
    case "investor":
      return "Investors";
    case "advisor":
      return "Advisors";
  }
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  stage: PipelineStage;
  mode: ContactMode;
  nextFollowUp: string | null; // ISO date string
  source: string;
  notes: string;
  avatarUrl?: string;
  createdAt: string;
  // Enrichment fields
  linkedinUrl?: string;
  location?: string;
  personSummary?: string;
  companyDescription?: string;
  companySize?: string;
  companyIndustry?: string;
  companyType?: string;
  companyLocation?: string;
  companyFunding?: string;
}

export interface Meeting {
  id: string;
  contactId: string;
  title: string;
  dateTime: string; // ISO date string
  duration: number; // minutes
  calendarEventId?: string;
  granolaNote?: string;
  preMeetingBrief?: string;
  userNotes?: string;
  granolaId?: string;
  granolaTranscript?: string;
  granolaSummary?: string;
}

export type ActivityType = "meeting" | "email" | "note" | "stage_change" | "follow_up_set";

export interface Activity {
  id: string;
  contactId: string;
  type: ActivityType;
  description: string;
  timestamp: string; // ISO date string
  metadata?: Record<string, string>;
}
