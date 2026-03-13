"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ContactMode, getModeLabel } from "@/lib/types";

const modes: { mode: ContactMode; icon: string }[] = [
  { mode: "prospect", icon: "🎯" },
  { mode: "investor", icon: "💰" },
];

export function Sidebar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentMode = (searchParams.get("mode") as ContactMode) || "prospect";

  function switchMode(mode: ContactMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    // Navigate to same page with new mode
    router.push(`${pathname}?${params.toString()}`);
  }

  function hrefWithMode(path: string) {
    return `${path}?mode=${currentMode}`;
  }

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

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
            isActive("/") && !pathname.startsWith("/contacts")
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
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">v0.1 prototype</p>
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

function ContactsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
