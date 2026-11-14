"use client";

// Public-site chrome shared by every marketing page: dark nav, footer,
// mobile CTA bar and the dark page hero. All public pages use the same
// Midnight Black / Electric Cobalt / Acid Lime look as the home hero.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";
import { Logo, RinkLines } from "@/components/Brand";
import { CONTACT, NAV } from "@/lib/site-content";

// ONE container for every public page, so all edges line up and wide
// screens are used well (1560px cap; side padding grows with the screen).
export const wrap = "w-full max-w-[1560px] mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16";

export const dark = {
  card: "rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.08]",
  cardHover: "transition hover:bg-white/[0.05] hover:ring-white/[0.14]",
  eyebrow: "text-[12px] font-semibold uppercase tracking-[0.16em] text-lime-400",
  h2: "font-display text-3xl sm:text-[2.6rem] leading-[1.1] font-semibold tracking-[-0.03em] text-white text-balance",
  lead: "text-[16px] leading-relaxed text-ink-400",
  ctaLime: "group inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-ink-950 font-semibold px-6 py-3.5 rounded-xl shadow-glow-lime transition",
  ctaGhost: "inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/10 text-white font-semibold px-6 py-3.5 rounded-xl transition",
};

export default function SiteShell({ children }) {
  return (
    <main className="min-h-screen bg-ink-950 text-white overflow-x-hidden">
      <SiteNav />
      {children}
      <Pager />
      <SiteFooter />
      <MobileCta />
    </main>
  );
}

function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled || open ? "bg-ink-950/85 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"}`}>
      <div className={`${wrap} h-16 sm:h-[72px] flex items-center justify-between gap-4`}>
        <Link href="/" aria-label="Online Skating School home"><Logo size={34} /></Link>
        <div className="hidden lg:flex items-center gap-0.5 text-[13.5px] font-medium">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 rounded-lg transition-colors ${active ? "text-white" : "text-ink-300 hover:text-white hover:bg-white/[0.05]"}`}>
                {n.label}
                {active && <span className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full bg-lime-400" />}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex text-[13.5px] font-semibold text-ink-200 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/5 transition">Sign in</Link>
          <Link href="/admission" className="hidden sm:inline-flex items-center gap-1.5 text-[13.5px] font-semibold bg-lime-400 text-ink-950 px-4 py-2 rounded-lg hover:bg-lime-300 transition">
            Apply now <Icon.ArrowRight width={14} height={14} />
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-ink-200 hover:bg-white/5" aria-label="Menu" aria-expanded={open}>
            {open ? <Icon.X width={20} height={20} /> : <Icon.Menu width={20} height={20} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-white/[0.06] px-5 pb-5 pt-2 animate-slideUp">
          {[...NAV, { href: "/login", label: "Sign in" }].map((n) => (
            <Link key={n.href} href={n.href} className={`flex items-center justify-between py-3.5 border-b border-white/[0.05] text-[16px] font-medium ${pathname === n.href ? "text-lime-400" : "text-ink-200"}`}>
              {n.label} <Icon.ChevronRight width={16} height={16} className="text-ink-600" />
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export function PageHero({ eyebrow, title, text, children }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hairline-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <RinkLines className="absolute inset-0 w-full h-full opacity-50" />
      <div className="absolute inset-0 grain" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[460px] bg-[radial-gradient(closest-side,rgba(47,107,224,0.28),transparent)]" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-b from-transparent to-ink-950" />
      <div className={`relative ${wrap} pt-36 sm:pt-44 pb-16 sm:pb-20`}>
        <p className={`${dark.eyebrow} animate-rise`}>{eyebrow}</p>
        <h1 className="animate-rise [animation-delay:80ms] font-display text-[2.5rem] leading-[1.05] sm:text-6xl 2xl:text-7xl font-semibold tracking-[-0.035em] mt-4 max-w-4xl text-balance">{title}</h1>
        {text && <p className="animate-rise [animation-delay:160ms] mt-5 text-[17px] sm:text-lg text-ink-400 max-w-2xl leading-relaxed">{text}</p>}
        {children && <div className="animate-rise [animation-delay:240ms] mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function Section({ children, className = "" }) {
  return <section className={`relative py-16 sm:py-24 ${className}`}><div className={wrap}>{children}</div></section>;
}

export function SectionHead({ eyebrow, title, text, center = false }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={dark.eyebrow}>{eyebrow}</p>}
      <h2 className={`${dark.h2} mt-3`}>{title}</h2>
      {text && <p className={`${dark.lead} mt-4`}>{text}</p>}
    </div>
  );
}

export function CtaBand({ title = "Ready to start skating?", text = "Admission is open for all ages. It takes about five minutes." }) {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-[2rem] ring-1 ring-white/10 bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 px-6 sm:px-14 py-12 sm:py-16">
        <RinkLines animated={false} className="absolute inset-0 w-full h-full opacity-40" />
        <div className="absolute inset-0 grain" />
        <div className="absolute -right-20 -bottom-24 w-96 h-96 bg-[radial-gradient(closest-side,rgba(212,255,36,0.22),transparent)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-balance">{title}</h2>
            <p className="text-brand-100/80 text-[16px] mt-3">{text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admission" className={dark.ctaLime}>Start admission <Icon.ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={dark.ctaGhost}><Icon.MessageCircle width={16} height={16} className="text-lime-400" /> WhatsApp</a>
          </div>
        </div>
      </div>
    </Section>
  );
}

// Previous / Next page links so no page is a dead end.
function Pager() {
  const pathname = usePathname();
  const i = NAV.findIndex((n) => n.href === pathname);
  if (i === -1) return null;
  const prev = NAV[i - 1];
  const next = NAV[i + 1];
  return (
    <nav aria-label="Page navigation" className="pb-16">
      <div className={`${wrap} grid sm:grid-cols-2 gap-4`}>
        {prev ? (
          <Link href={prev.href} className="group rounded-2xl ring-1 ring-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:ring-white/[0.16] p-5 sm:p-6 flex items-center gap-4 transition">
            <span className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 transition-transform group-hover:-translate-x-0.5"><Icon.ArrowLeft width={18} height={18} /></span>
            <span className="min-w-0"><span className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Previous</span><span className="block font-display text-lg font-semibold">{prev.label}</span><span className="block text-[13px] text-ink-400 truncate">{prev.blurb}</span></span>
          </Link>
        ) : null}
        {next ? (
          <Link href={next.href} className={`${prev ? "" : "sm:col-span-2 "}group rounded-2xl ring-1 ring-lime-400/30 bg-lime-400/[0.06] hover:bg-lime-400/[0.1] hover:ring-lime-400/60 p-5 sm:p-6 flex items-center justify-end gap-4 text-right transition`}>
            <span className="min-w-0"><span className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-lime-400">Next</span><span className="block font-display text-lg font-semibold">{next.label}</span><span className="block text-[13px] text-ink-400 truncate">{next.blurb}</span></span>
            <span className="w-11 h-11 rounded-xl bg-lime-400 text-ink-950 flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-0.5"><Icon.ArrowRight width={18} height={18} /></span>
          </Link>
        ) : (
          <Link href="/admission" className="group rounded-2xl bg-lime-400 text-ink-950 hover:bg-lime-300 p-5 sm:p-6 flex items-center justify-end gap-4 text-right transition">
            <span><span className="block text-[12px] font-semibold uppercase tracking-[0.12em] opacity-70">Ready?</span><span className="block font-display text-lg font-semibold">Start the admission form</span><span className="block text-[13px] opacity-70">About five minutes</span></span>
            <span className="w-11 h-11 rounded-xl bg-ink-950 text-lime-400 flex items-center justify-center flex-shrink-0"><Icon.ArrowRight width={18} height={18} /></span>
          </Link>
        )}
      </div>
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] pt-16 pb-28 lg:pb-12">
      <div className={`${wrap} grid sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr] gap-10`}>
        <div className="max-w-sm">
          <Logo size={34} />
          <p className="text-[14px] text-ink-400 leading-relaxed mt-4">Professional roller skating coaching since 2020. Uttara · Bashundhara · Aftab Nagar · Gulshan, Dhaka.</p>
        </div>
        <div>
          <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-4">Explore</h5>
          <div className="flex flex-col gap-2.5 text-[14px] text-ink-300">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-lime-400 transition-colors">{n.label}</Link>)}
            <Link href="/admission" className="hover:text-lime-400 transition-colors">Admission form</Link>
            <Link href="/login" className="hover:text-lime-400 transition-colors">Portal sign in</Link>
          </div>
        </div>
        <div>
          <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-4">Contact</h5>
          <div className="flex flex-col gap-2.5 text-[14px] text-ink-300">
            <a href={CONTACT.phoneHref} className="inline-flex items-center gap-2 hover:text-lime-400"><Icon.Phone width={14} height={14} /> {CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 hover:text-lime-400 break-all"><Icon.Mail width={14} height={14} /> {CONTACT.email}</a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-lime-400"><Icon.MessageCircle width={14} height={14} /> WhatsApp</a>
          </div>
        </div>
      </div>
      <div className={`${wrap} mt-12`}><div className="pt-6 border-t border-white/[0.06] flex flex-wrap justify-between gap-3 text-[12.5px] text-ink-400">
        <span>© 2020–{new Date().getFullYear()} Online Skating School. All rights reserved.</span>
        <span className="inline-flex items-center gap-1.5"><Icon.Lock width={12} height={12} /> Secure portal · encrypted sign-in</span>
      </div></div>
    </footer>
  );
}

function MobileCta() {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-950/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex-shrink-0 rounded-xl bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center text-lime-400" aria-label="Chat on WhatsApp">
        <Icon.MessageCircle width={19} height={19} />
      </a>
      <Link href="/admission" className="flex-1 inline-flex items-center justify-center gap-2 bg-lime-400 text-ink-950 font-semibold h-12 rounded-xl active:scale-[0.98] transition">
        Apply for admission <Icon.ArrowRight width={16} height={16} />
      </Link>
    </div>
  );
}
