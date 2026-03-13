"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { stageColors, stageDotColors } from "@/lib/stage-colors";
import { PipelineStage, Activity, Contact, Meeting, getStagesForMode } from "@/lib/types";

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
}: {
  contact: Contact;
  activities: Activity[];
  contactMeetings: Meeting[];
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
            description: `Stage changed from ${oldStage} → ${newStage}`,
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

  return (
    <div className="p-8 max-w-5xl">
      <Link href={`/contacts?mode=${modeParam}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block">
        &larr; Contacts
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Profile header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-lg font-semibold">
                    {contact.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-semibold">{contact.name}</h1>
                  <p className="text-sm text-muted-foreground">{contact.role} at {contact.company}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{contact.email}</p>
                </div>
                <Badge className={stageColors[stage]} variant="secondary">{stage}</Badge>
              </div>
              {contact.notes && (
                <p className="text-sm text-muted-foreground mt-4 p-3 rounded-md bg-muted/50">{contact.notes}</p>
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

          {/* Past Meetings */}
          {contactMeetings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Meetings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contactMeetings.map((meeting) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(meeting.dateTime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" — "}{meeting.duration}min
                        </p>
                      </div>
                      {meeting.granolaNote && (
                        <Badge variant="secondary" className="text-xs">Has transcript</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Follow-up Date</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="date"
                value={followUp}
                onChange={(e) => handleFollowUpChange(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-transparent"
              />
              {saving && (
                <p className="text-xs text-muted-foreground mt-1">Saving...</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="text-sm">{contact.source}</p>
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
                <p className="text-sm">{contact.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
