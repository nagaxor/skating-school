"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, PageLoading, EmptyState, Avatar, ConfirmDialog, Toast, cx } from "@/components/ui";
import { ResetPasswordModal } from "@/components/AccountActions";
import AttendanceGrid from "@/components/AttendanceGrid";
import QrCardModal from "@/components/QrCardModal";
import { can } from "@/lib/rbac";

const PROGRAM_TONE = { Beginner: "brand", Intermediate: "lime", Advanced: "slate" };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const taka = (n) => `৳${Number(n || 0).toLocaleString("en-IN")}`;
const title = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

export default function StudentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("profile");
  const [resetOpen, setResetOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => Promise.all([api(`/api/students?id=${id}`), api(`/api/payments?studentId=${id}`), api(`/api/attendance?studentId=${id}`)])
    .then(([s, p, a]) => { setStudent(s); setPayments(p); setAttendance(a); })
    .catch(() => setNotFound(true))
    .finally(() => setLoading(false)), [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading statCards={0} />;
  if (notFound || !student) return <div className={cx.card}><EmptyState icon={Icon.Users} title="Student not found" hint="They may have been removed, or you don't have access." action={<Link href="/dashboard/students" className={cx.btnSecondary}>Back to students</Link>} /></div>;

  const present = attendance.filter((a) => a.status === "present").length;
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : null;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const lastPayment = payments[0];
  const isActive = student.status === "active";
  const canManage = can(user.role, "students.update");

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await api("/api/users/status", { method: "PATCH", body: JSON.stringify({ userId: student.userId, active: !isActive }) });
      setToast({ message: isActive ? "Account deactivated" : "Account reactivated", tone: "emerald" });
      setConfirm(false);
      load();
    } catch (e) { setToast({ message: e.message, tone: "red" }); }
    finally { setBusy(false); }
  };

  const r = 34, c = 2 * Math.PI * r;

  return (
    <div className="space-y-5">
      {canManage && <Link href="/dashboard/students" className={cx.link}><Icon.ArrowLeft width={14} height={14} /> All students</Link>}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-950 text-white">
        <div className="absolute inset-0 grain" />
        <div className="absolute -top-28 -right-20 w-96 h-96 bg-[radial-gradient(closest-side,rgba(47,107,224,0.35),transparent)]" />
        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <Avatar name={student.name} initials={student.avatar} src={student.photo} size={88} className="!rounded-3xl ring-4 ring-white/10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl sm:text-[28px] font-semibold tracking-tight truncate">{student.name}</h2>
                {!isActive && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-ink-300">Inactive</span>}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-[13px] text-ink-400">
                <Badge tone={PROGRAM_TONE[student.program] || "slate"}>{student.program}</Badge>
                <span className="inline-flex items-center gap-1"><Icon.MapPin width={13} height={13} />{student.club || "Unassigned"}</span>
                {student.age != null && <span>· Age {student.age}</span>}
                {student.shift && <span>· {title(student.shift)} shift</span>}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[13px] text-ink-300 flex-wrap">
                {student.phone && <a href={`tel:${student.phone}`} className="inline-flex items-center gap-1.5 hover:text-white"><Icon.Phone width={13} height={13} />{student.phone}</a>}
                {!student.email?.endsWith("@no-login.invalid") && <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1.5 hover:text-white truncate"><Icon.Mail width={13} height={13} />{student.email}</a>}
              </div>
            </div>
          </div>
          {can(user.role, "users.set_status") ? (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setQrOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-lime-400 text-ink-950 hover:bg-lime-300 transition"><Icon.Command width={15} height={15} /> QR card</button>
              {can(user.role, "users.reset_password") && <button onClick={() => setResetOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-white/[0.07] ring-1 ring-white/10 hover:bg-white/[0.12] transition"><Icon.Key width={15} height={15} /> Reset password</button>}
              <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-white/[0.07] ring-1 ring-white/10 hover:bg-white/[0.12] transition"><Icon.Power width={15} height={15} /> {isActive ? "Deactivate" : "Reactivate"}</button>
            </div>
          ) : null}
        </div>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 border-t border-white/[0.08] divide-x divide-white/[0.08]">
          <div className="p-5 sm:px-8 flex items-center gap-4">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90 flex-shrink-0 hidden sm:block" aria-hidden="true">
              <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.08)" />
              {rate > 0 && <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke={rate >= 75 ? "#34D399" : "#EDBE57"} strokeDasharray={`${(rate / 100) * c} ${c}`} />}
            </svg>
            <div>
              <div className="text-[12px] text-ink-400">Attendance</div>
              <div className="font-display text-2xl font-semibold tabular">{rate == null ? "—" : `${rate}%`}</div>
              <div className="text-[11.5px] text-ink-500">{present}/{attendance.length} classes</div>
            </div>
          </div>
          <Metric label="Total paid" value={taka(totalPaid)} hint={`${payments.length} receipt${payments.length === 1 ? "" : "s"}`} />
          <Metric label="Last payment" value={lastPayment ? taka(lastPayment.amount) : "—"} hint={lastPayment ? `${lastPayment.month} · ${lastPayment.date}` : "No payments yet"} />
          <Metric label="Enrolled" value={fmtDate(student.enrollDate)} hint={`Session ${student.session || "—"}`} />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-ink-100 dark:bg-white/5 p-1 w-fit" role="tablist">
        {[["profile", "Profile", Icon.User], ["payments", `Payments (${payments.length})`, Icon.CreditCard], ["attendance", "Attendance", Icon.Calendar]].map(([k, label, I]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition ${tab === k ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-sm" : "text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"}`}>
            <I width={14} height={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <InfoCard title="Guardians" icon={Icon.Users} rows={[
            ["Guardian", student.guardian], ["Father", student.fatherName], ["Father's mobile", student.fatherMobile], ["Father's occupation", [student.fatherOccupation, student.fatherOccupationType].filter(Boolean).join(" · ")], ["Father's NID", student.fatherNid],
            ["Mother", student.motherName], ["Mother's mobile", student.motherMobile], ["Mother's occupation", [student.motherOccupation, student.motherOccupationType].filter(Boolean).join(" · ")], ["Mother's NID", student.motherNid],
          ]} />
          <div className="space-y-4">
            <InfoCard title="Personal" icon={Icon.User} rows={[
              ["Date of birth", student.dob ? fmtDate(student.dob) : null], ["Gender", title(student.gender)], ["Blood group", student.bloodGroup],
              ["Religion", title(student.religion)], ["Birth registration", student.birthReg], ["School", student.presentSchool],
            ]} />
            <InfoCard title="Address" icon={Icon.MapPin} rows={[["Present", student.presentAddress], ["Permanent", student.permanentAddress]]} />
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className={cx.card}>
          {payments.length === 0 ? <EmptyState icon={Icon.CreditCard} title="No payments recorded" /> : (
            <ul className="divide-y divide-ink-100 dark:divide-white/[0.05]">
              {payments.map((p) => (
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

      {tab === "attendance" && <AttendanceGrid records={attendance} />}

      {qrOpen && <QrCardModal studentId={student.id} canRotate={can(user.role, "students.qr_rotate")} onClose={() => setQrOpen(false)} />}
      {resetOpen && <ResetPasswordModal person={{ userId: student.userId, name: student.name }} onClose={() => setResetOpen(false)} onDone={() => { setResetOpen(false); setToast({ message: `Temporary password set for ${student.name}`, tone: "emerald" }); }} />}
      <ConfirmDialog open={confirm} title={isActive ? `Deactivate ${student.name}?` : `Reactivate ${student.name}?`}
        message={isActive ? "They'll be signed out immediately and can't log in. All records are kept." : "They'll be able to sign in again."}
        confirmLabel={isActive ? "Deactivate" : "Reactivate"} tone={isActive ? "danger" : "primary"} busy={busy} onConfirm={toggleStatus} onCancel={() => setConfirm(false)} />
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="p-5 sm:px-8">
      <div className="text-[12px] text-ink-400">{label}</div>
      <div className="font-display text-xl sm:text-2xl font-semibold tabular truncate">{value}</div>
      <div className="text-[11.5px] text-ink-500 truncate">{hint}</div>
    </div>
  );
}

function InfoCard({ title: t, icon: I, rows }) {
  const visible = rows.filter(([, v]) => v);
  return (
    <div className={cx.card + " p-5 sm:p-6"}>
      <h3 className={cx.cardTitle + " flex items-center gap-2"}><I width={16} height={16} className="text-ink-400" />{t}</h3>
      {visible.length === 0 ? <p className="text-sm text-ink-400 mt-4">Not provided</p> : (
        <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-4">
          {visible.map(([l, v]) => (
            <div key={l} className="min-w-0">
              <dt className="text-[11.5px] font-medium text-ink-400">{l}</dt>
              <dd className="text-sm font-medium text-ink-900 dark:text-ink-100 mt-0.5 whitespace-pre-wrap break-words">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
