export type PipelineStage = "Lead" | "Met" | "Follow-up" | "Pilot" | "Customer" | "Pass";

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  stage: PipelineStage;
  nextFollowUp: string | null; // ISO date string
  source: string;
  notes: string;
  avatarUrl?: string;
  createdAt: string;
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
