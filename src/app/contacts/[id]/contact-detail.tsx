"use client";

import { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InlineEdit } from "@/components/ui/inline-edit";
import { stageColors, stageDotColors } from "@/lib/stage-colors";
import { FollowUpDropdown } from "@/components/follow-up-dropdown";
import { PipelineStage, Activity, Contact, Meeting, Email, getStagesForMode } from "@/lib/types";

function ActivityIcon({ type }: { type: Activity["type"] }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "meeting":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case "email":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case "note":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case "stage_change":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
      );
    case "follow_up_set":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

export function ContactDetail({
  contact,
  activities: initialActivities,
  contactMeetings,
  emails: initialEmails,
  prepMeeting,
}: {
  contact: Contact;
  activities: Activity[];
  contactMeetings: Meeting[];
  emails: Email[];
  prepMeeting?: Meeting;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = contact.mode;
  const modeParam = searchParams.get("mode") || mode;
  const contactStages = getStagesForMode(mode);

  const [stage, setStage] = useState<PipelineStage>(contact.stage);
  const [followUp, setFollowUp] = useState(contact.nextFollowUp ?? "");
  const [activities, setActivities] = useState(initialActivities);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(contact.notes);
  const [editingNotes, setEditingNotes] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [emails] = useState(initialEmails);
  const [localContact, setLocalContact] = useState(contact);
  const [meetings, setMeetings] = useState(contactMeetings);
  const [hideIrrelevantMeetings, setHideIrrelevantMeetings] = useState(true);

  const patchField = useCallback(async (field: string, value: string) => {
    const prev = localContact;
    setLocalContact((c) => ({ ...c, [field]: value }));
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      setLocalContact(prev);
      throw new Error("Failed to save");
    }
    router.refresh();
  }, [localContact, contact.id, router]);

  async function handleFollowUpChange(newDate: string) {
    setFollowUp(newDate);
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUp: newDate || null }),
      });
      if (res.ok) {
        const actRes = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: contact.id,
            type: "follow_up_set",
            description: newDate ? `Follow-up set for ${newDate}` : "Follow-up date cleared",
            timestamp: new Date().toISOString(),
          }),
        });
        if (actRes.ok) {
          const newActivity = await actRes.json();
          setActivities((prev) => [newActivity, ...prev]);
        }
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(newStage: PipelineStage) {
    const oldStage = stage;
    setStage(newStage);
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        const actRes = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: contact.id,
            type: "stage_change",
            description: `Stage changed from ${oldStage} \u2192 ${newStage}`,
            timestamp: new Date().toISOString(),
            metadata: { from: oldStage, to: newStage },
          }),
        });
        if (actRes.ok) {
          const newActivity = await actRes.json();
          setActivities((prev) => [newActivity, ...prev]);
        }
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setEditingNotes(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/enrich`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setEnriching(false);
    }
  }

  async function toggleIrrelevant(meetingId: string, current: boolean) {
    const newVal = !current;
    setMeetings((prev) => prev.map((m) => m.id === meetingId ? { ...m, irrelevant: newVal } : m));
    await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ irrelevant: newVal }),
    });
  }

  function getMeetingSummaryPreview(meeting: Meeting): string {
    const text = meeting.granolaSummary || meeting.granolaNote || "";
    if (!text) return "No summary available";
    const lines = text.split("\n").filter((l) => l.trim());
    return lines.slice(0, 2).join(" ").slice(0, 150) + (text.length > 150 ? "..." : "");
  }

  // Group emails by threadId
  const emailThreads = emails.reduce<Record<string, Email[]>>((acc, email) => {
    const key = email.threadId || email.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(email);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-6xl">
      <Link href={`/contacts?mode=${modeParam}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block">
        &larr; Contacts
      </Link>

      {/* Meeting Prep Banner */}
      {prepMeeting && (
        <Card className="mb-6 border-blue-500/30 bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <CardTitle className="text-base font-medium text-blue-300">Meeting Prep</CardTitle>
              <Badge variant="secondary" className="text-[10px] bg-blue-900/50 text-blue-300">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{prepMeeting.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {new Date(prepMeeting.dateTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" \u2014 "}{prepMeeting.duration}min
                </p>
              </div>
              {prepMeeting.preMeetingBrief && (
                <div>
                  <p className="text-xs font-medium text-blue-400 mb-1">Pre-meeting Brief</p>
                  <p className="text-sm whitespace-pre-wrap">{prepMeeting.preMeetingBrief}</p>
                </div>
              )}
              {/* Quick context from enrichment */}
              {(contact.personSummary || contact.companyDescription) && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-500/20">
                  {contact.personSummary && (
                    <div>
                      <p className="text-xs font-medium text-blue-400 mb-1">About {contact.name.split(" ")[0]}</p>
                      <p className="text-xs text-muted-foreground">{contact.personSummary}</p>
                    </div>
                  )}
                  {contact.companyDescription && (
                    <div>
                      <p className="text-xs font-medium text-blue-400 mb-1">About {contact.company}</p>
                      <p className="text-xs text-muted-foreground">{contact.companyDescription}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Previous meetings summary */}
              {contactMeetings.length > 1 && (
                <div className="pt-2 border-t border-blue-500/20">
                  <p className="text-xs font-medium text-blue-400 mb-1">Previous Meetings ({contactMeetings.length - 1})</p>
                  <div className="space-y-1">
                    {contactMeetings
                      .filter((m) => m.id !== prepMeeting.id)
                      .slice(0, 3)
                      .map((m) => (
                        <p key={m.id} className="text-xs text-muted-foreground">
                          {new Date(m.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" \u2014 "}{m.title}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="col-span-2 space-y-6">
          {/* Account Intelligence */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Account Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              {!localContact.accountStatus && !localContact.keyProblems && !localContact.pilotOpportunities && !localContact.meetingInsights ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet — run transcript analysis to populate</p>
              ) : null}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      localContact.accountStatus && /active|pilot/i.test(localContact.accountStatus)
                        ? "bg-green-500"
                        : localContact.accountStatus && /follow.?up|needs/i.test(localContact.accountStatus)
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`} />
                    <InlineEdit value={localContact.accountStatus || ""} onSave={(v) => patchField("accountStatus", v)} className="text-sm" placeholder="e.g. Active prospect - demo scheduled" />
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Key Problems & Objectives</p>
                  <InlineEdit value={localContact.keyProblems || ""} onSave={(v) => patchField("keyProblems", v)} className="text-sm" placeholder="Key problems/objectives discussed" multiline />
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pilot Opportunities</p>
                  <InlineEdit value={localContact.pilotOpportunities || ""} onSave={(v) => patchField("pilotOpportunities", v)} className="text-sm" placeholder="Potential pilot opportunities identified" multiline />
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Meeting Insights</p>
                  <div className="max-h-48 overflow-y-auto">
                    <InlineEdit value={localContact.meetingInsights || ""} onSave={(v) => patchField("meetingInsights", v)} className="text-sm" placeholder="Cumulative insights from meetings" multiline />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Meeting History</CardTitle>
                {meetings.some((m) => m.irrelevant) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
                      &#8942;
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setHideIrrelevantMeetings(!hideIrrelevantMeetings)}>
                        {hideIrrelevantMeetings ? "Show irrelevant" : "Hide irrelevant"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No meetings yet</p>
              ) : (
                <div className="space-y-3">
                  {meetings
                    .filter((m) => !hideIrrelevantMeetings || !m.irrelevant)
                    .map((meeting) => (
                    <div key={meeting.id} className={`rounded-lg border border-border ${meeting.irrelevant ? "opacity-50" : ""}`}>
                      <button
                        onClick={() => setExpandedMeeting(expandedMeeting === meeting.id ? null : meeting.id)}
                        className="w-full text-left p-3 hover:bg-accent/50 transition-colors rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${meeting.irrelevant ? "line-through" : ""}`}>{meeting.title}</p>
                              {(meeting.granolaSummary || meeting.granolaNote) && (
                                <Badge variant="secondary" className="text-[10px]">Has summary</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(meeting.dateTime).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                              {" \u2014 "}{meeting.duration}min
                            </p>
                          </div>
                          <svg
                            className={`h-4 w-4 text-muted-foreground transition-transform ${expandedMeeting === meeting.id ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                        {expandedMeeting !== meeting.id && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {getMeetingSummaryPreview(meeting)}
                          </p>
                        )}
                      </button>

                      {expandedMeeting === meeting.id && (
                        <div className="px-3 pb-3 space-y-3">
                          <Separator />
                          {(meeting.granolaSummary || meeting.granolaNote) && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                              <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                                {meeting.granolaSummary || meeting.granolaNote}
                              </div>
                            </div>
                          )}
                          {meeting.userNotes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm">{meeting.userNotes}</p>
                            </div>
                          )}
                          {meeting.granolaTranscript && (
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTranscript(showTranscript === meeting.id ? null : meeting.id);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                              >
                                {showTranscript === meeting.id ? "Hide transcript" : "View transcript"}
                              </button>
                              {showTranscript === meeting.id && (
                                <div className="mt-2 text-sm whitespace-pre-wrap bg-muted/20 rounded-md p-3 max-h-96 overflow-y-auto border border-border">
                                  {meeting.granolaTranscript}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Link
                              href={`/meetings/${meeting.id}`}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              View full meeting &rarr;
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleIrrelevant(meeting.id, meeting.irrelevant); }}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {meeting.irrelevant ? "Mark relevant" : "Mark irrelevant"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Threads */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Emails</CardTitle>
            </CardHeader>
            <CardContent>
              {emails.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No emails yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(emailThreads).map(([threadKey, threadEmails]) => (
                    <div key={threadKey} className="rounded-lg border border-border">
                      {threadEmails.map((email, i) => (
                        <div key={email.id} className={i > 0 ? "border-t border-border" : ""}>
                          <button
                            onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                            className="w-full text-left p-3 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{email.subject}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground truncate">
                                    {email.fromAddress}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(email.timestamp).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                              <svg
                                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expandedEmail === email.id ? "rotate-180" : ""}`}
                                fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </div>
                            {expandedEmail !== email.id && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {email.bodyPreview}
                              </p>
                            )}
                          </button>
                          {expandedEmail === email.id && (
                            <div className="px-3 pb-3 space-y-2">
                              <Separator />
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>From: {email.fromAddress}</p>
                                <p>To: {email.toAddress}</p>
                              </div>
                              <div className="text-sm whitespace-pre-wrap bg-muted/20 rounded-md p-3">
                                {email.body || email.bodyPreview}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
              ) : (
                <div className="space-y-0">
                  {activities.map((activity, i) => (
                    <div key={activity.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <ActivityIcon type={activity.type} />
                        </div>
                        {i < activities.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(activity.timestamp).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Notes</CardTitle>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-transparent resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setNotes(contact.notes); setEditingNotes(false); }}
                      className="px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {notes || "No notes yet. Click Edit to add notes."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-4">
          {/* Contact Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-base font-semibold">
                    {contact.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold"><InlineEdit value={localContact.name} onSave={(v) => patchField("name", v)} className="text-lg font-semibold" /></h1>
                  <div><InlineEdit value={localContact.role} onSave={(v) => patchField("role", v)} className="text-sm text-muted-foreground" placeholder="Add role" /></div>
                  <div><InlineEdit value={localContact.company} onSave={(v) => patchField("company", v)} className="text-sm text-muted-foreground" placeholder="Add company" /></div>
                  <div className="mt-1"><InlineEdit value={localContact.email} onSave={(v) => patchField("email", v)} className="text-xs text-muted-foreground" placeholder="Add email" /></div>
                </div>
              </div>
              {/* Stage and mode shown in Pipeline Stage card instead */}
            </CardContent>
          </Card>

          {/* Pipeline Stage Selector */}
          {contactStages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pipeline Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {contactStages.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStageChange(s)}
                      disabled={saving}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        stage === s
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${stageDotColors[s]}`} />
                      {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Date */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Follow-up Date</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpDropdown
                value={followUp || undefined}
                onSelect={(date) => handleFollowUpChange(date)}
              />
              {saving && (
                <p className="text-xs text-muted-foreground mt-1">Saving...</p>
              )}
            </CardContent>
          </Card>

          {/* Enrich Button */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {enriching ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enriching...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    Enrich with Brave Search
                  </>
                )}
              </button>
            </CardContent>
          </Card>

          {/* Company Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Company Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <InlineEdit value={localContact.companyDescription || ""} onSave={(v) => patchField("companyDescription", v)} className="text-sm" placeholder="Add description" multiline />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Industry</p>
                <InlineEdit value={localContact.companyIndustry || ""} onSave={(v) => patchField("companyIndustry", v)} className="text-sm" placeholder="Add industry" />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <InlineEdit value={localContact.companySize || ""} onSave={(v) => patchField("companySize", v)} className="text-sm" placeholder="Add size" />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <InlineEdit value={localContact.companyType || ""} onSave={(v) => patchField("companyType", v)} className="text-sm" placeholder="Add type" />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <InlineEdit value={localContact.companyLocation || ""} onSave={(v) => patchField("companyLocation", v)} className="text-sm" placeholder="Add location" />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Funding</p>
                <InlineEdit value={localContact.companyFunding || ""} onSave={(v) => patchField("companyFunding", v)} className="text-sm" placeholder="Add funding" />
              </div>
            </CardContent>
          </Card>

          {/* Person Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Person Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Background</p>
                <InlineEdit value={localContact.personSummary || ""} onSave={(v) => patchField("personSummary", v)} className="text-sm" placeholder="Add background" multiline />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <InlineEdit value={localContact.location || ""} onSave={(v) => patchField("location", v)} className="text-sm" placeholder="Add location" />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">LinkedIn</p>
                <InlineEdit value={localContact.linkedinUrl || ""} onSave={(v) => patchField("linkedinUrl", v)} className="text-sm text-blue-400" placeholder="Add LinkedIn URL" />
              </div>
            </CardContent>
          </Card>

          {/* Source & Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <InlineEdit value={localContact.source} onSave={(v) => patchField("source", v)} className="text-sm" placeholder="Add source" />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="text-sm">
                  {new Date(contact.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{localContact.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
