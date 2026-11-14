import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, assertSameOrigin, requirePermission } from "@/lib/access";
import { guardianCreateSchema, guardianLinkSchema, idSchema } from "@/lib/validation";
import { audit, initialsOf } from "@/lib/security";

// Guardian (parent) accounts. ADMIN ONLY: linking a parent to a child is
// what grants access to that child's data, so only administrators may do it.

async function requireAdmin(request, mutating) {
  if (mutating && !assertSameOrigin(request)) return { res: json({ error: "Invalid origin" }, 403) };
  const ctx = await getAuthContext();
  const denied = requirePermission(ctx, "guardians.manage");
  if (denied) return { res: denied };
  return { ctx };
}

export async function GET(request) {
  const { res } = await requireAdmin(request, false);
  if (res) return res;
  const guardians = await db.user.findMany({
    where: { role: "guardian" },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, phone: true, avatar: true, active: true, lastLoginAt: true,
      guardianLinks: {
        orderBy: { createdAt: "asc" },
        select: { relation: true, student: { select: { id: true, program: true, user: { select: { name: true, avatar: true } }, club: { select: { name: true } } } } },
      },
    },
  });
  return json(guardians.map((g) => ({
    userId: g.id, name: g.name, email: g.email, phone: g.phone, avatar: g.avatar,
    status: g.active ? "active" : "inactive", lastLoginAt: g.lastLoginAt,
    children: g.guardianLinks.map((l) => ({ id: l.student.id, name: l.student.user.name, avatar: l.student.user.avatar, program: l.student.program, club: l.student.club?.name || "", relation: l.relation })),
  })));
}

export async function POST(request) {
  const { ctx, res } = await requireAdmin(request, true);
  if (res) return res;
  const parsed = guardianCreateSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid guardian data", details: parsed.error.flatten().fieldErrors }, 400);
  const d = parsed.data;
  const ids = [...new Set(d.children.map((c) => c.studentId))];
  if (ids.length && (await db.student.count({ where: { id: { in: ids } } })) !== ids.length) return json({ error: "One or more students were not found" }, 400);

  try {
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: d.email, password: await bcrypt.hash(d.password, 12), name: d.name, phone: d.phone || null, role: "guardian", avatar: initialsOf(d.name) },
      });
      if (d.children.length) {
        await tx.guardianLink.createMany({ data: d.children.map((c) => ({ guardianId: u.id, studentId: c.studentId, relation: c.relation })), skipDuplicates: true });
      }
      return u;
    });
    await audit({ actorId: ctx.user.id, action: "guardian.create", target: user.id, meta: { name: d.name, children: ids.length }, request });
    return json({ userId: user.id }, 201);
  } catch (err) {
    if (err.code === "P2002") return json({ error: "An account with this email already exists" }, 409);
    console.error("Create guardian", err);
    return json({ error: "Failed to create guardian" }, 500);
  }
}

// PATCH { guardianId, link: { studentId, relation } } | { guardianId, unlink: studentId }
export async function PATCH(request) {
  const { ctx, res } = await requireAdmin(request, true);
  if (res) return res;
  const parsed = guardianLinkSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { guardianId, link, unlink } = parsed.data;

  const guardian = await db.user.findFirst({ where: { id: guardianId, role: "guardian" }, select: { id: true, name: true } });
  if (!guardian) return json({ error: "Guardian not found" }, 404);

  if (link) {
    const student = await db.student.findUnique({ where: { id: link.studentId }, select: { id: true, user: { select: { name: true } } } });
    if (!student) return json({ error: "Student not found" }, 404);
    await db.guardianLink.upsert({
      where: { guardianId_studentId: { guardianId, studentId: link.studentId } },
      update: { relation: link.relation },
      create: { guardianId, studentId: link.studentId, relation: link.relation },
    });
    await audit({ actorId: ctx.user.id, action: "guardian.link", target: guardianId, meta: { name: guardian.name, student: student.user.name, relation: link.relation }, request });
  } else {
    const removed = await db.guardianLink.deleteMany({ where: { guardianId, studentId: unlink } });
    if (!removed.count) return json({ error: "That child isn't linked to this guardian" }, 404);
    await audit({ actorId: ctx.user.id, action: "guardian.unlink", target: guardianId, meta: { name: guardian.name, studentId: unlink }, request });
  }
  return json({ success: true });
}

export async function DELETE(request) {
  const { ctx, res } = await requireAdmin(request, true);
  if (res) return res;
  const id = new URL(request.url).searchParams.get("userId");
  if (!idSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);
  const guardian = await db.user.findFirst({ where: { id, role: "guardian" }, select: { id: true, name: true } });
  if (!guardian) return json({ error: "Guardian not found" }, 404);
  await db.user.delete({ where: { id } }); // links cascade; children are untouched
  await audit({ actorId: ctx.user.id, action: "guardian.delete", target: id, meta: { name: guardian.name }, request });
  return json({ success: true });
}
