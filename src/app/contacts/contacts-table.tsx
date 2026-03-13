"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { stageColors } from "@/lib/stage-colors";
import { Contact, ContactMode, PipelineStage, getStagesForMode, getModeLabel } from "@/lib/types";

export function ContactsTable({
  contacts,
  mode,
  initialStage,
}: {
  contacts: Contact[];
  mode: ContactMode;
  initialStage?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "All">(
    (initialStage as PipelineStage) || "All"
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  const stages: (PipelineStage | "All")[] = ["All", ...getStagesForMode(mode)];
  const companyLabel = mode === "investor" ? "Fund" : "Company";

  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage as PipelineStage);
    }
  }, [initialStage]);

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

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkSetStage(newStage: PipelineStage) {
    setBulkAction(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/contacts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: newStage }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkAction(false);
    }
  }

  async function bulkSetFollowUp(date: string) {
    setBulkAction(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/contacts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nextFollowUp: date }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkAction(false);
    }
  }

  async function quickAction(contactId: string, action: "pass" | "follow_up") {
    if (action === "pass") {
      const passStage = mode === "investor" ? "Passed" : "Pass";
      await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: passStage }),
      });
      router.refresh();
    } else {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUp: tomorrow }),
      });
      router.refresh();
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{getModeLabel(mode)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{contacts.length} contacts in pipeline</p>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-accent/50 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <select
              disabled={bulkAction}
              className="text-sm px-2 py-1 rounded-md border border-input bg-background"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) bulkSetStage(e.target.value as PipelineStage);
                e.target.value = "";
              }}
            >
              <option value="" disabled>Set Stage...</option>
              {getStagesForMode(mode).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="date"
              disabled={bulkAction}
              className="text-sm px-2 py-1 rounded-md border border-input bg-background"
              onChange={(e) => {
                if (e.target.value) bulkSetFollowUp(e.target.value);
              }}
              title="Set Follow-up"
            />
            <button
              disabled={bulkAction}
              onClick={() => bulkSetStage(mode === "investor" ? "Passed" : "Pass")}
              className="text-sm px-3 py-1 rounded-md border border-input bg-background hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              Pass All
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder={`Search by name or ${companyLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-9 text-sm"
            />
            <div className="flex gap-1 ml-auto flex-wrap">
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
                <th className="text-left px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-input"
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{companyLabel}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Stage</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Follow-up</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Source</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id} className="border-t border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(contact.id)}
                      onChange={() => toggleOne(contact.id)}
                      className="rounded border-input"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}?mode=${mode}`} className="flex items-center gap-3">
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
                  <td className="px-4 py-3 text-sm">{contact.company}</td>
                  <td className="px-4 py-3">
                    <Badge className={stageColors[contact.stage]} variant="secondary">
                      {contact.stage}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.nextFollowUp
                      ? new Date(contact.nextFollowUp + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{contact.source}</td>
                  <td className="px-4 py-3">
                    <QuickActions
                      contactId={contact.id}
                      onAction={quickAction}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
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

function QuickActions({
  contactId,
  onAction,
}: {
  contactId: string;
  onAction: (id: string, action: "pass" | "follow_up") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-md shadow-md py-1 min-w-[140px]">
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              onClick={() => { onAction(contactId, "pass"); setOpen(false); }}
            >
              Pass
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              onClick={() => { onAction(contactId, "follow_up"); setOpen(false); }}
            >
              Follow-up Tomorrow
            </button>
          </div>
        </>
      )}
    </div>
  );
}
