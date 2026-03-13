"use client";

export function LocalTime({ dateTime, format = "short" }: { dateTime: string; format?: "short" | "dateTime" | "timeOnly" | "dateOnly" }) {
  const d = new Date(dateTime);

  if (format === "timeOnly") {
    return <>{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>;
  }

  if (format === "dateOnly") {
    return <>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>;
  }

  if (format === "dateTime") {
    return (
      <>
        {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        {" · "}
        {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </>
    );
  }

  // "short" — date + time
  return (
    <>
      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      {" · "}
      {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
    </>
  );
}
