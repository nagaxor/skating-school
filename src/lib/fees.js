// Fee rules shared by the guardian portal (server) and UI.
// Monthly fee by program: keep in sync with the public landing page.
export const PROGRAM_FEES = { Beginner: 2000, Intermediate: 2500, Advanced: 3000 };

export const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

// Month-by-month balance from enrolment (max 12 months back) to the current
// month. A month is "paid" when a monthly_fee payment carries that month's
// label (that's how the Fees page records them, e.g. "November 2026").
export function balanceHistory({ enrollDate, program, payments, now = new Date(), maxMonths = 12 }) {
  const fee = PROGRAM_FEES[program] ?? PROGRAM_FEES.Beginner;
  const start = new Date(enrollDate);
  const months = [];
  for (let i = 0; i < maxMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    if (d < new Date(start.getFullYear(), start.getMonth(), 1)) break;
    months.push(d);
  }
  const monthly = payments.filter((p) => p.type === "monthly_fee");
  const rows = months.map((d) => {
    const label = monthLabel(d);
    const paid = monthly.filter((p) => p.month === label);
    const amountPaid = paid.reduce((s, p) => s + p.amount, 0);
    return {
      month: label,
      due: fee,
      paid: amountPaid,
      status: amountPaid >= fee ? "paid" : amountPaid > 0 ? "partial" : "due",
      receipts: paid.map((p) => ({ id: p.id, receiptNo: p.receiptNo, amount: p.amount, date: p.date })),
    };
  });
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.due - r.paid), 0);
  return { fee, rows, outstanding, dueMonths: rows.filter((r) => r.status !== "paid").length };
}
