import { db } from "@/lib/db";
import { getSession, forbiddenResponse, unauthorizedResponse } from "@/lib/auth";

export async function getAuthContext() {
  const session = await getSession();
  if (!session?.id || !session?.role) return null;
  let user;
  try {
    user = await db.user.findUnique({
      where: { id: String(session.id) },
      select: {
        id: true, name: true, email: true, role: true, active: true, sessionVersion: true,
        instructor: { select: { id: true, clubId: true } },
        student: { select: { id: true, clubId: true } },
      },
    });
  } catch (err) {
    // getAuthContext runs first in almost every API route, before that route's
    // own try/catch. Letting a transient DB error (Neon cold start, dropped
    // connection, etc.) escape from here means Next.js renders its default
    // HTML error page instead of JSON — which the frontend's res.json() then
    // fails to parse as "Unexpected token '<'". Treating it as "not
    // authenticated" is a safe fallback: every caller already handles a null
    // context by returning a clean 401/403 JSON response.
    console.error("getAuthContext: user lookup failed", err);
    return null;
  }
  if (!user?.active || user.role !== session.role) return null;
  // Revoked session (password changed, account deactivated, or "sign out
  // everywhere"): the token's version no longer matches the user's.
  if ((session.sv ?? 0) !== user.sessionVersion) return null;
  return { session, user };
}

// ── Authorization helpers ────────────────────────────────────────────────
// RULE: always ALLOW-list roles. Never write `role === "student" → deny`,
// because any new role (e.g. guardian) would silently fall through to
// staff/admin access. Unknown roles must end up with no access.
export const STAFF_ROLES = ["admin", "instructor"];
export const isStaff = (ctx) => STAFF_ROLES.includes(ctx?.user?.role);
export const isAdmin = (ctx) => ctx?.user?.role === "admin";

const NONE = { id: "__none__" };

// Prisma `where` for Student rows this user may see. Use it everywhere a
// student, payment, attendance or receipt is read:
//   db.student.findFirst({ where: { id, ...scope } })
//   db.payment.findMany({ where: { student: scope } })
export function studentScope(ctx) {
  switch (ctx?.user?.role) {
    case "admin": return {};
    case "instructor": return ctx.user.instructor?.clubId ? { clubId: ctx.user.instructor.clubId } : NONE;
    case "student": return { userId: ctx.user.id };
    case "guardian": return { guardianLinks: { some: { guardianId: ctx.user.id } } };
    default: return NONE;
  }
}

// Club ids whose schedules/notices this user may see; null = all (admin).
export async function visibleClubIds(ctx) {
  if (isAdmin(ctx)) return null;
  if (ctx?.user?.role === "instructor") return ctx.user.instructor?.clubId ? [ctx.user.instructor.clubId] : [];
  if (ctx?.user?.role === "student") return ctx.user.student?.clubId ? [ctx.user.student.clubId] : [];
  if (ctx?.user?.role === "guardian") {
    const kids = await db.student.findMany({ where: studentScope(ctx), select: { clubId: true } });
    return [...new Set(kids.map((k) => k.clubId).filter(Boolean))];
  }
  return [];
}

export async function requireContext(roles = []) {
  const ctx = await getAuthContext();
  if (!ctx) return { ctx: null, response: unauthorizedResponse() };
  if (roles.length && !roles.includes(ctx.user.role)) return { ctx: null, response: forbiddenResponse() };
  return { ctx, response: null };
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let originUrl;
  try { originUrl = new URL(origin); } catch { return false; }

  const requestUrl = new URL(request.url);
  if (originUrl.origin === requestUrl.origin) return true; // direct connection, no proxy in front

  // Behind a reverse proxy / tunnel / forwarded port, request.url reflects
  // the internal host Next.js actually received, not the public URL the
  // browser sees — so trust the standard forwarded headers too.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const effectiveOrigin = `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`;
    if (originUrl.origin === effectiveOrigin) return true;
  }

  // Last resort: an explicitly configured trusted URL, for proxies that
  // don't forward X-Forwarded-* at all. Set this in .env if you're testing
  // through a tunnel/proxy and still see "Invalid origin".
  const trusted = process.env.NEXT_PUBLIC_APP_URL;
  if (trusted) {
    try { if (originUrl.origin === new URL(trusted).origin) return true; } catch {}
  }

  return false;
}