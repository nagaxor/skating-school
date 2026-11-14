"use client";

import { Icon } from "@/components/Icons";

// Illustrative preview of the parent portal used on the marketing pages.
export default function PortalPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-[radial-gradient(closest-side,rgba(212,255,36,0.14),transparent)]" />
      <div className="relative rounded-3xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-xl p-5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Parent portal</span>
          <span className="text-[10.5px] text-ink-500">Preview</span>
        </div>
        <div className="rounded-2xl bg-ink-950/70 ring-1 ring-white/[0.06] p-4">
          <div className="text-[12px] text-ink-400">Next class</div>
          <div className="font-display text-xl font-semibold mt-0.5">Saturday · 4:00 PM</div>
          <div className="text-[12.5px] text-ink-400 mt-1">Intermediate · your branch</div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-2xl bg-ink-950/70 ring-1 ring-white/[0.06] p-4">
            <div className="text-[12px] text-ink-400">Attendance</div>
            <div className="mt-2 flex items-end gap-1 h-10">
              {[60, 85, 70, 95, 80, 100, 90].map((h, i) => (
                <span key={i} className={`flex-1 rounded-sm ${i === 5 ? "bg-lime-400" : "bg-gradient-to-t from-brand-600 to-brand-400"}`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-ink-950/70 ring-1 ring-white/[0.06] p-4">
            <div className="text-[12px] text-ink-400">Monthly fee</div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-950 bg-lime-400 rounded-md px-2 py-1">
              <Icon.Check width={12} height={12} strokeWidth={3} /> Paid
            </div>
            <div className="text-[11px] text-ink-500 mt-1.5">Receipt issued</div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-brand-600/25 to-transparent ring-1 ring-brand-400/25 p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-brand-500/25 text-brand-200 flex items-center justify-center"><Icon.Bell width={16} height={16} /></span>
          <div>
            <div className="text-[13px] font-semibold">Notice from your coach</div>
            <div className="text-[12px] text-ink-400">Bring knee guards for Saturday&apos;s session</div>
          </div>
        </div>
      </div>
    </div>
  );
}
