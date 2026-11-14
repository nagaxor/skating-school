import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, assertSameOrigin } from "@/lib/access";
import { adminPasswordResetSchema, PASSWORD_HINT } from "@/lib/validation";
import { audit } from "@/lib/security";

// POST { userId, password }: admin sets a temporary password for someone
// who forgot theirs. Unlocks the account and signs out all their sessions.
export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  if (!ctx || ctx.user.role !== "admin") return json({ error: "Forbidden" }, 403);

  const parsed = adminPasswordResetSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: `Password: ${PASSWORD_HINT.toLowerCase()}` }, 400);
  const { userId, password } = parsed.data;
  if (userId === ctx.user.id) return json({ error: "Use My Profile to change your own password" }, 400);

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
  if (!target) return json({ error: "Not found" }, 404);

  await db.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null },
  });
  await audit({ actorId: ctx.user.id, action: "user.password_reset", target: userId, meta: { name: target.name, role: target.role }, request });
  return json({ success: true });
}
