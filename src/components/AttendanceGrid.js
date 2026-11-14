"use client";

import { Icon } from "@/components/Icons";
import { Badge, EmptyState, cx } from "@/components/ui";

// Last 12 weeks as a GitHub-style grid: green = present, red = absent, grey = no class.
export default function AttendanceGrid({ records }) {
  const byDate = new Map(records.map((r) => [r.date, r.status]));
  const today = new Date();
  // Columns are Sat→Fri weeks (the school week); the last column holds today.
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 1) % 7) - 7 * 11);
  const localKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const weeks = [];
  for (let w = 0; w < 12; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const key = localKey(dt);
      days.push({ key, status: byDate.get(key), future: dt > today });
    }
    weeks.push(days);
  }
  const recent = records.slice(0, 8);

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-4">
      <div className={cx.card + " p-5 sm:p-6"}>
        <h3 className={cx.cardTitle}>Last 12 weeks</h3>
        <div className="mt-4 flex gap-1.5">
          <div className="grid grid-rows-7 gap-1.5 text-[10px] text-ink-400 pr-1">
            {["Sat", "", "Mon", "", "Wed", "", "Fri"].map((d, i) => <span key={i} className="h-4 leading-4">{d}</span>)}
          </div>
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-rows-7 gap-1.5">
              {week.map((d) => (
                <span key={d.key} title={`${d.key}${d.status ? ` · ${d.status}` : ""}`}
                  className={`w-4 h-4 rounded-[4px] ${d.future ? "opacity-0" : d.status === "present" ? "bg-emerald-500" : d.status === "absent" ? "bg-red-400" : "bg-ink-100 dark:bg-white/[0.06]"}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-[11px] text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-emerald-500" />Present</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-red-400" />Absent</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-ink-100 dark:bg-white/10" />No record</span>
        </div>
      </div>
      <div className={cx.card}>
        <div className={cx.cardHeader}><h3 className={cx.cardTitle}>Recent classes</h3></div>
        {recent.length === 0 ? <EmptyState icon={Icon.Calendar} title="No attendance recorded yet" /> : (
          <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
            {recent.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-ink-700 dark:text-ink-300 tabular">{new Date(r.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                <Badge dot tone={r.status === "present" ? "emerald" : "red"}>{r.status === "present" ? "Present" : "Absent"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
