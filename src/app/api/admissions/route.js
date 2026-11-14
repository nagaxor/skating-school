import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, assertSameOrigin, requirePermission } from "@/lib/access";
import { staffAdmissionSchema } from "@/lib/validation";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/security";
import { createAdmission, parseDob } from "@/lib/admission";
import { qrPayload } from "@/lib/qr";

// POST: full admission from the dashboard (admin / instructor).
//  • "admissions.create" to admit; an instructor's student always goes to their own branch.
//  • Creating or linking a guardian account grants data access, so it ALSO
//    needs "guardians.manage" (admin). Instructors admit with mode "none".
export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const ctx = await getAuthContext();
  { const denied = requirePermission(ctx, "admissions.create"); if (denied) return denied; }

  const parsed = staffAdmissionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Please check the form for errors", details: parsed.error.flatten().fieldErrors }, 400);
  const data = parsed.data;
  const g = data.guardianAccount;
  if (g.mode !== "none" && !can(ctx.user.role, "guardians.manage")) return json({ error: "Only an administrator can create or link guardian accounts" }, 403);

  // Branch: instructors are pinned to their own; admins may choose any existing branch.
  let clubId = data.clubId || null;
  if (!can(ctx.user.role, "students.move_branch")) {
    clubId = ctx.user.instructor?.clubId || null;
    if (!clubId) return json({ error: "You are not assigned to a branch" }, 400);
  } else if (clubId && !(await db.club.findUnique({ where: { id: clubId }, select: { id: true } }))) {
    return json({ error: "Branch not found" }, 400);
  }
  const { dob, error } = parseDob(data.dob);
  if (error) return json({ error }, 400);

  if (g.mode === "new" && (await db.user.findUnique({ where: { email: g.email }, select: { id: true } }))) {
    return json({ error: "That guardian email is already registered. Choose “Link existing guardian” instead." }, 409);
  }

  try {
    const { student, guardianUser } = await createAdmission(data, {
      clubId, dob,
      guardian: g.mode === "new" ? { create: g } : g.mode === "existing" ? { existingId: g.guardianId, relation: g.relation } : null,
    });
    await audit({ actorId: ctx.user.id, action: "admission.staff", target: student.id, meta: { name: data.name, guardian: guardianUser?.email || null, guardianMode: g.mode }, request });
    return json({
      studentId: student.id,
      qr: qrPayload(student.qrToken),
      guardian: guardianUser ? { id: guardianUser.id, name: guardianUser.name, email: guardianUser.email, created: g.mode === "new" } : null,
    }, 201);
  } catch (err) {
    if (err.code === "GUARDIAN_NOT_FOUND") return json({ error: "Guardian not found" }, 404);
    if (err.code === "P2002") return json({ error: "That email is already registered" }, 409);
    console.error("Staff admission", err);
    return json({ error: "Admission failed. Please try again." }, 500);
  }
}
