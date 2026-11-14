import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, requirePermission } from "@/lib/access";
import { json } from "@/lib/auth";
import { clubCreateSchema, clubUpdateSchema, idSchema } from "@/lib/validation";
import { audit } from "@/lib/security";
import { can } from "@/lib/rbac";

export async function GET(request) {
  const ctx = await getAuthContext();

  // Public, unauthenticated callers (e.g. the admission form) get a minimal,
  // active-branches-only list — no counts, no inactive branches, ever.
  if (!ctx) {
    const clubs = await db.club.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, location: true },
    });
    return json(clubs);
  }

  const showAll = new URL(request.url).searchParams.get("all") === "1";
  const includeInactive = showAll && can(ctx.user.role, "branches.manage");

  const clubs = await db.club.findMany({
    where: includeInactive ? {} : { status: "active" },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, location: true, status: true,
      _count: { select: { students: true, instructors: true } },
    },
  });

  return json(
    clubs.map((c) => ({
      id: c.id, name: c.name, location: c.location, status: c.status,
      studentCount: c._count.students, instructorCount: c._count.instructors,
    }))
  );
}

export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "branches.manage"); if (denied) return denied; }

  const parsed = clubCreateSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid branch data", details: parsed.error.flatten().fieldErrors }, 400);

  try {
    const club = await db.club.create({ data: parsed.data });
    await audit({ actorId: ctx.user.id, action: "branch.create", target: club.id, meta: { name: club.name }, request });
    return json({ id: club.id }, 201);
  } catch (err) {
    if (err.code === "P2002") return json({ error: "A branch with this name already exists" }, 409);
    console.error("Create club", err);
    return json({ error: "Failed to create branch" }, 500);
  }
}

export async function PATCH(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "branches.manage"); if (denied) return denied; }

  const parsed = clubUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid branch data", details: parsed.error.flatten().fieldErrors }, 400);
  const { id, ...data } = parsed.data;
  if (Object.keys(data).length === 0) return json({ error: "Nothing to update" }, 400);

  const existing = await db.club.findUnique({ where: { id } });
  if (!existing) return json({ error: "Branch not found" }, 404);

  try {
    // Notices target a branch by NAME, so a rename must carry them along or
    // that branch's students would silently stop seeing its notices.
    await db.$transaction([
      db.club.update({ where: { id }, data }),
      ...(data.name && data.name !== existing.name
        ? [db.notice.updateMany({ where: { audience: existing.name }, data: { audience: data.name } })]
        : []),
    ]);
    await audit({ actorId: ctx.user.id, action: "branch.update", target: id, meta: { name: existing.name, changes: data }, request });
    return json({ success: true });
  } catch (err) {
    if (err.code === "P2002") return json({ error: "A branch with this name already exists" }, 409);
    console.error("Update club", err);
    return json({ error: "Failed to update branch" }, 500);
  }
}

export async function DELETE(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "branches.manage"); if (denied) return denied; }

  const id = new URL(request.url).searchParams.get("id");
  if (!idSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);

  try {
    const club = await db.club.findUnique({
      where: { id },
      select: { id: true, _count: { select: { students: true, instructors: true, schedules: true } } },
    });
    if (!club) return json({ error: "Branch not found" }, 404);
    if (club._count.students > 0 || club._count.instructors > 0) {
      return json({ error: "Reassign students and instructors before deleting this branch" }, 409);
    }
    if (club._count.schedules > 0) {
      return json({ error: "This branch still has schedule slots. Remove them before deleting the branch." }, 409);
    }

    await db.club.delete({ where: { id } });
    await audit({ actorId: ctx.user.id, action: "branch.delete", target: id, request });
    return json({ success: true });
  } catch (err) {
    if (err.code === "P2003" || /foreign key|violates.*constraint/i.test(err?.message || "")) {
      return json({ error: "This branch still has related records elsewhere and can't be deleted." }, 409);
    }
    console.error("Delete club", err);
    return json({ error: "Failed to delete branch" }, 500);
  }
}
