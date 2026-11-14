"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Toast, ModalShell, ConfirmDialog, PageHeader, StatCard, cx } from "@/components/ui";
import { RinkLines } from "@/components/Brand";

export default function BranchesPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  // Card → full page: a dark "portal" grows from the card to fill the screen,
  // then we navigate. The branch page starts on the same dark stage, so the
  // hand-off is seamless. Reduced motion → navigate immediately.
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const openBranch = useCallback((club, el) => {
    const href = `/dashboard/branches/${club.id}`;
    if (leaving) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !el?.getBoundingClientRect) { router.push(href); return; }
    setLeaving(true);
    const r = el.getBoundingClientRect();
    const portal = document.createElement("div");
    portal.setAttribute("aria-hidden", "true");
    Object.assign(portal.style, { position: "fixed", zIndex: "80", left: "0", top: "0", width: "100vw", height: "100vh", background: "#030407", pointerEvents: "none" });
    portal.innerHTML = `<div style="position:absolute;inset:0;background:radial-gradient(circle at ${r.left + r.width / 2}px ${r.top + r.height / 2}px, rgba(47,107,224,.45), transparent 55%)"></div>`;
    document.body.appendChild(portal);
    const from = `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round 20px)`;
    const anim = portal.animate([{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: 650, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "forwards" });
    router.prefetch(href);
    // Hand-off: the branch page calls window.__releaseBranchPortal() once it has
    // rendered, so the old list never flashes. Safety net in case it never does.
    window.__releaseBranchPortal = () => {
      window.__releaseBranchPortal = null;
      portal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "ease-out", fill: "forwards" }).finished.then(() => portal.remove());
    };
    setTimeout(() => window.__releaseBranchPortal?.(), 8000);
    anim.finished.then(() => router.push(href));
  }, [leaving, router]);

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

  const runConfirm = async () => {
    setBusyId(confirm.club.id);
    try { await confirm.run(); setConfirm(null); load(); }
    catch (e) { notify(e.message, "red"); }
    finally { setBusyId(null); }
  };

  const toggleStatus = (club) => {
    const deactivate = club.status === "active";
    setConfirm({
      club,
      title: deactivate ? `Deactivate ${club.name}?` : `Reactivate ${club.name}?`,
      message: deactivate
        ? "It will be hidden from new admissions and the public Branches page. Students, instructors and history are kept."
        : "It will appear again on the public site and in the admission form.",
      label: deactivate ? "Deactivate" : "Reactivate",
      tone: deactivate ? "danger" : "primary",
      run: async () => {
        await api("/api/clubs", { method: "PATCH", body: JSON.stringify({ id: club.id, status: deactivate ? "inactive" : "active" }) });
        notify(deactivate ? `${club.name} deactivated` : `${club.name} reactivated`);
      },
    });
  };

  const remove = (club) => setConfirm({
    club,
    title: `Delete ${club.name}?`,
    message: "This permanently deletes the branch. It can't be undone.",
    label: "Delete branch",
    tone: "danger",
    run: async () => { await api(`/api/clubs?id=${club.id}`, { method: "DELETE" }); notify("Branch deleted"); },
  });

  // Card actions must not also open the drawer.
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

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
            <div key={c.id} role="button" tabIndex={0} aria-label={`Open ${c.name}`}
              onClick={(e) => openBranch(c, e.currentTarget)}
              onMouseEnter={() => router.prefetch(`/dashboard/branches/${c.id}`)}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openBranch(c, e.currentTarget); } }}
              className={`${cx.card} group overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:hover:ring-white/[0.16] focus-visible:ring-2 focus-visible:ring-brand-500 ${c.status === "inactive" ? "opacity-60" : ""}`}>
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
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-lime-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 transition-all">
                  Open branch <Icon.ArrowRight width={12} height={12} />
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.07] mt-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={stop(() => setEditing(c))} className={cx.btnGhost}><Icon.Edit width={13} height={13} /> Edit</button>
                <button disabled={busyId === c.id} onClick={stop(() => toggleStatus(c))} className={cx.btnGhost + " disabled:opacity-40"}>
                  {c.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  disabled={busyId === c.id || c.studentCount > 0 || c.instructorCount > 0}
                  onClick={stop(() => remove(c))}
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

      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.label} tone={confirm?.tone} busy={!!busyId} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
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
