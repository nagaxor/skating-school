import { db } from "@/lib/db";
import HomeContent from "@/components/site/HomeContent";
import JsonLd from "@/components/JsonLd";
import { organizationLd, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata = {
  title: { absolute: `${SITE_NAME} | ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

// Branches feed the Organization schema; rendered per request (no DB at build time).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let branches = [];
  try {
    branches = await db.club.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { name: true, location: true } });
  } catch (err) {
    console.error("Home: branches unavailable for schema", err);
  }
  return (
    <>
      <JsonLd data={[organizationLd(branches), { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" }]} />
      <HomeContent />
    </>
  );
}
