import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { MatchStage } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMatchDate(dt: Date): string {
  if (isToday(dt)) return "Today";
  if (isTomorrow(dt)) return "Tomorrow";
  return format(dt, "EEE, d MMM");
}

export function formatKickoff(dt: Date, timezone?: string): string {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
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
