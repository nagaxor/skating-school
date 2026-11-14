import JoinContent from "@/components/site/JoinContent";
import JsonLd from "@/components/JsonLd";
import { pageMeta, breadcrumbLd, abs } from "@/lib/seo";
import { STEPS } from "@/lib/site-content";

export const metadata = pageMeta({
  title: "How to Join",
  description: "Join Online Skating School in three steps: apply online in five minutes, pick a branch and shift, start skating. See what details to have ready.",
  path: "/how-to-join",
});

const howTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to join Online Skating School",
  totalTime: "PT5M",
  step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text, url: abs("/how-to-join") })),
};

export default function HowToJoinPage() {
  return (
    <>
      <JsonLd data={[howTo, breadcrumbLd([{ name: "How to join", path: "/how-to-join" }])]} />
      <JoinContent />
    </>
  );
}
