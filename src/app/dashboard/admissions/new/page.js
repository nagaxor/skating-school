"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/rbac";
import { Icon } from "@/components/Icons";
import { PageHeader, cx } from "@/components/ui";
import AdmissionForm from "@/components/AdmissionForm";

// Full admission from the dashboard. Access: "admissions.create" (lib/rbac.js).
export default function NewAdmissionPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-5">
      <PageHeader title="New admission" subtitle="Admit a student, give the parents portal access and print the QR attendance card."
        actions={<Link href="/dashboard/students" className={cx.btnSecondary}><Icon.ArrowLeft width={15} height={15} /> Students</Link>} />
      <AdmissionForm mode="staff" canLinkGuardian={can(user.role, "guardians.manage")} branchFixed={!can(user.role, "students.move_branch")} />
    </div>
  );
}
