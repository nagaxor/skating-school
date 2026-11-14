"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { RinkLines } from "@/components/Brand";
import { Avatar, Badge, EmptyState, SearchInput, Skeleton } from "@/components/ui";

const PROGRAMS = ["Beginner", "Intermediate", "Advanced"];
const PROGRAM_TONE = { Beginner: "brand", Intermediate: "lime", Advanced: "slate" };
const PROGRAM_BAR = { Beginner: "bg-brand-600", Intermediate: "bg-lime-400", Advanced: "bg-ink-900 dark:bg-ink-300" };
const EXIT_MS = 320;

// Slide-over panel listing a branch's students (and instructors), with an
// animated entrance/exit and a staggered list. `club` = null → closed.
export default function BranchDrawer({ club, students, instructors, loading, onClose }) {
  // Keep the last club while the exit animation plays, then unmount.
  const [shown, setShown] = useState(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [program, setProgram] = useState("all");
  const panelRef = useRef(null);

  useEffect(() => {
    if (club) {
      setShown(club);
      setQuery("");
      setProgram("all");
      const raf = requestAnimationFrame(() => setOpen(true)); // next frame → CSS transition runs
      return () => cancelAnimationFrame(raf);
    }
    setOpen(false);
    const t = setTimeout(() => setShown(null), EXIT_MS);
    return () => clearTimeout(t);
  }, [club]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [shown, onClose]);

  const members = useMemo(() => (shown ? students.filter((s) => s.clubId === shown.id) : []), [students, shown]);
  const coaches = useMemo(() => (shown ? instructors.filter((i) => i.clubId === shown.id) : []), [instructors, shown]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((s) => (program === "all" || s.program === program) && (!q || s.name.toLowerCase().includes(q) || (s.guardian || "").toLowerCase().includes(q) || (s.phone || "").includes(q)))
      .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "active" ? -1 : 1));
  }, [members, program, query]);

  if (!shown) return null;
  const counts = Object.fromEntries(PROGRAMS.map((p) => [p, members.filter((s) => s.program === p).length]));
  const active = members.filter((s) => s.status === "active").length;

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      {/* Backdrop */}
      <div onClick={onClose}
        className={`absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />

      {/* Panel */}
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${shown.name} students`}
        className={`absolute right-0 top-0 bottom-0 w-full sm:w-[480px] lg:w-[520px] bg-white dark:bg-ink-900 shadow-popover outline-none flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="relative bg-ink-950 text-white overflow-hidden flex-shrink-0">
          <RinkLines className="absolute inset-0 w-full h-full opacity-70" />
          <div className="absolute inset-0 grain" />
          <div className="absolute -top-20 -right-16 w-64 h-64 bg-[radial-gradient(closest-side,rgba(47,107,224,0.45),transparent)]" />
          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div className={`transition-all duration-500 delay-100 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-400">Branch</div>
                <h2 className="font-display text-2xl font-semibold tracking-tight mt-1">{shown.name}</h2>
                <div className="text-[13px] text-ink-400 mt-1 inline-flex items-center gap-1.5"><Icon.MapPin width={13} height={13} />{shown.location}</div>
              </div>
              <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center transition">
                <Icon.X width={17} height={17} />
              </button>
            </div>

            <div className={`grid grid-cols-3 gap-2 mt-5 transition-all duration-500 delay-150 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              {[["Students", members.length], ["Active", active], ["Coaches", coaches.length]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08] px-3 py-2.5">
                  <div className="font-display text-xl font-semibold tabular">{loading ? "…" : v}</div>
                  <div className="text-[11px] text-ink-400">{l}</div>
                </div>
              ))}
            </div>

            {members.length > 0 && (
              <div className="mt-4">
                <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
                  {PROGRAMS.map((p) => counts[p] > 0 && (
                    <div key={p} className={`${PROGRAM_BAR[p]} transition-all duration-700 ease-out`} style={{ width: open ? `${(counts[p] / members.length) * 100}%` : "0%" }} />
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-[11.5px] text-ink-400">
                  {PROGRAMS.map((p) => <span key={p} className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${PROGRAM_BAR[p]}`} />{p} {counts[p]}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coaches */}
        {coaches.length > 0 && (
          <div className="px-6 pt-4 flex flex-wrap gap-2 flex-shrink-0">
            {coaches.map((c) => (
              <span key={c.userId} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-ink-50 dark:bg-white/[0.04] ring-1 ring-ink-900/[0.06] dark:ring-white/[0.08] text-[12.5px]">
                <Avatar name={c.name} initials={c.avatar} size={22} className="!rounded-full" />
                <span className="font-semibold text-ink-800 dark:text-ink-100">{c.name}</span>
                <span className="text-ink-400">Coach</span>
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="px-6 pt-4 pb-3 space-y-2.5 flex-shrink-0">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, guardian or phone…" />
          <div className="flex gap-1.5 overflow-x-auto">
            {["all", ...PROGRAMS].map((p) => (
              <button key={p} onClick={() => setProgram(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${program === p ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950" : "bg-ink-100 dark:bg-white/5 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-white/10"}`}>
                {p === "all" ? `All ${members.length}` : `${p} ${counts[p]}`}
              </button>
            ))}
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading ? (
            <div className="space-y-2 px-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : list.length === 0 ? (
            <EmptyState icon={Icon.Users} title={members.length ? "No students match" : "No students in this branch yet"} hint={members.length ? "Try another search or program." : "Students appear here once they're enrolled in this branch."} />
          ) : (
            <ul key={`${shown.id}-${program}-${query}`}>
              {list.map((s, i) => (
                <li key={s.id} className="animate-itemIn" style={{ animationDelay: `${Math.min(i, 14) * 35 + 120}ms` }}>
                  <Link href={`/dashboard/students/${s.id}`} onClick={onClose}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink-50 dark:hover:bg-white/[0.04] transition-colors">
                    <Avatar name={s.name} initials={s.avatar} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-ink-900 dark:text-white truncate">{s.name}</span>
                        {s.status !== "active" && <Badge>Inactive</Badge>}
                      </div>
                      <div className="text-xs text-ink-500 truncate">{s.guardian || "No guardian"}{s.age != null ? ` · Age ${s.age}` : ""}{s.phone ? ` · ${s.phone}` : ""}</div>
                    </div>
                    <Badge tone={PROGRAM_TONE[s.program] || "slate"}>{s.program}</Badge>
                    <Icon.ChevronRight width={16} height={16} className="text-ink-300 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
