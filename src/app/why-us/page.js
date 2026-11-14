import WhyContent from "@/components/site/WhyContent";
import JsonLd from "@/components/JsonLd";
import { pageMeta, breadcrumbLd } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Why Choose Us",
  description: "Safety-first roller skating coaching, a rollball and speed-skating competition pathway, and a guardian portal for parents. Online Skating School, Dhaka.",
  path: "/why-us",
});

export default function WhyUsPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Why us", path: "/why-us" }])} />
      <WhyContent />
    </>
  );
}
