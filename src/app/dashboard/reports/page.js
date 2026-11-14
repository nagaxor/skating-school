"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { PageLoading, PageHeader, StatCard, EmptyState, cx } from "@/components/ui";

const taka = (n) => `৳${Number(n || 0).toLocaleString("en-IN")}`;
const METHOD_LABEL = { cash: "Cash", bkash: "bKash", nagad: "Nagad", rocket: "Rocket", bank_transfer: "Bank transfer" };
const METHOD_COLOR = { cash: "#0A9FC4", bkash: "#E2136E", nagad: "#F7941D", rocket: "#8C3494", bank_transfer: "#66708E" };
const TYPE_LABEL = { monthly_fee: "Monthly fees", admission_fee: "Admission fees", equipment: "Equipment", event_fee: "Events" };
const PROGRAM_COLOR = { Beginner: "bg-brand-500", Intermediate: "bg-gold-400", Advanced: "bg-red-500" };

export default function ReportsPage() {
  const [students, setStudents] = useState(null);
  const [payments, setPayments] = useState([]);
  const [range, setRange] = useState(12);

  useEffect(() => {
    Promise.all([api("/api/students"), api("/api/payments")]).then(([s, p]) => { setPayments(p); setStudents(s); });
  }, []);

  const data = useMemo(() => {
    if (!students) return null;
    const now = new Date();
    const months = Array.from({ length: range }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (range - 1) + i, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "short" }), year: d.getFullYear(), total: 0, count: 0 };
    });
    const inRange = payments.filter((p) => months.some((m) => m.key === p.date.slice(0, 7)));
    for (const p of inRange) { const m = months.find((x) => x.key === p.date.slice(0, 7)); m.total += p.amount; m.count++; }
    const sum = (arr) => arr.reduce((s, p) => s + p.amount, 0);
    const group = (arr, key) => Object.entries(arr.reduce((acc, p) => { acc[p[key]] = (acc[p[key]] || 0) + p.amount; return acc; }, {})).sort((a, b) => b[1] - a[1]);
    const active = students.filter((s) => s.status === "active");
    const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const paidIds = new Set(payments.filter((p) => p.type === "monthly_fee" && p.month === monthLabel).map((p) => p.studentId));
    const countBy = (key) => Object.entries(active.reduce((acc, s) => { const k = s[key] || "Unassigned"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
    return {
      months, total: sum(inRange), count: inRange.length,
      avg: inRange.length ? Math.round(sum(inRange) / inRange.length) : 0,
      byMethod: group(inRange, "method"), byType: group(inRange, "type"),
      active, collection: active.length ? Math.round((active.filter((s) => paidIds.has(s.id)).length / active.length) * 100) : 0,
      byClub: countBy("club"), byProgram: countBy("program"),
      best: [...months].sort((a, b) => b.total - a.total)[0],
    };
  }, [students, payments, range]);

  if (!data) return <PageLoading />;
  const max = Math.max(1, ...data.months.map((m) => m.total));

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Revenue and enrolment across every branch."
        actions={
          <div className="inline-flex rounded-xl bg-ink-100 dark:bg-white/5 p-1" role="tablist" aria-label="Range">
            {[3, 6, 12].map((r) => (
              <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${range === r ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-sm" : "text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"}`}>
                {r} months
              </button>
            ))}
          </div>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Icon.Wallet} label={`Revenue · ${range} months`} value={taka(data.total)} hint={`${data.count} payments`} tone="emerald" />
        <StatCard icon={Icon.CreditCard} label="Average payment" value={taka(data.avg)} tone="brand" />
        <StatCard icon={Icon.TrendingUp} label="Collected this month" value={`${data.collection}%`} hint="of active students" tone="gold" />
        <StatCard icon={Icon.Users} label="Active students" value={data.active.length} hint={`${students.length - data.active.length} inactive`} tone="slate" />
      </div>

      {/* Revenue trend */}
      <div className={cx.card + " p-5 sm:p-6"}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className={cx.cardTitle}>Revenue trend</h3>
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{data.best?.total ? `Best month: ${data.best.label} ${data.best.year} · ${taka(data.best.total)}` : "No payments in this period yet"}</p>
          </div>
          <div className="font-display text-2xl font-semibold text-ink-950 dark:text-white tabular">{taka(data.total)}</div>
        </div>
        <div className="mt-6 relative h-56">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <div key={f} className="absolute inset-x-0 border-t border-dashed border-ink-100 dark:border-white/[0.05]" style={{ bottom: `${f * 85}%` }}>
              <span className="absolute -top-2.5 right-0 text-[10px] text-ink-400 bg-white dark:bg-transparent pl-1 tabular">{taka(Math.round(max * f))}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-3 pr-14">
            {data.months.map((m, i) => {
              const current = i === data.months.length - 1;
              return (
                <div key={m.key} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group relative">
                  <div className="absolute bottom-[calc(var(--h)+28px)] hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-ink-950 text-white text-[11px] font-semibold px-2.5 py-1.5 shadow-popover" style={{ "--h": `${(m.total / max) * 85}%` }}>
                    {taka(m.total)} · {m.count} pmt
                  </div>
                  <div className={`w-full max-w-[44px] rounded-t-lg rounded-b-sm transition-all duration-500 ${current ? "bg-gradient-to-t from-brand-600 to-brand-300" : "bg-ink-200 dark:bg-white/10 group-hover:bg-brand-300 dark:group-hover:bg-brand-500/50"}`}
                    style={{ height: `max(3px, ${(m.total / max) * 85}%)` }} />
                  <div className={`text-[10.5px] font-medium ${current ? "text-ink-900 dark:text-white" : "text-ink-400"}`}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Breakdown title="By payment method" rows={data.byMethod.map(([k, v]) => ({ label: METHOD_LABEL[k] || k, value: v, color: METHOD_COLOR[k] }))} total={data.total} />
        <Breakdown title="By fee type" rows={data.byType.map(([k, v], i) => ({ label: TYPE_LABEL[k] || k, value: v, color: ["#0A9FC4", "#EDBE57", "#3A425C", "#22BCE0"][i % 4] }))} total={data.total} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <CountBars title="Active students by branch" rows={data.byClub} barClass={() => "bg-gradient-to-r from-brand-600 to-brand-400"} />
        <CountBars title="Active students by program" rows={data.byProgram} barClass={(k) => PROGRAM_COLOR[k] || "bg-ink-400"} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows, total }) {
  const r = 46, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={cx.card + " p-5 sm:p-6"}>
      <h3 className={cx.cardTitle}>{title}</h3>
      {rows.length === 0 ? <EmptyState icon={Icon.BarChart} title="No payments in this period" /> : (
        <div className="flex items-center gap-6 mt-5">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90 flex-shrink-0" aria-hidden="true">
            <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" className="stroke-ink-100 dark:stroke-white/10" />
            {rows.map((row) => {
              const len = (row.value / total) * c;
              const el = <circle key={row.label} cx="60" cy="60" r={r} fill="none" strokeWidth="14" stroke={row.color} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />;
              offset += len;
              return el;
            })}
          </svg>
          <ul className="flex-1 space-y-2.5 min-w-0">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-2.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                <span className="flex-1 truncate text-ink-700 dark:text-ink-300">{row.label}</span>
                <span className="font-semibold text-ink-950 dark:text-white tabular">{taka(row.value)}</span>
                <span className="w-10 text-right text-xs text-ink-400 tabular">{Math.round((row.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CountBars({ title, rows, barClass }) {
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <div className={cx.card + " p-5 sm:p-6"}>
      <h3 className={cx.cardTitle}>{title}</h3>
      {rows.length === 0 ? <EmptyState icon={Icon.Users} title="No active students" /> : (
        <ul className="mt-5 space-y-4">
          {rows.map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between text-sm mb-1.5"><span className="text-ink-700 dark:text-ink-300">{k}</span><span className="font-semibold text-ink-950 dark:text-white tabular">{v}</span></div>
              <div className="h-2.5 rounded-full bg-ink-100 dark:bg-white/[0.06] overflow-hidden"><div className={`h-full rounded-full ${barClass(k)} transition-all duration-700`} style={{ width: `${(v / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
