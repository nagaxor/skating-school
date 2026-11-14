"use client";

import Link from "next/link";
import { Icon } from "@/components/Icons";
import { RinkLines } from "@/components/Brand";
import SiteShell, { Section, SectionHead, CtaBand, dark } from "@/components/SiteShell";
import PortalPreview from "@/components/site/PortalPreview";
import { STATS, STEPS } from "@/lib/site-content";

const EXPLORE = [
  { href: "/programs", icon: Icon.Award, title: "Programs", text: "Beginner, Intermediate and Advanced. Ages, fees and what each level teaches.", accent: "lime" },
  { href: "/why-us", icon: Icon.Shield, title: "Why us", text: "Safety-first coaching, a competition pathway and a portal for parents.", accent: "brand" },
  { href: "/branches", icon: Icon.MapPin, title: "Branches", text: "Uttara, Bashundhara, Aftab Nagar and Gulshan. Find the one nearest you.", accent: "brand" },
  { href: "/faq", icon: Icon.Info, title: "FAQ", text: "Ages, equipment, course length, payments and the guardian portal.", accent: "lime" },
];

export default function HomeContent() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hairline-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <RinkLines className="absolute inset-0 w-full h-full opacity-90" />
        <div className="absolute inset-0 grain" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(closest-side,rgba(47,107,224,0.28),transparent)]" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-32 sm:pt-40 pb-20 sm:pb-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
          <div>
            <div className="animate-rise inline-flex items-center gap-2 rounded-full bg-white/[0.06] ring-1 ring-white/10 pl-1.5 pr-3.5 py-1.5 text-[12px] font-medium text-ink-200 mb-7">
              <span className="rounded-full bg-lime-400 text-ink-950 text-[10.5px] font-bold px-2 py-0.5">2026</span>
              Admissions are open for all ages
            </div>
            <h1 className="animate-rise [animation-delay:80ms] font-display text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.4rem] font-semibold tracking-[-0.035em] text-balance">
              Where young champions <span className="text-lime-400">learn to glide.</span>
            </h1>
            <p className="animate-rise [animation-delay:160ms] mt-6 text-[17px] sm:text-lg text-ink-300 max-w-xl leading-relaxed">
              Bangladesh&apos;s leading roller skating school. Professional coaching for ages 3 and up, across Dhaka&apos;s top skating venues.
            </p>
            <div className="animate-rise [animation-delay:240ms] mt-9 flex flex-wrap gap-3">
              <Link href="/admission" className={dark.ctaLime}>Start admission <Icon.ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
              <Link href="/programs" className={dark.ctaGhost}>Explore programs</Link>
            </div>
            <div className="animate-rise [animation-delay:320ms] mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink-400">
              {["Ages 3 and up", "Safety-first coaching", "Est. 2020"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2"><Icon.Check width={14} height={14} className="text-lime-400" />{t}</span>
              ))}
            </div>
          </div>
          <div className="animate-rise [animation-delay:200ms] hidden md:block"><PortalPreview /></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.08]">
            {STATS.map((s) => (
              <div key={s.lbl} className="px-6 py-6 sm:py-7 bg-ink-950/95">
                <div className="font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular">{s.val}</div>
                <div className="text-[13px] text-ink-400 mt-1">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore */}
      <Section>
        <SectionHead eyebrow="Explore" title="Everything about the school, one tap away." />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXPLORE.map((e) => (
            <Link key={e.href} href={e.href} className={`${dark.card} ${dark.cardHover} group p-6 flex flex-col min-h-[230px]`}>
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${e.accent === "lime" ? "bg-lime-400 text-ink-950" : "bg-brand-600 text-white"}`}><e.icon width={19} height={19} /></span>
              <h3 className="font-display text-xl font-semibold mt-6">{e.title}</h3>
              <p className="text-[14px] text-ink-400 leading-relaxed mt-2 flex-1">{e.text}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-lime-400">Open <Icon.ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Steps */}
      <Section>
        <SectionHead eyebrow="Admission" title="From sign-up to first glide in three steps." />
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className={`${dark.card} p-7`}>
              <div className="font-display text-sm font-semibold text-lime-400">{s.n}</div>
              <h3 className="font-display text-xl font-semibold mt-3">{s.title}</h3>
              <p className="text-[14.5px] text-ink-400 leading-relaxed mt-2">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </SiteShell>
  );
}
