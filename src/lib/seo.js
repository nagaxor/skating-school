// SEO helpers: site URL, per-page metadata and schema.org JSON-LD.
// Production MUST set NEXT_PUBLIC_APP_URL to the real https origin, or
// canonical URLs, the sitemap and social cards will point at localhost.
import { CONTACT, PROGRAMS, FAQ } from "@/lib/site-content";

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = "Online Skating School";
export const SITE_TAGLINE = "Roller skating classes in Dhaka for ages 3+";
export const SITE_DESCRIPTION =
  "Roller skating classes in Dhaka for ages 3+ at Uttara, Bashundhara, Aftab Nagar and Gulshan. Beginner to Advanced courses with a parent portal.";
export const KEYWORDS = [
  "roller skating Dhaka", "skating school Bangladesh", "skating classes for kids", "inline skating Dhaka",
  "skating Uttara", "skating Bashundhara", "skating Aftab Nagar", "skating Gulshan",
  "rollball training", "speed skating Bangladesh", "Online Skating School",
];
// Until the official logo is added as /logo.png, the generated app icon stands in.
export const LOGO_PATH = "/icon-512.png";

export const abs = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Per-page metadata with canonical URL + matching Open Graph / Twitter fields.
// Page-level openGraph REPLACES the root one (Next.js doesn't deep-merge), so
// the share image must be repeated here or sub-pages lose their preview.
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: ${SITE_TAGLINE}` };

export function pageMeta({ title, description, path }) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, type: "website", siteName: SITE_NAME, locale: "en_US", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [OG_IMAGE.url] },
  };
}

// ── JSON-LD builders ────────────────────────────────────────────────────
export function organizationLd(branches = []) {
  return {
    "@context": "https://schema.org",
    "@type": ["SportsOrganization", "EducationalOrganization"],
    "@id": abs("/#organization"),
    name: SITE_NAME,
    alternateName: "Bangladesh Online Skating School",
    url: abs("/"),
    logo: abs(LOGO_PATH),
    description: SITE_DESCRIPTION,
    sport: "Roller skating",
    foundingDate: "2020",
    telephone: CONTACT.phone.replace(/\s+/g, ""),
    email: CONTACT.email,
    address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
    areaServed: { "@type": "City", name: "Dhaka" },
    ...(branches.length ? { location: branches.map(branchLd) } : {}),
  };
}

export function branchLd(b) {
  return {
    "@type": "SportsActivityLocation",
    name: `${SITE_NAME} – ${b.name}`,
    address: { "@type": "PostalAddress", streetAddress: b.location, addressLocality: "Dhaka", addressCountry: "BD" },
    telephone: CONTACT.phone.replace(/\s+/g, ""),
    parentOrganization: { "@id": abs("/#organization") },
  };
}

export function coursesLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Roller skating programs",
    itemListElement: PROGRAMS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: `${p.title} roller skating course`,
        description: p.desc,
        provider: { "@id": abs("/#organization"), "@type": "Organization", name: SITE_NAME, url: abs("/") },
        educationalLevel: p.title,
        timeRequired: "P4M",
        offers: { "@type": "Offer", price: p.fee.replace(/,/g, ""), priceCurrency: "BDT", category: "Monthly fee", availability: "https://schema.org/InStock", url: abs("/admission") },
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "onsite", location: "Dhaka, Bangladesh" },
      },
    })),
  };
}

export function faqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}
