"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icons";
import { EmptyState, cx } from "@/components/ui";
import BranchView from "@/components/BranchView";

// Full-page branch view. Access: /dashboard/branches/* → "branches.manage" (lib/rbac.js).
export default function BranchPage() {
  const { id } = useParams();
  const [club, setClub] = useState(undefined); // undefined = loading, null = not found
  const [data, setData] = useState({ students: [], instructors: [], loading: true });

  useEffect(() => {
    api("/api/clubs?all=1").then((clubs) => setClub(clubs.find((c) => c.id === id) || null)).catch(() => setClub(null));
    Promise.all([api("/api/students"), api("/api/staff")])
      .then(([students, staff]) => setData({ students, instructors: staff.instructors || [], loading: false }))
      .catch(() => setData((d) => ({ ...d, loading: false })));
  }, [id]);

  // Release the card→page portal (see branches list) once this page has content.
  useEffect(() => {
    if (club !== undefined) requestAnimationFrame(() => window.__releaseBranchPortal?.());
  }, [club]);

  if (club === null) {
    return <div className={cx.card}><EmptyState icon={Icon.Building} title="Branch not found" hint="It may have been deleted." action={<Link href="/dashboard/branches" className={cx.btnSecondary}><Icon.ArrowLeft width={15} height={15} /> All branches</Link>} /></div>;
  }
  // Until the branch row arrives, show the dark stage so the portal transition lands on the same colour.
  if (!club) return <div className="rounded-3xl bg-ink-950 h-[calc(100vh-8.5rem)]" />;
  return <BranchView club={club} students={data.students} instructors={data.instructors} loading={data.loading} />;
}
