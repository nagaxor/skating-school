"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Avatar, Badge, EmptyState, PageLoading, cx } from "@/components/ui";

export const taka = (n) => `৳${Number(n || 0).toLocaleString("en-IN")}`;

export const TODAY = {
  present: { label: "In class today", tone: "emerald", icon: Icon.Check, dot: "bg-emerald-500" },
  absent: { label: "Absent today", tone: "red", icon: Icon.X, dot: "bg-red-500" },
  pending: { label: "Class today · not marked yet", tone: "gold", icon: Icon.Clock, dot: "bg-gold-400" },
  no_class: { label: "No class today", tone: "slate", icon: Icon.Calendar, dot: "bg-ink-300" },
};

// Shared loader for the guardian portal pages.
export function useMyChildren() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/api/my-children").then(setData).catch((e) => setError(e.message)); }, []);
  return { data, error };
}

export default function GuardianHome({ user }) {
  const { data, error } = useMyChildren();
  if (error) return <div className={cx.card}><EmptyState icon={Icon.AlertTriangle} title="Couldn't load your children" hint={error} /></div>;
  if (!data) return <PageLoading statCards={2} />;

  const kids = data.children;
  const totalDue = kids.reduce((s, k) => s + k.balance.outstanding, 0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12.5px] font-medium text-ink-500 dark:text-ink-400">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h2 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight text-ink-950 dark:text-white mt-0.5">{greet}, {user.name.split(" ")[0]}</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{kids.length ? `Here's how your ${kids.length === 1 ? "child is" : `${kids.length} children are`} doing.` : "Your guardian portal"}</p>
        </div>
        {kids.length > 0 && (
          <div className={`rounded-2xl px-5 py-3 ring-1 ${totalDue ? "bg-gold-400/10 ring-gold-400/30" : "bg-emerald-500/[0.07] ring-emerald-500/20"}`}>
            <div className="text-[11.5px] font-medium text-ink-500 dark:text-ink-400">{totalDue ? "Total outstanding" : "Fees"}</div>
            <div className={`font-display text-xl font-semibold tabular ${totalDue ? "text-gold-600 dark:text-gold-300" : "text-emerald-700 dark:text-emerald-300"}`}>{totalDue ? taka(totalDue) : "All paid up ✓"}</div>
          </div>
        )}
      </div>

      {kids.length === 0 ? (
        <div className={cx.card}>
          <EmptyState icon={Icon.Users} title="No children linked yet" hint="Ask the school office to link your child's admission to this account. For your safety, only the school can do this." />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {kids.map((k) => <ChildCard key={k.id} child={k} />)}
        </div>
      )}

      <div className="rounded-2xl ring-1 ring-ink-900/[0.06] dark:ring-white/[0.07] bg-white/60 dark:bg-white/[0.02] p-4 flex items-start gap-3 text-[13px] text-ink-500 dark:text-ink-400">
        <Icon.Lock width={16} height={16} className="flex-shrink-0 mt-0.5 text-ink-400" />
        <span>Only you and the school can see your children&apos;s records. Children are linked to your account by the school office.</span>
      </div>
    </div>
  );
}

function ChildCard({ child: k }) {
  const t = TODAY[k.today] || TODAY.no_class;
  const rate = k.month.total ? Math.round((k.month.present / k.month.total) * 100) : null;
  const r = 26, c = 2 * Math.PI * r;
  return (
    <Link href={`/dashboard/children/${k.id}`} className={`${cx.card} group overflow-hidden hover:shadow-lift transition-shadow`}>
      <div className="relative bg-ink-950 text-white p-5 overflow-hidden">
        <div className="absolute inset-0 grain" />
        <div className="absolute -top-16 -right-10 w-56 h-56 bg-[radial-gradient(closest-side,rgba(47,107,224,0.35),transparent)]" />
        <div className="relative flex items-center gap-4">
          <Avatar name={k.name} initials={k.avatar} src={k.photo} size={60} className="!rounded-2xl ring-2 ring-white/10" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold truncate">{k.name}</h3>
            </div>
            <div className="text-[13px] text-ink-400 truncate">{k.program} · {k.club?.name || "No branch"}</div>
          </div>
          <Icon.ChevronRight width={18} height={18} className="text-ink-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
        </div>
        <div className={`relative mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold bg-white/[0.07] ring-1 ring-white/10`}>
          <span className={`w-2 h-2 rounded-full ${t.dot} ${k.today === "pending" ? "animate-pulse" : ""}`} /> {t.label}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-ink-100 dark:divide-white/[0.06]">
        <div className="p-4 flex items-center gap-3">
          <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90 flex-shrink-0 hidden sm:block" aria-hidden="true">
            <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" className="stroke-ink-100 dark:stroke-white/10" />
            {rate > 0 && <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke={rate >= 75 ? "#10B981" : "#EDBE57"} strokeDasharray={`${(rate / 100) * c} ${c}`} />}
          </svg>
          <div>
            <div className="text-[11px] text-ink-500">This month</div>
            <div className="font-display text-lg font-semibold text-ink-950 dark:text-white tabular">{rate == null ? "—" : `${rate}%`}</div>
            <div className="text-[11px] text-ink-400 tabular">{k.month.present}/{k.month.total} present</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-ink-500">Next class</div>
          <div className="text-[14px] font-semibold text-ink-950 dark:text-white mt-0.5 truncate">{k.nextClass ? k.nextClass.day : "—"}</div>
          <div className="text-[11px] text-ink-400 truncate">{k.nextClass ? k.nextClass.time : "Not scheduled"}</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-ink-500">Balance</div>
          {k.balance.outstanding ? (
            <>
              <div className="font-display text-lg font-semibold text-gold-600 dark:text-gold-300 tabular">{taka(k.balance.outstanding)}</div>
              <div className="text-[11px] text-ink-400">{k.balance.dueMonths} month{k.balance.dueMonths === 1 ? "" : "s"} due</div>
            </>
          ) : (
            <>
              <div className="font-display text-lg font-semibold text-emerald-600 dark:text-emerald-400">Paid</div>
              <div className="text-[11px] text-ink-400">Up to date</div>
            </>
          )}
        </div>
      </div>
      {!k.active && <div className="px-4 py-2 text-[12px] bg-ink-50 dark:bg-white/[0.03] text-ink-500 border-t border-ink-100 dark:border-white/[0.06]"><Badge>Inactive</Badge> This enrolment is currently inactive.</div>}
    </Link>
  );
}
