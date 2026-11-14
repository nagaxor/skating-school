import { abs } from "@/lib/seo";

// /sitemap.xml: only public, indexable pages.
export default function sitemap() {
  const now = new Date();
  return [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/programs", priority: 0.9, changeFrequency: "monthly" },
    { path: "/admission", priority: 0.9, changeFrequency: "monthly" },
    { path: "/how-to-join", priority: 0.8, changeFrequency: "monthly" },
    { path: "/branches", priority: 0.8, changeFrequency: "weekly" },
    { path: "/why-us", priority: 0.7, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  ].map((p) => ({ url: abs(p.path), lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority }));
}
