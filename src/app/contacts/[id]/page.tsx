import { notFound } from "next/navigation";
import { getContact, getContactActivities, getContactMeetings } from "@/lib/db";
import { ContactDetail } from "./contact-detail";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact, activities, contactMeetings] = await Promise.all([
    getContact(id),
    getContactActivities(id),
    getContactMeetings(id),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <ContactDetail
      contact={contact}
      activities={activities}
      contactMeetings={contactMeetings}
    />
  );
}
