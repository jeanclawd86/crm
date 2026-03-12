"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { stageColors } from "@/lib/stage-colors";
import { Contact, PipelineStage } from "@/lib/types";

const stages: (PipelineStage | "All")[] = ["All", "Lead", "Met", "Follow-up", "Pilot", "Customer", "Pass"];

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "All">("All");

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === "All" || c.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [contacts, search, stageFilter]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground mt-1">{contacts.length} contacts in pipeline</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by name or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-9 text-sm"
            />
            <div className="flex gap-1 ml-auto">
              {stages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    stageFilter === stage
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Company</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Stage</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Follow-up</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id} className="border-t border-border hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">
                          {contact.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium hover:underline">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.role}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm">{contact.company}</td>
                  <td className="px-6 py-3">
                    <Badge className={stageColors[contact.stage]} variant="secondary">
                      {contact.stage}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {contact.nextFollowUp
                      ? new Date(contact.nextFollowUp + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{contact.source}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                    No contacts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
