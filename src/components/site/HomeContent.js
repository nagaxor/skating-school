"use client";

import Link from "next/link";
import { Icon } from "@/components/Icons";
import { RinkLines } from "@/components/Brand";
import SiteShell, { CtaBand, dark, wrap } from "@/components/SiteShell";
import PortalPreview from "@/components/site/PortalPreview";
import { STATS } from "@/lib/site-content";


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

        <div className={`relative ${wrap} pt-32 sm:pt-40 pb-20 sm:pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 2xl:gap-24 items-center`}>
          <div>
            <div className="animate-rise inline-flex items-center gap-2 rounded-full bg-white/[0.06] ring-1 ring-white/10 pl-1.5 pr-3.5 py-1.5 text-[12px] font-medium text-ink-200 mb-7">
              <span className="rounded-full bg-lime-400 text-ink-950 text-[10.5px] font-bold px-2 py-0.5">2026</span>
              Admissions are open for all ages
            </div>
            <h1 className="animate-rise [animation-delay:80ms] font-display text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.4rem] 2xl:text-[5.4rem] font-semibold tracking-[-0.035em] text-balance">
              Where young champions <span className="text-lime-400">learn to glide.</span>
            </h1>
            <p className="animate-rise [animation-delay:160ms] mt-6 text-[17px] sm:text-lg 2xl:text-xl text-ink-300 max-w-xl 2xl:max-w-2xl leading-relaxed">
              Bangladesh&apos;s leading roller skating school. Professional coaching for ages 3 and up, across Dhaka&apos;s top skating venues.
            </p>
            <div className="animate-rise [animation-delay:240ms] mt-9 flex flex-wrap gap-3">
              <Link href="/admission" className={dark.ctaLime}>Start admission <Icon.ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
              <Link href="/programs" className={dark.ctaGhost}>Explore programs</Link>
            </div>
            <div className="animate-rise [animation-delay:320ms] mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink-400">
              {["Ages 3 and up", "Safety-first coaching", "4 branches in Dhaka"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2"><Icon.Check width={14} height={14} className="text-lime-400" />{t}</span>
              ))}
            </div>
          </div>
          <div className="animate-rise [animation-delay:200ms] hidden md:block"><PortalPreview /></div>
        </div>

        <div className={`relative ${wrap} pb-12`}>
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

      <CtaBand />
    </SiteShell>
  );
}
