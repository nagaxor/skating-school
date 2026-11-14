"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { PageHeader, EmptyState, PageLoading, Badge, Avatar, cx } from "@/components/ui";
import { can } from "@/lib/rbac";

const FILTERS = [
  { key: "", label: "All" },
  { key: "auth", label: "Sign-ins" },
  { key: "payment", label: "Payments" },
  { key: "student", label: "Students" },
  { key: "staff", label: "Staff" },
  { key: "user", label: "Accounts" },
  { key: "guardian", label: "Guardians" },
  { key: "settings", label: "Settings" },
];

const LABELS = {
  "auth.login": ["Signed in", "slate"],
  "auth.logout": ["Signed out", "slate"],
  "auth.logout_all": ["Signed out of all devices", "gold"],
  "auth.login_failed": ["Failed sign-in attempt", "gold"],
  "auth.locked": ["Account locked after failed attempts", "red"],
  "auth.password_change": ["Changed own password", "brand"],
  "admission.submit": ["Online admission submitted", "emerald"],
  "payment.create": ["Recorded a payment", "emerald"],
  "student.create": ["Enrolled a student", "brand"],
  "student.update": ["Edited a student", "slate"],
  "student.delete": ["Deleted a student", "red"],
  "staff.create": ["Added an instructor", "brand"],
  "staff.update": ["Edited an instructor", "slate"],
  "staff.delete": ["Removed a staff member", "red"],
  "staff.role_change": ["Changed a staff role", "gold"],
  "user.activate": ["Reactivated an account", "emerald"],
  "user.deactivate": ["Deactivated an account", "red"],
  "user.password_reset": ["Reset someone's password", "gold"],
  "branch.create": ["Created a branch", "brand"],
  "branch.update": ["Updated a branch", "slate"],
  "branch.delete": ["Deleted a branch", "red"],
  "notice.create": ["Posted a notice", "brand"],
  "notice.delete": ["Deleted a notice", "slate"],
  "schedule.create": ["Added a class slot", "brand"],
  "schedule.delete": ["Removed a class slot", "slate"],
  "settings.update": ["Changed a setting", "gold"],
  "guardian.create": ["Created a guardian account", "brand"],
  "guardian.link": ["Linked a child to a guardian", "gold"],
  "guardian.unlink": ["Unlinked a child from a guardian", "gold"],
  "guardian.delete": ["Deleted a guardian account", "red"],
};

function describe(item) {
  const m = item.meta || {};
  switch (item.action) {
    case "payment.create": return `৳${Number(m.amount || 0).toLocaleString("en-IN")} from ${m.student || "a student"} · ${m.month || ""} · ${m.receiptNo || ""}`;
    case "staff.role_change": return `${m.name}: ${m.from} → ${m.to}`;
    case "settings.update": return `${item.target}: “${m.from ?? "(empty)"}” → “${m.to}”`;
    case "admission.submit": return item.target;
    case "notice.create": case "notice.delete": return m.title;
    case "schedule.create": case "schedule.delete": return `${m.day} ${m.time} · ${m.program}`;
    case "branch.update": return m.name;
    case "guardian.link": return `${m.student} → ${m.name} (${m.relation})`;
    default: return m.name || "";
  }
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [filter, setFilter] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (reset, cur) => {
    const qs = new URLSearchParams();
    if (filter) qs.set("action", filter);
    if (!reset && cur) qs.set("cursor", cur);
    const res = await api(`/api/audit?${qs}`);
    setItems((prev) => (reset ? res.items : [...(prev || []), ...res.items]));
    setCursor(res.nextCursor);
  }, [filter]);

  useEffect(() => {
    if (!can(user.role, "audit.read")) return;
    setItems(null);
    load(true).catch((e) => setError(e.message));
  }, [load, user.role]);

  if (!can(user.role, "audit.read")) return <div className={cx.card}><EmptyState icon={Icon.Lock} title="Administrators only" /></div>;

  // Group by day
  const groups = [];
  for (const it of items || []) {
    const day = new Date(it.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, rows: [] });
    groups[groups.length - 1].rows.push(it);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader title="Activity Log" subtitle="Who did what, and when: sign-ins, payments, account and settings changes." />

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition ${filter === f.key ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950" : "bg-white dark:bg-white/5 ring-1 ring-ink-900/10 dark:ring-white/10 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-white/10"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error ? <div className={cx.card}><EmptyState icon={Icon.AlertTriangle} title="Couldn't load activity" hint={error} /></div>
        : !items ? <PageLoading statCards={0} />
        : items.length === 0 ? <div className={cx.card}><EmptyState icon={Icon.Activity} title="No activity yet" hint="Actions will appear here as people use the system." /></div>
        : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.day} className={cx.card}>
                <div className="px-5 py-3 border-b border-ink-100 dark:border-white/[0.06] text-[12px] font-semibold text-ink-500 dark:text-ink-400">{g.day}</div>
                <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
                  {g.rows.map((it) => {
                    const [label, tone] = LABELS[it.action] || [it.action, "slate"];
                    const detail = describe(it);
                    return (
                      <li key={it.id} className="px-5 py-3.5 flex items-start gap-3">
                        <Avatar name={it.actor?.name || "System"} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink-800 dark:text-ink-200">
                            <span className="font-semibold text-ink-950 dark:text-white">{it.actor?.name || "Deleted user"}</span>{" "}
                            <span className="text-ink-600 dark:text-ink-300">{label.charAt(0).toLowerCase() + label.slice(1)}</span>
                          </div>
                          {detail && <div className="text-xs text-ink-500 mt-0.5 truncate">{detail}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge tone={tone}>{it.action.split(".")[0]}</Badge>
                          <div className="text-[11px] text-ink-400 mt-1 tabular">{new Date(it.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{it.ip ? ` · ${it.ip}` : ""}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {cursor && (
              <div className="flex justify-center">
                <button className={cx.btnSecondary} disabled={loadingMore} onClick={async () => { setLoadingMore(true); try { await load(false, cursor); } finally { setLoadingMore(false); } }}>
                  {loadingMore ? "Loading…" : "Load older activity"}
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
