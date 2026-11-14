import { db } from "@/lib/db";
import { json, removeAuthCookie } from "@/lib/auth";
import { getAuthContext, assertSameOrigin } from "@/lib/access";
import { audit } from "@/lib/security";

// "Sign out of all devices": revoke every session for the current user,
// including this one.
export async function DELETE(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  if (!ctx) return json({ error: "Unauthorized" }, 401);
  await db.user.update({ where: { id: ctx.user.id }, data: { sessionVersion: { increment: 1 } } });
  await removeAuthCookie(request);
  await audit({ actorId: ctx.user.id, action: "auth.logout_all", request });
  return json({ success: true });
}
