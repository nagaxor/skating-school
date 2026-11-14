import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/access";
import { AuthProvider } from "@/lib/auth-context";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }) {
  // Same checks as the API: valid JWT, active user, matching role and
  // session version (so revoked sessions can't even render the shell).
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: ctx.user.id },
    select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, lastLoginAt: true },
  });
  if (!user) redirect("/login");

  const clubId = ctx.user.instructor?.clubId || ctx.user.student?.clubId || null;
  const club = clubId ? await db.club.findUnique({ where: { id: clubId }, select: { id: true, name: true } }) : null;

  const serializedUser = {
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    club: club?.name || "All Clubs",
    clubId: club?.id || null,
  };

  return (
    <AuthProvider initialUser={serializedUser}>
      <DashboardShell user={serializedUser}>{children}</DashboardShell>
    </AuthProvider>
  );
}
