"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ContactMode, getModeLabel, Contact, MeetingWithContact } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { stageColors } from "@/lib/stage-colors";

const modes: { mode: ContactMode; icon: string }[] = [
  { mode: "prospect", icon: "\u{1F3AF}" },
  { mode: "investor", icon: "\u{1F4B0}" },
];

interface SearchResults {
  contacts: Contact[];
  meetings: MeetingWithContact[];
}

export function Sidebar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentMode = (searchParams.get("mode") as ContactMode) || "prospect";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function switchMode(mode: ContactMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    router.push(`${pathname}?${params.toString()}`);
  }

  function hrefWithMode(path: string) {
    return `${path}?mode=${currentMode}`;
  }

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(path);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data: SearchResults = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch {
        // silently fail
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleResultClick() {
    setSearchQuery("");
    setSearchResults(null);
    setSearchOpen(false);
  }

  return (
    <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      <div className="p-5 border-b border-border">
        <Link href={hrefWithMode("/")} className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">C</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">CRM</span>
        </Link>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border" ref={searchRef}>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setSearchOpen(true)}
            placeholder="Search..."
            className="w-full h-7 pl-8 pr-3 text-xs rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchOpen && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.contacts.length === 0 && searchResults.meetings.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center">No results</p>
              ) : (
                <>
                  {searchResults.contacts.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 pt-2 pb-1">
                        Contacts
                      </p>
                      {searchResults.contacts.slice(0, 5).map((c) => (
                        <Link
                          key={c.id}
                          href={`/contacts/${c.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
                        >
                          <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-medium">
                              {c.name.split(" ").map((n) => n[0]).join("")}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.company}</p>
                          </div>
                          <Badge className={`${stageColors[c.stage]} text-[9px] px-1.5 py-0`} variant="secondary">
                            {c.stage}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.meetings.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 pt-2 pb-1 border-t border-border">
                        Meetings
                      </p>
                      {searchResults.meetings.slice(0, 5).map((m) => (
                        <Link
                          key={m.id}
                          href={`/contacts/${m.contactId}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
                        >
                          <MeetingIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.contact.name} &middot;{" "}
                              {new Date(m.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="p-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 mb-2">
          Mode
        </p>
        <div className="space-y-0.5">
          {modes.map(({ mode, icon }) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                currentMode === mode
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <span>{icon}</span>
              {getModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <Link
          href={hrefWithMode("/")}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive("/") && !pathname.startsWith("/contacts") && !pathname.startsWith("/meetings") && !pathname.startsWith("/import")
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <DashboardIcon className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href={hrefWithMode("/contacts")}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive("/contacts")
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <ContactsIcon className="h-4 w-4" />
          Contacts
        </Link>
        <Link
          href="/meetings"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive("/meetings")
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <MeetingIcon className="h-4 w-4" />
          Meetings
        </Link>
        <Link
          href={hrefWithMode("/import")}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive("/import")
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <ImportIcon className="h-4 w-4" />
          Import
        </Link>
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">v0.2 prototype</p>
      </div>
    </aside>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function ContactsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function MeetingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}
