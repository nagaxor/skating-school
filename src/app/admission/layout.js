import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Online Admission Form",
  description: "Apply for roller skating classes at Online Skating School, Dhaka. The online admission form takes about five minutes.",
  path: "/admission",
});

export default function AdmissionLayout({ children }) {
  return children;
}
