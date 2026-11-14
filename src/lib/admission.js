import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { initialsOf } from "@/lib/security";
import { newToken } from "@/lib/qr";

// Shared by the public admission form and the staff "New admission" page.
// Children don't sign in themselves: the student User gets a placeholder,
// non-deliverable email and a random password nobody knows. Parents use the
// GUARDIAN account, which is linked to the child in the same transaction.

export function ageFromDob(dob) {
  if (!dob) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  if (today.getUTCMonth() < dob.getUTCMonth() || (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function parseDob(dob) {
  if (!dob) return { dob: null };
  const d = new Date(Date.UTC(Number(dob.year), Number(dob.month) - 1, Number(dob.day)));
  if (d.getUTCDate() !== Number(dob.day)) return { error: "That date of birth doesn't exist" };
  if (d > new Date()) return { error: "Date of birth can't be in the future" };
  return { dob: d };
}

const placeholderEmail = () => `student.${crypto.randomBytes(9).toString("hex")}@no-login.invalid`;

// Creates the student (+ optional guardian/link). `guardian`:
//   null | { create: { name, email, phone, password, relation } } | { existingId, relation }
export async function createAdmission(data, { clubId, dob, guardian }) {
  const studentPassword = await bcrypt.hash(crypto.randomBytes(24).toString("base64url"), 12);
  const guardianHash = guardian?.create ? await bcrypt.hash(guardian.create.password, 12) : null;

  return db.$transaction(async (tx) => {
    const studentUser = await tx.user.create({
      data: { email: placeholderEmail(), password: studentPassword, name: data.name, phone: data.mobile, role: "student", avatar: initialsOf(data.name) },
    });
    const student = await tx.student.create({
      data: {
        userId: studentUser.id, clubId,
        program: data.program || "Beginner",
        guardian: data.fatherName || data.motherName,
        age: ageFromDob(dob),
        presentAddress: data.presentAddress,
        permanentAddress: data.sameAsPresent ? data.presentAddress : data.permanentAddress,
        fatherName: data.fatherName, fatherNid: data.fatherNid || null, fatherOccupation: data.fatherOccupation || null,
        fatherOccupationType: data.fatherOccupationType || null, fatherMobile: data.fatherMobile || null,
        motherName: data.motherName, motherNid: data.motherNid || null, motherOccupation: data.motherOccupation || null,
        motherOccupationType: data.motherOccupationType || null, motherMobile: data.motherMobile || null,
        dob, birthReg: data.birthReg || null, bloodGroup: data.bloodGroup || null, presentSchool: data.presentSchool || null,
        religion: data.religion || null, gender: data.gender, shift: data.shift,
        session: String(new Date().getFullYear()),
        photo: data.photo || null,
        qrToken: newToken(), qrIssuedAt: new Date(),
      },
    });

    let guardianUser = null;
    if (guardian?.create) {
      const g = guardian.create;
      guardianUser = await tx.user.create({
        data: { email: g.email, password: guardianHash, name: g.name, phone: g.phone || null, role: "guardian", avatar: initialsOf(g.name) },
      });
    } else if (guardian?.existingId) {
      guardianUser = await tx.user.findFirst({ where: { id: guardian.existingId, role: "guardian" } });
      if (!guardianUser) throw Object.assign(new Error("Guardian not found"), { code: "GUARDIAN_NOT_FOUND" });
    }
    if (guardianUser) {
      await tx.guardianLink.create({ data: { guardianId: guardianUser.id, studentId: student.id, relation: guardian.create?.relation || guardian.relation || "Guardian" } });
    }
    return { student, studentUser, guardianUser };
  });
}
