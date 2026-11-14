import FaqContent from "@/components/site/FaqContent";
import JsonLd from "@/components/JsonLd";
import { pageMeta, faqLd, breadcrumbLd } from "@/lib/seo";

export const metadata = pageMeta({
  title: "FAQ for Parents",
  description: "Answers about starting age, course length, skating equipment, fee payment (bKash, Nagad, cash) and the guardian portal at Online Skating School, Dhaka.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={[faqLd(), breadcrumbLd([{ name: "FAQ", path: "/faq" }])]} />
      <FaqContent />
    </>
  );
}
