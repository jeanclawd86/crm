import { getAllMeetings } from "@/lib/db";
import { MeetingsList } from "./meetings-list";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const meetings = await getAllMeetings();
  return <MeetingsList meetings={meetings} />;
}
