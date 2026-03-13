import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getTodaysMeetings,
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

  const [todaysMeetings, dueFollowUps, pipelineCounts] = await Promise.all([
    getTodaysMeetings(mode),
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
        <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: `repeat(${Math.min(stages.length, 8)}, minmax(0, 1fr))` }}>
          {orderedCounts.map(({ stage, count }) => (
            <Card key={stage} size="sm">
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
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Today's Meetings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Today&apos;s Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No meetings today
              </p>
            ) : (
              <div className="space-y-2">
                {todaysMeetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {meeting.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(meeting.dateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit" }
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            — {meeting.duration}min
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
