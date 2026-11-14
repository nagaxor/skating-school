"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Logo, RinkLines } from "@/components/Brand";

const WHATSAPP = "https://wa.me/8801707080260";

const PROGRAMS = [
  { title: "Beginner", age: "Ages 3+", fee: "2,000", tone: "brand", desc: "Balance, forward glide, safe stopping and first turns, with full safety-gear guidance from day one.", points: ["Balance & posture", "Stopping safely", "Basic turns"] },
  { title: "Intermediate", age: "Ages 6+", fee: "2,500", tone: "gold", desc: "Crossovers, backward skating and speed control. Builds the confidence to skate anywhere.", points: ["Crossovers", "Backward skating", "Inline technique"], featured: true },
  { title: "Advanced", age: "Ages 8+", fee: "3,000", tone: "ink", desc: "Speed skating, rollball and competition preparation on the pathway to national events.", points: ["Speed training", "Rollball", "Competition prep"] },
];

const FEATURES = [
  { icon: Icon.Shield, title: "Safety first, always", text: "Every class starts with protective gear checks and fall-safe technique." },
  { icon: Icon.Award, title: "Competition pathway", text: "Advanced skaters train toward rollball and national-level speed events." },
  { icon: Icon.MapPin, title: "Venues across Dhaka", text: "Train at the branch closest to home, on the shift that suits your family." },
  { icon: Icon.Smartphone, title: "Parent portal", text: "Check schedules, attendance and notices any time from your phone." },
  { icon: Icon.FileText, title: "Digital receipts", text: "Every payment is recorded with a printable, verifiable receipt." },
  { icon: Icon.Zap, title: "Structured progress", text: "A 4-month course structure, so you always know the next milestone." },
];

const STEPS = [
  { n: "01", title: "Apply online", text: "Fill in the admission form in about five minutes, with a photo of the skater." },
  { n: "02", title: "Pick branch & shift", text: "Choose the venue and morning or day shift that fits your routine." },
  { n: "03", title: "Start skating", text: "Sign in to your portal for schedules, notices and fee receipts." },
];

const FAQ = [
  { q: "What age can my child start?", a: "Children can join the Beginner course from age 3. Intermediate starts at 6+ and Advanced at 8+." },
  { q: "How long is a course?", a: "Each course runs for 4 months with structured milestones, after which skaters can move up a level." },
  { q: "What equipment is needed?", a: "Skates and full protective gear (helmet, knee, elbow and wrist guards). Coaches guide new families on what to buy." },
  { q: "How can I pay fees?", a: "Cash, bKash, Nagad, Rocket or bank transfer. Every payment gets a digital receipt in your portal." },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    fetch("/api/clubs").then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setBranches(d)).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white text-ink-950 overflow-x-hidden">
      {/* Nav */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-ink-950/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          <Link href="/" aria-label="Online Skating School home"><Logo size={34} /></Link>
          <div className="hidden md:flex items-center gap-8 text-[13.5px] font-medium text-ink-300">
            <a href="#programs" className="hover:text-white transition-colors">Programs</a>
            <a href="#why" className="hover:text-white transition-colors">Why us</a>
            {branches.length > 0 && <a href="#branches" className="hover:text-white transition-colors">Branches</a>}
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-[13.5px] font-semibold text-ink-200 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/5 transition">Sign in</Link>
            <Link href="/admission" className="hidden sm:inline-flex items-center gap-1.5 text-[13.5px] font-semibold bg-white text-ink-950 px-4 py-2 rounded-lg hover:bg-brand-50 transition">
              Apply now <Icon.ArrowRight width={14} height={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-ink-950 text-white overflow-hidden">
        <div className="absolute inset-0 hairline-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <RinkLines className="absolute inset-0 w-full h-full opacity-90" />
        <div className="absolute inset-0 grain" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(closest-side,rgba(10,159,196,0.28),transparent)]" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-32 sm:pt-40 pb-20 sm:pb-28 grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
          <div>
            <div className="animate-rise inline-flex items-center gap-2 rounded-full bg-white/[0.06] ring-1 ring-white/10 pl-1.5 pr-3.5 py-1.5 text-[12px] font-medium text-ink-200 mb-7">
              <span className="rounded-full bg-gold-400 text-ink-950 text-[10.5px] font-bold px-2 py-0.5">2026</span>
              Admissions are open for all ages
            </div>
            <h1 className="animate-rise [animation-delay:80ms] font-display text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.4rem] font-semibold tracking-[-0.035em] text-balance">
              Where young champions{" "}
              <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-gold-300 bg-clip-text text-transparent">learn to glide.</span>
            </h1>
            <p className="animate-rise [animation-delay:160ms] mt-6 text-[17px] sm:text-lg text-ink-300 max-w-xl leading-relaxed">
              Bangladesh&apos;s leading roller skating school. Professional coaching for ages 3 and up, across Dhaka&apos;s top skating venues.
            </p>
            <div className="animate-rise [animation-delay:240ms] mt-9 flex flex-wrap gap-3">
              <Link href="/admission" className="group inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-6 py-3.5 rounded-xl shadow-glow-teal transition">
                Start admission <Icon.ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#programs" className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/10 text-white font-semibold px-6 py-3.5 rounded-xl transition">
                Explore programs
              </a>
            </div>
            <div className="animate-rise [animation-delay:320ms] mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink-400">
              {["Ages 3 and up", "Safety-first coaching", "Est. 2020"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2"><Icon.Check width={14} height={14} className="text-brand-400" />{t}</span>
              ))}
            </div>
          </div>

          {/* Product preview card */}
          <div className="animate-rise [animation-delay:200ms] relative hidden md:block">
            <div className="absolute -inset-6 bg-[radial-gradient(closest-side,rgba(237,190,87,0.18),transparent)]" />
            <div className="relative rounded-3xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-xl p-5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Parent portal</span>
                <span className="text-[10.5px] text-ink-500">Preview</span>
              </div>
              <div className="rounded-2xl bg-ink-950/70 ring-1 ring-white/[0.06] p-4">
                <div className="text-[12px] text-ink-400">Next class</div>
                <div className="font-display text-xl font-semibold mt-0.5">Saturday · 4:00 PM</div>
                <div className="text-[12.5px] text-ink-400 mt-1">Intermediate · your branch</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-2xl bg-ink-950/70 ring-1 ring-white/[0.06] p-4">
                  <div className="text-[12px] text-ink-400">Attendance</div>
                  <div className="mt-2 flex items-end gap-1 h-10">
                    {[60, 85, 70, 95, 80, 100, 90].map((h, i) => (
                      <span key={i} className="flex-1 rounded-sm bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-ink-950/70 ring-1 ring-white/[0.06] p-4">
                  <div className="text-[12px] text-ink-400">Monthly fee</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-400/20 rounded-md px-2 py-1">
                    <Icon.Check width={12} height={12} /> Paid
                  </div>
                  <div className="text-[11px] text-ink-500 mt-1.5">Receipt issued</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-gradient-to-r from-gold-400/15 to-transparent ring-1 ring-gold-400/20 p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-gold-400/20 text-gold-300 flex items-center justify-center"><Icon.Bell width={16} height={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Notice from your coach</div>
                  <div className="text-[12px] text-ink-400">Bring knee guards for Saturday&apos;s session</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.08]">
            {[
              { val: "1000+", lbl: "Active skaters" },
              { val: "6+", lbl: "Affiliated clubs" },
              { val: "2020", lbl: "Established" },
              { val: "4 mo", lbl: "Course duration" },
            ].map((s) => (
              <div key={s.lbl} className="px-6 py-6 sm:py-7 bg-ink-950/95">
                <div className="font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular">{s.val}</div>
                <div className="text-[13px] text-ink-400 mt-1">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="scroll-mt-20 py-20 sm:py-28 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHead eyebrow="Programs" title="A clear path from first glide to podium." text="Structured courses for every level, with safety training and competition pathways built in." />
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {PROGRAMS.map((p) => (
              <div key={p.title} className={`relative rounded-3xl p-7 sm:p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${p.featured ? "bg-ink-950 text-white shadow-[0_30px_60px_-20px_rgba(11,15,28,0.5)]" : "bg-white ring-1 ring-ink-900/[0.08] hover:shadow-lift"}`}>
                {p.featured && <RinkLines animated={false} className="absolute inset-0 w-full h-full rounded-3xl opacity-50" />}
                <div className="relative flex items-center justify-between">
                  <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-md ${p.featured ? "bg-white/10 text-ink-200" : "bg-ink-50 text-ink-600 ring-1 ring-ink-900/5"}`}>{p.age}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${p.tone === "brand" ? "bg-brand-500" : p.tone === "gold" ? "bg-gold-400" : "bg-ink-900"}`} />
                </div>
                <h3 className="relative font-display text-2xl font-semibold tracking-tight mt-6">{p.title}</h3>
                <p className={`relative text-[14.5px] leading-relaxed mt-2.5 ${p.featured ? "text-ink-300" : "text-ink-500"}`}>{p.desc}</p>
                <ul className="relative mt-6 space-y-2.5 text-[14px]">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${p.featured ? "bg-brand-400/20 text-brand-300" : "bg-brand-500/10 text-brand-600"}`}><Icon.Check width={11} height={11} strokeWidth={3} /></span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <div className={`relative mt-auto pt-8 flex items-end justify-between border-t ${p.featured ? "border-white/10" : "border-ink-900/[0.06]"} mt-8`}>
                  <div>
                    <span className="font-display text-3xl font-semibold tracking-tight tabular">৳{p.fee}</span>
                    <span className={`text-sm ${p.featured ? "text-ink-400" : "text-ink-500"}`}> / month</span>
                  </div>
                  <Link href="/admission" className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition ${p.featured ? "bg-white text-ink-950 hover:bg-brand-50" : "bg-ink-950 text-white hover:bg-ink-800"}`} aria-label={`Apply for ${p.title}`}>
                    <Icon.ArrowUpRight width={17} height={17} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="scroll-mt-20 py-20 sm:py-28 px-5 sm:px-8 bg-ink-50">
        <div className="max-w-7xl mx-auto">
          <SectionHead eyebrow="Why Online Skating School" title="Serious coaching. Zero guesswork for parents." text="Everything a family needs, on the rink and off it." />
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-900/[0.07] rounded-3xl overflow-hidden ring-1 ring-ink-900/[0.07]">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-7 sm:p-8 group">
                <span className="w-11 h-11 rounded-xl bg-ink-950 text-brand-300 flex items-center justify-center shadow-inner-hair transition-transform group-hover:-translate-y-0.5">
                  <f.icon width={19} height={19} />
                </span>
                <h3 className="font-display text-[17px] font-semibold mt-5">{f.title}</h3>
                <p className="text-[14.5px] text-ink-500 leading-relaxed mt-1.5">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches (live) */}
      {branches.length > 0 && (
        <section id="branches" className="scroll-mt-20 py-20 sm:py-28 px-5 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow="Branches" title="Train close to home." text="Choose your branch during admission. You can see your class schedule in the portal." />
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="flex items-start gap-4 rounded-2xl ring-1 ring-ink-900/[0.08] p-5 hover:shadow-lift transition">
                  <span className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center flex-shrink-0"><Icon.MapPin width={18} height={18} /></span>
                  <div className="min-w-0">
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-[13.5px] text-ink-500 mt-0.5">{b.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 bg-ink-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 grain" />
        <div className="relative max-w-7xl mx-auto">
          <SectionHead dark eyebrow="Admission" title="From sign-up to first glide in three steps." />
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-3xl bg-white/[0.04] ring-1 ring-white/[0.08] p-7">
                <div className="font-display text-sm font-semibold text-brand-300">{s.n}</div>
                <h3 className="font-display text-xl font-semibold mt-3">{s.title}</h3>
                <p className="text-[14.5px] text-ink-400 leading-relaxed mt-2">{s.text}</p>
                {i < STEPS.length - 1 && <Icon.ArrowRight width={18} height={18} className="hidden md:block absolute -right-[15px] top-1/2 -translate-y-1/2 text-ink-600 z-10" />}
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/admission" className="inline-flex items-center gap-2 bg-white text-ink-950 font-semibold px-6 py-3.5 rounded-xl hover:bg-brand-50 transition">
              Start admission <Icon.ArrowRight width={16} height={16} />
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 ring-1 ring-white/15 hover:bg-white/5 font-semibold px-6 py-3.5 rounded-xl transition">
              <Icon.MessageCircle width={16} height={16} className="text-emerald-400" /> Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <SectionHead center eyebrow="FAQ" title="Questions parents ask." />
          <div className="mt-12 divide-y divide-ink-900/[0.08] border-y border-ink-900/[0.08]">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-[16px]">
                  {f.q}
                  <span className="w-8 h-8 rounded-full ring-1 ring-ink-900/10 flex items-center justify-center flex-shrink-0 transition-transform group-open:rotate-45">
                    <Icon.Plus width={15} height={15} />
                  </span>
                </summary>
                <p className="text-[15px] text-ink-500 leading-relaxed mt-3 pr-12">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink-950 text-white pt-16 pb-28 lg:pb-12 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-[1.4fr_1fr_1fr] gap-10">
          <div className="max-w-sm">
            <Logo size={34} />
            <p className="text-[14px] text-ink-400 leading-relaxed mt-4">Professional roller skating coaching since 2020. Dhaka, Bangladesh.</p>
          </div>
          <div>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-4">Explore</h5>
            <div className="flex flex-col gap-2.5 text-[14px] text-ink-300">
              <a href="#programs" className="hover:text-white">Programs</a>
              <Link href="/admission" className="hover:text-white">Admission</Link>
              <Link href="/login" className="hover:text-white">Portal sign in</Link>
            </div>
          </div>
          <div>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-4">Contact</h5>
            <div className="flex flex-col gap-2.5 text-[14px] text-ink-300">
              <a href="tel:+8801707080260" className="inline-flex items-center gap-2 hover:text-white"><Icon.Phone width={14} height={14} /> +880 1707 080 260</a>
              <a href="mailto:onlineskatingschool@gmail.com" className="inline-flex items-center gap-2 hover:text-white break-all"><Icon.Mail width={14} height={14} /> onlineskatingschool@gmail.com</a>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white"><Icon.MessageCircle width={14} height={14} /> WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/[0.06] flex flex-wrap justify-between gap-3 text-[12.5px] text-ink-500">
          <span>© 2020–{new Date().getFullYear()} Online Skating School. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5"><Icon.Lock width={12} height={12} /> Secure portal · encrypted sign-in</span>
        </div>
      </footer>

      {/* Persistent mobile CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-ink-950/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex-shrink-0 rounded-xl bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center text-emerald-400" aria-label="Chat on WhatsApp">
          <Icon.MessageCircle width={19} height={19} />
        </a>
        <Link href="/admission" className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold h-12 rounded-xl active:scale-[0.98] transition">
          Apply for admission <Icon.ArrowRight width={16} height={16} />
        </Link>
      </div>
    </main>
  );
}

function SectionHead({ eyebrow, title, text, dark = false, center = false }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-brand-300" : "text-brand-600"}`}>{eyebrow}</p>
      <h2 className={`font-display text-3xl sm:text-[2.6rem] leading-[1.1] font-semibold tracking-[-0.03em] mt-3 text-balance ${dark ? "text-white" : "text-ink-950"}`}>{title}</h2>
      {text && <p className={`text-[16px] leading-relaxed mt-4 ${dark ? "text-ink-400" : "text-ink-500"}`}>{text}</p>}
    </div>
  );
}
