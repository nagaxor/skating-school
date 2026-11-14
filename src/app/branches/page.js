import { db } from "@/lib/db";
import BranchesContent from "@/components/site/BranchesContent";
import JsonLd from "@/components/JsonLd";
import { pageMeta, branchLd, breadcrumbLd } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Branches in Dhaka",
  description: "Roller skating classes at Uttara, Bashundhara, Aftab Nagar and Gulshan in Dhaka. Find the Online Skating School branch closest to home.",
  path: "/branches",
});

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
  return (
    <>
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "ItemList", name: "Online Skating School branches", itemListElement: branches.map((b, i) => ({ "@type": "ListItem", position: i + 1, item: branchLd(b) })) },
        breadcrumbLd([{ name: "Branches", path: "/branches" }]),
      ]} />
      <BranchesContent branches={branches} />
    </>
  );
}
