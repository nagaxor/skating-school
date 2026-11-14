"use client";

import { Fragment } from "react";
import { Icon } from "@/components/Icons";
import { PageHeader, cx } from "@/components/ui";
import { PERMISSIONS, ROLES, ROLE_LABELS, can, ROLE_PERMISSIONS } from "@/lib/rbac";

// Read-only view of the RBAC matrix in lib/rbac.js, the same data the API,
// menu and page guard enforce. Changing access means editing that file.
export default function RolesPage() {
  const groups = Object.entries(PERMISSIONS).reduce((acc, [key, p]) => {
    (acc[p.group] ||= []).push({ key, ...p });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Access" subtitle="Who can do what. Enforced on the server for every request; the menu and buttons follow the same rules." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {ROLES.map((r) => (
          <div key={r} className={cx.card + " p-4 sm:p-5"}>
            <div className="text-[12px] font-medium text-ink-500 dark:text-ink-400">{ROLE_LABELS[r]}</div>
            <div className="font-display text-2xl font-semibold text-ink-950 dark:text-white mt-1 tabular">{ROLE_PERMISSIONS[r].length}</div>
            <div className="text-[11.5px] text-ink-500 mt-0.5">of {Object.keys(PERMISSIONS).length} permissions</div>
          </div>
        ))}
      </div>

      <div className={cx.card + " overflow-hidden"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className={cx.thead}>
                <th className={cx.th + " w-[46%]"}>Permission</th>
                {ROLES.map((r) => <th key={r} className={cx.th + " text-center"}>{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([group, perms]) => (
                <Fragment key={group}>
                  <tr className="bg-ink-50/60 dark:bg-white/[0.02]">
                    <td colSpan={ROLES.length + 1} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{group}</td>
                  </tr>
                  {perms.map((p) => (
                    <tr key={p.key} className={cx.tr}>
                      <td className={cx.td}>
                        <div className="font-medium text-ink-900 dark:text-ink-100">{p.label}</div>
                        <div className="text-[11.5px] text-ink-400 font-mono">{p.key}</div>
                        {p.scope && <div className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-0.5">Scope · {p.scope}</div>}
                      </td>
                      {ROLES.map((r) => (
                        <td key={r} className={cx.td + " text-center"}>
                          {can(r, p.key)
                            ? <span className="inline-flex w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 items-center justify-center" aria-label="Allowed"><Icon.Check width={15} height={15} strokeWidth={2.6} /></span>
                            : <span className="inline-flex w-7 h-7 rounded-lg text-ink-300 dark:text-ink-600 items-center justify-center" aria-label="Not allowed"><Icon.X width={14} height={14} /></span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl ring-1 ring-ink-900/[0.06] dark:ring-white/[0.07] bg-white/60 dark:bg-white/[0.02] p-4 flex items-start gap-3 text-[13px] text-ink-500 dark:text-ink-400">
        <Icon.Shield width={16} height={16} className="flex-shrink-0 mt-0.5 text-ink-400" />
        <span>
          Two checks run on every request: the <b>permission</b> above, then the <b>scope</b> (instructors see only their branch, students only themselves, guardians only linked children).
          Records outside the scope return &quot;not found&quot;. Roles are changed under Staff (admin ↔ instructor); guardians and students are separate account types.
        </span>
      </div>
    </div>
  );
}
