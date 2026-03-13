import { notFound } from "next/navigation";
import { getContact, getContactActivities, getContactMeetings, getContactEmails } from "@/lib/db";
import { ContactDetail } from "./contact-detail";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prep?: string }>;
}) {
  const { id } = await params;
  const { prep: prepMeetingId } = await searchParams;
  const [contact, activities, contactMeetings, emails] = await Promise.all([
    getContact(id),
    getContactActivities(id),
    getContactMeetings(id),
    getContactEmails(id),
  ]);

  if (!contact) {
    notFound();
  }

  const prepMeeting = prepMeetingId
    ? contactMeetings.find((m) => m.id === prepMeetingId)
    : undefined;

  return (
    <ContactDetail
      contact={contact}
      activities={activities}
      contactMeetings={contactMeetings}
      emails={emails}
      prepMeeting={prepMeeting}
    />
  );
}
