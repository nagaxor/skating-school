import { db } from "@/lib/db";
import { signToken, setAuthCookie, removeAuthCookie, getSession, json } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/access";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { audit, clientIp, LOCKOUT } from "@/lib/security";
import bcrypt from "bcryptjs";

// A valid bcrypt hash of a random string. Compared against when the email
// doesn't exist so response time doesn't reveal which emails are registered.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7lYxSt8nRw9cS1E7ytmQKwkpW7q5o.6";

export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ip = clientIp(request);
  const limit = rateLimit(`login:${ip}`, 20);
  if (!limit.ok) return json({ error: "Too many login attempts. Try again later." }, 429, { "Retry-After": String(limit.retryAfter) });

  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Invalid email or password" }, 400);
    const { email, password } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return json({ error: "Invalid email or password" }, 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return json({ error: `Too many failed attempts. This account is locked for ${minutes} more minute${minutes === 1 ? "" : "s"}.` }, 423);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok || !user.active) {
      if (!ok) {
        const failures = user.failedLogins + 1;
        const lock = failures >= LOCKOUT.maxFailures;
        await db.user.update({
          where: { id: user.id },
          data: lock
            ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCKOUT.minutes * 60000) }
            : { failedLogins: failures },
        });
        await audit({ actorId: user.id, action: lock ? "auth.locked" : "auth.login_failed", request });
        if (lock) return json({ error: `Too many failed attempts. This account is locked for ${LOCKOUT.minutes} minutes.` }, 423);
      }
      return json({ error: user.active ? "Invalid email or password" : "This account has been deactivated. Contact your administrator." }, 401);
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await setAuthCookie(await signToken(updated), request);
    await audit({ actorId: user.id, action: "auth.login", request });

    return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, phone: user.phone } });
  } catch (err) {
    console.error("Login error", err);
    return json({ error: "Login failed" }, 500);
  }
}

export async function DELETE(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const session = await getSession();
  await removeAuthCookie(request);
  if (session?.id) await audit({ actorId: String(session.id), action: "auth.logout", request });
  return json({ success: true });
}
