"use client";

import { Icon } from "@/components/Icons";
import SiteShell, { PageHero, Section, SectionHead, CtaBand } from "@/components/SiteShell";
import PortalPreview from "@/components/site/PortalPreview";
import { FEATURES, STATS } from "@/lib/site-content";

export default function WhyContent() {
  return (
    <SiteShell>
      <PageHero eyebrow="Why Online Skating School" title={<>Serious coaching. <span className="text-lime-400">Zero guesswork</span> for parents.</>}
        text="Everything a family needs, on the rink and off it." />

      <Section className="!pt-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-3xl overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.08]">
          {FEATURES.map((f, i) => {
            const I = Icon[f.icon];
            return (
              <div key={f.title} className="bg-ink-950 p-7 sm:p-9 group hover:bg-ink-900 transition-colors">
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:-translate-y-0.5 ${i % 2 ? "bg-brand-600 text-white" : "bg-lime-400 text-ink-950"}`}><I width={20} height={20} /></span>
                <h3 className="font-display text-[19px] font-semibold mt-6">{f.title}</h3>
                <p className="text-[14.5px] text-ink-400 leading-relaxed mt-2">{f.text}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionHead eyebrow="Guardian portal" title="Follow every child from your phone." text="Parents sign in to see each child's attendance, today's class status, upcoming classes, fee balance and receipts. Several children can be followed from one account. Only your family's data is ever shown." />
            <ul className="mt-8 space-y-3 text-[15px]">
              {["Present or absent, the same day", "Month-by-month fee balance", "Printable digital receipts", "Notices from coaches"].map((t) => (
                <li key={t} className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-lime-400 text-ink-950 flex items-center justify-center"><Icon.Check width={13} height={13} strokeWidth={3} /></span>{t}</li>
              ))}
            </ul>
          </div>
          <PortalPreview />
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.08]">
          {STATS.map((s) => (
            <div key={s.lbl} className="px-6 py-7 bg-ink-950">
              <div className="font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular">{s.val}</div>
              <div className="text-[13px] text-ink-400 mt-1">{s.lbl}</div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </SiteShell>
  );
}
