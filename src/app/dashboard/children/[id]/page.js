"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@/components/Icons";
import { Avatar, Badge, EmptyState, PageLoading, cx } from "@/components/ui";
import AttendanceGrid from "@/components/AttendanceGrid";
import { useMyChildren, TODAY, taka } from "@/components/GuardianHome";

// Guardian view of ONE linked child. Data comes only from /api/my-children,
// which the server scopes to this guardian's links, so an id that isn't
// linked simply isn't in the response and the page shows "not found".
export default function ChildPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error } = useMyChildren();
  const [tab, setTab] = useState("attendance");

  if (user.role !== "guardian") return <div className={cx.card}><EmptyState icon={Icon.Lock} title="This page is for guardians" /></div>;
  if (error) return <div className={cx.card}><EmptyState icon={Icon.AlertTriangle} title="Couldn't load" hint={error} /></div>;
  if (!data) return <PageLoading statCards={0} />;

  const k = data.children.find((c) => c.id === id);
  if (!k) return <div className={cx.card}><EmptyState icon={Icon.Users} title="Child not found" hint="This child isn't linked to your account." action={<Link href="/dashboard" className={cx.btnSecondary}>Back to my children</Link>} /></div>;

  const t = TODAY[k.today] || TODAY.no_class;
  const present = k.attendance.filter((a) => a.status === "present").length;
  const rate = k.attendance.length ? Math.round((present / k.attendance.length) * 100) : null;
  const totalPaid = k.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      {data.children.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {data.children.map((c) => (
            <Link key={c.id} href={`/dashboard/children/${c.id}`}
              className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition ${c.id === k.id ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950" : "bg-white dark:bg-white/5 ring-1 ring-ink-900/10 dark:ring-white/10 text-ink-600 dark:text-ink-300 hover:bg-ink-50"}`}>
              <Avatar name={c.name} initials={c.avatar} src={c.photo} size={26} className="!rounded-full" /> {c.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      ) : (
        <Link href="/dashboard" className={cx.link}><Icon.ArrowLeft width={14} height={14} /> My children</Link>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-ink-950 text-white">
        <div className="absolute inset-0 grain" />
        <div className="absolute -top-28 -right-20 w-96 h-96 bg-[radial-gradient(closest-side,rgba(47,107,224,0.35),transparent)]" />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={k.name} initials={k.avatar} src={k.photo} size={84} className="!rounded-3xl ring-4 ring-white/10" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl sm:text-[28px] font-semibold tracking-tight">{k.name}</h2>
            <div className="text-[13.5px] text-ink-400 mt-1">{k.program}{k.age != null ? ` · Age ${k.age}` : ""} · {k.club?.name || "No branch"}{k.club?.location ? `, ${k.club.location}` : ""}</div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold bg-white/[0.07] ring-1 ring-white/10">
              <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.label}
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 border-t border-white/[0.08] divide-x divide-white/[0.08]">
          <Metric label="Attendance (4 months)" value={rate == null ? "—" : `${rate}%`} hint={`${present} of ${k.attendance.length} classes`} />
          <Metric label="This month" value={`${k.month.present}/${k.month.total}`} hint="classes attended" />
          <Metric label="Outstanding" value={k.balance.outstanding ? taka(k.balance.outstanding) : "৳0"} hint={k.balance.outstanding ? `${k.balance.dueMonths} month(s) due` : "All paid up"} accent={k.balance.outstanding ? "text-gold-300" : "text-emerald-300"} />
          <Metric label="Total paid" value={taka(totalPaid)} hint={`${k.payments.length} receipt${k.payments.length === 1 ? "" : "s"}`} />
        </div>
      </section>

      <div className="flex gap-1 rounded-xl bg-ink-100 dark:bg-white/5 p-1 w-fit max-w-full overflow-x-auto" role="tablist">
        {[["attendance", "Attendance", Icon.Calendar], ["balance", "Balance", Icon.Wallet], ["payments", "Receipts", Icon.FileText], ["schedule", "Classes", Icon.Clock]].map(([key, label, I]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition ${tab === key ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-sm" : "text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"}`}>
            <I width={14} height={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "attendance" && <AttendanceGrid records={k.attendance} />}

      {tab === "balance" && (
        <div className={cx.card}>
          <div className={cx.cardHeader}>
            <div>
              <h3 className={cx.cardTitle}>Monthly fee history</h3>
              <p className="text-xs text-ink-500 mt-0.5">{k.program} program · {taka(k.balance.fee)} per month</p>
            </div>
            {k.balance.outstanding > 0 && <Badge tone="gold">{taka(k.balance.outstanding)} outstanding</Badge>}
          </div>
          {k.balance.rows.length === 0 ? <EmptyState icon={Icon.Wallet} title="No months to show yet" /> : (
            <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
              {k.balance.rows.map((r) => (
                <li key={r.month} className="px-5 py-3.5 flex items-center gap-4">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.status === "paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : r.status === "partial" ? "bg-gold-400/15 text-gold-600 dark:text-gold-300" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                    {r.status === "paid" ? <Icon.Check width={16} height={16} /> : <Icon.Clock width={16} height={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink-900 dark:text-white">{r.month}</div>
                    <div className="text-xs text-ink-500 truncate">
                      {r.receipts.length ? r.receipts.map((x) => `${x.receiptNo} · ${x.date}`).join(", ") : "No payment recorded"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink-950 dark:text-white tabular">{taka(r.paid)} <span className="text-ink-400 font-normal">/ {taka(r.due)}</span></div>
                    <Badge tone={r.status === "paid" ? "emerald" : r.status === "partial" ? "gold" : "red"}>{r.status === "paid" ? "Paid" : r.status === "partial" ? "Partly paid" : "Due"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="px-5 py-3 text-[12px] text-ink-400 border-t border-ink-100 dark:border-white/[0.06]">Shows up to the last 12 months since enrolment. Please contact the school office if anything looks wrong.</p>
        </div>
      )}

      {tab === "payments" && (
        <div className={cx.card}>
          {k.payments.length === 0 ? <EmptyState icon={Icon.FileText} title="No receipts yet" /> : (
            <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
              {k.payments.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/receipt/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-ink-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0"><Icon.FileText width={17} height={17} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-900 dark:text-white">{p.month} <span className="font-normal text-ink-500">· {p.type.replace(/_/g, " ")}</span></div>
                      <div className="text-xs text-ink-500 tabular mt-0.5">{p.receiptNo} · {p.date} · {p.method.replace("_", " ")}</div>
                    </div>
                    <div className="font-display font-semibold text-ink-950 dark:text-white tabular">{taka(p.amount)}</div>
                    <Icon.ChevronRight width={16} height={16} className="text-ink-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className={cx.card}>
          {k.schedule.length === 0 ? <EmptyState icon={Icon.Calendar} title="No classes scheduled" hint="The branch hasn't published a schedule for this program yet." /> : (
            <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
              {k.schedule.map((s) => (
                <li key={s.id} className="px-5 py-4 flex items-center gap-4">
                  <span className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center font-display font-semibold text-sm">{s.day.slice(0, 3)}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink-900 dark:text-white">{s.day} · {s.time}</div>
                    <div className="text-xs text-ink-500">Coach {s.instructor} · {k.club?.name}</div>
                  </div>
                  {k.nextClass?.id === s.id && <Badge tone="brand" dot>Next</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint, accent = "" }) {
  return (
    <div className="p-5 sm:px-8">
      <div className="text-[12px] text-ink-400">{label}</div>
      <div className={`font-display text-xl sm:text-2xl font-semibold tabular ${accent}`}>{value}</div>
      <div className="text-[11.5px] text-ink-500">{hint}</div>
    </div>
  );
}
