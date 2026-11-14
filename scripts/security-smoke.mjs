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

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll security checks passed");
process.exit(failures ? 1 : 0);
