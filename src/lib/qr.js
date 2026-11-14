import crypto from "node:crypto";
import { db } from "@/lib/db";

// Student attendance QR codes.
// The QR encodes "OSS1:<token>": a random, unguessable secret stored on the
// student row. It is NOT the student id, so cards can't be forged by guessing,
// and rotating the token instantly cancels a lost card.
export const QR_PREFIX = "OSS1:";
const TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

export const newToken = () => crypto.randomBytes(18).toString("base64url"); // 24 chars, 144 bits

export const qrPayload = (token) => `${QR_PREFIX}${token}`;

// Accepts the raw scanned text; returns the token or null for anything that isn't ours.
export function parseQr(text) {
  const t = String(text || "").trim();
  if (!t.startsWith(QR_PREFIX)) return null;
  const token = t.slice(QR_PREFIX.length);
  return TOKEN_RE.test(token) ? token : null;
}

// Give every listed student a token (only those missing one).
export async function ensureTokens(students) {
  const missing = students.filter((s) => !s.qrToken);
  for (const s of missing) {
    for (let i = 0; i < 3; i++) {
      try {
        const token = newToken();
        await db.student.update({ where: { id: s.id }, data: { qrToken: token, qrIssuedAt: new Date() } });
        s.qrToken = token;
        break;
      } catch (err) {
        if (err.code !== "P2002") throw err; // collision is astronomically unlikely; retry anyway
      }
    }
  }
  return students;
}

// Today's date in Bangladesh, as a UTC-midnight Date (how attendance dates are stored).
export function todayDhaka(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  return { ymd, date: new Date(Date.UTC(y, m - 1, d)) };
}
