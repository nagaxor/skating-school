"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { can } from "@/lib/rbac";
import { Icon } from "@/components/Icons";
import { PageLoading, EmptyState, Toast, PageHeader, Avatar, Badge, cx } from "@/components/ui";
import QrScanner from "@/components/QrScanner";

// Today in Bangladesh (display only; the server decides the real date).
const dhakaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const prettyDate = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Short confirmation sound + vibration for scans (no audio files needed).
function feedback(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = ok ? 1046 : 220;
    g.gain.setValueAtTime(0.18, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.18 : 0.35));
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch {}
  navigator.vibrate?.(ok ? 60 : [80, 60, 80]);
}

export default function AttendancePage() {
  const { user } = useAuth();
  const canBackdate = can(user.role, "attendance.backdate");
  const canScan = can(user.role, "attendance.scan");
  const today = useMemo(() => dhakaToday(), []);
  const [tab, setTab] = useState(canScan ? "scan" : "manual");
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState({}); // studentId → { status, source, scannedAt }
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const isToday = date === today;

  useEffect(() => { api("/api/students").then((s) => setStudents(s.filter((x) => x.status === "active"))).finally(() => setLoading(false)); }, []);

  const loadDay = useCallback(() => {
    const q = isToday ? "today=1" : `date=${date}`;
    return api(`/api/attendance?${q}`).then((rows) => {
      const r = {}, m = {};
      rows.forEach((x) => { r[x.studentId] = x; m[x.studentId] = x.status; });
      setRecords(r); setMarks(m);
    });
  }, [date, isToday]);
  useEffect(() => { loadDay(); }, [loadDay]);

  const toggle = (sid, status) => setMarks((prev) => ({ ...prev, [sid]: prev[sid] === status ? undefined : status }));
  const save = async () => {
    setSaving(true);
    const list = Object.entries(marks).filter(([, s]) => s).map(([studentId, status]) => ({ studentId, status }));
    try {
      await api("/api/attendance", { method: "POST", body: JSON.stringify({ date, records: list }) });
      setToast({ message: `Attendance saved for ${list.length} student${list.length !== 1 ? "s" : ""}`, tone: "emerald" });
      loadDay();
    } catch (e) { setToast({ message: e.message, tone: "red" }); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoading statCards={0} />;

  const present = Object.values(marks).filter((v) => v === "present").length;
  const absent = Object.values(marks).filter((v) => v === "absent").length;
  const scanned = Object.values(records).filter((r) => r.source === "qr").length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={isToday ? "Today" : "Correcting a past day"} title="Attendance"
        subtitle={`${prettyDate(date)} · ${present} present · ${absent} absent · ${students.length - present - absent} not marked`}
        actions={canBackdate ? (
          <div className="relative">
            <Icon.Calendar width={15} height={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input type="date" max={today} className={cx.input + " pl-9 w-48"} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-ink-100 dark:bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-ink-700 dark:text-ink-200"><Icon.Lock width={14} height={14} /> Date is set automatically</span>
        )} />

      {canScan && isToday && (
        <div className="inline-flex rounded-xl bg-ink-100 dark:bg-white/5 p-1" role="tablist">
          {[["scan", "Scan QR", Icon.Command], ["manual", "Mark by hand", Icon.Clipboard]].map(([k, l, I]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition ${tab === k ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-sm" : "text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"}`}>
              <I width={14} height={14} /> {l}
            </button>
          ))}
        </div>
      )}

      {tab === "scan" && canScan && isToday ? (
        <ScanPanel students={students} records={records} scanned={scanned} onMarked={loadDay} />
      ) : (
        <ManualPanel students={students} marks={marks} records={records} toggle={toggle} save={save} saving={saving}
          markAll={() => setMarks((p) => Object.fromEntries(students.map((s) => [s.id, p[s.id] || "present"])))} />
      )}
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function ScanPanel({ students, records, scanned, onMarked }) {
  const [last, setLast] = useState(null); // { ok, already, student, error, at }
  const [feed, setFeed] = useState([]);
  const recent = useRef(new Map()); // code → time, to ignore the same card held in view

  const onCode = useCallback(async (code) => {
    const now = Date.now();
    if (now - (recent.current.get(code) || 0) < 4000) return;
    recent.current.set(code, now);
    try {
      const r = await api("/api/attendance/scan", { method: "POST", body: JSON.stringify({ code }) });
      feedback(true);
      setLast({ ok: true, already: r.already, student: r.student, at: now });
      if (!r.already) setFeed((f) => [{ ...r.student, time: r.time }, ...f].slice(0, 30));
      onMarked();
    } catch (e) {
      feedback(false);
      setLast({ ok: false, error: e.message, at: now });
    }
  }, [onMarked]);

  const presentIds = new Set(Object.entries(records).filter(([, r]) => r.status === "present").map(([id]) => id));
  const waiting = students.filter((s) => !presentIds.has(s.id));

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
      <div className={cx.card + " p-4 sm:p-5 space-y-4"}>
        <div className="min-h-[88px]">
        {last ? (
          <div key={last.at} className={`animate-scaleIn rounded-2xl p-4 flex items-center gap-4 ring-1 ${last.ok ? (last.already ? "bg-gold-400/10 ring-gold-400/30" : "bg-emerald-500/10 ring-emerald-500/30") : "bg-red-500/10 ring-red-500/30"}`} role="status" aria-live="assertive">
            {last.ok ? <Avatar name={last.student.name} initials={last.student.avatar} src={last.student.photo} size={56} /> : <span className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center"><Icon.X width={26} height={26} /></span>}
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-semibold text-ink-950 dark:text-white truncate">{last.ok ? last.student.name : "Not marked"}</div>
              <div className="text-sm text-ink-600 dark:text-ink-300">{last.ok ? (last.already ? "Already marked present today" : `Present · ${last.student.program}`) : last.error}</div>
            </div>
            {last.ok && <span className={`w-11 h-11 rounded-full flex items-center justify-center ${last.already ? "bg-gold-400 text-ink-950" : "bg-emerald-500 text-white"}`}><Icon.Check width={22} height={22} strokeWidth={3} /></span>}
          </div>
        ) : (
          <div className="h-[88px] rounded-2xl ring-1 ring-dashed ring-ink-900/10 dark:ring-white/10 flex items-center justify-center text-sm text-ink-400">Scan results appear here</div>
        )}
        </div>
        <QrScanner onCode={onCode} />
      </div>

      <div className="space-y-4">
        <div className={cx.card + " p-5"}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[12px] text-ink-500">Present today</div>
              <div className="font-display text-3xl font-semibold text-ink-950 dark:text-white tabular">{presentIds.size}<span className="text-ink-400 text-xl"> / {students.length}</span></div>
            </div>
            <Badge tone="lime">{scanned} by QR</Badge>
          </div>
          <div className="h-2 rounded-full bg-ink-100 dark:bg-white/10 mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-600 to-lime-400 transition-all duration-700" style={{ width: `${students.length ? (presentIds.size / students.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div className={cx.card}>
          <div className={cx.cardHeader}><h3 className={cx.cardTitle}>Just scanned</h3><span className="text-xs text-ink-400">this session</span></div>
          {feed.length === 0 ? <EmptyState icon={Icon.Command} title="No scans yet" hint="Scanned students appear here." /> : (
            <ul className="divide-y divide-ink-100 dark:divide-white/[0.05] max-h-72 overflow-y-auto">
              {feed.map((s, i) => (
                <li key={`${s.id}-${s.time}`} className={`px-5 py-2.5 flex items-center gap-3 ${i === 0 ? "animate-itemIn" : ""}`}>
                  <Avatar name={s.name} initials={s.avatar} size={30} />
                  <span className="flex-1 text-sm font-semibold text-ink-900 dark:text-white truncate">{s.name}</span>
                  <span className="text-[11px] text-ink-400 tabular">{new Date(s.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cx.card}>
          <div className={cx.cardHeader}><h3 className={cx.cardTitle}>Not here yet</h3><span className="text-xs text-ink-400 tabular">{waiting.length}</span></div>
          {waiting.length === 0 ? <EmptyState icon={Icon.Check} title="Everyone is present" /> : (
            <ul className="divide-y divide-ink-100 dark:divide-white/[0.05] max-h-60 overflow-y-auto">
              {waiting.map((s) => (
                <li key={s.id} className="px-5 py-2.5 flex items-center gap-3">
                  <Avatar name={s.name} initials={s.avatar} size={28} />
                  <span className="flex-1 text-sm text-ink-700 dark:text-ink-300 truncate">{s.name}</span>
                  <span className="text-[11px] text-ink-400">{s.program}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualPanel({ students, marks, records, toggle, save, saving, markAll }) {
  if (students.length === 0) return <div className={cx.card}><EmptyState icon={Icon.Clipboard} title="No students to mark" /></div>;
  return (
    <>
      <div className="flex flex-wrap gap-2 justify-end">
        <button onClick={markAll} className={cx.btnSecondary}><Icon.Users width={15} height={15} /> Mark rest present</button>
        <button onClick={save} disabled={saving} className={cx.btnPrimary}>{saving ? "Saving…" : <><Icon.Check width={16} height={16} /> Save attendance</>}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {students.map((s) => {
          const state = marks[s.id];
          const viaQr = records[s.id]?.source === "qr" && records[s.id]?.status === state;
          return (
            <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors bg-white dark:bg-ink-900 ${state === "present" ? "border-emerald-400/60 !bg-emerald-500/[0.06]" : state === "absent" ? "border-red-400/60 !bg-red-500/[0.06]" : "border-ink-900/[0.06] dark:border-white/[0.07]"}`}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={s.name} initials={s.avatar} size={36} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-ink-900 dark:text-ink-100 truncate">{s.name}</div>
                  <div className="text-xs text-ink-500 truncate">{s.program} · {s.club || "Unassigned"}{viaQr ? " · scanned" : ""}</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => toggle(s.id, "present")} aria-label={`${s.name} present`} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${state === "present" ? "bg-emerald-500 text-white border-emerald-500" : "border-ink-200 dark:border-white/[0.07] text-emerald-500 hover:bg-emerald-500/10"}`}><Icon.Check width={15} height={15} /></button>
                <button onClick={() => toggle(s.id, "absent")} aria-label={`${s.name} absent`} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${state === "absent" ? "bg-red-500 text-white border-red-500" : "border-ink-200 dark:border-white/[0.07] text-red-500 hover:bg-red-500/10"}`}><Icon.X width={15} height={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
