import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { json, setAuthCookie, signToken } from "@/lib/auth";
import { getAuthContext, assertSameOrigin } from "@/lib/access";
import { passwordChangeSchema, PASSWORD_HINT } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/security";

// Change own password. Bumps sessionVersion so every OTHER device is signed
// out; this device gets a fresh cookie with the new version.
export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  if (!ctx) return json({ error: "Unauthorized" }, 401);
  if (!rateLimit(`pwchange:${ctx.user.id}`, 10).ok) return json({ error: "Too many attempts. Try again later." }, 429);

  const parsed = passwordChangeSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: `New password: ${PASSWORD_HINT.toLowerCase()}` }, 400);
  const user = await db.user.findUnique({ where: { id: ctx.user.id } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
    return json({ error: "Current password is incorrect" }, 400);
  }
  if (await bcrypt.compare(parsed.data.newPassword, user.password)) {
    return json({ error: "New password must be different from the current one" }, 400);
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(parsed.data.newPassword, 12), sessionVersion: { increment: 1 } },
  });
  await setAuthCookie(await signToken(updated), request);
  await audit({ actorId: user.id, action: "auth.password_change", request });
  return json({ success: true });
}
