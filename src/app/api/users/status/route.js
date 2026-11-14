import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, assertSameOrigin, requirePermission } from "@/lib/access";
import { userStatusSchema } from "@/lib/validation";
import { audit } from "@/lib/security";

// PATCH { userId, active }: activate or deactivate any account (admin only).
// Deactivating also revokes every session for that user immediately.
// Instructors may (de)activate students in their own branch.
export async function PATCH(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "users.set_status"); if (denied) return denied; }

  const parsed = userStatusSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { userId, active } = parsed.data;
  if (userId === ctx.user.id) return json({ error: "You cannot change your own account status" }, 400);

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, active: true, student: { select: { clubId: true } } },
  });
  if (!target) return json({ error: "Not found" }, 404);

  if (ctx.user.role === "instructor") {
    if (target.role !== "student" || target.student?.clubId !== ctx.user.instructor?.clubId) {
      return json({ error: "Forbidden" }, 403);
    }
  }
  if (target.active === active) return json({ success: true });

  if (!active && target.role === "admin") {
    const activeAdmins = await db.user.count({ where: { role: "admin", active: true } });
    if (activeAdmins <= 1) return json({ error: "Cannot deactivate the last active administrator" }, 400);
  }

  await db.user.update({
    where: { id: userId },
    data: active ? { active: true, failedLogins: 0, lockedUntil: null } : { active: false, sessionVersion: { increment: 1 } },
  });
  await audit({ actorId: ctx.user.id, action: active ? "user.activate" : "user.deactivate", target: userId, meta: { name: target.name, role: target.role }, request });
  return json({ success: true });
}
