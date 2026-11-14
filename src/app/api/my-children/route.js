import { db } from "@/lib/db";
import { json } from "@/lib/auth";
import { getAuthContext, studentScope } from "@/lib/access";
import { balanceHistory } from "@/lib/fees";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dhakaDate = (d = new Date()) => new Date(d.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// GET /api/my-children: guardian portal data. Guardian role ONLY.
// Everything is read through studentScope(ctx) → only children linked to
// this guardian via GuardianLink are ever returned. Sensitive identity
// numbers (NID, birth registration) are deliberately not included here.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return json({ error: "Unauthorized" }, 401);
  if (ctx.user.role !== "guardian") return json({ error: "Forbidden" }, 403);

  const now = dhakaDate();
  const today = ymd(now);
  const since = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 120));

  const children = await db.student.findMany({
    where: studentScope(ctx),
    orderBy: { enrollDate: "asc" },
    include: {
      user: { select: { name: true, avatar: true, active: true } },
      club: { select: { id: true, name: true, location: true } },
      guardianLinks: { where: { guardianId: ctx.user.id }, select: { relation: true } },
      attendance: { where: { date: { gte: since } }, orderBy: { date: "desc" }, select: { id: true, date: true, status: true } },
      payments: { orderBy: { date: "desc" }, take: 200, select: { id: true, amount: true, method: true, type: true, month: true, receiptNo: true, date: true } },
    },
  });

  const clubIds = [...new Set(children.map((c) => c.clubId).filter(Boolean))];
  const schedules = clubIds.length
    ? await db.schedule.findMany({ where: { clubId: { in: clubIds } }, include: { instructor: { include: { user: { select: { name: true } } } } } })
    : [];

  const result = children.map((c) => {
    const attendance = c.attendance.map((a) => ({ id: a.id, date: a.date.toISOString().slice(0, 10), status: a.status }));
    const payments = c.payments.map((p) => ({ ...p, date: p.date.toISOString().slice(0, 10) }));
    const thisMonth = today.slice(0, 7);
    const monthRecs = attendance.filter((a) => a.date.startsWith(thisMonth));
    const present = monthRecs.filter((a) => a.status === "present").length;
    const slots = schedules
      .filter((s) => s.clubId === c.clubId && s.program === c.program)
      .map((s) => ({ id: s.id, day: s.day, time: s.time, instructor: s.instructor.user.name }));
    const todayName = DAYS[now.getDay()];
    const todayRec = attendance.find((a) => a.date === today);
    const todayStatus = todayRec ? todayRec.status : slots.some((s) => s.day === todayName) ? "pending" : "no_class";
    const order = (day) => (DAYS.indexOf(day) - now.getDay() + 7) % 7;
    const next = [...slots].sort((a, b) => order(a.day) - order(b.day))[0] || null;

    return {
      id: c.id,
      name: c.user.name,
      avatar: c.user.avatar,
      photo: c.photo,
      active: c.user.active,
      relation: c.guardianLinks[0]?.relation || null,
      program: c.program,
      age: c.age,
      shift: c.shift,
      enrollDate: c.enrollDate,
      club: c.club ? { name: c.club.name, location: c.club.location } : null,
      today: todayStatus,
      month: { present, total: monthRecs.length },
      attendance,
      schedule: slots,
      nextClass: next,
      payments,
      balance: balanceHistory({ enrollDate: c.enrollDate, program: c.program, payments, now }),
    };
  });

  return json({ today, children: result });
}
