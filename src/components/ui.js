"use client";
import { useEffect } from "react";
import { Icon } from "./Icons";

// Shared UI kit. Pages compose these + the `cx` class tokens below.
// See CLAUDE.md §5 "Design system" before adding new one-off styles.

const TONES = {
  emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/15 dark:text-emerald-300 dark:ring-emerald-400/20",
  amber: "bg-gold-400/15 text-gold-600 ring-gold-500/20 dark:text-gold-300 dark:ring-gold-400/25",
  gold: "bg-gold-400/15 text-gold-600 ring-gold-500/20 dark:text-gold-300 dark:ring-gold-400/25",
  red: "bg-red-500/10 text-red-600 ring-red-600/15 dark:text-red-300 dark:ring-red-400/20",
  slate: "bg-ink-100 text-ink-600 ring-ink-900/5 dark:bg-white/5 dark:text-ink-300 dark:ring-white/10",
  teal: "bg-brand-500/10 text-brand-700 ring-brand-600/15 dark:text-brand-300 dark:ring-brand-400/20",
  brand: "bg-brand-500/10 text-brand-700 ring-brand-600/15 dark:text-brand-300 dark:ring-brand-400/20",
  lime: "bg-lime-400/25 text-lime-800 ring-lime-600/25 dark:bg-lime-400/10 dark:text-lime-300 dark:ring-lime-400/25",
};

export function Badge({ children, tone = "slate", dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${TONES[tone] || TONES.slate}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "from-brand-500 to-brand-300",
  "from-lime-500 to-lime-300",
  "from-ink-700 to-ink-500",
  "from-emerald-600 to-emerald-400",
  "from-brand-700 to-brand-500",
];

export function Avatar({ name = "", initials, src, size = 36, className = "" }) {
  const text = initials || name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };
  // eslint-disable-next-line @next/next/no-img-element -- data: URL photos, nothing for next/image to optimise
  if (src) return <img src={src} alt="" style={style} className={`rounded-xl object-cover flex-shrink-0 ring-1 ring-black/5 ${className}`} />;
  return (
    <span style={style} className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${tone} ${tone.includes("lime") ? "text-ink-950" : "text-white"} font-semibold flex-shrink-0 shadow-inner-hair ${className}`}>
      {text}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-ink-100 dark:bg-white/5 rounded-lg ${className}`} />;
}

export function EmptyState({ icon, title, hint, action }) {
  const IconComp = icon || Icon.Inbox;
  return (
    <div className="text-center py-14 px-6">
      <div className="w-12 h-12 rounded-2xl bg-ink-50 ring-1 ring-ink-900/5 dark:bg-white/5 dark:ring-white/10 text-ink-400 flex items-center justify-center mx-auto mb-3.5">
        <IconComp width={20} height={20} />
      </div>
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
      {hint && <p className="text-xs text-ink-500 dark:text-ink-400 mt-1 max-w-xs mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageLoading({ statCards = 4 }) {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      {statCards > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: statCards }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-2xl" />)}
        </div>
      )}
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400 mb-1.5">{eyebrow}</p>}
        <h2 className="font-display text-[22px] sm:text-2xl font-semibold tracking-tight text-ink-950 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

const STAT_ACCENTS = {
  teal: "text-brand-600 bg-brand-500/10 dark:text-brand-300",
  brand: "text-brand-600 bg-brand-500/10 dark:text-brand-300",
  emerald: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
  amber: "text-gold-600 bg-gold-400/15 dark:text-gold-300",
  gold: "text-gold-600 bg-gold-400/15 dark:text-gold-300",
  lime: "text-lime-800 bg-lime-400/30 dark:text-lime-300 dark:bg-lime-400/10",
  navy: "text-ink-700 bg-ink-100 dark:text-ink-200 dark:bg-white/5",
  red: "text-red-600 bg-red-500/10 dark:text-red-300",
  slate: "text-ink-500 bg-ink-100 dark:text-ink-300 dark:bg-white/5",
};

export function StatCard({ icon: IconComp, label, value, hint, tone = "brand", trend }) {
  return (
    <div className={cx.card + " p-4 sm:p-5 relative overflow-hidden"}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-medium text-ink-500 dark:text-ink-400">{label}</div>
        {IconComp && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${STAT_ACCENTS[tone] || STAT_ACCENTS.brand}`}>
            <IconComp width={16} height={16} />
          </div>
        )}
      </div>
      <div className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight text-ink-950 dark:text-white mt-1.5 tabular truncate">{value}</div>
      {(hint || trend) && (
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500 dark:text-ink-400">
          {trend && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {trend.up ? "▲" : "▼"} {trend.label}
            </span>
          )}
          {hint}
        </div>
      )}
    </div>
  );
}

export function Toast({ message, tone = "emerald", onClose }) {
  useEffect(() => {
    if (!message || !onClose) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  const isError = tone === "red";
  return (
    <div role="status" aria-live="polite" className="fixed bottom-24 md:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[100] animate-slideUp">
      <div className="flex items-center gap-3 bg-ink-950 text-white text-sm font-medium pl-3 pr-2 py-2.5 rounded-xl shadow-popover ring-1 ring-white/10 sm:min-w-[300px]">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isError ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
          {isError ? <Icon.AlertTriangle width={14} height={14} /> : <Icon.Check width={14} height={14} />}
        </span>
        <span className="flex-1">{message}</span>
        {onClose && (
          <button onClick={onClose} className="text-ink-400 hover:text-white w-7 h-7 rounded-lg flex items-center justify-center" aria-label="Dismiss">
            <Icon.X width={14} height={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ModalShell({ title, subtitle, onClose, children, footer, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`bg-white dark:bg-ink-900 rounded-t-3xl sm:rounded-2xl w-full ${maxWidth} max-h-[92vh] overflow-y-auto shadow-popover ring-1 ring-ink-900/5 dark:ring-white/10 animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 sticky top-0 bg-white/95 dark:bg-ink-900/95 backdrop-blur z-10">
          <div>
            <h3 className="font-display font-semibold text-[17px] text-ink-950 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-400 hover:text-ink-700 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors -mr-2">
            <Icon.X width={18} height={18} />
          </button>
        </div>
        <div className="px-6 pb-6 space-y-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-ink-100 dark:border-white/5 flex justify-end gap-2 sticky bottom-0 bg-ink-50/90 dark:bg-ink-900/95 backdrop-blur" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Promise-free confirm dialog. Use for destructive actions instead of window.confirm.
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <ModalShell
      title={title}
      onClose={onCancel}
      maxWidth="max-w-md"
      footer={
        <>
          <button className={cx.btnSecondary} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={tone === "danger" ? cx.btnDanger : cx.btnPrimary} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner />}{confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{message}</p>
    </ModalShell>
  );
}

export function Spinner({ className = "" }) {
  return <span className={`w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block ${className}`} style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Icon.Search width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx.input + " pl-9"} />
    </div>
  );
}

export const cx = {
  card: "bg-white dark:bg-ink-900/70 rounded-2xl shadow-card dark:shadow-none dark:ring-1 dark:ring-white/[0.07]",
  cardHeader: "px-5 py-4 border-b border-ink-100 dark:border-white/[0.06] flex items-center justify-between gap-3 flex-wrap",
  cardTitle: "font-display font-semibold text-[15px] text-ink-950 dark:text-white",
  btnPrimary: "inline-flex items-center justify-center gap-2 bg-ink-950 text-white dark:bg-white dark:text-ink-950 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:bg-ink-800 dark:hover:bg-ink-100 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
  btnBrand: "inline-flex items-center justify-center gap-2 bg-lime-400 text-ink-950 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:bg-lime-300 hover:shadow-glow-lime active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
  btnSecondary: "inline-flex items-center justify-center gap-2 bg-white dark:bg-white/5 ring-1 ring-ink-900/10 dark:ring-white/10 text-ink-800 dark:text-ink-100 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-ink-50 dark:hover:bg-white/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
  btnDanger: "inline-flex items-center justify-center gap-2 bg-red-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
  btnDangerGhost: "inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all duration-150",
  btnGhost: "inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-all duration-150",
  iconBtn: "inline-flex items-center justify-center w-9 h-9 rounded-xl text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 transition-colors",
  link: "inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 transition-colors",
  input: "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-ink-950/60 text-ink-900 dark:text-ink-100 ring-1 ring-inset ring-ink-900/10 dark:ring-white/10 transition-shadow duration-150 focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500",
  label: "text-[12px] font-semibold text-ink-700 dark:text-ink-300 block mb-1.5",
  thead: "bg-ink-50/80 dark:bg-white/[0.02]",
  th: "text-left px-4 py-3 text-[11px] font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-[0.08em]",
  tr: "border-b border-ink-100 dark:border-white/[0.05] last:border-0 hover:bg-ink-50/70 dark:hover:bg-white/[0.02] transition-colors",
  td: "px-4 py-3.5 text-sm text-ink-700 dark:text-ink-300",
};
