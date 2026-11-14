"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { ModalShell, cx } from "@/components/ui";

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number";
export const strongPassword = (v) => typeof v === "string" && v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

// Readable random temporary password (no ambiguous characters).
export function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const rnd = new Uint32Array(12);
  crypto.getRandomValues(rnd);
  const chars = Array.from(rnd, (n, i) => (i === 3 ? digits : i === 7 ? letters : all)[n % (i === 3 ? digits.length : i === 7 ? letters.length : all.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}

// Admin-only: set a temporary password for someone else (staff or student).
export function ResetPasswordModal({ person, onClose, onDone }) {
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      await api("/api/users/password", { method: "POST", body: JSON.stringify({ userId: person.userId, password }) });
      onDone?.();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <ModalShell title={`Reset password for ${person.name}`} subtitle="They'll be signed out everywhere and any lockout is cleared." onClose={onClose} maxWidth="max-w-md"
      footer={<>
        <button onClick={onClose} className={cx.btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={busy || !strongPassword(password)} className={cx.btnPrimary}><Icon.Key width={15} height={15} />{busy ? "Saving…" : "Set password"}</button>
      </>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div>
        <label className={cx.label}>Temporary password</label>
        <div className="flex gap-2">
          <input className={cx.input + " font-mono tracking-wide"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" spellCheck={false} />
          <button type="button" onClick={copy} className={cx.btnSecondary + " !px-3"} aria-label="Copy password">{copied ? <Icon.Check width={15} height={15} /> : <Icon.Clipboard width={15} height={15} />}</button>
          <button type="button" onClick={() => setPassword(generatePassword())} className={cx.btnSecondary + " !px-3"} aria-label="Generate another">↻</button>
        </div>
        <p className={`text-[11px] mt-1.5 ${strongPassword(password) ? "text-ink-400" : "text-red-500"}`}>{PASSWORD_HINT}</p>
      </div>
      <p className="text-[13px] text-ink-500 dark:text-ink-400 leading-relaxed bg-ink-50 dark:bg-white/[0.03] rounded-xl p-3 ring-1 ring-ink-900/5 dark:ring-white/5">
        Share it privately (in person or by phone), and ask them to change it under <span className="font-semibold text-ink-700 dark:text-ink-200">Profile &amp; Security</span> after signing in.
      </p>
    </ModalShell>
  );
}
