import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, assertSameOrigin, requirePermission, studentScope } from "@/lib/access";
import { audit } from "@/lib/security";
import { ensureTokens, newToken, qrPayload } from "@/lib/qr";
import { idSchema } from "@/lib/validation";

// GET  ?id=<studentId>  → one card;  GET ?club=<id>|all → cards for printing.
// Visible to anyone who may read that student (same scope: guardians get their
// own children's cards, instructors their branch). Tokens are created lazily.
export async function GET(request) {
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "students.read"); if (denied) return denied; }
  const sp = new URL(request.url).searchParams;
  const id = sp.get("id");
  const club = sp.get("club");

  const where = { ...studentScope(ctx) };
  if (id) {
    if (!idSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);
    where.id = id;
  } else if (club && club !== "all") {
    where.clubId = club; // only narrows the scope
  }
  const rows = await db.student.findMany({
    where,
    orderBy: { user: { name: "asc" } },
    take: id ? 1 : 500,
    select: { id: true, qrToken: true, qrIssuedAt: true, program: true, photo: true, user: { select: { name: true, avatar: true, active: true } }, club: { select: { name: true } } },
  });
  if (id && rows.length === 0) return json({ error: "Not found" }, 404);
  await ensureTokens(rows);

  const cards = rows.map((s) => ({
    id: s.id, name: s.user.name, avatar: s.user.avatar, photo: id ? s.photo : undefined, program: s.program,
    club: s.club?.name || "", active: s.user.active, payload: qrPayload(s.qrToken), issuedAt: s.qrIssuedAt,
  }));
  return json(id ? cards[0] : cards);
}

// POST ?id=<studentId>: re-issue (rotate) the card. The old QR stops working at once.
export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "students.qr_rotate"); if (denied) return denied; }
  const id = new URL(request.url).searchParams.get("id");
  if (!idSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);
  const student = await db.student.findFirst({ where: { id, ...studentScope(ctx) }, select: { id: true, user: { select: { name: true } } } });
  if (!student) return json({ error: "Not found" }, 404);
  const token = newToken();
  await db.student.update({ where: { id }, data: { qrToken: token, qrIssuedAt: new Date() } });
  await audit({ actorId: ctx.user.id, action: "student.qr_rotate", target: id, meta: { name: student.user.name }, request });
  return json({ payload: qrPayload(token) });
}
