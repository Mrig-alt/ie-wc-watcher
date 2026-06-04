"use client";

import { cn } from "@/lib/utils";

type Visibility = "public" | "friends" | "stealth";

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: boolean;
}

const options: { value: Visibility; label: string; desc: string; bonus?: string }[] = [
  {
    value: "public",
    label: "🌍 Public",
    desc: "Everyone sees your pairings and profile",
    bonus: "+50 tokens bonus",
  },
  {
    value: "friends",
    label: "👥 Friends",
    desc: "Only mutual connections see you",
  },
  {
    value: "stealth",
    label: "🕵️ Stealth",
    desc: "Hidden from opponents — you see all",
  },
];

export default function VisibilitySelector({ value, onChange, disabled }: VisibilitySelectorProps) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
            value === opt.value
              ? "border-green-600 bg-green-50 ring-1 ring-green-600"
              : "border-gray-200 bg-white hover:border-green-300"
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{opt.label}</p>
            <p className="text-xs text-gray-500">{opt.desc}</p>
          </div>
          {opt.bonus && (
            <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              {opt.bonus}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
