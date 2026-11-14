import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, assertSameOrigin, requirePermission, studentScope } from "@/lib/access";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/security";
import { parseQr, todayDhaka } from "@/lib/qr";

// POST { code }: scan a student's QR card → mark PRESENT for today.
// The date always comes from the server (Asia/Dhaka), never from the client.
// Scope: an instructor can only scan students of their own branch; anything
// else answers "not recognised" (no hint whether the card exists elsewhere).
export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "attendance.scan"); if (denied) return denied; }
  if (!rateLimit(`scan:${ctx.user.id}`, 240, 60 * 1000).ok) return json({ error: "Too many scans. Wait a moment." }, 429);

  let body = {};
  try { body = await request.json(); } catch {}
  const token = parseQr(body?.code);
  if (!token) return json({ error: "Not a school QR code" }, 400);

  const student = await db.student.findFirst({
    where: { qrToken: token, ...studentScope(ctx) },
    select: { id: true, program: true, photo: true, user: { select: { name: true, avatar: true, active: true } }, club: { select: { name: true } } },
  });
  if (!student) return json({ error: "Card not recognised for your branch" }, 404);
  if (!student.user.active) return json({ error: `${student.user.name}'s account is inactive` }, 409);

  const { ymd, date } = todayDhaka();
  const existing = await db.attendance.findUnique({ where: { date_studentId: { date, studentId: student.id } }, select: { status: true, source: true, scannedAt: true } });
  const now = new Date();
  await db.attendance.upsert({
    where: { date_studentId: { date, studentId: student.id } },
    update: { status: "present", source: "qr", scannedAt: existing?.scannedAt ?? now, markedById: ctx.user.id },
    create: { date, studentId: student.id, status: "present", source: "qr", scannedAt: now, markedById: ctx.user.id },
  });
  const already = existing?.status === "present";
  if (!already) await audit({ actorId: ctx.user.id, action: "attendance.scan", target: student.id, meta: { name: student.user.name, date: ymd }, request });

  return json({
    already,
    date: ymd,
    time: (existing?.scannedAt ?? now).toISOString(),
    student: { id: student.id, name: student.user.name, avatar: student.user.avatar, photo: student.photo, program: student.program, club: student.club?.name || "" },
  });
}
