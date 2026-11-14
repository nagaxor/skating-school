// End-to-end security smoke test against a RUNNING local app.
// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/security-smoke.mjs [baseUrl]
// Creates a temporary instructor, exercises lockout / revocation / validation,
// then deletes it. Never point this at production.
const BASE = process.argv[2] || "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("Refusing to run against a non-local URL");
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");

let failures = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
  if (!cond) failures++;
};

async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Origin: BASE, ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  const token = setCookie?.match(/oss-token=([^;]*)/)?.[1];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, cookie: token ? `oss-token=${token}` : null };
}

const login = (email, password) => call("/api/auth", { method: "POST", body: { email, password } });

const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
check("admin login", admin.status === 200);
const A = admin.cookie;

const email = `smoke-${Date.now()}@local.test`;
const pw1 = "Smoke-pass-123";
const created = await call("/api/instructors", { method: "POST", cookie: A, body: { name: "Smoke Test", email, password: pw1 } });
check("create temp instructor", created.status === 201);
const userId = created.data?.userId;

try {
  check("weak password rejected on create", (await call("/api/instructors", { method: "POST", cookie: A, body: { name: "Weak", email: `weak-${Date.now()}@local.test`, password: "abcdefgh" } })).status === 400);

  const unknown = await login(`nobody-${Date.now()}@local.test`, "whatever1");
  check("unknown email gives generic 401", unknown.status === 401 && /Invalid email or password/.test(unknown.data?.error || ""));

  let last;
  for (let i = 0; i < 5; i++) last = await login(email, "wrong-password-1");
  check("5 wrong passwords lock the account", last.status === 423, `status ${last.status}`);
  check("correct password refused while locked", (await login(email, pw1)).status === 423);

  const pw2 = "Reset-pass-456";
  check("admin password reset", (await call("/api/users/password", { method: "POST", cookie: A, body: { userId, password: pw2 } })).status === 200);
  const s1 = await login(email, pw2);
  check("reset unlocks + login works", s1.status === 200);

  check("instructor blocked from admin API", (await call("/api/audit", { cookie: s1.cookie })).status === 403);

  check("deactivate user", (await call("/api/users/status", { method: "PATCH", cookie: A, body: { userId, active: false } })).status === 200);
  check("deactivated session revoked", (await call("/api/students", { cookie: s1.cookie })).status === 401);
  check("deactivated cannot log in", (await login(email, pw2)).status === 401);
  check("reactivate user", (await call("/api/users/status", { method: "PATCH", cookie: A, body: { userId, active: true } })).status === 200);

  const devA = await login(email, pw2);
  const devB = await login(email, pw2);
  const pw3 = "Changed-pass-789";
  const changed = await call("/api/auth/password", { method: "POST", cookie: devB.cookie, body: { currentPassword: pw2, newPassword: pw3 } });
  check("password change", changed.status === 200);
  check("other device signed out after password change", (await call("/api/students", { cookie: devA.cookie })).status === 401);
  check("current device keeps working (new cookie)", (await call("/api/students", { cookie: changed.cookie })).status === 200);

  check("sign out everywhere", (await call("/api/auth/sessions", { method: "DELETE", cookie: changed.cookie })).status === 200);
  check("session dead after sign-out-everywhere", (await call("/api/students", { cookie: changed.cookie })).status === 401);

  check("cannot deactivate yourself", (await call("/api/users/status", { method: "PATCH", cookie: A, body: { userId: "self", active: false } })).status !== 200);

  const svg = await call("/api/admission", { method: "POST", body: { photo: "data:image/svg+xml;base64,PHN2Zy8+" } });
  check("SVG / non-raster photo rejected", svg.status === 400 && !!svg.data?.details?.photo);

  const badOrigin = await fetch(BASE + "/api/auth", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" });
  check("cross-origin POST rejected", badOrigin.status === 403);

  const audit = await call("/api/audit", { cookie: A });
  const actions = new Set((audit.data?.items || []).map((i) => i.action));
  check("audit log records events", ["auth.locked", "user.password_reset", "user.deactivate", "auth.password_change", "auth.logout_all"].every((a) => actions.has(a)));
} finally {
  const del = await call(`/api/staff?userId=${userId}`, { method: "DELETE", cookie: A });
  check("cleanup temp instructor", del.status === 200, `status ${del.status}`);
}

// ── Guardian portal: IDOR / tenant isolation ─────────────────────────────
console.log("\n— guardian isolation —");
const tag = Date.now();
const kids = [];
const guardians = [];
try {
  for (let i = 0; i < 3; i++) {
    const r = await call("/api/students", { method: "POST", cookie: A, body: { name: `Kid ${i} ${tag}`, email: `kid${i}-${tag}@local.test`, password: "Kid-pass-123", guardian: "Parent" } });
    kids.push(r.data?.id);
  }
  check("create 3 temp students", kids.every(Boolean));
  const pays = [];
  for (const id of kids) pays.push((await call("/api/payments", { method: "POST", cookie: A, body: { studentId: id, amount: 2000, method: "cash", type: "monthly_fee", month: "January 2026" } })).data?.id);
  await call("/api/attendance", { method: "POST", cookie: A, body: { date: new Date().toISOString().slice(0, 10), records: kids.map((studentId) => ({ studentId, status: "present" })) } });

  const gA = await call("/api/guardians", { method: "POST", cookie: A, body: { name: "Guardian A", email: `ga-${tag}@local.test`, password: "Guard-pass-1", children: [{ studentId: kids[0], relation: "Father" }, { studentId: kids[1], relation: "Father" }] } });
  const gB = await call("/api/guardians", { method: "POST", cookie: A, body: { name: "Guardian B", email: `gb-${tag}@local.test`, password: "Guard-pass-1", children: [{ studentId: kids[2], relation: "Mother" }] } });
  guardians.push(gA.data?.userId, gB.data?.userId);
  check("create 2 guardians", gA.status === 201 && gB.status === 201);
  const GA = (await login(`ga-${tag}@local.test`, "Guard-pass-1")).cookie;
  const GB = (await login(`gb-${tag}@local.test`, "Guard-pass-1")).cookie;

  const mine = await call("/api/my-children", { cookie: GA });
  const mineIds = (mine.data?.children || []).map((c) => c.id).sort();
  check("guardian A sees exactly their 2 children", JSON.stringify(mineIds) === JSON.stringify([kids[0], kids[1]].sort()));
  check("my-children omits NID/birth-reg", !JSON.stringify(mine.data).match(/Nid|birthReg/));
  check("guardian B sees exactly 1 child", (await call("/api/my-children", { cookie: GB })).data?.children?.length === 1);

  const other = kids[2];
  check("IDOR: A cannot open B's child (students?id)", (await call(`/api/students?id=${other}`, { cookie: GA })).status === 404);
  check("IDOR: A's student list has only own kids", ((await call("/api/students", { cookie: GA })).data || []).every((s) => [kids[0], kids[1]].includes(s.id)));
  check("IDOR: A gets no payments for B's child", ((await call(`/api/payments?studentId=${other}`, { cookie: GA })).data || []).length === 0);
  check("IDOR: A's payment list has only own kids", ((await call("/api/payments", { cookie: GA })).data || []).every((p) => [kids[0], kids[1]].includes(p.studentId)));
  check("IDOR: A gets no attendance for B's child", ((await call(`/api/attendance?studentId=${other}`, { cookie: GA })).data || []).length === 0);
  check("IDOR: A cannot open B's child's receipt", (await call(`/api/receipts?id=${pays[2]}`, { cookie: GA })).status === 404);
  check("A can open own child's receipt", (await call(`/api/receipts?id=${pays[0]}`, { cookie: GA })).status === 200);

  check("guardian cannot record payments", (await call("/api/payments", { method: "POST", cookie: GA, body: { studentId: kids[0], amount: 1, method: "cash", type: "monthly_fee", month: "X" } })).status === 403);
  check("guardian cannot mark attendance", (await call("/api/attendance", { method: "POST", cookie: GA, body: { date: "2026-01-01", records: [{ studentId: kids[0], status: "absent" }] } })).status === 403);
  check("guardian cannot edit students", (await call("/api/students", { method: "PATCH", cookie: GA, body: { id: kids[0], name: "Hacked" } })).status === 403);
  check("guardian cannot post notices", (await call("/api/notices", { method: "POST", cookie: GA, body: { title: "x", body: "yy" } })).status === 403);
  check("guardian cannot deactivate users", (await call("/api/users/status", { method: "PATCH", cookie: GA, body: { userId: guardians[1], active: false } })).status === 403);
  check("guardian cannot manage guardians", (await call("/api/guardians", { cookie: GA })).status === 403 && (await call("/api/guardians", { method: "PATCH", cookie: GA, body: { guardianId: guardians[0], link: { studentId: other } } })).status === 403);
  for (const p of ["/api/staff", "/api/audit", "/api/instructors"]) check(`guardian blocked from ${p}`, (await call(p, { cookie: GA })).status === 403);
  check("student role cannot use guardian portal", (await call("/api/my-children", { cookie: (await login(`kid0-${tag}@local.test`, "Kid-pass-123")).cookie })).status === 403);

  check("unlink child", (await call("/api/guardians", { method: "PATCH", cookie: A, body: { guardianId: guardians[0], unlink: kids[1] } })).status === 200);
  check("unlinked child disappears immediately", (await call(`/api/students?id=${kids[1]}`, { cookie: GA })).status === 404);
} finally {
  for (const g of guardians) if (g) await call(`/api/guardians?userId=${g}`, { method: "DELETE", cookie: A });
  for (const k of kids) if (k) await call(`/api/students?id=${k}`, { method: "DELETE", cookie: A });
  console.log("cleanup guardian fixtures done");
}

// ── RBAC matrix: every role × every protected endpoint ───────────────────
// Reads the real matrix from src/lib/rbac.js. Bodies are deliberately empty or
// invalid, so an ALLOWED role gets past authorization and then fails
// validation (400/404) without changing data; a DENIED role must get 403.
console.log("\n— RBAC matrix —");
{
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const rbacSrc = readFileSync(fileURLToPath(new URL("../src/lib/rbac.js", import.meta.url)), "utf8");
  const { can, ROLES } = await import("data:text/javascript;base64," + Buffer.from(rbacSrc).toString("base64"));

  const t = Date.now();
  const made = { users: [], students: [], clubs: [] };
  const club = await call("/api/clubs", { method: "POST", cookie: A, body: { name: `RBAC Test ${t}`, location: "Test" } });
  made.clubs.push(club.data?.id);
  const inst = await call("/api/instructors", { method: "POST", cookie: A, body: { name: "RBAC Instructor", email: `rbac-i-${t}@local.test`, password: "Rbac-pass-123", clubId: club.data?.id } });
  made.users.push(inst.data?.userId);
  const stu = await call("/api/students", { method: "POST", cookie: A, body: { name: "RBAC Student", email: `rbac-s-${t}@local.test`, password: "Rbac-pass-123", guardian: "Parent", clubId: club.data?.id } });
  made.students.push(stu.data?.id);
  const gua = await call("/api/guardians", { method: "POST", cookie: A, body: { name: "RBAC Guardian", email: `rbac-g-${t}@local.test`, password: "Rbac-pass-123", children: [{ studentId: stu.data?.id, relation: "Father" }] } });
  made.users.push(gua.data?.userId);

  const cookies = {
    admin: A,
    instructor: (await login(`rbac-i-${t}@local.test`, "Rbac-pass-123")).cookie,
    student: (await login(`rbac-s-${t}@local.test`, "Rbac-pass-123")).cookie,
    guardian: (await login(`rbac-g-${t}@local.test`, "Rbac-pass-123")).cookie,
  };
  check("RBAC fixtures: one signed-in user per role", Object.values(cookies).every(Boolean));

  const ENDPOINTS = [
    ["GET", "/api/students", "students.read"], ["POST", "/api/students", "students.create"],
    ["PATCH", "/api/students", "students.update"], ["DELETE", "/api/students", "students.delete"],
    ["GET", "/api/payments", "payments.read"], ["POST", "/api/payments", "payments.create"],
    ["GET", "/api/receipts?id=none", "payments.read"],
    ["GET", "/api/attendance", "attendance.read"], ["POST", "/api/attendance", "attendance.mark"],
    ["GET", "/api/schedules", "schedules.read"], ["POST", "/api/schedules", "schedules.create"], ["DELETE", "/api/schedules", "schedules.delete"],
    ["GET", "/api/notices", "notices.read"], ["POST", "/api/notices", "notices.create"], ["DELETE", "/api/notices", "notices.delete"],
    ["POST", "/api/clubs", "branches.manage"], ["PATCH", "/api/clubs", "branches.manage"], ["DELETE", "/api/clubs", "branches.manage"],
    ["GET", "/api/instructors", "staff.manage"], ["POST", "/api/instructors", "staff.manage"], ["PATCH", "/api/instructors", "staff.manage"], ["DELETE", "/api/instructors", "staff.manage"],
    ["GET", "/api/staff", "staff.manage"], ["DELETE", "/api/staff", "staff.manage"], ["PATCH", "/api/staff/role", "staff.change_role"],
    ["GET", "/api/audit", "audit.read"],
    ["POST", "/api/users/password", "users.reset_password"], ["PATCH", "/api/users/status", "users.set_status"],
    ["GET", "/api/guardians", "guardians.manage"], ["POST", "/api/guardians", "guardians.manage"], ["PATCH", "/api/guardians", "guardians.manage"], ["DELETE", "/api/guardians", "guardians.manage"],
    ["GET", "/api/my-children", "portal.children"],
    ["PUT", "/api/settings", "settings.update"],
  ];

  let cells = 0, wrong = [];
  for (const [method, path, perm] of ENDPOINTS) {
    for (const role of ROLES) {
      const r = await call(path, { method, cookie: cookies[role], body: method === "GET" ? undefined : {} });
      const allowed = can(role, perm);
      const ok = allowed ? r.status !== 401 && r.status !== 403 : r.status === 403;
      cells++;
      if (!ok) wrong.push(`${role} ${method} ${path} → ${r.status} (expected ${allowed ? "allowed" : "403"})`);
    }
  }
  check(`RBAC matrix: ${ENDPOINTS.length} endpoints × ${ROLES.length} roles = ${cells} cells match lib/rbac.js`, wrong.length === 0, wrong.slice(0, 6).join(" | "));

  // cleanup
  for (const s of made.students) if (s) await call(`/api/students?id=${s}`, { method: "DELETE", cookie: A });
  for (const u of made.users) if (u) { await call(`/api/guardians?userId=${u}`, { method: "DELETE", cookie: A }); await call(`/api/staff?userId=${u}`, { method: "DELETE", cookie: A }); }
  for (const c of made.clubs) if (c) await call(`/api/clubs?id=${c}`, { method: "DELETE", cookie: A });
  console.log("cleanup RBAC fixtures done");
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll security checks passed");
process.exit(failures ? 1 : 0);
