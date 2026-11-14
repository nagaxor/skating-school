"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, StatCard, Avatar, cx } from "@/components/ui";
import GuardianHome from "@/components/GuardianHome";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const taka = (n) => `৳${Number(n || 0).toLocaleString("en-IN")}`;

export default function DashboardHome() {
  const { user } = useAuth();
  if (user.role === "guardian") return <GuardianHome user={user} />;
  return <MemberHome user={user} />;
}

function MemberHome({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    Promise.all([
      api("/api/students"),
      api("/api/payments"),
      api("/api/notices"),
      api("/api/schedules"),
      user.role === "student" ? api(`/api/attendance?month=${month}`) : Promise.resolve([]),
    ])
      .then(([students, payments, notices, schedules, attendance]) => setData({ students, payments, notices, schedules, attendance }))
      .catch((e) => setError(e.message));
  }, [user.role]);

  if (error) return <div className={cx.card}><EmptyState icon={Icon.AlertTriangle} title="Couldn't load your dashboard" hint={error} /></div>;
  if (!data) return <PageLoading statCards={4} />;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12.5px] font-medium text-ink-500 dark:text-ink-400">{today}</p>
          <h2 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight text-ink-950 dark:text-white mt-0.5">
            {greet}, {user.name.split(" ")[0]}
          </h2>
        </div>
        {["admin", "instructor"].includes(user.role) && (
          <div className="flex gap-2">
            <Link href="/dashboard/attendance" className={cx.btnSecondary}><Icon.Clipboard width={16} height={16} /> Attendance</Link>
            <Link href="/dashboard/fees" className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Record payment</Link>
          </div>
        )}
      </div>

      {user.role === "student" ? <StudentView data={data} /> : <StaffView data={data} />}
    </div>
  );
}

function StaffView({ data }) {
  const { students, payments, notices } = data;
  const now = new Date();
  const ym = (d) => d.slice(0, 7);
  const thisYm = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().slice(0, 7);
  const monthRevenue = payments.filter((p) => ym(p.date) === thisYm).reduce((s, p) => s + p.amount, 0);
  const prevRevenue = payments.filter((p) => ym(p.date) === prev).reduce((s, p) => s + p.amount, 0);
  const delta = prevRevenue ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100) : null;
  const active = students.filter((s) => s.status === "active");
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const paidIds = new Set(payments.filter((p) => p.type === "monthly_fee" && p.month === monthLabel).map((p) => p.studentId));
  const paid = active.filter((s) => paidIds.has(s.id)).length;
  const pct = active.length ? Math.round((paid / active.length) * 100) : 0;
  const urgent = notices.filter((n) => n.urgent).length;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Icon.Users} label="Active students" value={active.length} hint={`${students.length - active.length} inactive`} tone="brand" />
        <StatCard icon={Icon.Wallet} label="Revenue this month" value={taka(monthRevenue)} tone="emerald"
          trend={delta === null ? null : { up: delta >= 0, label: `${Math.abs(delta)}%` }} hint={delta === null ? "No data last month" : "vs last month"} />
        <StatCard icon={Icon.TrendingUp} label="Fees collected" value={`${pct}%`} hint={`${paid} of ${active.length} paid`} tone="gold" />
        <StatCard icon={Icon.Bell} label="Urgent notices" value={urgent} hint={`${notices.length} total`} tone={urgent ? "red" : "slate"} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <RevenueChart payments={payments} />
        <FeeRing paid={paid} total={active.length} pct={pct} monthLabel={monthLabel} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <RecentPayments payments={payments} />
        <NoticeList notices={notices} />
      </div>
    </>
  );
}

function StudentView({ data }) {
  const { students, payments, notices, schedules, attendance } = data;
  const me = students[0];
  const present = attendance.filter((a) => a.status === "present").length;
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : null;
  const next = nextClass(schedules.filter((s) => !me?.program || s.program === me.program));
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-ink-950 text-white p-6 sm:p-8">
        <div className="absolute inset-0 grain" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[radial-gradient(closest-side,rgba(10,159,196,0.35),transparent)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-300">Next class</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">{next ? `${next.day} · ${next.time}` : "No class scheduled"}</div>
            <div className="text-ink-400 text-sm mt-1.5">{next ? `${next.program} with ${next.instructor} · ${next.club}` : "Your branch hasn't published a schedule yet."}</div>
          </div>
          <Link href="/dashboard/schedule" className="inline-flex items-center gap-2 bg-white text-ink-950 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-brand-50 transition">
            Full schedule <Icon.ArrowRight width={15} height={15} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Icon.Award} label="My program" value={me?.program || "—"} hint={me?.club || "No branch"} tone="gold" />
        <StatCard icon={Icon.Check} label="Attendance this month" value={rate === null ? "—" : `${rate}%`} hint={`${present} of ${attendance.length} classes`} tone="emerald" />
        <StatCard icon={Icon.CreditCard} label="Total paid" value={taka(totalPaid)} hint={`${payments.length} receipts`} tone="brand" />
        <StatCard icon={Icon.Bell} label="Notices" value={notices.length} hint={`${notices.filter((n) => n.urgent).length} urgent`} tone="slate" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <RecentPayments payments={payments} student />
        <NoticeList notices={notices} />
      </div>
    </>
  );
}

function nextClass(schedules) {
  if (!schedules.length) return null;
  const todayIdx = new Date().getDay();
  return [...schedules].sort((a, b) => ((DAYS.indexOf(a.day) - todayIdx + 7) % 7) - ((DAYS.indexOf(b.day) - todayIdx + 7) % 7))[0];
}

function RevenueChart({ payments }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: d.toLocaleDateString("en-US", { month: "short" }), total: 0 };
  });
  for (const p of payments) {
    const m = months.find((x) => x.key === p.date.slice(0, 7));
    if (m) m.total += p.amount;
  }
  const max = Math.max(...months.map((m) => m.total), 1);
  const sum = months.reduce((s, m) => s + m.total, 0);

  return (
    <div className={cx.card + " p-5 sm:p-6"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={cx.cardTitle}>Revenue</h3>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">Last 6 months</p>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold text-ink-950 dark:text-white tabular">{taka(sum)}</div>
          <div className="text-[11px] text-ink-500">total collected</div>
        </div>
      </div>
      <div className="mt-6 h-48 flex items-end gap-2 sm:gap-4" role="img" aria-label={`Revenue for the last six months: ${months.map((m) => `${m.label} ${taka(m.total)}`).join(", ")}`}>
        {months.map((m, i) => {
          const h = Math.max(3, Math.round((m.total / max) * 100));
          const current = i === months.length - 1;
          return (
            <div key={m.key} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group">
              <div className="text-[10.5px] font-semibold text-ink-500 dark:text-ink-400 tabular opacity-0 group-hover:opacity-100 transition-opacity">{m.total ? taka(m.total) : ""}</div>
              <div
                className={`w-full max-w-[52px] rounded-lg transition-all duration-500 ${current ? "bg-gradient-to-t from-brand-600 to-brand-400 shadow-glow-teal" : "bg-ink-200 dark:bg-white/10 group-hover:bg-ink-300 dark:group-hover:bg-white/20"}`}
                style={{ height: `${h}%` }}
              />
              <div className={`text-[11px] font-medium ${current ? "text-ink-900 dark:text-white" : "text-ink-400"}`}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeeRing({ paid, total, pct, monthLabel }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <Link href="/dashboard/payment-history" className={cx.card + " p-5 sm:p-6 flex flex-col hover:shadow-lift transition-shadow"}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className={cx.cardTitle}>Fee collection</h3>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{monthLabel}</p>
        </div>
        <Icon.ArrowUpRight width={16} height={16} className="text-ink-400" />
      </div>
      <div className="flex-1 flex items-center gap-6 mt-4">
        <svg width="132" height="132" viewBox="0 0 132 132" className="flex-shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="66" cy="66" r={r} fill="none" strokeWidth="12" className="stroke-ink-100 dark:stroke-white/10" />
          {pct > 0 && <circle cx="66" cy="66" r={r} fill="none" strokeWidth="12" strokeLinecap="round" stroke="url(#ring)" strokeDasharray={`${(pct / 100) * c} ${c}`} className="transition-all duration-700" />}
          <defs>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22BCE0" /><stop offset="1" stopColor="#EDBE57" /></linearGradient>
          </defs>
        </svg>
        <div>
          <div className="font-display text-4xl font-semibold tracking-tight text-ink-950 dark:text-white tabular">{pct}%</div>
          <div className="text-sm text-ink-500 dark:text-ink-400 mt-1"><span className="font-semibold text-emerald-600 dark:text-emerald-400">{paid} paid</span> · <span className={total - paid ? "font-semibold text-red-500" : ""}>{total - paid} due</span></div>
          <div className="text-xs text-ink-400 mt-3">Open the fee tracker →</div>
        </div>
      </div>
    </Link>
  );
}

function RecentPayments({ payments, student = false }) {
  return (
    <div className={cx.card}>
      <div className={cx.cardHeader}>
        <h3 className={cx.cardTitle}>Recent payments</h3>
        <Link href="/dashboard/fees" className={cx.link}>View all <Icon.ArrowRight width={12} height={12} /></Link>
      </div>
      {payments.length === 0 ? (
        <EmptyState icon={Icon.CreditCard} title="No payments yet" hint={student ? "Your receipts will appear here." : "Recorded payments will appear here."} />
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
          {payments.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/receipt/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50/70 dark:hover:bg-white/[0.02] transition-colors">
                <Avatar name={p.studentName} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 dark:text-ink-100 truncate">{student ? p.month : p.studentName}</div>
                  <div className="text-xs text-ink-500 truncate">{student ? p.receiptNo : `${p.month} · ${p.method.replace("_", " ")}`}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-ink-950 dark:text-white tabular">{taka(p.amount)}</div>
                  <div className="text-[11px] text-ink-400 tabular">{p.date}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoticeList({ notices }) {
  return (
    <div className={cx.card}>
      <div className={cx.cardHeader}>
        <h3 className={cx.cardTitle}>Notices</h3>
        <Link href="/dashboard/notices" className={cx.link}>View all <Icon.ArrowRight width={12} height={12} /></Link>
      </div>
      {notices.length === 0 ? (
        <EmptyState icon={Icon.Bell} title="No notices yet" hint="Announcements from your school will appear here." />
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
          {notices.slice(0, 5).map((n) => (
            <li key={n.id} className="px-5 py-3.5 flex gap-3">
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.urgent ? "bg-red-500 ring-4 ring-red-500/15" : "bg-brand-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink-900 dark:text-ink-100">{n.title}</span>
                  {n.urgent && <Badge tone="red">Urgent</Badge>}
                </div>
                <div className="text-xs text-ink-500 mt-0.5 truncate">{n.author} · {n.date}{n.audience !== "All" ? ` · ${n.audience}` : ""}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
