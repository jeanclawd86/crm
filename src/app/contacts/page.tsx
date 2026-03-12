import { getAllContacts } from "@/lib/db";
import { ContactsTable } from "./contacts-table";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await getAllContacts();

  return <ContactsTable contacts={contacts} />;
}
