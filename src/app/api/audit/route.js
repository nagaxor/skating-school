import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext } from "@/lib/access";

// GET /api/audit?cursor=<id>&action=<prefix>: admin-only activity log, newest first.
export async function GET(request) {
  const ctx = await getAuthContext();
  if (!ctx) return json({ error: "Unauthorized" }, 401);
  if (ctx.user.role !== "admin") return json({ error: "Forbidden" }, 403);

  const sp = new URL(request.url).searchParams;
  const cursor = sp.get("cursor");
  const action = sp.get("action")?.trim();
  const take = 50;

  const rows = await db.auditLog.findMany({
    where: action && /^[a-z_.]{1,40}$/.test(action) ? { action: { startsWith: action } } : {},
    include: { actor: { select: { name: true, role: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const items = rows.slice(0, take).map((r) => ({
    id: r.id,
    action: r.action,
    target: r.target,
    meta: r.meta,
    ip: r.ip,
    at: r.createdAt.toISOString(),
    actor: r.actor ? { name: r.actor.name, role: r.actor.role } : null,
  }));
  return json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
}
