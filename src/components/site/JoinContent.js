"use client";

import Link from "next/link";
import { Icon } from "@/components/Icons";
import SiteShell, { PageHero, Section, SectionHead, dark } from "@/components/SiteShell";
import { STEPS, CHECKLIST, PROGRAMS, CONTACT } from "@/lib/site-content";

export default function JoinContent() {
  return (
    <SiteShell>
      <PageHero eyebrow="How to join" title={<>From sign-up to first glide <span className="text-lime-400">in three steps.</span></>}
        text="The admission form takes about five minutes. Keep the details below ready and you'll finish in one go.">
        <div className="flex flex-wrap gap-3">
          <Link href="/admission" className={dark.ctaLime}>Start the admission form <Icon.ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={dark.ctaGhost}><Icon.MessageCircle width={16} height={16} className="text-lime-400" /> Ask a question first</a>
        </div>
      </PageHero>

      <Section className="!pt-4">
        <ol className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className={`${dark.card} p-7 relative`}>
              <span className="w-11 h-11 rounded-xl bg-lime-400 text-ink-950 font-display font-semibold flex items-center justify-center">{i + 1}</span>
              <h2 className="font-display text-xl font-semibold mt-5">{s.title}</h2>
              <p className="text-[14.5px] text-ink-400 leading-relaxed mt-2">{s.text}</p>
              {i < STEPS.length - 1 && <Icon.ArrowRight width={18} height={18} className="hidden md:block absolute -right-[13px] top-1/2 -translate-y-1/2 text-ink-600" />}
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
          <div>
            <SectionHead eyebrow="Before you start" title="Have these details ready." text="No documents to upload except the photo. Everything else is typed in." />
            <ul className="mt-10 grid sm:grid-cols-2 gap-3">
              {CHECKLIST.map((c) => (
                <li key={c.title} className={`${dark.card} p-5 flex gap-4`}>
                  <span className="w-7 h-7 rounded-lg bg-lime-400/15 text-lime-400 flex items-center justify-center flex-shrink-0"><Icon.Check width={14} height={14} strokeWidth={3} /></span>
                  <span><span className="block font-semibold text-[15px]">{c.title}</span><span className="block text-[13.5px] text-ink-400 mt-1">{c.text}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <aside className={`${dark.card} p-6 lg:sticky lg:top-28`}>
            <h3 className="font-display text-lg font-semibold">Monthly fees</h3>
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {PROGRAMS.map((p) => (
                <li key={p.title} className="py-3 flex items-center justify-between">
                  <span><span className="font-semibold">{p.title}</span> <span className="text-ink-400 text-[13px]">· {p.age}</span></span>
                  <span className="font-display font-semibold tabular">৳{p.fee}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-ink-400 mt-3">Pay by cash, bKash, Nagad, Rocket or bank transfer. Every payment gets a digital receipt.</p>
            <Link href="/programs" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-lime-400 hover:text-lime-300">Compare programs <Icon.ArrowRight width={14} height={14} /></Link>
          </aside>
        </div>
      </Section>
    </SiteShell>
  );
}
