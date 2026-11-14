import { SITE_URL } from "@/lib/seo";

// /robots.txt: public marketing pages are crawlable; private app areas are not.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/login"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
