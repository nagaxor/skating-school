"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Toast, ModalShell, ConfirmDialog, PageHeader, SearchInput, Avatar, cx } from "@/components/ui";

const PROGRAM_TONE = { Beginner: "brand", Intermediate: "gold", Advanced: "red" };
const PASSWORD_HINT = "At least 8 characters, with a letter and a number";
const strong = (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("all");
  const [club, setClub] = useState("all");
  const [status, setStatus] = useState("active");
  const [modal, setModal] = useState(null); // { type: "add" } | { type: "edit", student }
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/api/students").then(setStudents).finally(() => setLoading(false)), []);
  useEffect(() => { load(); api("/api/clubs").then(setClubs).catch(() => {}); }, [load]);
  const notify = (message, tone = "emerald") => setToast({ message, tone });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) =>
      (!q || s.name.toLowerCase().includes(q) || (s.guardian || "").toLowerCase().includes(q) || (s.phone || "").includes(q) || (s.email || "").toLowerCase().includes(q)) &&
      (program === "all" || s.program === program) &&
      (club === "all" || s.clubId === club) &&
      (status === "all" || s.status === status)
    );
  }, [students, search, program, club, status]);

  const counts = useMemo(() => ({
    all: students.length,
    active: students.filter((s) => s.status === "active").length,
    inactive: students.filter((s) => s.status !== "active").length,
  }), [students]);

  const save = async (form) => {
    if (modal.type === "add") {
      await api("/api/students", { method: "POST", body: JSON.stringify(form) });
      notify(`${form.name} enrolled`);
    } else {
      await api("/api/students", { method: "PATCH", body: JSON.stringify({ id: modal.student.id, ...form }) });
      notify("Student updated");
    }
    setModal(null);
    load();
  };

  const runConfirm = async () => {
    setBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
      load();
    } catch (e) { notify(e.message, "red"); }
    finally { setBusy(false); }
  };

  const askToggle = (s) => {
    const deactivate = s.status === "active";
    setConfirm({
      title: deactivate ? `Deactivate ${s.name}?` : `Reactivate ${s.name}?`,
      message: deactivate
        ? "They will be signed out immediately and won't be able to log in. Their records, payments and attendance are kept. You can reactivate them any time."
        : "They will be able to sign in again with their existing password.",
      label: deactivate ? "Deactivate" : "Reactivate",
      tone: deactivate ? "danger" : "primary",
      run: async () => {
        await api("/api/users/status", { method: "PATCH", body: JSON.stringify({ userId: s.userId, active: !deactivate }) });
        notify(deactivate ? `${s.name} deactivated` : `${s.name} reactivated`);
      },
    });
  };

  const askDelete = (s) => setConfirm({
    title: `Permanently delete ${s.name}?`,
    message: "This deletes the student account together with ALL their payments and attendance records. It can't be undone. Consider deactivating instead.",
    label: "Delete permanently",
    tone: "danger",
    run: async () => {
      await api(`/api/students?id=${s.id}`, { method: "DELETE" });
      notify("Student deleted");
    },
  });

  const exportCsv = () => downloadCsv(`students-${new Date().toISOString().slice(0, 10)}.csv`, filtered, [
    { label: "Name", value: "name" }, { label: "Email", value: "email" }, { label: "Phone", value: "phone" },
    { label: "Guardian", value: "guardian" }, { label: "Age", value: "age" }, { label: "Program", value: "program" },
    { label: "Branch", value: "club" }, { label: "Status", value: "status" },
    { label: "Enrolled", value: (r) => (r.enrollDate || "").slice(0, 10) },
  ]);

  if (loading) return <PageLoading statCards={0} />;
  const canManage = ["admin", "instructor"].includes(user.role);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle={`${counts.active} active · ${counts.inactive} inactive`}
        actions={canManage && (
          <>
            <button onClick={exportCsv} disabled={!filtered.length} className={cx.btnSecondary}><Icon.Download width={15} height={15} /> Export</button>
            <button onClick={() => setModal({ type: "add" })} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add student</button>
          </>
        )}
      />

      <div className={cx.card}>
        <div className="p-3 sm:p-4 flex flex-wrap gap-2 border-b border-ink-100 dark:border-white/[0.06]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, guardian, phone, email…" className="flex-1 min-w-[220px]" />
          <select className={cx.input + " !w-auto"} value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Program">
            <option value="all">All programs</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
          {user.role === "admin" && (
            <select className={cx.input + " !w-auto"} value={club} onChange={(e) => setClub(e.target.value)} aria-label="Branch">
              <option value="all">All branches</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="inline-flex rounded-xl bg-ink-100 dark:bg-white/5 p-1" role="tablist" aria-label="Status">
            {["active", "inactive", "all"].map((k) => (
              <button key={k} role="tab" aria-selected={status === k} onClick={() => setStatus(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${status === k ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-sm" : "text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"}`}>
                {k} <span className="text-ink-400 tabular">{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Icon.Users} title={students.length ? "No students match these filters" : "No students yet"}
            hint={students.length ? "Try clearing the search or filters." : "Enroll your first student, or share the online admission link with parents."}
            action={!students.length && canManage && <button onClick={() => setModal({ type: "add" })} className={cx.btnPrimary}><Icon.Plus width={16} height={16} /> Add student</button>} />
        ) : (
          <>
            <ul className="md:hidden divide-y divide-ink-100 dark:divide-white/[0.05]">
              {filtered.map((s) => (
                <li key={s.id}>
                  <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-ink-50 dark:active:bg-white/[0.03]">
                    <Avatar name={s.name} initials={s.avatar} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[15px] text-ink-900 dark:text-white truncate">{s.name}</span>
                        {s.status !== "active" && <Badge>Inactive</Badge>}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5 truncate">{s.program} · {s.club || "Unassigned"}{s.age != null ? ` · Age ${s.age}` : ""}</div>
                    </div>
                    <Icon.ChevronRight width={18} height={18} className="text-ink-300 flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr className={cx.thead}>
                  <th className={cx.th}>Student</th><th className={cx.th}>Guardian</th><th className={cx.th}>Branch</th>
                  <th className={cx.th}>Program</th><th className={cx.th}>Status</th><th className={cx.th + " text-right"}>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className={cx.tr}>
                      <td className={cx.td}>
                        <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 group">
                          <Avatar name={s.name} initials={s.avatar} size={34} />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-300 truncate">{s.name}</div>
                            <div className="text-xs text-ink-500 truncate">{s.age != null ? `Age ${s.age} · ` : ""}{s.phone || s.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className={cx.td}>{s.guardian || "—"}</td>
                      <td className={cx.td}>{s.club || <span className="text-ink-400">Unassigned</span>}</td>
                      <td className={cx.td}><Badge tone={PROGRAM_TONE[s.program] || "slate"}>{s.program}</Badge></td>
                      <td className={cx.td}><Badge dot tone={s.status === "active" ? "emerald" : "slate"}>{s.status === "active" ? "Active" : "Inactive"}</Badge></td>
                      <td className={cx.td}>
                        {canManage && (
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => setModal({ type: "edit", student: s })} className={cx.btnGhost} title="Edit"><Icon.Edit width={14} height={14} /> Edit</button>
                            <button onClick={() => askToggle(s)} className={cx.btnGhost} title={s.status === "active" ? "Deactivate" : "Reactivate"}><Icon.Power width={14} height={14} /></button>
                            {user.role === "admin" && <button onClick={() => askDelete(s)} className={cx.btnDangerGhost} title="Delete permanently"><Icon.Trash width={14} height={14} /></button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modal && <StudentModal mode={modal.type} student={modal.student} clubs={clubs} isAdmin={user.role === "admin"} onClose={() => setModal(null)} onSave={save} />}
      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.label} tone={confirm?.tone} busy={busy} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function StudentModal({ mode, student, clubs, isAdmin, onClose, onSave }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(isEdit
    ? { name: student.name, phone: student.phone || "", age: student.age ?? "", guardian: student.guardian || "", program: student.program, clubId: student.clubId || "" }
    : { name: "", email: "", password: "", phone: "", age: "", guardian: "", program: "Beginner", clubId: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(""); setSubmitting(true);
    const payload = { ...form, age: form.age === "" ? null : Number(form.age), clubId: form.clubId || null };
    if (!isAdmin) delete payload.clubId;
    try { await onSave(payload); } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const valid = form.name.trim().length >= 2 && form.guardian.trim().length >= 2 &&
    (isEdit || (/\S+@\S+\.\S+/.test(form.email) && strong(form.password)));

  return (
    <ModalShell
      title={isEdit ? `Edit ${student.name}` : "Enroll a student"}
      subtitle={isEdit ? student.email : "Creates a student login. Share the temporary password with the family."}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className={cx.btnSecondary}>Cancel</button>
        <button disabled={!valid || submitting} onClick={submit} className={cx.btnPrimary}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Enroll student"}</button>
      </>}
    >
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div><label className={cx.label}>Full name *</label><input className={cx.input} value={form.name} onChange={(e) => u("name", e.target.value)} /></div>
      {!isEdit && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={cx.label}>Email *</label><input type="email" autoComplete="off" className={cx.input} value={form.email} onChange={(e) => u("email", e.target.value)} /></div>
          <div>
            <label className={cx.label}>Temporary password *</label>
            <input type="password" autoComplete="new-password" className={cx.input} value={form.password} onChange={(e) => u("password", e.target.value)} />
            <p className={`text-[11px] mt-1 ${form.password && !strong(form.password) ? "text-red-500" : "text-ink-400"}`}>{PASSWORD_HINT}</p>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={cx.label}>Guardian name *</label><input className={cx.input} value={form.guardian} onChange={(e) => u("guardian", e.target.value)} /></div>
        <div><label className={cx.label}>Phone</label><input className={cx.input} inputMode="tel" value={form.phone} onChange={(e) => u("phone", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><label className={cx.label}>Age</label><input type="number" min={3} max={100} className={cx.input} value={form.age} onChange={(e) => u("age", e.target.value)} /></div>
        <div><label className={cx.label}>Program</label>
          <select className={cx.input} value={form.program} onChange={(e) => u("program", e.target.value)}>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </div>
        {isAdmin && (
          <div className="col-span-2 sm:col-span-1"><label className={cx.label}>Branch</label>
            <select className={cx.input} value={form.clubId} onChange={(e) => u("clubId", e.target.value)}>
              <option value="">Unassigned</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
