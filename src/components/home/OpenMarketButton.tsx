import Link from "next/link";
import { Swords } from "lucide-react";

export default function OpenMarketButton() {
  return (
    <Link
      href="/market"
      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 px-4 py-2 rounded-xl font-semibold transition-colors border border-amber-200 shadow-sm"
    >
      <Swords className="h-4 w-4 text-amber-600" />
      <span>Open Market ⚔️</span>
    </Link>
  );
}
