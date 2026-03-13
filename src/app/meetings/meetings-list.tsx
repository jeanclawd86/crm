"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MeetingWithContact } from "@/lib/types";
import { stageColors } from "@/lib/stage-colors";

export function MeetingsList({ meetings }: { meetings: MeetingWithContact[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {meetings.length} meetings across all contacts
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Meetings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No meetings yet</p>
          ) : (
            <div className="divide-y divide-border">
              {meetings.map((meeting) => (
                <div key={meeting.id}>
                  <button
                    onClick={() => setExpanded(expanded === meeting.id ? null : meeting.id)}
                    className="w-full text-left p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{meeting.title}</p>
                          {(meeting.granolaSummary || meeting.granolaNote) && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              Has summary
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(meeting.dateTime).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {meeting.duration}min
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/contacts/${meeting.contactId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 shrink-0 hover:underline"
                      >
                        <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-[10px] font-medium">
                            {meeting.contact.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{meeting.contact.name}</p>
                          <p className="text-[10px] text-muted-foreground">{meeting.contact.company}</p>
                        </div>
                      </Link>
                      <Badge className={stageColors[meeting.contact.stage]} variant="secondary">
                        {meeting.contact.stage}
                      </Badge>
                      <svg
                        className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                          expanded === meeting.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                    {expanded !== meeting.id && (meeting.granolaSummary || meeting.granolaNote) && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {(meeting.granolaSummary || meeting.granolaNote || "").slice(0, 200)}
                      </p>
                    )}
                  </button>

                  {expanded === meeting.id && (
                    <div className="px-4 pb-4 space-y-3">
                      <Separator />
                      {(meeting.granolaSummary || meeting.granolaNote) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                          <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                            {meeting.granolaSummary || meeting.granolaNote}
                          </div>
                        </div>
                      )}
                      {meeting.userNotes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{meeting.userNotes}</p>
                        </div>
                      )}
                      {meeting.granolaTranscript && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Transcript</p>
                          <div className="text-sm whitespace-pre-wrap bg-muted/20 rounded-md p-3 max-h-64 overflow-y-auto border border-border">
                            {meeting.granolaTranscript}
                          </div>
                        </div>
                      )}
                      <Link
                        href={`/contacts/${meeting.contactId}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-block"
                      >
                        View contact &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
