import type { Fair } from "@/types";

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org"
  );
}

export function formatFairDateRange(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end;
  if (!end || end === start) {
    return new Date(start).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const startD = new Date(start);
  const endD = new Date(end);
  const sameMonth =
    startD.getMonth() === endD.getMonth() &&
    startD.getFullYear() === endD.getFullYear();
  if (sameMonth) {
    return `${startD.getDate()}–${endD.getDate()} ${endD.toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" }
    )}`;
  }
  return `${startD.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  })} – ${endD.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const TEST_RECIPIENT = "eduadviser@iaesgujarat.org";
