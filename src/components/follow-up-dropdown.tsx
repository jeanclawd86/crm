"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getQuickDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextMonday = new Date(today);
  const dayOfWeek = nextMonday.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);

  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const threeWeeks = new Date(today);
  threeWeeks.setDate(threeWeeks.getDate() + 21);

  const fourWeeks = new Date(today);
  fourWeeks.setDate(fourWeeks.getDate() + 28);

  return [
    { label: "Tomorrow", date: toYMD(tomorrow) },
    { label: "Next week (Monday)", date: toYMD(nextMonday) },
    { label: "Two weeks", date: toYMD(twoWeeks) },
    { label: "Three weeks", date: toYMD(threeWeeks) },
    { label: "Four weeks", date: toYMD(fourWeeks) },
  ];
}

/** Standalone menu items for embedding inside an existing DropdownMenuSubContent */
export function FollowUpMenuItems({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (date: string) => void;
}) {
  const [showDateInput, setShowDateInput] = useState(false);
  const quickDates = getQuickDates();

  return (
    <>
      {quickDates.map((item) => (
        <DropdownMenuItem key={item.label} onClick={() => onSelect(item.date)}>
          {item.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      {showDateInput ? (
        <div className="p-2">
          <input
            type="date"
            autoFocus
            onChange={(e) => {
              if (e.target.value) {
                onSelect(e.target.value);
                setShowDateInput(false);
              }
            }}
            className="text-sm px-2 py-1 rounded-md border border-input bg-background w-full"
          />
        </div>
      ) : (
        <DropdownMenuItem onClick={() => setShowDateInput(true)}>
          Pick date...
        </DropdownMenuItem>
      )}
      {value && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSelect("")}>
            Clear
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

export function FollowUpDropdown({
  value,
  onSelect,
  triggerLabel,
}: {
  value?: string;
  onSelect: (date: string) => void;
  triggerLabel?: string;
}) {
  const [showDateInput, setShowDateInput] = useState(false);
  const quickDates = getQuickDates();

  const displayText = triggerLabel
    ? triggerLabel
    : value
      ? formatDisplayDate(value)
      : "Add follow-up";

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setShowDateInput(false);
      }}
    >
      <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        {displayText}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
        {quickDates.map((item) => (
          <DropdownMenuItem key={item.label} onClick={() => onSelect(item.date)}>
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {showDateInput ? (
          <div className="p-2">
            <input
              type="date"
              autoFocus
              onChange={(e) => {
                if (e.target.value) {
                  onSelect(e.target.value);
                  setShowDateInput(false);
                }
              }}
              className="text-sm px-2 py-1 rounded-md border border-input bg-background w-full"
            />
          </div>
        ) : (
          <DropdownMenuItem onClick={() => setShowDateInput(true)}>
            Pick date...
          </DropdownMenuItem>
        )}
        {value && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelect("")}>
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
