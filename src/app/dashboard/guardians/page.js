"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Avatar, Badge, ConfirmDialog, EmptyState, ModalShell, PageHeader, PageLoading, SearchInput, StatCard, Toast, cx } from "@/components/ui";
import { ResetPasswordModal, PASSWORD_HINT, strongPassword, generatePassword } from "@/components/AccountActions";

const RELATIONS = ["Father", "Mother", "Guardian"];

export default function GuardiansPage() {
  const { user } = useAuth();
  const [guardians, setGuardians] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {type:"add"} | {type:"link", g} | {type:"reset", g}
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => api("/api/guardians").then(setGuardians).catch((e) => setToast({ message: e.message, tone: "red" })), []);
  useEffect(() => { if (user.role === "admin") { load(); api("/api/students").then(setStudents).catch(() => {}); } }, [load, user.role]);
  const notify = (message, tone = "emerald") => setToast({ message, tone });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (guardians || []).filter((g) => !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || (g.phone || "").includes(q) || g.children.some((c) => c.name.toLowerCase().includes(q)));
  }, [guardians, search]);

  if (user.role !== "admin") return <div className={cx.card}><EmptyState icon={Icon.Lock} title="Administrators only" /></div>;
  if (!guardians) return <PageLoading statCards={3} />;

  const linkedIds = new Set(guardians.flatMap((g) => g.children.map((c) => c.id)));
  const runConfirm = async () => {
    setBusy(true);
    try { await confirm.run(); setConfirm(null); load(); } catch (e) { notify(e.message, "red"); } finally { setBusy(false); }
  };

  const unlink = (g, c) => setConfirm({
    title: `Unlink ${c.name} from ${g.name}?`,
    message: `${g.name} will immediately stop seeing ${c.name}'s attendance, fees and receipts.`,
    label: "Unlink", tone: "danger",
    run: async () => { await api("/api/guardians", { method: "PATCH", body: JSON.stringify({ guardianId: g.userId, unlink: c.id }) }); notify("Child unlinked"); },
  });
  const toggle = (g) => {
    const deactivate = g.status === "active";
    setConfirm({
      title: deactivate ? `Deactivate ${g.name}?` : `Reactivate ${g.name}?`,
      message: deactivate ? "They're signed out of every device immediately and can't log in until reactivated." : "They'll be able to sign in again.",
      label: deactivate ? "Deactivate" : "Reactivate", tone: deactivate ? "danger" : "primary",
      run: async () => { await api("/api/users/status", { method: "PATCH", body: JSON.stringify({ userId: g.userId, active: !deactivate }) }); notify(deactivate ? "Guardian deactivated" : "Guardian reactivated"); },
    });
  };
  const remove = (g) => setConfirm({
    title: `Delete ${g.name}'s guardian account?`,
    message: "The login and all child links are removed. The children's own records are not affected.",
    label: "Delete", tone: "danger",
    run: async () => { await api(`/api/guardians?userId=${g.userId}`, { method: "DELETE" }); notify("Guardian deleted"); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Guardians" subtitle="Parent accounts for the guardian portal. A guardian only ever sees the children linked here."
        actions={<button onClick={() => setModal({ type: "add" })} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add guardian</button>} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Icon.HeartPulse} label="Guardians" value={guardians.length} hint={`${guardians.filter((g) => g.status === "active").length} active`} tone="brand" />
        <StatCard icon={Icon.Users} label="Children linked" value={linkedIds.size} hint={`of ${students.length} students`} tone="emerald" />
        <StatCard icon={Icon.AlertTriangle} label="Not linked" value={students.filter((s) => !linkedIds.has(s.id)).length} hint="students without a guardian" tone="gold" />
      </div>

      <div className={cx.card}>
        <div className="p-3 sm:p-4 border-b border-ink-100 dark:border-white/[0.06]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search guardian, email, phone or child…" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Icon.HeartPulse} title={guardians.length ? "No matches" : "No guardians yet"} hint={guardians.length ? "Try another search." : "Create a guardian account and link their children."}
            action={!guardians.length && <button onClick={() => setModal({ type: "add" })} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add guardian</button>} />
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
            {filtered.map((g) => (
              <li key={g.userId} className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 lg:w-80 min-w-0">
                  <Avatar name={g.name} initials={g.avatar} size={42} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="font-semibold text-ink-900 dark:text-white truncate">{g.name}</span>{g.status !== "active" && <Badge dot>Inactive</Badge>}</div>
                    <div className="text-xs text-ink-500 truncate">{g.email}{g.phone ? ` · ${g.phone}` : ""}</div>
                  </div>
                </div>
                <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                  {g.children.length === 0 && <span className="text-[13px] text-gold-600 dark:text-gold-300">No children linked</span>}
                  {g.children.map((c) => (
                    <span key={c.id} className="group inline-flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full bg-ink-50 dark:bg-white/[0.04] ring-1 ring-ink-900/[0.06] dark:ring-white/[0.08] text-[12.5px]">
                      <Avatar name={c.name} initials={c.avatar} size={24} className="!rounded-full" />
                      <span className="font-semibold text-ink-800 dark:text-ink-100">{c.name}</span>
                      <span className="text-ink-400">{c.relation}</span>
                      <button onClick={() => unlink(g, c)} className="w-5 h-5 rounded-full flex items-center justify-center text-ink-400 hover:text-red-600 hover:bg-red-500/10" aria-label={`Unlink ${c.name}`}><Icon.X width={11} height={11} /></button>
                    </span>
                  ))}
                  <button onClick={() => setModal({ type: "link", g })} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-semibold text-brand-700 dark:text-brand-300 ring-1 ring-dashed ring-brand-500/40 hover:bg-brand-500/10"><Icon.Plus width={12} height={12} /> Link child</button>
                </div>
                <div className="flex items-center gap-0.5 -ml-2 lg:ml-0">
                  <button onClick={() => setModal({ type: "reset", g })} className={cx.btnGhost}><Icon.Key width={14} height={14} /> Password</button>
                  <button onClick={() => toggle(g)} className={cx.btnGhost} title={g.status === "active" ? "Deactivate" : "Reactivate"}><Icon.Power width={14} height={14} /></button>
                  <button onClick={() => remove(g)} className={cx.btnDangerGhost} title="Delete"><Icon.Trash width={14} height={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal?.type === "add" && <GuardianModal students={students} onClose={() => setModal(null)} onSaved={(n) => { setModal(null); notify(`${n} can now sign in to the guardian portal`); load(); }} />}
      {modal?.type === "link" && <LinkModal guardian={modal.g} students={students} onClose={() => setModal(null)} onSaved={() => { setModal(null); notify("Child linked"); load(); }} />}
      {modal?.type === "reset" && <ResetPasswordModal person={{ userId: modal.g.userId, name: modal.g.name }} onClose={() => setModal(null)} onDone={() => { setModal(null); notify(`Temporary password set for ${modal.g.name}`); }} />}
      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.label} tone={confirm?.tone} busy={busy} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function StudentPicker({ students, selected, onToggle, exclude = [] }) {
  const [q, setQ] = useState("");
  const list = students.filter((s) => !exclude.includes(s.id) && (!q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.guardian || "").toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="rounded-xl ring-1 ring-ink-900/10 dark:ring-white/10 overflow-hidden">
      <div className="p-2 border-b border-ink-100 dark:border-white/[0.06]"><SearchInput value={q} onChange={setQ} placeholder="Search students…" /></div>
      <ul className="max-h-56 overflow-y-auto divide-y divide-ink-100 dark:divide-white/[0.05]">
        {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-400">No students found</li>}
        {list.map((s) => {
          const on = selected.includes(s.id);
          return (
            <li key={s.id}>
              <button type="button" onClick={() => onToggle(s.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${on ? "bg-brand-500/[0.08]" : "hover:bg-ink-50 dark:hover:bg-white/[0.03]"}`}>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ring-1 ${on ? "bg-brand-600 ring-brand-600 text-white" : "ring-ink-900/20 dark:ring-white/20"}`}>{on && <Icon.Check width={12} height={12} strokeWidth={3} />}</span>
                <Avatar name={s.name} initials={s.avatar} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-900 dark:text-white truncate">{s.name}</div>
                  <div className="text-xs text-ink-500 truncate">{s.program} · {s.club || "Unassigned"}{s.guardian ? ` · ${s.guardian}` : ""}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GuardianModal({ students, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: generatePassword(), relation: "Father" });
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && strongPassword(form.password);

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      await api("/api/guardians", { method: "POST", body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password, children: picked.map((studentId) => ({ studentId, relation: form.relation })) }) });
      onSaved(form.name);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <ModalShell title="Add a guardian" subtitle="Creates a parent login that can see only the children you select." onClose={onClose} maxWidth="max-w-2xl"
      footer={<><button onClick={onClose} className={cx.btnSecondary}>Cancel</button><button disabled={!valid || busy} onClick={submit} className={cx.btnPrimary}>{busy ? "Creating…" : `Create guardian${picked.length ? ` · ${picked.length} child${picked.length === 1 ? "" : "ren"}` : ""}`}</button></>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={cx.label}>Full name *</label><input className={cx.input} value={form.name} onChange={(e) => u("name", e.target.value)} /></div>
        <div><label className={cx.label}>Phone</label><input className={cx.input} inputMode="tel" value={form.phone} onChange={(e) => u("phone", e.target.value)} /></div>
        <div><label className={cx.label}>Email (login) *</label><input type="email" autoComplete="off" className={cx.input} value={form.email} onChange={(e) => u("email", e.target.value)} /></div>
        <div>
          <label className={cx.label}>Temporary password *</label>
          <div className="flex gap-2"><input className={cx.input + " font-mono"} value={form.password} onChange={(e) => u("password", e.target.value)} autoComplete="off" spellCheck={false} /><button type="button" onClick={() => u("password", generatePassword())} className={cx.btnSecondary + " !px-3"} aria-label="Generate">↻</button></div>
          <p className={`text-[11px] mt-1 ${strongPassword(form.password) ? "text-ink-400" : "text-red-500"}`}>{PASSWORD_HINT}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={cx.label + " !mb-0"}>Children {picked.length > 0 && <span className="text-ink-400 font-normal">· {picked.length} selected</span>}</label>
          <div className="inline-flex rounded-lg bg-ink-100 dark:bg-white/5 p-0.5">
            {RELATIONS.map((r) => <button type="button" key={r} onClick={() => u("relation", r)} className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${form.relation === r ? "bg-white dark:bg-ink-800 shadow-sm text-ink-900 dark:text-white" : "text-ink-500"}`}>{r}</button>)}
          </div>
        </div>
        <StudentPicker students={students} selected={picked} onToggle={(id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />
      </div>
    </ModalShell>
  );
}

function LinkModal({ guardian, students, onClose, onSaved }) {
  const [picked, setPicked] = useState([]);
  const [relation, setRelation] = useState("Father");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(""); setBusy(true);
    try {
      for (const studentId of picked) await api("/api/guardians", { method: "PATCH", body: JSON.stringify({ guardianId: guardian.userId, link: { studentId, relation } }) });
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <ModalShell title={`Link children to ${guardian.name}`} subtitle="They'll see attendance, fees and receipts for these children." onClose={onClose} maxWidth="max-w-xl"
      footer={<><button onClick={onClose} className={cx.btnSecondary}>Cancel</button><button disabled={!picked.length || busy} onClick={submit} className={cx.btnPrimary}>{busy ? "Linking…" : `Link ${picked.length || ""}`}</button></>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div className="inline-flex rounded-lg bg-ink-100 dark:bg-white/5 p-0.5">
        {RELATIONS.map((r) => <button type="button" key={r} onClick={() => setRelation(r)} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${relation === r ? "bg-white dark:bg-ink-800 shadow-sm text-ink-900 dark:text-white" : "text-ink-500"}`}>{r}</button>)}
      </div>
      <StudentPicker students={students} selected={picked} exclude={guardian.children.map((c) => c.id)} onToggle={(id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />
    </ModalShell>
  );
}
