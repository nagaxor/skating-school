import ProgramsContent from "@/components/site/ProgramsContent";
import JsonLd from "@/components/JsonLd";
import { pageMeta, coursesLd, breadcrumbLd } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Skating Programs & Fees",
  description: "Roller skating courses in Dhaka: Beginner (ages 3+, ৳2,000/month), Intermediate (6+, ৳2,500) and Advanced (8+, ৳3,000). 4-month structured courses with safety training.",
  path: "/programs",
});

export default function ProgramsPage() {
  return (
    <>
      <JsonLd data={[coursesLd(), breadcrumbLd([{ name: "Programs", path: "/programs" }])]} />
      <ProgramsContent />
    </>
  );
}
