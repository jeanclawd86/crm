"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ContactMode,
} from "@/lib/types";

type ImportField =
  | "name"
  | "email"
  | "company"
  | "role"
  | "stage"
  | "mode"
  | "source"
  | "notes"
  | "nextFollowUp"
  | "__skip__";

const IMPORT_FIELDS: { value: ImportField; label: string; required: boolean }[] = [
  { value: "name", label: "Name", required: true },
  { value: "email", label: "Email", required: true },
  { value: "company", label: "Company", required: true },
  { value: "role", label: "Role", required: true },
  { value: "stage", label: "Stage", required: false },
  { value: "mode", label: "Mode", required: false },
  { value: "source", label: "Source", required: false },
  { value: "notes", label: "Notes", required: false },
  { value: "nextFollowUp", label: "Next Follow-up", required: false },
  { value: "__skip__", label: "(Skip)", required: false },
];

const REQUIRED_FIELDS: ImportField[] = ["name", "email", "company", "role"];

interface ParsedRow {
  [key: string]: string;
}

type ImportStep = "input" | "mapping" | "preview" | "importing" | "done";

interface ImportResult {
  total: number;
  imported: number;
  errors: { index: number; error: string }[];
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === "," || ch === "\t") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim()).map(parseLine);
  return { headers, rows };
}

function guessMapping(headers: string[]): ImportField[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  return headers.map((h) => {
    const n = normalize(h);
    if (n.includes("name") || n === "fullname" || n === "contact") return "name";
    if (n.includes("email") || n === "mail") return "email";
    if (n.includes("company") || n.includes("fund") || n.includes("org")) return "company";
    if (n.includes("role") || n.includes("title") || n.includes("position")) return "role";
    if (n.includes("stage") || n.includes("status") || n.includes("pipeline")) return "stage";
    if (n === "mode" || n === "type" || n === "category") return "mode";
    if (n.includes("source") || n.includes("origin") || n.includes("channel")) return "source";
    if (n.includes("note") || n.includes("comment")) return "notes";
    if (n.includes("followup") || n.includes("follow") || n.includes("next")) return "nextFollowUp";
    return "__skip__";
  });
}

export function ImportWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = (searchParams.get("mode") as ContactMode) || "prospect";

  const [step, setStep] = useState<ImportStep>("input");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ImportField[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  }, []);

  function handleParse() {
    const { headers: h, rows: r } = parseCSV(csvText);
    if (h.length === 0 || r.length === 0) return;
    setHeaders(h);
    setRows(r);
    setColumnMapping(guessMapping(h));
    setStep("mapping");
  }

  function updateMapping(index: number, field: ImportField) {
    setColumnMapping((prev) => {
      const next = [...prev];
      next[index] = field;
      return next;
    });
  }

  const mappedContacts: ParsedRow[] = rows.map((row) => {
    const obj: ParsedRow = {};
    columnMapping.forEach((field, i) => {
      if (field !== "__skip__" && row[i] !== undefined) {
        obj[field] = row[i];
      }
    });
    return obj;
  });

  const missingRequired = REQUIRED_FIELDS.filter(
    (f) => !columnMapping.includes(f)
  );

  function handleConfirmMapping() {
    if (missingRequired.length > 0) return;
    setStep("preview");
  }

  async function handleImport() {
    setStep("importing");
    const contacts = mappedContacts.map((row) => ({
      name: row.name || "",
      email: row.email || "",
      company: row.company || "",
      role: row.role || "",
      stage: row.stage || undefined,
      mode: (row.mode as ContactMode) || currentMode,
      source: row.source || "CSV Import",
      notes: row.notes || "",
      nextFollowUp: row.nextFollowUp || undefined,
    }));

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      const data = await res.json();
      setImportResult({
        total: data.total ?? contacts.length,
        imported: data.imported ?? 0,
        errors: data.errors ?? [],
      });
      setStep("done");
    } catch {
      setImportResult({
        total: contacts.length,
        imported: 0,
        errors: [{ index: -1, error: "Network error — import failed" }],
      });
      setStep("done");
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import Contacts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV file or paste CSV data to bulk-import contacts.
        </p>
      </div>

      {/* Step 1: Input */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload CSV file</label>
              <Input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="max-w-sm"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Or paste CSV data</label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"name,email,company,role,stage,source\nJohn Doe,john@acme.com,Acme Inc,CEO,Lead,Website"}
                rows={10}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleParse}
              disabled={!csvText.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              Parse CSV
            </button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingRequired.length > 0 && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
                Missing required mappings: {missingRequired.join(", ")}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">CSV Column</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Maps To</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Sample Values</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-3 py-2 font-medium">{header}</td>
                      <td className="px-3 py-2">
                        <select
                          value={columnMapping[i]}
                          onChange={(e) => updateMapping(i, e.target.value as ImportField)}
                          className="text-sm px-2 py-1 rounded-md border border-input bg-background"
                        >
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}{f.required ? " *" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {rows.slice(0, 3).map((r) => r[i]).filter(Boolean).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("input")}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleConfirmMapping}
                disabled={missingRequired.length > 0}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                Preview ({rows.length} rows)
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview ({rows.length} contacts)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">#</th>
                    {REQUIRED_FIELDS.map((f) => (
                      <th key={f} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground capitalize">{f}</th>
                    ))}
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Stage</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedContacts.map((contact, i) => {
                    const valid = REQUIRED_FIELDS.every((f) => contact[f]);
                    return (
                      <tr key={i} className={`border-b border-border ${valid ? "" : "bg-destructive/5"}`}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        {REQUIRED_FIELDS.map((f) => (
                          <td key={f} className="px-3 py-2">{contact[f] || <span className="text-destructive">missing</span>}</td>
                        ))}
                        <td className="px-3 py-2">
                          {contact.stage ? (
                            <Badge variant="secondary">{contact.stage}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Lead</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{contact.source || "CSV Import"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("mapping")}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Import {rows.length} Contacts
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Importing contacts...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {step === "done" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="p-4 rounded-lg bg-accent/50 flex-1 text-center">
                <p className="text-2xl font-semibold">{importResult.imported}</p>
                <p className="text-xs text-muted-foreground mt-1">Imported</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/50 flex-1 text-center">
                <p className="text-2xl font-semibold">{importResult.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 flex-1 text-center">
                  <p className="text-2xl font-semibold text-destructive">{importResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Errors</p>
                </div>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm space-y-1">
                {importResult.errors.map((err, i) => (
                  <p key={i}>Row {err.index + 1}: {err.error}</p>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/contacts?mode=${currentMode}`)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                View Contacts
              </button>
              <button
                onClick={() => {
                  setCsvText("");
                  setHeaders([]);
                  setRows([]);
                  setColumnMapping([]);
                  setImportResult(null);
                  setStep("input");
                }}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent"
              >
                Import More
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
