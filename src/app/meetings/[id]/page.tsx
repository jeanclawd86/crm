import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getMeeting, getContact, getContactMeetings } from "@/lib/db";
import { stageDotColors } from "@/lib/stage-colors";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const contact = await getContact(meeting.contactId);
  if (!contact) notFound();

  const allMeetings = await getContactMeetings(contact.id);
  const pastMeetings = allMeetings.filter((m) => m.id !== id);

  const meetingDate = new Date(meeting.dateTime);
  const isPast = meetingDate < new Date();

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block">
        &larr; Dashboard
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Meeting header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-semibold">{meeting.title}</h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {meetingDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {meetingDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — {meeting.duration}min
                    </span>
                  </div>
                </div>
                <Badge variant={isPast ? "secondary" : "default"}>
                  {isPast ? "Completed" : "Upcoming"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pre-meeting Brief */}
          {meeting.preMeetingBrief && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                  Pre-Meeting Brief
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm prose-invert max-w-none">
                  {meeting.preMeetingBrief.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="font-semibold text-sm mt-3 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
                    }
                    if (line.startsWith("- ")) {
                      return <p key={i} className="text-sm text-muted-foreground pl-4 py-0.5">{line}</p>;
                    }
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm text-muted-foreground">{line.replace(/\*\*/g, "")}</p>;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Granola Transcript */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Meeting Notes
                {meeting.granolaNote && (
                  <Badge variant="secondary" className="ml-2 text-xs">Granola</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.granolaNote ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  {meeting.granolaNote.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) {
                      return <h3 key={i} className="text-sm font-semibold mt-4 first:mt-0 mb-2">{line.replace("## ", "")}</h3>;
                    }
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="font-medium text-sm mt-2">{line.replace(/\*\*/g, "")}</p>;
                    }
                    if (line.startsWith("- ")) {
                      return <p key={i} className="text-sm text-muted-foreground pl-4 py-0.5">{line}</p>;
                    }
                    if (line.startsWith("[")) {
                      return <p key={i} className="text-sm text-muted-foreground italic mt-2">{line}</p>;
                    }
                    if (line.trim() === "") return <div key={i} className="h-1" />;
                    return <p key={i} className="text-sm text-muted-foreground">{line.replace(/\*\*/g, "")}</p>;
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">No transcript yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Granola transcript will appear here after the meeting</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Notes */}
          {meeting.userNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Your Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{meeting.userNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contact Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/contacts/${contact.id}`} className="block group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">
                      {contact.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:underline">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.role}</p>
                  </div>
                </div>
              </Link>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm">{contact.company}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Stage</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-2 w-2 rounded-full ${stageDotColors[contact.stage]}`} />
                    <span className="text-sm">{contact.stage}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{contact.email}</p>
                </div>
                {contact.nextFollowUp && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Next Follow-up</p>
                      <p className="text-sm">
                        {new Date(contact.nextFollowUp + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Past meetings with this contact */}
          {pastMeetings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Past Meetings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pastMeetings.map((m) => (
                  <Link key={m.id} href={`/meetings/${m.id}`} className="block">
                    <div className="p-2 rounded-md hover:bg-accent transition-colors">
                      <p className="text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
