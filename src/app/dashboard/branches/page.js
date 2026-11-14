"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Toast, ModalShell, PageHeader, StatCard, cx } from "@/components/ui";
import { RinkLines } from "@/components/Brand";

export default function BranchesPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => api("/api/clubs?all=1").then(setClubs).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const notify = (message, tone = "emerald") => setToast({ message, tone });

  const addBranch = async (form) => {
    await api("/api/clubs", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false);
    notify("Branch added");
    load();
  };

  const saveEdit = async (form) => {
    await api("/api/clubs", { method: "PATCH", body: JSON.stringify({ id: editing.id, ...form }) });
    setEditing(null);
    notify("Branch updated");
    load();
  };

  const toggleStatus = async (club) => {
    setBusyId(club.id);
    try {
      await api("/api/clubs", { method: "PATCH", body: JSON.stringify({ id: club.id, status: club.status === "active" ? "inactive" : "active" }) });
      notify(club.status === "active" ? `${club.name} marked inactive` : `${club.name} reactivated`);
      load();
    } catch (e) { notify(e.message, "red"); }
    finally { setBusyId(null); }
  };

  const remove = async (club) => {
    if (!confirm(`Delete "${club.name}"? This can't be undone.`)) return;
    setBusyId(club.id);
    try {
      await api(`/api/clubs?id=${club.id}`, { method: "DELETE" });
      notify("Branch deleted");
      load();
    } catch (e) { notify(e.message, "red"); }
    finally { setBusyId(null); }
  };

  if (loading) return <PageLoading statCards={0} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Branches" subtitle="Deactivate a branch to hide it from new admissions without losing its history."
        actions={<button onClick={() => setShowAdd(true)} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add branch</button>} />
      {clubs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={Icon.Building} label="Active branches" value={clubs.filter((c) => c.status === "active").length} hint={`${clubs.length} total`} tone="brand" />
          <StatCard icon={Icon.Users} label="Students" value={clubs.reduce((s, c) => s + c.studentCount, 0)} tone="lime" />
          <StatCard icon={Icon.Shield} label="Instructors" value={clubs.reduce((s, c) => s + c.instructorCount, 0)} tone="slate" />
        </div>
      )}

      {clubs.length === 0 ? (
        <div className={cx.card}><EmptyState icon={Icon.Building} title="No branches yet" hint="Add your first branch to start assigning students and instructors." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((c) => (
            <div key={c.id} className={`${cx.card} overflow-hidden flex flex-col transition-opacity ${c.status === "inactive" ? "opacity-60" : ""}`}>
              <div className="relative h-24 bg-ink-950 overflow-hidden">
                <RinkLines animated={false} className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0 grain" />
                <div className="absolute top-3 right-3"><Badge dot tone={c.status === "active" ? "emerald" : "slate"}>{c.status === "active" ? "Active" : "Inactive"}</Badge></div>
              </div>
              <div className="px-5 -mt-6 relative"><div className="w-12 h-12 rounded-xl bg-white dark:bg-ink-800 shadow-lift dark:ring-1 dark:ring-white/10 flex items-center justify-center text-brand-600 dark:text-brand-300"><Icon.Building width={20} height={20} /></div></div>
              <div className="p-5 pt-3 flex flex-col gap-4 flex-1">
              <div>
                <div className="font-display font-semibold text-ink-950 dark:text-white">{c.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1"><Icon.MapPin width={12} height={12} />{c.location}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Icon.Users width={13} height={13} />{c.studentCount} student{c.studentCount !== 1 && "s"}</span>
                <span className="flex items-center gap-1"><Icon.Shield width={13} height={13} />{c.instructorCount} instructor{c.instructorCount !== 1 && "s"}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.07] mt-auto">
                <button onClick={() => setEditing(c)} className={cx.btnGhost}><Icon.Edit width={13} height={13} /> Edit</button>
                <button disabled={busyId === c.id} onClick={() => toggleStatus(c)} className={cx.btnGhost + " disabled:opacity-40"}>
                  {c.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  disabled={busyId === c.id || c.studentCount > 0 || c.instructorCount > 0}
                  onClick={() => remove(c)}
                  title={c.studentCount > 0 || c.instructorCount > 0 ? "Reassign members before deleting" : "Delete branch"}
                  className={cx.btnDangerGhost + " ml-auto disabled:opacity-30 disabled:pointer-events-none"}
                >
                  <Icon.Trash width={13} height={13} />
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <BranchModal title="Add Branch" onClose={() => setShowAdd(false)} onSave={addBranch} />}
      {editing && <BranchModal title="Edit Branch" initial={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function BranchModal({ title, initial, onClose, onSave }) {
  const [form, setForm] = useState({ name: initial?.name || "", location: initial?.location || "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(""); setSubmitting(true);
    try { await onSave(form); } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      maxWidth="max-w-sm"
      footer={<>
        <button onClick={onClose} className={cx.btnSecondary}>Cancel</button>
        <button disabled={!form.name || !form.location || submitting} onClick={submit} className={cx.btnPrimary}>{submitting ? "Saving…" : "Save"}</button>
      </>}
    >
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div><label className={cx.label}>Branch name *</label><input className={cx.input} placeholder="e.g. Uttara Skating Club" value={form.name} onChange={(e) => u("name", e.target.value)} /></div>
      <div><label className={cx.label}>Location *</label><input className={cx.input} placeholder="e.g. Uttara, Dhaka" value={form.location} onChange={(e) => u("location", e.target.value)} /></div>
    </ModalShell>
  );
}
