"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { can } from "@/lib/rbac";
import { Icon } from "@/components/Icons";
import { EmptyState, PageHeader, PageLoading, cx } from "@/components/ui";
import QrCard from "@/components/QrCard";

// Print attendance QR cards for a whole branch (instructors: their own branch).
export default function QrCardsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [club, setClub] = useState("all");
  const [cards, setCards] = useState(null);
  const [onlyActive, setOnlyActive] = useState(true);

  useEffect(() => { if (can(user.role, "branches.manage")) api("/api/clubs?all=1").then(setClubs).catch(() => {}); }, [user.role]);
  useEffect(() => { setCards(null); api(`/api/students/qr?club=${club}`).then(setCards).catch(() => setCards([])); }, [club]);

  if (!cards) return <PageLoading statCards={0} />;
  const shown = onlyActive ? cards.filter((c) => c.active) : cards;

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader title="QR attendance cards" subtitle="Print, cut and give each student their card. Scanning it marks them present."
          actions={<>
            <Link href="/dashboard/students" className={cx.btnSecondary}><Icon.ArrowLeft width={15} height={15} /> Students</Link>
            <button onClick={() => window.print()} disabled={!shown.length} className={cx.btnPrimary}><Icon.Download width={15} height={15} /> Print {shown.length} card{shown.length === 1 ? "" : "s"}</button>
          </>} />
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {clubs.length > 0 && (
            <select className={cx.input + " !w-auto"} value={club} onChange={(e) => setClub(e.target.value)} aria-label="Branch">
              <option value="all">All branches</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300 px-2">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="w-4 h-4 accent-brand-600" /> Active students only
          </label>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={cx.card}><EmptyState icon={Icon.Users} title="No students to print" /></div>
      ) : (
        <div className="print-area">
          <div className="qr-sheet grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {shown.map((c) => <div key={c.id} className="break-inside-avoid"><QrCard card={c} compact /></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
