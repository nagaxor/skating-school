// ─────────────────────────────────────────────────────────────────────────
// RBAC: the single source of truth for "who may do what".
// Used by the API (requirePermission in lib/access.js), the dashboard menu,
// the page guard, buttons in the UI, the Roles & Access page and the
// automated security test. Plain JS, no server imports, safe on the client.
//
// Two layers, both required:
//   1. PERMISSION (this file): may this ROLE perform this ACTION at all?
//   2. SCOPE (lib/access.js studentScope / visibleClubIds): WHICH records?
//      e.g. an instructor has "students.update" but only for their branch.
// Rule: deny by default. A role or permission not listed here has no access.
// ─────────────────────────────────────────────────────────────────────────

export const ROLES = ["admin", "instructor", "student", "guardian"];

export const ROLE_LABELS = { admin: "Administrator", instructor: "Instructor", student: "Student", guardian: "Guardian" };

// Every permission, grouped for the Roles & Access page.
// `scope` explains how records are limited for non-admins.
export const PERMISSIONS = {
  // Students
  "students.read": { group: "Students", label: "View students", scope: "Instructor: own branch · Student: self · Guardian: linked children" },
  "students.create": { group: "Students", label: "Enroll students", scope: "Instructor: into own branch" },
  "students.update": { group: "Students", label: "Edit student details", scope: "Instructor: own branch" },
  "students.move_branch": { group: "Students", label: "Move a student to another branch" },
  "students.delete": { group: "Students", label: "Delete students permanently" },
  "students.qr_rotate": { group: "Students", label: "Re-issue a student's QR card", scope: "Instructor: own branch" },
  "admissions.create": { group: "Students", label: "Full admission from the dashboard", scope: "Linking a guardian also needs guardians.manage" },
  "students.view_ids": { group: "Students", label: "See NID / birth registration numbers", scope: "Student: self · Guardian: linked children" },

  // Accounts
  "users.set_status": { group: "Accounts", label: "Activate / deactivate accounts", scope: "Instructor: students in own branch only" },
  "users.reset_password": { group: "Accounts", label: "Reset someone's password" },
  "staff.manage": { group: "Accounts", label: "Manage staff (add, edit, remove)" },
  "staff.change_role": { group: "Accounts", label: "Promote / demote admins and instructors" },
  "guardians.manage": { group: "Accounts", label: "Create guardians and link children" },

  // Operations
  "attendance.read": { group: "Operations", label: "View attendance", scope: "Same scope as students" },
  "attendance.mark": { group: "Operations", label: "Mark attendance (today)", scope: "Instructor: own branch, today only" },
  "attendance.scan": { group: "Operations", label: "Scan student QR codes for attendance", scope: "Instructor: own branch, today only" },
  "attendance.backdate": { group: "Operations", label: "Mark or correct attendance for other dates" },
  "payments.read": { group: "Operations", label: "View payments & receipts", scope: "Same scope as students" },
  "payments.create": { group: "Operations", label: "Record payments", scope: "Instructor: own branch" },
  "schedules.read": { group: "Operations", label: "View class schedule", scope: "Own / children's branches" },
  "schedules.create": { group: "Operations", label: "Add class slots", scope: "Instructor: own branch" },
  "schedules.delete": { group: "Operations", label: "Remove class slots", scope: "Instructor: own branch" },
  "notices.read": { group: "Operations", label: "Read notices", scope: "'All' + own / children's branches" },
  "notices.create": { group: "Operations", label: "Post notices", scope: "Instructor: own branch or All" },
  "notices.delete": { group: "Operations", label: "Delete notices", scope: "Instructor: only their own" },
  "fees.track": { group: "Operations", label: "Use the monthly fee tracker", scope: "Instructor: own branch" },

  // Administration
  "branches.manage": { group: "Administration", label: "Manage branches" },
  "reports.view": { group: "Administration", label: "View reports" },
  "audit.read": { group: "Administration", label: "Read the activity log" },
  "settings.update": { group: "Administration", label: "Change school settings" },
  "rbac.view": { group: "Administration", label: "View roles & access" },

  // Portal
  "portal.children": { group: "Guardian portal", label: "Guardian portal (my children)" },
  "self.profile": { group: "Account", label: "Own profile, password and sessions" },
};

const ALL = Object.keys(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  admin: ALL.filter((p) => p !== "portal.children"),
  instructor: [
    "students.read", "students.create", "students.update",
    "users.set_status",
    "attendance.read", "attendance.mark", "attendance.scan",
    "students.qr_rotate", "admissions.create",
    "payments.read", "payments.create", "fees.track",
    "schedules.read", "schedules.create", "schedules.delete",
    "notices.read", "notices.create", "notices.delete",
    "self.profile",
  ],
  student: [
    "students.read", "students.view_ids",
    "attendance.read", "payments.read", "schedules.read", "notices.read",
    "self.profile",
  ],
  guardian: [
    "portal.children", "students.read", "students.view_ids",
    "attendance.read", "payments.read", "schedules.read", "notices.read",
    "self.profile",
  ],
};

const SETS = Object.fromEntries(Object.entries(ROLE_PERMISSIONS).map(([r, ps]) => [r, new Set(ps)]));

// can("instructor", "payments.create") → true. Unknown role/permission → false.
export function can(role, permission) {
  if (!PERMISSIONS[permission]) return false;
  return SETS[role]?.has(permission) ?? false;
}

// Dashboard pages → permission needed to open them (longest prefix wins).
export const ROUTE_PERMISSIONS = [
  { path: "/dashboard/students", perm: "students.create" },
  { path: "/dashboard/admissions", perm: "admissions.create" },        // staff list; guardians/students use their own views
  { path: "/dashboard/guardians", perm: "guardians.manage" },
  { path: "/dashboard/staff", perm: "staff.manage" },
  { path: "/dashboard/branches", perm: "branches.manage" },
  { path: "/dashboard/attendance", perm: "attendance.mark" },
  { path: "/dashboard/fees", perm: "payments.read" },
  { path: "/dashboard/payment-history", perm: "fees.track" },
  { path: "/dashboard/schedule", perm: "schedules.read" },
  { path: "/dashboard/notices", perm: "notices.read" },
  { path: "/dashboard/reports", perm: "reports.view" },
  { path: "/dashboard/activity", perm: "audit.read" },
  { path: "/dashboard/settings", perm: "settings.update" },
  { path: "/dashboard/roles", perm: "rbac.view" },
  { path: "/dashboard/children", perm: "portal.children" },
  { path: "/dashboard/receipt", perm: "payments.read" },
  { path: "/dashboard/profile", perm: "self.profile" },
  { path: "/dashboard", perm: "self.profile" },
];

export function permissionForPath(pathname) {
  const match = ROUTE_PERMISSIONS
    .filter((r) => pathname === r.path || pathname.startsWith(r.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.perm || null;
}

// Unlisted dashboard paths are denied (deny by default).
export function canAccessPath(role, pathname) {
  const perm = permissionForPath(pathname);
  return perm ? can(role, perm) : false;
}
