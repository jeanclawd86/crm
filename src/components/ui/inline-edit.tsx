"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  as?: "input" | "textarea";
}

export function InlineEdit({
  value,
  onSave,
  className = "",
  placeholder = "Click to edit",
  multiline = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      // Keep the new text — don't revert
      setText(trimmed);
      setEditing(false);
    } catch {
      setText(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [text, value, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setText(value);
      setEditing(false);
    }
  };

  if (editing) {
    const sharedProps = {
      value: text,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      disabled: saving,
      className: `w-full bg-transparent border border-input rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${className}`,
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={3}
          {...sharedProps}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        {...sharedProps}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:underline hover:decoration-dotted hover:decoration-muted-foreground/50 ${multiline ? "block whitespace-pre-line" : "inline-block"} ${className} ${!text ? "text-muted-foreground italic" : ""}`}
      title="Click to edit"
    >
      {text || placeholder}
    </span>
  );
}
