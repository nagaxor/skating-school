"use client";

import { Icon } from "@/components/Icons";
import SiteShell, { PageHero, Section, CtaBand, dark } from "@/components/SiteShell";
import { FAQ, CONTACT } from "@/lib/site-content";

export default function FaqContent() {
  return (
    <SiteShell>
      <PageHero eyebrow="FAQ" title={<>Questions <span className="text-lime-400">parents ask.</span></>}
        text="Can't find your answer? Message us on WhatsApp and we'll reply quickly." />

      <Section className="!pt-4">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQ.map((f, i) => (
              <details key={f.q} className="group py-6" open={i === 0}>
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-[17px]">
                  <span className="flex items-center gap-4"><span className="font-display text-sm text-brand-400 w-6">0{i + 1}</span>{f.q}</span>
                  <span className="w-9 h-9 rounded-full ring-1 ring-white/15 flex items-center justify-center flex-shrink-0 transition group-open:rotate-45 group-open:bg-lime-400 group-open:text-ink-950 group-open:ring-lime-400">
                    <Icon.Plus width={16} height={16} />
                  </span>
                </summary>
                <p className="text-[15.5px] text-ink-400 leading-relaxed mt-3 pl-10 pr-12">{f.a}</p>
              </details>
            ))}
          </div>

          <aside className={`${dark.card} p-6 lg:sticky lg:top-28`}>
            <h3 className="font-display text-lg font-semibold">Talk to the school</h3>
            <p className="text-[14px] text-ink-400 mt-1.5">We're happy to help you choose a program and branch.</p>
            <div className="mt-5 space-y-2">
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-lime-400 text-ink-950 font-semibold px-4 py-3 hover:bg-lime-300 transition"><Icon.MessageCircle width={17} height={17} /> WhatsApp us</a>
              <a href={CONTACT.phoneHref} className="flex items-center gap-3 rounded-xl bg-white/[0.05] ring-1 ring-white/10 px-4 py-3 hover:bg-white/[0.09] transition text-[14px]"><Icon.Phone width={16} height={16} className="text-brand-400" /> {CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 rounded-xl bg-white/[0.05] ring-1 ring-white/10 px-4 py-3 hover:bg-white/[0.09] transition text-[14px] break-all"><Icon.Mail width={16} height={16} className="text-brand-400 flex-shrink-0" /> {CONTACT.email}</a>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
    </SiteShell>
  );
}
