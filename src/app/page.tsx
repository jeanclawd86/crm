import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getUpcomingMeetings,
  getRecentMeetings,
  getDueFollowUps,
  getPipelineCounts,
} from "@/lib/db";
import { stageColors, stageDotColors } from "@/lib/stage-colors";
import { ContactMode, getStagesForMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: modeParam } = await searchParams;
  const mode = (modeParam === "investor" ? "investor" : "prospect") as ContactMode;
  const stages = getStagesForMode(mode);

  const [upcomingMeetings, recentMeetings, dueFollowUps, pipelineCounts] = await Promise.all([
    getUpcomingMeetings(mode),
    getRecentMeetings(mode),
    getDueFollowUps(mode),
    getPipelineCounts(mode),
  ]);

  const title = mode === "investor" ? "Fundraising Dashboard" : "Sales Dashboard";

  const orderedCounts = stages.map((stage) => ({
    stage,
    count: pipelineCounts[stage] || 0,
  }));

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Pipeline Summary */}
      {stages.length > 0 && (
        <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: `repeat(${Math.min(stages.length, 10)}, minmax(0, 1fr))` }}>
          {orderedCounts.map(({ stage, count }) => (
            <Link
              key={stage}
              href={`/contacts?mode=${mode}&stage=${encodeURIComponent(stage)}`}
            >
              <Card size="sm" className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`h-2 w-2 rounded-full ${stageDotColors[stage]}`}
                    />
                    <span className="text-xs text-muted-foreground truncate">{stage}</span>
                  </div>
                  <p className="text-2xl font-semibold">{count}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming meetings
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/contacts/${meeting.contactId}?prep=${meeting.id}&mode=${mode}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {meeting.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(meeting.dateTime).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                            {" · "}
                            {new Date(meeting.dateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit" }
                            )}
                            {" · "}
                            {meeting.duration}min
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-[10px] font-medium">
                            {meeting.contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {meeting.contact.name.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Due Follow-ups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Due Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dueFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No follow-ups due
              </p>
            ) : (
              <div className="space-y-2">
                {dueFollowUps.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}?mode=${mode}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">
                          {contact.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.company}
                        </p>
                      </div>
                      <Badge
                        className={stageColors[contact.stage]}
                        variant="secondary"
                      >
                        {contact.stage}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Meetings */}
      {recentMeetings.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent Meetings</h2>
          <div className="space-y-1">
            {recentMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/contacts/${meeting.contactId}?prep=${meeting.id}&mode=${mode}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="text-xs text-muted-foreground w-16 shrink-0">
                  {new Date(meeting.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className="text-sm text-muted-foreground truncate">{meeting.title}</span>
                <span className="text-xs text-muted-foreground/60 shrink-0 ml-auto">{meeting.contact.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link
          href={`/contacts?mode=${mode}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all contacts &rarr;
        </Link>
      </div>
    </div>
  );
}
