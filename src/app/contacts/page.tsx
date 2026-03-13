import { getAllContacts } from "@/lib/db";
import { ContactsTable } from "./contacts-table";
import { ContactMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; stage?: string }>;
}) {
  const { mode: modeParam, stage: stageParam } = await searchParams;
  const mode = (modeParam === "investor" ? "investor" : "prospect") as ContactMode;
  const contacts = await getAllContacts(mode);

  return <ContactsTable contacts={contacts} mode={mode} initialStage={stageParam} />;
}
