"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Toast, ModalShell, ConfirmDialog, PageHeader, cx } from "@/components/ui";

const DAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PROGRAM_TONE = { Beginner: "brand", Intermediate: "gold", Advanced: "red" };
const PROGRAM_BAR = { Beginner: "bg-brand-500", Intermediate: "bg-gold-400", Advanced: "bg-red-500" };
const todayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });

export default function SchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [clubFilter, setClubFilter] = useState("all");

  // Adding a slot needs the full instructor roster (admin-only endpoint).
  // Deleting is allowed for admins and for instructors within their branch.
  const canAdd = user.role === "admin";
  const canDelete = ["admin", "instructor"].includes(user.role);

  const load = useCallback(() => api("/api/schedules").then(setSchedules).finally(() => setLoading(false)), []);
  useEffect(() => {
    load();
    if (canAdd) {
      api("/api/clubs").then(setClubs).catch(() => {});
      api("/api/staff").then((d) => setInstructors(d.instructors || [])).catch(() => {});
    }
  }, [load, canAdd]);

  const addSchedule = async (form) => {
    await api("/api/schedules", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false);
    setToast({ message: "Class slot added", tone: "emerald" });
    load();
  };

  const removeSlot = async () => {
    setBusy(true);
    try {
      await api(`/api/schedules?id=${confirm.id}`, { method: "DELETE" });
      setToast({ message: "Class slot removed", tone: "emerald" });
      setConfirm(null);
      load();
    } catch (e) { setToast({ message: e.message, tone: "red" }); }
    finally { setBusy(false); }
  };

  if (loading) return <PageLoading statCards={0} />;
  const branchNames = [...new Set(schedules.map((s) => s.club))].sort();
  const visible = schedules.filter((s) => clubFilter === "all" || s.club === clubFilter);
  const today = todayName();

  return (
    <div className="space-y-5">
      <PageHeader title="Weekly schedule" subtitle={`${schedules.length} class slot${schedules.length === 1 ? "" : "s"} per week`}
        actions={<>
          {branchNames.length > 1 && (
            <select className={cx.input + " !w-auto"} value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} aria-label="Branch">
              <option value="all">All branches</option>
              {branchNames.map((b) => <option key={b}>{b}</option>)}
            </select>
          )}
          {canAdd && <button onClick={() => setShowAdd(true)} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add class</button>}
        </>} />

      {visible.length === 0 ? (
        <div className={cx.card}><EmptyState icon={Icon.Calendar} title="No classes scheduled" hint={canAdd ? "Add the first weekly class slot." : "Your branch hasn't published a schedule yet."}
          action={canAdd && <button onClick={() => setShowAdd(true)} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add class</button>} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {DAY_ORDER.map((day) => {
            const slots = visible.filter((s) => s.day === day);
            const isToday = day === today;
            return (
              <section key={day} className={`${cx.card} p-3 ${isToday ? "ring-2 ring-brand-500/60 dark:ring-brand-400/50" : ""} ${slots.length === 0 ? "opacity-70" : ""}`}>
                <div className="flex items-center justify-between px-1.5 pt-1 pb-2.5">
                  <h3 className="font-display font-semibold text-[15px] text-ink-950 dark:text-white">{day}</h3>
                  {isToday ? <Badge tone="brand" dot>Today</Badge> : <span className="text-[11px] text-ink-400 tabular">{slots.length || "—"}</span>}
                </div>
                {slots.length === 0 ? (
                  <div className="text-xs text-ink-400 px-1.5 pb-2">No classes</div>
                ) : (
                  <ul className="space-y-2">
                    {slots.map((s) => (
                      <li key={s.id} className="group relative rounded-xl bg-ink-50 dark:bg-white/[0.03] ring-1 ring-ink-900/[0.04] dark:ring-white/[0.05] pl-4 pr-3 py-3 overflow-hidden">
                        <span className={`absolute left-0 top-0 bottom-0 w-1 ${PROGRAM_BAR[s.program] || "bg-ink-300"}`} />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink-900 dark:text-white flex items-center gap-1.5"><Icon.Clock width={13} height={13} className="text-ink-400" />{s.time}</div>
                            <div className="mt-1.5"><Badge tone={PROGRAM_TONE[s.program] || "slate"}>{s.program}</Badge></div>
                            <div className="text-xs text-ink-500 mt-1.5 truncate">{s.instructor} · {s.club}</div>
                          </div>
                          {canDelete && (
                            <button onClick={() => setConfirm(s)} className="opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-400 hover:text-red-600 hover:bg-red-500/10 w-7 h-7 rounded-lg flex items-center justify-center transition" aria-label={`Remove ${day} ${s.time}`}>
                              <Icon.Trash width={13} height={13} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {showAdd && <ScheduleModal clubs={clubs} instructors={instructors} onClose={() => setShowAdd(false)} onSave={addSchedule} />}
      <ConfirmDialog open={!!confirm} title="Remove this class slot?" message={confirm ? `${confirm.day} ${confirm.time}, ${confirm.program} with ${confirm.instructor} at ${confirm.club}. Students will no longer see it in their schedule.` : ""} confirmLabel="Remove slot" busy={busy} onConfirm={removeSlot} onCancel={() => setConfirm(null)} />
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function ScheduleModal({ clubs, instructors, onClose, onSave }) {
  const [form, setForm] = useState({ day: DAY_ORDER[0], time: "", program: "Beginner", clubId: clubs[0]?.id || "", instructorId: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const clubInstructors = instructors.filter((i) => i.clubId === form.clubId && i.status === "active");

  const submit = async () => {
    setError(""); setSubmitting(true);
    try { await onSave(form); } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };
  const valid = form.day && form.time.trim().length >= 3 && form.clubId && form.instructorId;

  return (
    <ModalShell title="Add a class slot" subtitle="Repeats every week until removed." onClose={onClose}
      footer={<>
        <button onClick={onClose} className={cx.btnSecondary}>Cancel</button>
        <button disabled={!valid || submitting} onClick={submit} className={cx.btnPrimary}>{submitting ? "Adding…" : "Add slot"}</button>
      </>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {clubs.length === 0 && <div className="bg-gold-400/10 ring-1 ring-gold-400/30 text-gold-600 dark:text-gold-300 text-sm px-4 py-3 rounded-xl">Create a branch first under Branches.</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={cx.label}>Day *</label>
          <select className={cx.input} value={form.day} onChange={(e) => u("day", e.target.value)}>{DAY_ORDER.map((d) => <option key={d}>{d}</option>)}</select>
        </div>
        <div><label className={cx.label}>Time *</label><input className={cx.input} placeholder="4:00 PM – 5:00 PM" value={form.time} onChange={(e) => u("time", e.target.value)} /></div>
      </div>
      <div><label className={cx.label}>Program *</label>
        <div className="grid grid-cols-3 gap-2">
          {["Beginner", "Intermediate", "Advanced"].map((p) => (
            <button type="button" key={p} onClick={() => u("program", p)} className={`py-2.5 rounded-xl text-sm font-semibold ring-1 transition ${form.program === p ? "bg-ink-950 text-white ring-ink-950 dark:bg-white dark:text-ink-950 dark:ring-white" : "ring-ink-900/10 dark:ring-white/10 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-white/5"}`}>{p}</button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={cx.label}>Branch *</label>
          <select className={cx.input} value={form.clubId} onChange={(e) => setForm((p) => ({ ...p, clubId: e.target.value, instructorId: "" }))}>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className={cx.label}>Instructor *</label>
          <select className={cx.input} value={form.instructorId} onChange={(e) => u("instructorId", e.target.value)}>
            <option value="">Select…</option>
            {clubInstructors.map((i) => <option key={i.instructorId} value={i.instructorId}>{i.name}</option>)}
          </select>
        </div>
      </div>
      {form.clubId && clubInstructors.length === 0 && <p className="text-xs text-gold-600 dark:text-gold-300 -mt-1">No active instructor is assigned to this branch yet. Assign one under Staff.</p>}
    </ModalShell>
  );
}
