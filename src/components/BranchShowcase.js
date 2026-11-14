"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Avatar, Badge, EmptyState, SearchInput } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────────
// Branch showcase: the clicked card "opens up" into a full panel.
//  • Shared-element transition: the panel is revealed with an animated
//    clip-path that starts at the card's exact on-screen rectangle and grows
//    to full size (no scaling, so text never distorts). Closing reverses it
//    back into the card. Built on the Web Animations API (no extra library).
//  • Motion graphics: rink lanes draw themselves, a glowing skater laps the
//    rink with a light trail, the name rises letter by letter, numbers count
//    up, the program ring fills, student cards cascade in.
//  • prefers-reduced-motion → no morph, instant content.
// ─────────────────────────────────────────────────────────────────────────

const PROGRAMS = ["Beginner", "Intermediate", "Advanced"];
const PROGRAM_TONE = { Beginner: "brand", Intermediate: "lime", Advanced: "slate" };
const PROGRAM_COLOR = { Beginner: "#2F6BE0", Intermediate: "#D4FF24", Advanced: "#B4B8C2" };
const OPEN_EASE = "cubic-bezier(0.76, 0, 0.24, 1)"; // ease-in-out: the growth out of the card stays visible
const CLOSE_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// clip-path inset() that matches `rect` inside the panel box `box`.
function insetFor(rect, box, radius) {
  const t = Math.max(0, rect.top - box.top);
  const l = Math.max(0, rect.left - box.left);
  const r = Math.max(0, box.right - rect.right);
  const b = Math.max(0, box.bottom - rect.bottom);
  return `inset(${t}px ${r}px ${b}px ${l}px round ${radius}px)`;
}

function useCountUp(target, run, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReduced()) { setV(target); return; }
    let raf, t0;
    const step = (t) => {
      t0 ??= t;
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

export default function BranchShowcase({ club, origin, students, instructors, loading, onClose }) {
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const closingRef = useRef(false);
  const [ready, setReady] = useState(false); // content animations start
  const [query, setQuery] = useState("");
  const [program, setProgram] = useState("all");

  // ── Open: reveal from the card's rectangle ───────────────────────────────
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (origin) origin.style.visibility = "hidden"; // the card "becomes" the panel
    const reduce = prefersReduced();
    if (!reduce && origin && panel?.animate) {
      const from = insetFor(origin.getBoundingClientRect(), panel.getBoundingClientRect(), 20);
      panel.animate([{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 28px)" }], { duration: 900, easing: OPEN_EASE, fill: "both" });
      backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease-out", fill: "both" });
    }
    const t = setTimeout(() => setReady(true), reduce ? 0 : 420);
    return () => { clearTimeout(t); if (origin) origin.style.visibility = ""; };
  }, [origin]);

  // ── Close: shrink back into the card, then unmount ────────────────────────
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    if (prefersReduced() || !origin || !panel?.animate) { onClose(); return; }
    const box = panel.getBoundingClientRect();
    const to = insetFor(origin.getBoundingClientRect(), box, 20);
    panel.querySelectorAll("[data-mg-content]").forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }));
    backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: "ease-in", fill: "forwards" });
    panel.animate([{ clipPath: "inset(0px 0px 0px 0px round 28px)" }, { clipPath: to }], { duration: 540, easing: CLOSE_EASE, fill: "forwards" })
      .finished.then(onClose, onClose);
  }, [origin, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [requestClose]);

  // ── Data ───────────────────────────────────────────────────────────────
  const members = useMemo(() => students.filter((s) => s.clubId === club.id), [students, club.id]);
  const coaches = useMemo(() => instructors.filter((i) => i.clubId === club.id), [instructors, club.id]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((s) => (program === "all" || s.program === program) && (!q || s.name.toLowerCase().includes(q) || (s.guardian || "").toLowerCase().includes(q) || (s.phone || "").includes(q)))
      .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "active" ? -1 : 1));
  }, [members, program, query]);
  const counts = Object.fromEntries(PROGRAMS.map((p) => [p, members.filter((s) => s.program === p).length]));
  const activeCount = members.filter((s) => s.status === "active").length;

  const run = ready && !loading;
  const nStudents = useCountUp(members.length, run);
  const nActive = useCountUp(activeCount, run, 1400);
  const nCoaches = useCountUp(coaches.length, run, 900);

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <div ref={backdropRef} onClick={requestClose} className="absolute inset-0 bg-ink-950/70 backdrop-blur-md" />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${club.name}: students`}
        className="absolute inset-0 sm:inset-4 lg:inset-6 2xl:inset-x-[max(1.5rem,calc((100vw-1400px)/2))] bg-white dark:bg-ink-900 outline-none overflow-hidden flex flex-col lg:flex-row shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]"
      >
        <ShowcaseHero club={club} ready={ready} counts={counts} total={members.length}
          nStudents={nStudents} nActive={nActive} nCoaches={nCoaches} coaches={coaches} loading={loading} onClose={requestClose} />

        {/* Student side */}
        <section data-mg-content className="flex-1 min-h-0 flex flex-col">
          <div className="px-5 sm:px-8 pt-6 pb-4 border-b border-ink-100 dark:border-white/[0.06] flex-shrink-0">
            <div className={`flex items-end justify-between gap-4 ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "380ms" }}>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-lime-400">Roster</div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink-950 dark:text-white mt-1">Students</h3>
              </div>
              <button onClick={requestClose} aria-label="Close" className="hidden lg:flex w-10 h-10 rounded-xl bg-ink-100 dark:bg-white/[0.06] hover:bg-ink-200 dark:hover:bg-white/[0.12] text-ink-700 dark:text-white items-center justify-center transition">
                <Icon.X width={18} height={18} />
              </button>
            </div>
            <div className={`mt-4 flex flex-col sm:flex-row gap-2 ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "460ms" }}>
              <SearchInput value={query} onChange={setQuery} placeholder="Search name, guardian or phone…" className="flex-1" />
              <div className="flex gap-1.5 overflow-x-auto">
                {["all", ...PROGRAMS].map((p) => (
                  <button key={p} onClick={() => setProgram(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${program === p ? "bg-ink-950 text-white dark:bg-lime-400 dark:text-ink-950" : "bg-ink-100 dark:bg-white/5 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-white/10"}`}>
                    {p === "all" ? `All ${members.length}` : `${p} ${counts[p]}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5">
            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[92px] rounded-2xl bg-ink-100 dark:bg-white/5 animate-pulse" />)}
              </div>
            ) : list.length === 0 ? (
              <EmptyState icon={Icon.Users} title={members.length ? "No students match" : "No students in this branch yet"}
                hint={members.length ? "Try another search or program." : "Students appear here once they're enrolled in this branch."} />
            ) : (
              <ul key={`${program}|${query}`} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {list.map((s, i) => (
                  <li key={s.id} className={ready ? "mg-card" : "opacity-0"} style={{ animationDelay: `${520 + Math.min(i, 18) * 55}ms` }}>
                    <Link href={`/dashboard/students/${s.id}`}
                      className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-ink-50/80 dark:bg-white/[0.03] ring-1 ring-ink-900/[0.05] dark:ring-white/[0.06] hover:ring-brand-500/40 dark:hover:ring-lime-400/40 hover:-translate-y-0.5 hover:shadow-lift transition-all overflow-hidden">
                      <span className="absolute inset-y-0 left-0 w-1" style={{ background: PROGRAM_COLOR[s.program] || "#858B98" }} />
                      <Avatar name={s.name} initials={s.avatar} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14.5px] font-semibold text-ink-900 dark:text-white truncate">{s.name}</span>
                          {s.status !== "active" && <Badge>Inactive</Badge>}
                        </div>
                        <div className="text-xs text-ink-500 truncate">{s.guardian || "No guardian"}{s.age != null ? ` · Age ${s.age}` : ""}</div>
                        <div className="mt-1.5"><Badge tone={PROGRAM_TONE[s.program] || "slate"}>{s.program}</Badge></div>
                      </div>
                      <Icon.ArrowUpRight width={16} height={16} className="text-ink-300 group-hover:text-brand-600 dark:group-hover:text-lime-400 transition" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Left side: motion graphics + numbers.
function ShowcaseHero({ club, ready, counts, total, nStudents, nActive, nCoaches, coaches, loading, onClose }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Vertical "stadium" rink path (x 50..390, y 40..600) used for lanes and the skater.
  const lane = (inset) => {
    const x = 50 + inset, y = 40 + inset, w = 340 - inset * 2, h = 560 - inset * 2, r = w / 2;
    return `M ${x + r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  };
  const R = 40, C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <section data-mg-content className="relative lg:w-[44%] xl:w-[460px] flex-shrink-0 bg-ink-950 text-white overflow-hidden min-h-[280px] lg:min-h-0">
      {/* Motion graphic: the rink draws itself, a skater laps it */}
      <svg viewBox="0 0 440 640" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id={`tr${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#D4FF24" stopOpacity="0" />
            <stop offset="1" stopColor="#D4FF24" />
          </linearGradient>
          <radialGradient id={`gl${uid}`}>
            <stop offset="0" stopColor="#2F6BE0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#2F6BE0" stopOpacity="0" />
          </radialGradient>
          <filter id={`bl${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
          <path id={`ln${uid}`} d={lane(0)} />
        </defs>
        <circle cx="390" cy="60" r="260" fill={`url(#gl${uid})`} />
        {ready && [0, 34, 68, 102].map((ins, i) => (
          <path key={ins} d={lane(ins)} pathLength="1000" fill="none" className="mg-draw"
            stroke={i === 0 ? "#8EB4F7" : "#8EB4F7"} strokeOpacity={i === 0 ? 0.55 : 0.22 - i * 0.03} strokeWidth={i === 0 ? 1.6 : 1}
            strokeDasharray={i % 2 ? "4 10" : undefined} style={{ animationDelay: `${120 + i * 140}ms` }} />
        ))}
        {ready && <path d="M 50 320 H 390" pathLength="1000" stroke="#8EB4F7" strokeOpacity="0.18" className="mg-draw" style={{ animationDelay: "700ms" }} />}
        {ready && <circle cx="220" cy="320" r="46" pathLength="1000" fill="none" stroke="#8EB4F7" strokeOpacity="0.22" className="mg-draw" style={{ animationDelay: "820ms" }} />}
        {ready && (
          <g style={{ opacity: 0, animation: "mgFade .6s 1.1s forwards" }}>
            <path d={lane(0)} pathLength="1000" fill="none" stroke={`url(#tr${uid})`} strokeWidth="3" strokeLinecap="round" className="mg-trail" />
            <g>
              <circle r="10" fill="#D4FF24" filter={`url(#bl${uid})`} opacity="0.8" />
              <circle r="4.5" fill="#F3FFC2" />
              <circle r="5" fill="none" stroke="#D4FF24" className="mg-pulse" />
              <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto"><mpath href={`#ln${uid}`} /></animateMotion>
            </g>
          </g>
        )}
        {[[70, 140], [380, 230], [120, 520], [330, 470], [240, 90]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.2} fill={i % 2 ? "#D4FF24" : "#8EB4F7"} opacity="0.5" className="mg-float" style={{ animationDelay: `${i * 0.9}s` }} />
        ))}
      </svg>
      <div className="absolute inset-0 grain" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent" />

      <div className="relative h-full flex flex-col justify-between p-6 sm:p-8 gap-6">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full bg-white/[0.07] ring-1 ring-white/10 px-3 py-1 text-[11.5px] font-semibold ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "150ms" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${club.status === "active" ? "bg-lime-400" : "bg-ink-400"}`} /> {club.status === "active" ? "Active branch" : "Inactive branch"}
          </span>
          <button onClick={onClose} aria-label="Close" className="lg:hidden w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center"><Icon.X width={18} height={18} /></button>
        </div>

        <div>
          <h2 className="font-display text-[2.6rem] sm:text-5xl leading-[1] font-semibold tracking-[-0.03em]" aria-label={club.name}>
            {ready && club.name.split("").map((ch, i) => (
              <span key={i} aria-hidden="true" className="mg-letter" style={{ animationDelay: `${260 + i * 38}ms` }}>{ch === " " ? " " : ch}</span>
            ))}
          </h2>
          <p className={`text-[14px] text-ink-400 mt-3 inline-flex items-center gap-1.5 ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "520ms" }}>
            <Icon.MapPin width={14} height={14} className="text-lime-400" />{club.location}
          </p>

          <div className={`grid grid-cols-3 gap-2 mt-6 ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "600ms" }}>
            {[["Students", nStudents], ["Active", nActive], ["Coaches", nCoaches]].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08] backdrop-blur px-3.5 py-3">
                <div className="font-display text-3xl font-semibold tabular">{loading ? "–" : v}</div>
                <div className="text-[11.5px] text-ink-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          <div className={`hidden sm:flex items-center gap-5 mt-5 ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "720ms" }}>
            <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90 flex-shrink-0" aria-hidden="true">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="11" />
              {PROGRAMS.map((p) => {
                const len = total ? (counts[p] / total) * C : 0;
                const el = (
                  <circle key={p} cx="50" cy="50" r={R} fill="none" stroke={PROGRAM_COLOR[p]} strokeWidth="11"
                    strokeDasharray={`${ready && !loading ? Math.max(0, len - 2) : 0} ${C}`} strokeDashoffset={-acc}
                    style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.22,1,.36,1) .85s" }} />
                );
                acc += len;
                return el;
              })}
            </svg>
            <ul className="space-y-1.5 text-[13px]">
              {PROGRAMS.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PROGRAM_COLOR[p] }} />
                  <span className="text-ink-300 w-24">{p}</span>
                  <span className="font-semibold tabular">{loading ? "–" : counts[p]}</span>
                </li>
              ))}
            </ul>
          </div>

          {coaches.length > 0 && (
            <div className={`hidden sm:flex flex-wrap gap-2 mt-5 ${ready ? "mg-fade" : "opacity-0"}`} style={{ animationDelay: "820ms" }}>
              {coaches.map((c) => (
                <span key={c.userId} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/[0.07] ring-1 ring-white/10 text-[12.5px]">
                  <Avatar name={c.name} initials={c.avatar} size={22} className="!rounded-full" />
                  <span className="font-semibold">{c.name}</span><span className="text-ink-400">Coach</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
