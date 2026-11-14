"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { PageLoading, PageHeader, Toast, cx } from "@/components/ui";
import { LogoMark } from "@/components/Brand";

const SECTIONS = [
  {
    title: "School profile", desc: "Shown on receipts and to parents.", icon: Icon.Building,
    fields: [
      { key: "school_name", label: "School name", placeholder: "Online Skating School", full: true },
      { key: "phone", label: "Phone", placeholder: "+880 1707 080 260", type: "tel" },
      { key: "email", label: "Email", placeholder: "onlineskatingschool@gmail.com", type: "email" },
      { key: "address", label: "Address", placeholder: "Dhaka, Bangladesh", full: true },
    ],
  },
  {
    title: "Default fees", desc: "Pre-fills amounts when recording payments.", icon: Icon.Wallet,
    fields: [
      { key: "admission_fee", label: "Admission fee", type: "number", prefix: "৳" },
      { key: "monthly_fee", label: "Monthly fee", type: "number", prefix: "৳" },
    ],
  },
];
const KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

export default function SettingsPage() {
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { api("/api/settings").then((v) => { setValues(v); setSaved(v); }).finally(() => setLoading(false)); }, []);
  const u = (k, v) => setValues((p) => ({ ...p, [k]: v }));
  const dirty = KEYS.filter((k) => (values[k] ?? "") !== (saved[k] ?? ""));

  const save = async () => {
    setSaving(true);
    try {
      // Only write what changed, so the activity log shows real changes.
      await Promise.all(dirty.map((key) => api("/api/settings", { method: "PUT", body: JSON.stringify({ key, value: values[key] ?? "" }) })));
      setSaved({ ...values });
      setToast({ message: `Saved ${dirty.length} change${dirty.length === 1 ? "" : "s"}`, tone: "emerald" });
    } catch (e) {
      setToast({ message: e.message, tone: "red" });
    } finally { setSaving(false); }
  };

  if (loading) return <PageLoading statCards={0} />;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Settings" subtitle="School details and defaults. Every change is recorded in the Activity Log." />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.title} className={cx.card + " p-5 sm:p-6"}>
              <div className="flex items-start gap-3 mb-5">
                <span className="w-10 h-10 rounded-xl bg-ink-100 dark:bg-white/5 text-ink-600 dark:text-ink-300 flex items-center justify-center flex-shrink-0"><s.icon width={18} height={18} /></span>
                <div><h3 className={cx.cardTitle}>{s.title}</h3><p className="text-[13px] text-ink-500 dark:text-ink-400 mt-0.5">{s.desc}</p></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {s.fields.map((f) => (
                  <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                    <label className={cx.label} htmlFor={f.key}>{f.label}</label>
                    <div className="relative">
                      {f.prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm">{f.prefix}</span>}
                      <input id={f.key} type={f.type || "text"} min={f.type === "number" ? 0 : undefined} placeholder={f.placeholder}
                        className={cx.input + (f.prefix ? " pl-8" : "")} value={values[f.key] || ""} onChange={(e) => u(f.key, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 px-1">Receipt header preview</div>
          <div className="rounded-2xl overflow-hidden shadow-lift bg-white dark:bg-ink-900 dark:ring-1 dark:ring-white/10">
            <div className="bg-ink-950 text-white text-center px-5 py-6 relative overflow-hidden">
              <div className="absolute inset-0 grain" />
              <div className="relative flex justify-center"><LogoMark size={40} /></div>
              <div className="relative font-display font-semibold text-lg mt-3">{values.school_name || "Online Skating School"}</div>
              <div className="relative text-[11.5px] text-ink-400 mt-1">{[values.address, values.phone].filter(Boolean).join(" · ") || "Address · Phone"}</div>
              <div className="relative text-[11.5px] text-ink-400">{values.email || "email@example.com"}</div>
            </div>
            <div className="px-5 py-3 flex justify-between text-[12px] bg-gold-200/40 dark:bg-gold-400/10">
              <span className="font-semibold text-gold-600 dark:text-gold-300 uppercase tracking-wider">Receipt no.</span>
              <span className="font-mono text-ink-700 dark:text-ink-200">OSS-2026-XXXX</span>
            </div>
          </div>
          <button onClick={save} disabled={saving || dirty.length === 0} className={cx.btnPrimary + " w-full h-11"}>
            {saving ? "Saving…" : dirty.length ? <><Icon.Check width={16} height={16} /> Save {dirty.length} change{dirty.length === 1 ? "" : "s"}</> : "All changes saved"}
          </button>
          {dirty.length > 0 && <button onClick={() => setValues(saved)} className={cx.btnGhost + " w-full justify-center"}>Discard changes</button>}
        </aside>
      </div>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
