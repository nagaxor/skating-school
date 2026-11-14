"use client";

import Link from "next/link";
import { Icon } from "@/components/Icons";
import { RinkLines } from "@/components/Brand";
import SiteShell, { PageHero, Section, SectionHead, CtaBand, dark } from "@/components/SiteShell";
import { PROGRAMS, INCLUDED } from "@/lib/site-content";

const DOT = { brand: "bg-brand-500", lime: "bg-lime-400", white: "bg-white" };

export default function ProgramsContent() {
  return (
    <SiteShell>
      <PageHero eyebrow="Programs" title={<>A clear path from first glide <span className="text-lime-400">to podium.</span></>}
        text="Structured courses for every level, with safety training and competition pathways built in. Every course runs for 4 months." />

      <Section className="!pt-4">
        <div className="grid md:grid-cols-3 gap-5">
          {PROGRAMS.map((p) => (
            <div key={p.title} className={`relative rounded-3xl p-7 sm:p-8 flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${p.featured ? "bg-gradient-to-b from-brand-700 to-brand-900 ring-2 ring-lime-400/70 shadow-glow-lime" : "bg-white/[0.03] ring-1 ring-white/[0.08] hover:ring-white/[0.15]"}`}>
              {p.featured && <RinkLines animated={false} className="absolute inset-0 w-full h-full opacity-40" />}
              <div className="relative flex items-center justify-between">
                <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-md ${p.featured ? "bg-lime-400 text-ink-950" : "bg-white/[0.06] text-ink-200 ring-1 ring-white/10"}`}>{p.age}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${DOT[p.accent]}`} />
              </div>
              <h2 className="relative font-display text-3xl font-semibold tracking-tight mt-6">{p.title}</h2>
              <p className={`relative text-[15px] leading-relaxed mt-3 ${p.featured ? "text-brand-100/85" : "text-ink-400"}`}>{p.desc}</p>
              <ul className="relative mt-6 space-y-3 text-[14.5px]">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${p.featured ? "bg-lime-400 text-ink-950" : "bg-lime-400/15 text-lime-400"}`}><Icon.Check width={11} height={11} strokeWidth={3} /></span>
                    {pt}
                  </li>
                ))}
              </ul>
              <div className={`relative mt-auto pt-8 flex items-end justify-between border-t ${p.featured ? "border-white/15" : "border-white/[0.08]"} mt-8`}>
                <div>
                  <span className="font-display text-4xl font-semibold tracking-tight tabular">৳{p.fee}</span>
                  <span className="text-sm text-ink-400"> / month</span>
                </div>
                <Link href="/admission" className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-lime-400 text-ink-950 font-semibold text-sm hover:bg-lime-300 transition" aria-label={`Apply for ${p.title}`}>
                  Apply <Icon.ArrowUpRight width={15} height={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="Included in every course" title="More than a skating class." />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INCLUDED.map((x, i) => (
            <div key={x.title} className={`${dark.card} p-6`}>
              <div className="font-display text-sm font-semibold text-brand-400">0{i + 1}</div>
              <h3 className="font-display text-lg font-semibold mt-3">{x.title}</h3>
              <p className="text-[14px] text-ink-400 leading-relaxed mt-2">{x.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className={`${dark.card} p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center`}>
          <div>
            <h3 className="font-display text-xl font-semibold">Not sure which level fits?</h3>
            <p className="text-ink-400 text-[15px] mt-2 max-w-2xl">Most new skaters start at Beginner. Coaches assess every child in the first weeks and move them up when they&apos;re ready.</p>
          </div>
          <Link href="/faq" className={dark.ctaGhost}>Read the FAQ</Link>
        </div>
      </Section>

      <CtaBand />
    </SiteShell>
  );
}
