"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Toast, ModalShell, ConfirmDialog, PageHeader, StatCard, Avatar, cx } from "@/components/ui";
import { ResetPasswordModal, strongPassword, PASSWORD_HINT } from "@/components/AccountActions";

export default function StaffPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [modal, setModal] = useState(null); // {type:"add"} | {type:"edit", person} | {type:"reset", person}
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => api("/api/staff").then(setData).catch((e) => setToast({ message: e.message, tone: "red" })), []);
  useEffect(() => { load(); api("/api/clubs?all=1").then(setClubs).catch(() => {}); }, [load]);
  const notify = (message, tone = "emerald") => setToast({ message, tone });

  if (!data) return <PageLoading statCards={3} />;
  const { admins = [], instructors = [] } = data;
  const activeAdmins = admins.filter((a) => a.status === "active").length;

  const runConfirm = async () => {
    setBusy(true);
    try { await confirm.run(); setConfirm(null); load(); }
    catch (e) { notify(e.message, "red"); }
    finally { setBusy(false); }
  };

  const ask = {
    role: (p, next) => setConfirm({
      title: next === "admin" ? `Make ${p.name} an administrator?` : `Make ${p.name} an instructor?`,
      message: next === "admin"
        ? "Administrators have full access to every branch, all finances, staff and settings. They will be signed out and need to log in again."
        : "They will lose administrator access and be limited to an assigned branch. They will be signed out and need to log in again.",
      label: next === "admin" ? "Promote to admin" : "Change to instructor", tone: "primary",
      run: async () => { await api("/api/staff/role", { method: "PATCH", body: JSON.stringify({ userId: p.userId, role: next }) }); notify(`${p.name} is now ${next === "admin" ? "an administrator" : "an instructor"}`); },
    }),
    status: (p) => {
      const deactivate = p.status === "active";
      setConfirm({
        title: deactivate ? `Deactivate ${p.name}?` : `Reactivate ${p.name}?`,
        message: deactivate ? "They are signed out of every device immediately and can't log in until reactivated. Their history (attendance, notices) is kept." : "They will be able to sign in again.",
        label: deactivate ? "Deactivate" : "Reactivate", tone: deactivate ? "danger" : "primary",
        run: async () => { await api("/api/users/status", { method: "PATCH", body: JSON.stringify({ userId: p.userId, active: !deactivate }) }); notify(deactivate ? `${p.name} deactivated` : `${p.name} reactivated`); },
      });
    },
    remove: (p) => setConfirm({
      title: `Remove ${p.name} permanently?`,
      message: "Only possible for staff with no attendance, notice or schedule history. For everyone else, deactivate instead. This can't be undone.",
      label: "Remove", tone: "danger",
      run: async () => { await api(`/api/staff?userId=${p.userId}`, { method: "DELETE" }); notify("Staff member removed"); },
    }),
  };

  const save = async (form) => {
    if (modal.type === "add") {
      await api("/api/instructors", { method: "POST", body: JSON.stringify(form) });
      notify(`${form.name} added as instructor`);
    } else {
      await api("/api/instructors", { method: "PATCH", body: JSON.stringify({ id: modal.person.instructorId, ...form }) });
      notify("Instructor updated");
    }
    setModal(null);
    load();
  };

  const Row = ({ p }) => {
    const self = p.userId === me.id;
    const lastAdmin = p.role === "admin" && activeAdmins <= 1 && p.status === "active";
    return (
      <li className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar name={p.name} initials={p.avatar} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink-900 dark:text-white truncate">{p.name}</span>
              {self && <Badge tone="brand">You</Badge>}
              {p.status !== "active" && <Badge dot>Inactive</Badge>}
            </div>
            <div className="text-xs text-ink-500 truncate mt-0.5">
              {p.email}{p.phone ? ` · ${p.phone}` : ""}
              {p.role === "instructor" && <> · {p.club || <span className="text-gold-600 dark:text-gold-300">No branch</span>}{p.specialization ? ` · ${p.specialization}` : ""}</>}
            </div>
          </div>
        </div>
        {!self && (
          <div className="flex items-center gap-0.5 flex-wrap sm:justify-end -ml-2 sm:ml-0">
            {p.role === "instructor" && <button onClick={() => setModal({ type: "edit", person: p })} className={cx.btnGhost}><Icon.Edit width={14} height={14} /> Edit</button>}
            <button onClick={() => setModal({ type: "reset", person: p })} className={cx.btnGhost} title="Set a temporary password"><Icon.Key width={14} height={14} /> Password</button>
            <button disabled={lastAdmin} onClick={() => ask.role(p, p.role === "admin" ? "instructor" : "admin")} className={cx.btnGhost + " disabled:opacity-30"} title={lastAdmin ? "The last active admin can't be demoted" : ""}>
              <Icon.Swap width={14} height={14} /> {p.role === "admin" ? "Make instructor" : "Make admin"}
            </button>
            <button disabled={lastAdmin} onClick={() => ask.status(p)} className={cx.btnGhost + " disabled:opacity-30"} title={p.status === "active" ? "Deactivate" : "Reactivate"}><Icon.Power width={14} height={14} /></button>
            <button disabled={lastAdmin} onClick={() => ask.remove(p)} className={cx.btnDangerGhost + " disabled:opacity-30"} title="Remove permanently"><Icon.Trash width={14} height={14} /></button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" subtitle="Admins have full access. Instructors are scoped to their assigned branch."
        actions={<button onClick={() => setModal({ type: "add" })} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add instructor</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Icon.Crown} label="Administrators" value={admins.length} hint={`${activeAdmins} active`} tone="lime" />
        <StatCard icon={Icon.Shield} label="Instructors" value={instructors.length} hint={`${instructors.filter((i) => i.status === "active").length} active`} tone="brand" />
        <StatCard icon={Icon.MapPin} label="Without a branch" value={instructors.filter((i) => !i.clubId).length} hint="instructors" tone="slate" />
      </div>

      <section className={cx.card}>
        <div className={cx.cardHeader}><h3 className={cx.cardTitle + " flex items-center gap-2"}><Icon.Crown width={16} height={16} className="text-gold-500" /> Administrators</h3></div>
        {admins.length === 0 ? <EmptyState icon={Icon.Crown} title="No administrators" /> : (
          <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">{admins.map((p) => <Row key={p.userId} p={p} />)}</ul>
        )}
      </section>

      <section className={cx.card}>
        <div className={cx.cardHeader}><h3 className={cx.cardTitle + " flex items-center gap-2"}><Icon.Shield width={16} height={16} className="text-brand-500" /> Instructors</h3></div>
        {instructors.length === 0 ? (
          <EmptyState icon={Icon.Shield} title="No instructors yet" hint="Add an instructor to assign schedules and mark attendance." />
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">{instructors.map((p) => <Row key={p.userId} p={p} />)}</ul>
        )}
      </section>

      {(modal?.type === "add" || modal?.type === "edit") && <InstructorModal mode={modal.type} initial={modal.person} clubs={clubs} onClose={() => setModal(null)} onSave={save} />}
      {modal?.type === "reset" && <ResetPasswordModal person={modal.person} onClose={() => setModal(null)} onDone={() => { setModal(null); notify(`Temporary password set for ${modal.person.name}`); }} />}
      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.label} tone={confirm?.tone} busy={busy} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function InstructorModal({ mode, initial, clubs, onClose, onSave }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(isEdit
    ? { name: initial.name, phone: initial.phone || "", specialization: initial.specialization || "", clubId: initial.clubId || "" }
    : { name: "", email: "", password: "", phone: "", specialization: "", clubId: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(""); setSubmitting(true);
    try { await onSave({ ...form, clubId: form.clubId || null }); } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };
  const valid = form.name.trim().length >= 2 && (isEdit || (/\S+@\S+\.\S+/.test(form.email) && strongPassword(form.password)));

  return (
    <ModalShell title={isEdit ? `Edit ${initial.name}` : "Add an instructor"} subtitle={isEdit ? initial.email : "Creates a staff login scoped to one branch."} onClose={onClose}
      footer={<>
        <button onClick={onClose} className={cx.btnSecondary}>Cancel</button>
        <button disabled={!valid || submitting} onClick={submit} className={cx.btnPrimary}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create instructor"}</button>
      </>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div><label className={cx.label}>Full name *</label><input className={cx.input} value={form.name} onChange={(e) => u("name", e.target.value)} /></div>
      {!isEdit && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={cx.label}>Email *</label><input type="email" autoComplete="off" className={cx.input} value={form.email} onChange={(e) => u("email", e.target.value)} /></div>
          <div>
            <label className={cx.label}>Temporary password *</label>
            <input type="password" autoComplete="new-password" className={cx.input} value={form.password} onChange={(e) => u("password", e.target.value)} />
            <p className={`text-[11px] mt-1 ${form.password && !strongPassword(form.password) ? "text-red-500" : "text-ink-400"}`}>{PASSWORD_HINT}</p>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={cx.label}>Phone</label><input className={cx.input} inputMode="tel" value={form.phone} onChange={(e) => u("phone", e.target.value)} /></div>
        <div><label className={cx.label}>Specialization</label><input className={cx.input} placeholder="e.g. Speed skating" value={form.specialization} onChange={(e) => u("specialization", e.target.value)} /></div>
      </div>
      <div><label className={cx.label}>Branch</label>
        <select className={cx.input} value={form.clubId} onChange={(e) => u("clubId", e.target.value)}>
          <option value="">No branch yet</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "active" ? " (inactive)" : ""}</option>)}
        </select>
      </div>
    </ModalShell>
  );
}
