"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Toast, ModalShell, ConfirmDialog, PageHeader, Avatar, cx } from "@/components/ui";

export default function NoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const canPost = ["admin", "instructor"].includes(user.role);
  const canDelete = (n) => user.role === "admin" || (user.role === "instructor" && n.mine);

  const load = useCallback(() => api("/api/notices").then(setNotices).finally(() => setLoading(false)), []);
  useEffect(() => { load(); if (user.role === "admin") api("/api/clubs").then(setClubs).catch(() => {}); }, [load, user.role]);

  const handleAdd = async (form) => {
    await api("/api/notices", { method: "POST", body: JSON.stringify(form) });
    setShowModal(false);
    setToast({ message: "Notice posted", tone: "emerald" });
    load();
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/notices?id=${confirm.id}`, { method: "DELETE" });
      setToast({ message: "Notice deleted", tone: "emerald" });
      setConfirm(null);
      load();
    } catch (e) { setToast({ message: e.message, tone: "red" }); }
    finally { setBusy(false); }
  };

  if (loading) return <PageLoading statCards={0} />;
  const list = onlyUrgent ? notices.filter((n) => n.urgent) : notices;
  const urgentCount = notices.filter((n) => n.urgent).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader title="Notices" subtitle={`${notices.length} notice${notices.length === 1 ? "" : "s"}${urgentCount ? ` · ${urgentCount} urgent` : ""}`}
        actions={<>
          {urgentCount > 0 && (
            <button onClick={() => setOnlyUrgent((v) => !v)} className={onlyUrgent ? cx.btnPrimary : cx.btnSecondary}>
              <Icon.AlertTriangle width={15} height={15} /> Urgent only
            </button>
          )}
          {canPost && <button onClick={() => setShowModal(true)} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Post notice</button>}
        </>} />

      {list.length === 0 ? (
        <div className={cx.card}><EmptyState icon={Icon.Bell} title={onlyUrgent ? "No urgent notices" : "No notices yet"} hint={canPost ? "Post an announcement for all branches or one branch." : "Announcements from your school will appear here."} /></div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => (
            <article key={n.id} className={`${cx.card} p-5 sm:p-6 relative overflow-hidden`}>
              {n.urgent && <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
              <div className="flex items-start gap-3.5">
                <Avatar name={n.author} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-ink-500">
                    <span className="font-semibold text-ink-800 dark:text-ink-200">{n.author}</span>
                    <span>·</span><span className="tabular">{n.date}</span>
                    <Badge tone={n.audience === "All" ? "slate" : "brand"}>{n.audience === "All" ? "All branches" : n.audience}</Badge>
                    {n.urgent && <Badge tone="red" dot>Urgent</Badge>}
                  </div>
                  <h3 className="font-display font-semibold text-[16px] text-ink-950 dark:text-white mt-2">{n.title}</h3>
                  <p className="text-[14.5px] text-ink-600 dark:text-ink-300 leading-relaxed whitespace-pre-wrap mt-1.5 break-words">{n.body}</p>
                </div>
                {canDelete(n) && (
                  <button onClick={() => setConfirm(n)} className={cx.iconBtn + " hover:!text-red-600 hover:!bg-red-500/10"} aria-label="Delete notice"><Icon.Trash width={15} height={15} /></button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && <NoticeModal clubs={clubs} isInstructor={user.role === "instructor"} onClose={() => setShowModal(false)} onSave={handleAdd} />}
      <ConfirmDialog open={!!confirm} title="Delete this notice?" message={confirm ? `“${confirm.title}” will be removed for everyone.` : ""} confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setConfirm(null)} />
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function NoticeModal({ clubs, isInstructor, onClose, onSave }) {
  const [form, setForm] = useState({ title: "", body: "", audience: "All", urgent: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(""); setSubmitting(true);
    try { await onSave(form); } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalShell title="Post a notice" subtitle={isInstructor ? "Visible to students in your branch (or everyone, if you choose All)." : "Choose who sees it."} onClose={onClose}
      footer={<>
        <button onClick={onClose} className={cx.btnSecondary}>Cancel</button>
        <button disabled={form.title.trim().length < 2 || form.body.trim().length < 2 || submitting} onClick={submit} className={cx.btnPrimary}>{submitting ? "Posting…" : "Post notice"}</button>
      </>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div><label className={cx.label}>Title *</label><input className={cx.input} maxLength={160} value={form.title} onChange={(e) => u("title", e.target.value)} /></div>
      <div>
        <label className={cx.label}>Message *</label>
        <textarea className={cx.input + " min-h-[130px] resize-y"} maxLength={5000} value={form.body} onChange={(e) => u("body", e.target.value)} />
        <div className="text-[11px] text-ink-400 text-right mt-1 tabular">{form.body.length}/5000</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 items-end">
        {!isInstructor && (
          <div><label className={cx.label}>Audience</label>
            <select className={cx.input} value={form.audience} onChange={(e) => u("audience", e.target.value)}>
              <option value="All">All branches</option>
              {clubs.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}
        <label className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ring-1 cursor-pointer transition ${form.urgent ? "ring-red-500/40 bg-red-500/[0.06]" : "ring-ink-900/10 dark:ring-white/10"}`}>
          <input type="checkbox" checked={form.urgent} onChange={(e) => u("urgent", e.target.checked)} className="w-4 h-4 accent-red-600" />
          <span className="text-sm font-semibold text-ink-800 dark:text-ink-200">Mark as urgent</span>
        </label>
      </div>
    </ModalShell>
  );
}
