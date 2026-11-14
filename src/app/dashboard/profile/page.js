"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { Badge, Avatar, PageHeader, ConfirmDialog, cx } from "@/components/ui";
import { PASSWORD_HINT, strongPassword } from "@/components/AccountActions";
import { ROLE_LABELS } from "@/lib/rbac";

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  { label: "Too weak", cls: "bg-red-500" },
  { label: "Weak", cls: "bg-red-400" },
  { label: "Fair", cls: "bg-gold-400" },
  { label: "Good", cls: "bg-brand-500" },
  { label: "Strong", cls: "bg-emerald-500" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const s = strength(form.newPassword);
  const mismatch = form.confirm && form.newPassword !== form.confirm;
  const canSubmit = form.currentPassword && strongPassword(form.newPassword) && form.newPassword === form.confirm && !submitting;

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    setSubmitting(true);
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setMsg("Password updated. Every other device has been signed out.");
    } catch (e2) { setErr(e2.message); }
    finally { setSubmitting(false); }
  };

  const signOutEverywhere = async () => {
    setSigningOut(true);
    try {
      await api("/api/auth/sessions", { method: "DELETE" });
      window.location.assign("/login");
    } catch (e) { setErr(e.message); setSigningOut(false); setConfirmAll(false); }
  };

  const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Profile & Security" subtitle="Your account details and sign-in security." />

      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-5 items-start">
        <div className="space-y-5">
          <div className={cx.card + " overflow-hidden"}>
            <div className="h-20 bg-ink-950 relative"><div className="absolute inset-0 grain" /><div className="absolute -right-10 -top-16 w-56 h-56 bg-[radial-gradient(closest-side,rgba(47,107,224,0.4),transparent)]" /></div>
            <div className="px-6 pb-6 -mt-9">
              <Avatar name={user.name} initials={user.avatar} size={72} className="ring-4 ring-white dark:ring-ink-900 !rounded-2xl" />
              <h3 className="font-display text-xl font-semibold text-ink-950 dark:text-white mt-3">{user.name}</h3>
              <div className="mt-1.5"><Badge tone={user.role === "admin" ? "lime" : "brand"}>{ROLE_LABELS[user.role]}</Badge></div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 mt-6">
                {[["Email", user.email], ["Phone", user.phone || "—"], ["Branch", user.club || "—"], ["Last sign-in", lastLogin]].map(([l, v]) => (
                  <div key={l} className="min-w-0">
                    <dt className="text-[11.5px] text-ink-400 font-medium">{l}</dt>
                    <dd className="text-sm font-semibold mt-0.5 text-ink-900 dark:text-ink-100 truncate" title={v}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className={cx.card + " p-6"}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0"><Icon.LogOut width={18} height={18} /></span>
              <div className="flex-1">
                <h3 className={cx.cardTitle}>Sign out of all devices</h3>
                <p className="text-[13px] text-ink-500 dark:text-ink-400 mt-1 leading-relaxed">Lost a phone or signed in on a shared computer? This ends every active session, including this one.</p>
                <button onClick={() => setConfirmAll(true)} className={cx.btnSecondary + " mt-4"}>Sign out everywhere</button>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className={cx.card + " p-6"}>
          <div className="flex items-start gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center flex-shrink-0"><Icon.Lock width={18} height={18} /></span>
            <div>
              <h3 className={cx.cardTitle}>Change password</h3>
              <p className="text-[13px] text-ink-500 dark:text-ink-400 mt-1">Changing it signs out your other devices.</p>
            </div>
          </div>
          {err && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-4" role="alert">{err}</div>}
          {msg && <div className="bg-emerald-500/[0.08] ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2" role="status"><Icon.Check width={15} height={15} />{msg}</div>}
          <div className="space-y-4">
            <div><label className={cx.label} htmlFor="cur">Current password</label><input id="cur" type="password" autoComplete="current-password" className={cx.input} value={form.currentPassword} onChange={(e) => u("currentPassword", e.target.value)} /></div>
            <div>
              <label className={cx.label} htmlFor="new">New password</label>
              <input id="new" type="password" autoComplete="new-password" className={cx.input} value={form.newPassword} onChange={(e) => u("newPassword", e.target.value)} />
              {form.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < s ? STRENGTH[s].cls : "bg-ink-100 dark:bg-white/10"}`} />)}</div>
                  <div className="flex justify-between mt-1.5 text-[11px]"><span className="text-ink-400">{PASSWORD_HINT}</span><span className="font-semibold text-ink-600 dark:text-ink-300">{STRENGTH[s].label}</span></div>
                </div>
              )}
            </div>
            <div>
              <label className={cx.label} htmlFor="conf">Confirm new password</label>
              <input id="conf" type="password" autoComplete="new-password" className={cx.input} value={form.confirm} onChange={(e) => u("confirm", e.target.value)} />
              {mismatch && <p className="text-[11px] text-red-500 mt-1.5">Passwords don&apos;t match</p>}
            </div>
            <button type="submit" disabled={!canSubmit} className={cx.btnPrimary + " w-full"}>{submitting ? "Updating…" : "Update password"}</button>
          </div>
        </form>
      </div>

      <ConfirmDialog open={confirmAll} title="Sign out of all devices?" message="Every session on every device will end, including this one. You'll need to sign in again." confirmLabel="Sign out everywhere" busy={signingOut} onConfirm={signOutEverywhere} onCancel={() => setConfirmAll(false)} />
    </div>
  );
}
