import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { MatchStage } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMadridTodayRange() {
  const tz = "Europe/Madrid";
  const now = new Date();
  const zonedNow = toZonedTime(now, tz);

  const startOfZoned = new Date(zonedNow);
  startOfZoned.setHours(0, 0, 0, 0);

  const endOfZoned = new Date(zonedNow);
  endOfZoned.setHours(23, 59, 59, 999);

  const startUtc = fromZonedTime(startOfZoned, tz);
  const endUtc = fromZonedTime(endOfZoned, tz);

  return { start: startUtc, end: endUtc };
}

export function formatMatchDate(dt: Date, timezone?: string): string {
  const tz = timezone ?? "Europe/Madrid";
  const zonedMatch = toZonedTime(dt, tz);
  const zonedNow = toZonedTime(new Date(), tz);

  const isZonedToday =
    zonedMatch.getFullYear() === zonedNow.getFullYear() &&
    zonedMatch.getMonth() === zonedNow.getMonth() &&
    zonedMatch.getDate() === zonedNow.getDate();

  const tomorrow = new Date(zonedNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isZonedTomorrow =
    zonedMatch.getFullYear() === tomorrow.getFullYear() &&
    zonedMatch.getMonth() === tomorrow.getMonth() &&
    zonedMatch.getDate() === tomorrow.getDate();

  if (isZonedToday) return "Today";
  if (isZonedTomorrow) return "Tomorrow";
  return format(zonedMatch, "EEE, d MMM");
}

export function formatKickoff(dt: Date, timezone?: string): string {
  const tz = timezone ?? "Europe/Madrid";
  const zoned = toZonedTime(dt, tz);
  return format(zoned, "HH:mm");
}

export function formatKickoffFull(dt: Date, timezone?: string): string {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zoned = toZonedTime(dt, tz);
  return format(zoned, "EEE d MMM, HH:mm");
}

export function stageLabel(stage: MatchStage): string {
  const labels: Record<MatchStage, string> = {
    global: "Global Match",
    friendly: "Warm-up Friendly",
    group: "Group Stage",
    round_of_32: "Round of 32",
    round_of_16: "Round of 16",
    quarter_final: "Quarter-Final",
    semi_final: "Semi-Final",
    third_place: "3rd Place",
    final: "Final",
  };
  return labels[stage];
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildTelegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function getPayoutText(odds?: number | null): string {
  if (odds != null) {
    return `Odds: ${odds.toFixed(2)}x`;
  }
  return "Flat Payouts (15/5)";
}
