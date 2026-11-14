import { db } from "@/lib/db";

// Best-effort client IP. On Vercel `x-real-ip` is set by the platform and
// can't be spoofed by the client; the first x-forwarded-for hop is the
// fallback for other proxies. Locally neither exists.
export function clientIp(request) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || "local").slice(0, 64);
}

// Writes an audit entry. Never throws: auditing must not break the action
// it records, so a failure is logged and swallowed.
export async function audit({ actorId = null, action, target = null, meta = null, request = null }) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action: String(action).slice(0, 80),
        target: target == null ? null : String(target).slice(0, 200),
        meta: meta ?? undefined,
        ip: request ? clientIp(request) : null,
      },
    });
  } catch (err) {
    console.error("audit: failed to write", action, err);
  }
}

// Login lockout policy (persistent, so it works across serverless instances).
export const LOCKOUT = { maxFailures: 5, minutes: 15 };

export function initialsOf(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
