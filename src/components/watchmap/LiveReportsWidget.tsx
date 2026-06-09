"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Flame, MapPin, RefreshCw, Send, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "buzzing",       label: "Buzzing 🟢",       color: "bg-green-100 text-green-800 border-green-200" },
  { value: "getting_busy",  label: "Getting busy 🟡",  color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "packed",        label: "Packed 🔴",         color: "bg-red-100 text-red-800 border-red-200" },
  { value: "queue_outside", label: "Queue outside ⏳",  color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "entry_fee",     label: "Entry fee 💰",      color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "good_screens",  label: "Great screens 📺",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "quiet_now",     label: "Quiet now 🙊",      color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "planning",      label: "Planning 💭",       color: "bg-slate-100 text-slate-800 border-slate-200" },
] as const;

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

type Report = {
  id: string;
  status: StatusValue;
  comment: string | null;
  createdAt: string;
  venueId: string | null;
  venueName: string;
  venueArea: string | null;
  venueMapsUrl: string | null;
  matchId: string | null;
  studentName: string;
  studentId: string | null;
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StatusBadge({ status }: { status: StatusValue }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  if (!opt) return null;
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", opt.color)}>
      {opt.label}
    </span>
  );
}

export default function LiveReportsWidget({
  currentUserId,
  matchId,
  matchDatetime,
  knownVenues,
}: {
  currentUserId: string | null;
  matchId?: string | null;
  matchDatetime?: Date | string | null;
  knownVenues: { id: string; name: string; area: string | null }[];
}) {
  const isPlanningMode = matchDatetime ? (new Date(matchDatetime).getTime() - Date.now() > 6 * 60 * 60 * 1000) : false;
  const [tab, setTab] = useState<"planning" | "live" | "bars">(isPlanningMode ? "planning" : "live");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selStatus, setSelStatus] = useState<StatusValue | null>(null);
  const [selVenueId, setSelVenueId] = useState<string | null>(null);
  const [freeVenue, setFreeVenue] = useState("");
  const [comment, setComment] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/live-reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 30_000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handlePost = async () => {
    if (tab === "live" && !selStatus) { setPostError("Pick a status"); return; }
    if (tab === "live" && !selVenueId && !freeVenue.trim()) { setPostError("Enter a venue"); return; }
    if (tab === "planning" && !comment.trim()) { setPostError("Enter a message to post"); return; }
    setPosting(true);
    setPostError("");
    try {
      const res = await fetch("/api/live-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: tab === "planning" ? "planning" : selStatus,
          venueId: selVenueId || null,
          venueName: selVenueId ? null : (freeVenue.trim() || null),
          matchId: matchId ?? null,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) { setPostError("Failed to post — try again"); return; }
      setPostSuccess(true);
      setShowForm(false);
      setSelStatus(null); setSelVenueId(null); setFreeVenue(""); setComment("");
      setTimeout(() => setPostSuccess(false), 3000);
      await fetchReports();
    } catch { setPostError("Network error"); }
    finally { setPosting(false); }
  };

  const barMap: Record<string, {
    venueName: string; venueArea: string | null; venueMapsUrl: string | null;
    latestStatus: StatusValue; latestTime: string; reports: Report[];
  }> = {};
  for (const r of reports) {
    if (r.status === "planning") continue;
    const key = r.venueId ?? r.venueName;
    if (!barMap[key]) barMap[key] = { venueName: r.venueName, venueArea: r.venueArea, venueMapsUrl: r.venueMapsUrl, latestStatus: r.status, latestTime: r.createdAt, reports: [] };
    barMap[key].reports.push(r);
  }
  const bars = Object.entries(barMap)
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Reports & Planning
          </h2>
          <p className="text-xs text-gray-400">
            Coordinate watch parties or report live from the ground
          </p>
        </div>
        <button onClick={fetchReports} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        <button onClick={() => setTab("planning")} className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all", tab === "planning" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>
          💬 Planning
        </button>
        <button onClick={() => setTab("live")} className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all", tab === "live" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>
          🔥 Live Now
        </button>
        <button onClick={() => setTab("bars")} className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all", tab === "bars" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>
          🍺 Bar Reports
        </button>
      </div>

      {currentUserId && tab !== "bars" && (
        <div>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors font-medium">
              {tab === "planning" ? "+ Send a message to coordinate" : "+ Report from where you are"}
            </button>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
              <textarea
                placeholder={tab === "planning" ? "Wanna reference a pub? Choose below" : "Add a comment (optional)"}
                value={comment} onChange={(e) => setComment(e.target.value)}
                rows={2} maxLength={300}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              {tab === "live" && (
                <>
                  <p className="text-sm font-semibold text-gray-800">What's the situation?</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.filter(s => s.value !== "planning").map((s) => (
                      <button key={s.value} onClick={() => setSelStatus(s.value)}
                        className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                          selStatus === s.value ? s.color + " ring-2 ring-offset-1 ring-current" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">{tab === "planning" ? "Any specific venue? (Optional)" : "Which bar / venue?"}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {knownVenues.map((v) => (
                    <button key={v.id} onClick={() => { setSelVenueId(v.id); setFreeVenue(""); }}
                      className={cn("text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                        selVenueId === v.id ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}>
                      {v.name}{v.area ? ` · ${v.area}` : ""}
                    </button>
                  ))}
                </div>
                {!selVenueId && (
                  <input type="text" placeholder="Or type venue name…" value={freeVenue}
                    onChange={(e) => setFreeVenue(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                )}
                {selVenueId && (
                  <button onClick={() => setSelVenueId(null)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">× Change venue</button>
                )}
              </div>
              {postError && <p className="text-xs text-red-500">{postError}</p>}
              <div className="flex gap-2">
                <button onClick={handlePost} disabled={posting}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" />{posting ? "Sending…" : (tab === "planning" ? "Send message" : "Post report")}
                </button>
                <button onClick={() => { setShowForm(false); setPostError(""); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">Cancel</button>
              </div>
            </div>
          )}
          {postSuccess && <p className="text-center text-sm text-green-600 font-medium py-1">✅ Report posted!</p>}
        </div>
      )}

      {tab === "planning" && (
        <div className="space-y-2">
          {loading && <p className="text-center text-sm text-gray-400 py-6">Loading…</p>}
          {!loading && reports.filter(r => r.status === "planning").length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Flame className="h-7 w-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet — start the planning!</p>
            </div>
          )}
          {reports.filter(r => r.status === "planning").map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white shadow-sm px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.venueName && r.venueName !== "Unknown venue" && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="font-medium">{r.venueName}</span>
                      {r.venueArea && <span className="text-gray-400 text-xs">· {r.venueArea}</span>}
                    </div>
                  )}
                  {r.comment && <p className="text-sm text-gray-600">
                    {r.comment}
                  </p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{r.studentName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "live" && (
        <div className="space-y-2">
          {loading && <p className="text-center text-sm text-gray-400 py-6">Loading…</p>}
          {!loading && reports.filter(r => r.status !== "planning").length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Flame className="h-7 w-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No live reports yet — be the first!</p>
            </div>
          )}
          {reports.filter(r => r.status !== "planning").map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white shadow-sm px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.venueName && r.venueName !== "Unknown venue" && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="font-medium">{r.venueName}</span>
                      {r.venueArea && <span className="text-gray-400 text-xs">· {r.venueArea}</span>}
                    </div>
                  )}
                  {r.comment && <p className="text-sm text-gray-600 italic">
                    "{r.comment}"
                  </p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{r.studentName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bars" && (
        <div className="space-y-2">
          {loading && <p className="text-center text-sm text-gray-400 py-6">Loading…</p>}
          {!loading && bars.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <MapPin className="h-7 w-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bar reports yet</p>
            </div>
          )}
          {bars.map((bar) => (
            <div key={bar.key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <button className="w-full text-left px-4 py-3" onClick={() => setExpanded(expanded === bar.key ? null : bar.key)}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-green-500" />
                      <span className="font-semibold text-sm text-gray-900">{bar.venueName}</span>
                      {bar.venueArea && <span className="text-xs text-gray-400">{bar.venueArea}</span>}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={bar.latestStatus} />
                      <span className="text-xs text-gray-400 ml-1.5">{timeAgo(bar.latestTime)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{bar.reports.length} report{bar.reports.length !== 1 ? "s" : ""}</span>
                    {expanded === bar.key ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </button>
              {expanded === bar.venueName && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                  {bar.reports.map((r) => (
                    <div key={r.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-gray-400">{r.studentName} · {timeAgo(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 italic mt-1">&ldquo;{r.comment}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
