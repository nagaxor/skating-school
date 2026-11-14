import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, studentScope, requirePermission } from "@/lib/access";
import { json } from "@/lib/auth";
import { studentCreateSchema, studentUpdateSchema, idSchema } from "@/lib/validation";
import { audit, initialsOf } from "@/lib/security";
import { can } from "@/lib/rbac";
import bcrypt from "bcryptjs";

export async function GET(request) {
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "students.read"); if (denied) return denied; }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Single-student full detail (includes photo, addresses, guardian NID,
  // etc.) — permission-checked per record, not exposed in the bulk list.
  if (id) {
    // Scoped lookup: a record outside the caller's scope is indistinguishable
    // from one that doesn't exist (404), so ids can't be probed.
    const s = await db.student.findFirst({
      where: { id: String(id), ...studentScope(ctx) },
      include: { user: { select: { name: true, email: true, phone: true, avatar: true, active: true } }, club: { select: { id: true, name: true } } },
    });
    if (!s) return json({ error: "Not found" }, 404);
    // NIDs / birth registration: admins, the student themself, and their linked guardians.
    // Identity numbers: role must hold students.view_ids; scope already limits which records.
    const sensitive = can(ctx.user.role, "students.view_ids");
    return json({
      id: s.id, userId: s.userId, name: s.user.name, email: s.user.email, phone: s.user.phone, avatar: s.user.avatar,
      age: s.age, guardian: s.guardian, program: s.program, club: s.club?.name || "", clubId: s.clubId,
      enrollDate: s.enrollDate, status: s.user.active ? "active" : "inactive",
      presentAddress: s.presentAddress, permanentAddress: s.permanentAddress,
      fatherName: s.fatherName, fatherOccupation: s.fatherOccupation, fatherOccupationType: s.fatherOccupationType, fatherMobile: s.fatherMobile,
      motherName: s.motherName, motherOccupation: s.motherOccupation, motherOccupationType: s.motherOccupationType, motherMobile: s.motherMobile,
      dob: s.dob, bloodGroup: s.bloodGroup, presentSchool: s.presentSchool, religion: s.religion, gender: s.gender,
      session: s.session, shift: s.shift, photo: s.photo,
      ...(sensitive ? { fatherNid: s.fatherNid, motherNid: s.motherNid, birthReg: s.birthReg } : {}),
    });
  }

  const requestedClub = searchParams.get("club");
  const search = searchParams.get("search")?.trim().toLowerCase();
  const where = { ...studentScope(ctx) };
  if (requestedClub && can(ctx.user.role, "students.move_branch")) where.clubId = requestedClub;
  const students = await db.student.findMany({
    where, include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, active: true } }, club: { select: { id: true, name: true } } },
    orderBy: { enrollDate: "desc" },
  });
  const result = students.map((s) => ({ id:s.id,userId:s.userId,name:s.user.name,email:s.user.email,phone:s.user.phone,avatar:s.user.avatar,age:s.age,guardian:s.guardian,program:s.program,club:s.club?.name||"",clubId:s.clubId,enrollDate:s.enrollDate,status:s.user.active?"active":"inactive" }));
  return json(search ? result.filter(s => s.name.toLowerCase().includes(search) || (s.guardian||"").toLowerCase().includes(search)) : result);
}

export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "students.create"); if (denied) return denied; }
  const parsed = studentCreateSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid student data", details: parsed.error.flatten().fieldErrors }, 400);
  const data = parsed.data;
  let clubId = data.clubId || null;
  if (ctx.user.role === "instructor") {
    clubId = ctx.user.instructor?.clubId || null;
    if (!clubId) return json({ error: "Instructor is not assigned to a club" }, 400);
  }
  if (clubId && !(await db.club.findUnique({ where: { id: clubId } }))) return json({ error: "Club not found" }, 400);
  try {
    const hash = await bcrypt.hash(data.password, 12);
    const user = await db.user.create({ data: { email:data.email,password:hash,name:data.name,phone:data.phone||null,role:"student",avatar:initialsOf(data.name) } });
    const student = await db.student.create({ data: { userId:user.id, age:data.age ?? null, guardian:data.guardian, program:data.program || "Beginner", clubId } });
    await audit({ actorId: ctx.user.id, action: "student.create", target: student.id, meta: { name: data.name }, request });
    return json({ id: student.id, userId: user.id }, 201);
  } catch (err) {
    if (err.code === "P2002") return json({ error: "Email already exists" }, 409);
    console.error("Create student", err); return json({ error: "Failed to create student" }, 500);
  }
}

export async function DELETE(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "students.delete"); if (denied) return denied; }
  const id = new URL(request.url).searchParams.get("id");
  if (!idSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);
  const student = await db.student.findUnique({ where: { id } });
  if (!student) return json({ error: "Not found" }, 404);
  const user = await db.user.findUnique({ where: { id: student.userId }, select: { name: true, email: true } });
  await db.user.delete({ where: { id: student.userId } });
  await audit({ actorId: ctx.user.id, action: "student.delete", target: id, meta: user, request });
  return json({ success: true });
}

// Edit a student's core details. Admins can edit anyone and move branches;
// instructors can edit students in their own branch but not move them.
export async function PATCH(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "students.update"); if (denied) return denied; }
  const parsed = studentUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "Invalid student data", details: parsed.error.flatten().fieldErrors }, 400);
  const { id, name, phone, age, guardian, program, clubId } = parsed.data;

  const student = await db.student.findUnique({ where: { id } });
  if (!student) return json({ error: "Not found" }, 404);
  if (ctx.user.role === "instructor") {
    if (student.clubId !== ctx.user.instructor?.clubId) return json({ error: "Forbidden" }, 403);
    if (clubId !== undefined && clubId !== student.clubId && !can(ctx.user.role, "students.move_branch")) return json({ error: "Only an administrator can move a student to another branch" }, 403);
  }
  if (clubId && !(await db.club.findUnique({ where: { id: clubId } }))) return json({ error: "Club not found" }, 400);

  try {
    await db.$transaction(async (tx) => {
      if (name !== undefined || phone !== undefined) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(name !== undefined ? { name, avatar: initialsOf(name) } : {}),
            ...(phone !== undefined ? { phone: phone || null } : {}),
          },
        });
      }
      await tx.student.update({
        where: { id },
        data: {
          ...(age !== undefined ? { age } : {}),
          ...(guardian !== undefined ? { guardian } : {}),
          ...(program !== undefined ? { program } : {}),
          ...(clubId !== undefined && can(ctx.user.role, "students.move_branch") ? { clubId } : {}),
        },
      });
    });
    await audit({ actorId: ctx.user.id, action: "student.update", target: id, meta: { fields: Object.keys(parsed.data).filter((k) => k !== "id") }, request });
    return json({ success: true });
  } catch (err) {
    console.error("Update student", err);
    return json({ error: "Failed to update student" }, 500);
  }
}
