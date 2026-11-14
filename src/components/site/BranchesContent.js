"use client";

import Link from "next/link";
import { Icon } from "@/components/Icons";
import { RinkLines } from "@/components/Brand";
import SiteShell, { PageHero, Section, CtaBand, dark } from "@/components/SiteShell";

const mapsUrl = (b) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name}, ${b.location}`)}`;

export default function BranchesContent({ branches }) {
  return (
    <SiteShell>
      <PageHero eyebrow="Branches" title={<>Train <span className="text-lime-400">close to home.</span></>}
        text="Choose your branch during admission. Your class schedule and coach notices appear in the portal." />

      <Section className="!pt-4">
        {branches.length === 0 ? (
          <div className={`${dark.card} p-10 text-center text-ink-400`}>Branch details are being updated. Please contact us on WhatsApp.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {branches.map((b, i) => (
              <div key={b.id} className={`${dark.card} ${dark.cardHover} overflow-hidden group`}>
                <div className="relative h-36 bg-gradient-to-br from-brand-700 via-brand-900 to-ink-950 overflow-hidden">
                  <RinkLines animated={false} className="absolute inset-0 w-full h-full opacity-60" />
                  <div className="absolute inset-0 grain" />
                  <span className="absolute top-4 left-5 font-display text-sm font-semibold text-lime-400">0{i + 1}</span>
                  <span className="absolute bottom-4 left-5 inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full bg-lime-400 text-ink-950 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-950" /> Admissions open
                  </span>
                </div>
                <div className="p-6 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{b.name}</h2>
                    <p className="text-[14.5px] text-ink-400 mt-1.5 inline-flex items-center gap-1.5"><Icon.MapPin width={14} height={14} className="text-brand-400" />{b.location}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={mapsUrl(b)} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-xl bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12] flex items-center justify-center" aria-label={`Open ${b.name} in Google Maps`}>
                      <Icon.ArrowUpRight width={17} height={17} />
                    </a>
                    <Link href="/admission" className="h-11 px-4 rounded-xl bg-lime-400 text-ink-950 font-semibold text-sm inline-flex items-center gap-1.5 hover:bg-lime-300">Apply</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <CtaBand title="Not sure which branch?" text="Message us on WhatsApp and we'll suggest the best branch and shift for your family." />
    </SiteShell>
  );
}
