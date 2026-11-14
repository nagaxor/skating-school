import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/access";
import { json, signToken, setAuthCookie } from "@/lib/auth";
import { admissionSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { audit, clientIp } from "@/lib/security";
import { createAdmission, parseDob } from "@/lib/admission";

// Public self-service admission (no login). The form's email + password become
// the PARENT's guardian-portal login and the child is linked to it, so the
// admission shows up in the guardian portal right away.
// Roles are hard-coded (student + guardian) and never taken from the body.
// If the email is already registered we refuse: silently linking a child to an
// existing account would let anyone attach children to someone else's login.
export async function POST(request) {
  if (!assertSameOrigin(request)) return json({ error: "Invalid origin" }, 403);

  const limit = rateLimit(`admission:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return json({ error: "Too many admission attempts. Try again later." }, 429, { "Retry-After": String(limit.retryAfter) });

  const parsed = admissionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Please check the form for errors", details: parsed.error.flatten().fieldErrors }, 400);
  const data = parsed.data;

  let clubId = null;
  if (data.clubId) {
    const club = await db.club.findFirst({ where: { id: data.clubId, status: "active" } });
    if (!club) return json({ error: "Please select a valid branch" }, 400);
    clubId = club.id;
  }
  const { dob, error } = parseDob(data.dob);
  if (error) return json({ error }, 400);

  if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    return json({ error: "An account with this email already exists. Sign in to the portal, or ask the school office to add this child to your account." }, 409);
  }

  try {
    const parentName = data.fatherName || data.motherName || `${data.name}'s guardian`;
    const relation = data.fatherName ? "Father" : "Mother";
    const { student, guardianUser } = await createAdmission(data, {
      clubId, dob,
      guardian: { create: { name: parentName, email: data.email, phone: data.mobile, password: data.password, relation } },
    });

    await setAuthCookie(await signToken(guardianUser), request); // parent lands in their portal
    await audit({ actorId: guardianUser.id, action: "admission.submit", target: student.id, meta: { name: data.name, guardian: data.email }, request });
    return json({ success: true }, 201);
  } catch (err) {
    if (err.code === "P2002") return json({ error: "An account with this email already exists. Try signing in instead." }, 409);
    console.error("Admission error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
