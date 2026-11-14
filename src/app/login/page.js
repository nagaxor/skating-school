"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Logo, RinkLines } from "@/components/Brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        setLoading(false);
        return;
      }
      // Hard navigation so the new HTTP-only cookie is sent with the first
      // request for the protected server component tree.
      window.location.assign("/dashboard");
    } catch {
      setError("Unable to reach the server. Please try again.");
      setLoading(false);
    }
  };

  const inputCls = "w-full h-12 px-4 rounded-xl text-[15px] bg-white dark:bg-ink-900 text-ink-900 dark:text-white ring-1 ring-inset ring-ink-900/10 dark:ring-white/10 focus:ring-2 focus:ring-brand-500 outline-none transition-shadow placeholder:text-ink-400";

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr] bg-white dark:bg-ink-950">
      {/* Showcase */}
      <div className="hidden lg:flex relative overflow-hidden bg-ink-950 text-white flex-col justify-between p-12">
        <RinkLines className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 grain" />
        <div className="absolute -bottom-40 -left-20 w-[600px] h-[500px] bg-[radial-gradient(closest-side,rgba(47,107,224,0.25),transparent)]" />
        <Link href="/" className="relative" aria-label="Home"><Logo size={36} /></Link>
        <div className="relative max-w-md">
          <h1 className="font-display text-[2.6rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
            Run every rink, roster and receipt <span className="text-lime-400">from one place.</span>
          </h1>
          <p className="text-ink-400 text-[15.5px] leading-relaxed mt-5">Attendance, fees, schedules and staff across all Online Skating School branches, secured by role.</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: Icon.Shield, t: "Role-based access" },
              { icon: Icon.Lock, t: "Encrypted sessions" },
              { icon: Icon.FileText, t: "Digital receipts" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] p-4">
                <f.icon width={17} height={17} className="text-lime-400" />
                <div className="text-[12.5px] font-medium text-ink-200 mt-3 leading-snug">{f.t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[12px] text-ink-500">© {new Date().getFullYear()} Online Skating School</div>
      </div>

      {/* Form */}
      <div className="flex flex-col px-5 sm:px-10 py-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden" aria-label="Home"><Logo size={32} tone="dark" /></Link>
          <Link href="/" className="text-[13px] font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white inline-flex items-center gap-1.5">
            <Icon.ArrowLeft width={14} height={14} /> Back to site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[380px] animate-scaleIn">
            <h2 className="font-display text-[28px] font-semibold tracking-tight text-ink-950 dark:text-white">Welcome back</h2>
            <p className="text-[14.5px] text-ink-500 mt-1.5 mb-8">Sign in to your Online Skating School portal.</p>

            {error && (
              <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-5 flex items-start gap-2.5 animate-slideUp" role="alert">
                <Icon.AlertTriangle width={16} height={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="text-[13px] font-semibold text-ink-700 dark:text-ink-300 block mb-2">Email</label>
                <input id="email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" required autoFocus />
              </div>
              <div>
                <label htmlFor="password" className="text-[13px] font-semibold text-ink-700 dark:text-ink-300 block mb-2">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={inputCls + " pr-12"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock"))}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-700 dark:hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                    <Icon.Eye width={17} height={17} />
                  </button>
                </div>
                {capsLock && <p className="text-[12px] text-gold-600 dark:text-gold-300 mt-2 inline-flex items-center gap-1.5"><Icon.Info width={13} height={13} /> Caps Lock is on</p>}
              </div>
              <button type="submit" disabled={loading || !email || !password} className="w-full h-12 bg-ink-950 dark:bg-white text-white dark:text-ink-950 font-semibold rounded-xl hover:bg-ink-800 dark:hover:bg-ink-100 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Signing in…</> : <>Sign in <Icon.ArrowRight width={16} height={16} /></>}
              </button>
            </form>

            <div className="mt-8 rounded-2xl bg-ink-50 dark:bg-white/[0.03] ring-1 ring-ink-900/[0.06] dark:ring-white/[0.06] p-4 text-[13px] text-ink-600 dark:text-ink-400 leading-relaxed">
              <span className="font-semibold text-ink-900 dark:text-white">New student?</span>{" "}
              <Link href="/admission" className="font-semibold text-brand-700 dark:text-brand-300 hover:underline underline-offset-2">Apply for admission</Link>. Staff accounts are created by your administrator. Forgot your password? Ask your administrator to reset it.
            </div>
            <p className="mt-6 text-[12px] text-ink-400 flex items-center gap-1.5"><Icon.Lock width={12} height={12} /> Accounts lock for 15 minutes after 5 failed attempts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
