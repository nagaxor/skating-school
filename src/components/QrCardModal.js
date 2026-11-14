"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { ModalShell, Spinner, cx } from "@/components/ui";
import QrCard from "@/components/QrCard";

// Show / print / re-issue one student's attendance QR card.
export default function QrCardModal({ studentId, canRotate = false, onClose }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { api(`/api/students/qr?id=${studentId}`).then(setCard).catch((e) => setError(e.message)); }, [studentId]);

  const rotate = async () => {
    setBusy(true); setError("");
    try {
      const r = await api(`/api/students/qr?id=${studentId}`, { method: "POST" });
      setCard((c) => ({ ...c, payload: r.payload }));
      setMsg("New card issued. The old QR code no longer works.");
      setConfirmRotate(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title="Attendance QR card" subtitle="Scan at the rink to mark attendance automatically." onClose={onClose} maxWidth="max-w-md"
      footer={<>
        {canRotate && !confirmRotate && <button onClick={() => setConfirmRotate(true)} className={cx.btnSecondary + " mr-auto"} disabled={!card}><Icon.Swap width={15} height={15} /> Re-issue</button>}
        <button onClick={onClose} className={cx.btnSecondary}>Close</button>
        <button onClick={() => window.print()} className={cx.btnPrimary} disabled={!card}><Icon.Download width={15} height={15} /> Print card</button>
      </>}>
      {error && <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {msg && <div className="bg-emerald-500/[0.08] ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">{msg}</div>}
      {confirmRotate && (
        <div className="rounded-xl ring-1 ring-gold-400/40 bg-gold-400/10 p-4 text-sm text-ink-700 dark:text-ink-200">
          Re-issuing cancels the current card immediately (use it when a card is lost). Print and hand over the new card.
          <div className="flex gap-2 mt-3">
            <button onClick={() => setConfirmRotate(false)} className={cx.btnSecondary}>Cancel</button>
            <button onClick={rotate} disabled={busy} className={cx.btnDanger}>{busy && <Spinner />}Cancel old card &amp; re-issue</button>
          </div>
        </div>
      )}
      <div className="print-area py-2">
        {card ? <QrCard card={card} /> : <div className="h-[420px] rounded-2xl bg-ink-100 dark:bg-white/5 animate-pulse" />}
      </div>
    </ModalShell>
  );
}
