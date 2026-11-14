import { db } from "@/lib/db";
import BranchesContent from "@/components/site/BranchesContent";

export const metadata = {
  title: "Branches",
  description: "Online Skating School branches in Uttara, Bashundhara, Aftab Nagar and Gulshan, Dhaka.",
};

// Rendered per request from the live branch list (no DB access at build time).
export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  let branches = [];
  try {
    // Public data only: active branches, name + location.
    branches = await db.club.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true, location: true } });
  } catch (err) {
    console.error("Branches page: DB unavailable", err);
  }
  return <BranchesContent branches={branches} />;
}
