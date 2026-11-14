"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Icon } from "@/components/Icons";
import { Logo, LogoMark } from "@/components/Brand";
import { Avatar } from "@/components/ui";
import CommandPalette from "@/components/CommandPalette";
import { can, canAccessPath, ROLE_LABELS } from "@/lib/rbac";

const MENU = [
  { href: "/dashboard", label: "Overview", icon: Icon.Home, perm: "self.profile", hideIf: "portal.children", exact: true },
  { href: "/dashboard", label: "My Children", icon: Icon.Users, perm: "portal.children", exact: true },
  { section: "People" },
  { href: "/dashboard/admissions/new", label: "New Admission", icon: Icon.FileText, perm: "admissions.create" },
  { href: "/dashboard/students", label: "Students", icon: Icon.Users, perm: "students.create" },
  { href: "/dashboard/guardians", label: "Guardians", icon: Icon.HeartPulse, perm: "guardians.manage" },
  { href: "/dashboard/staff", label: "Staff", icon: Icon.Shield, perm: "staff.manage" },
  { href: "/dashboard/branches", label: "Branches", icon: Icon.Building, perm: "branches.manage" },
  { section: "Operations" },
  { href: "/dashboard/attendance", label: "Attendance", icon: Icon.Clipboard, perm: "attendance.mark" },
  { href: "/dashboard/fees", label: "Fees & Payments", icon: Icon.Wallet, perm: "payments.read" },
  { href: "/dashboard/payment-history", label: "Fee Tracker", icon: Icon.TrendingUp, perm: "fees.track" },
  { href: "/dashboard/schedule", label: "Schedule", icon: Icon.Calendar, perm: "schedules.read" },
  { href: "/dashboard/notices", label: "Notices", icon: Icon.Bell, perm: "notices.read" },
  { section: "Administration" },
  { href: "/dashboard/reports", label: "Reports", icon: Icon.BarChart, perm: "reports.view" },
  { href: "/dashboard/activity", label: "Activity Log", icon: Icon.Activity, perm: "audit.read" },
  { href: "/dashboard/roles", label: "Roles & Access", icon: Icon.Key, perm: "rbac.view" },
  { href: "/dashboard/settings", label: "Settings", icon: Icon.Settings, perm: "settings.update" },
  { section: "Account" },
  { href: "/dashboard/profile", label: "Profile & Security", icon: Icon.User, perm: "self.profile" },
];

// Same four destinations for every role so the phone tab bar never reshuffles.
const TABS = [
  { href: "/dashboard", label: "Home", icon: Icon.Home, exact: true },
  { href: "/dashboard/fees", label: "Fees", icon: Icon.Wallet },
  { href: "/dashboard/schedule", label: "Schedule", icon: Icon.Calendar },
  { href: "/dashboard/notices", label: "Notices", icon: Icon.Bell },
];

// Menu visibility comes from the RBAC matrix (lib/rbac.js), never from role lists.
const visible = (item, role) => !!item.perm && can(role, item.perm) && !(item.hideIf && can(role, item.hideIf));

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function MenuList({ pathname, role, onNavigate, variant }) {
  return MENU.map((item, i) => {
    if (item.section) {
      let any = false;
      for (let j = i + 1; j < MENU.length && !MENU[j].section; j++) if (visible(MENU[j], role)) any = true;
      if (!any) return null;
      return (
        <div key={item.section} className={`mt-6 mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] ${variant === "sheet" ? "text-ink-400" : "text-ink-500"}`}>
          {item.section}
        </div>
      );
    }
    if (!visible(item, role)) return null;
    const active = isActive(pathname, item);

    if (variant === "sheet") {
      return (
        <Link key={item.href} href={item.href} onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium mb-0.5 transition-colors ${active ? "bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-ink-700 dark:text-ink-200 active:bg-ink-100 dark:active:bg-white/5"}`}>
          <item.icon width={19} height={19} className={active ? "" : "text-ink-400"} />
          {item.label}
        </Link>
      );
    }
    return (
      <Link key={item.href} href={item.href} onClick={onNavigate}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-all duration-150 ${active ? "bg-white/[0.07] text-white shadow-inner-hair" : "text-ink-400 hover:bg-white/[0.04] hover:text-ink-100"}`}>
        {active && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-lime-400 shadow-glow-lime" />}
        <item.icon width={17} height={17} className={active ? "text-lime-400" : "text-ink-500 group-hover:text-ink-300"} />
        {item.label}
      </Link>
    );
  });
}

export default function DashboardShell({ user, children }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const activeItem = !canAccessPath(user.role, pathname)
    ? { label: "No access" }
    : pathname.startsWith("/dashboard/receipt/")
    ? { label: "Receipt" }
    : pathname.startsWith("/dashboard/children/")
    ? { label: "My Children" }
    : pathname === "/dashboard/students/qr-cards"
    ? { label: "QR Cards" }
    : pathname.startsWith("/dashboard/students/")
    ? { label: "Student" }
    : [...MENU].reverse().find((m) => m.href && visible(m, user.role) && isActive(pathname, m));
  const onATab = TABS.some((t) => isActive(pathname, t));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const paletteItems = useMemo(() => {
    let group = "Navigate";
    const nav = [];
    for (const m of MENU) {
      if (m.section) { group = m.section === "Account" ? "Account" : "Navigate"; continue; }
      if (visible(m, user.role)) nav.push({ label: m.label, href: m.href, icon: m.icon, group });
    }
    const actions = [];
    if (can(user.role, "payments.create")) {
      actions.push({ label: "Record a payment", href: "/dashboard/fees", icon: Icon.Wallet, group: "Quick actions", keywords: "fee receipt collect" });
      actions.push({ label: "Mark today's attendance", href: "/dashboard/attendance", icon: Icon.Clipboard, group: "Quick actions", keywords: "present absent" });
      actions.push({ label: "Post a notice", href: "/dashboard/notices", icon: Icon.Bell, group: "Quick actions", keywords: "announcement" });
    }
    actions.push({ label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", run: toggleTheme, icon: theme === "dark" ? Icon.Sun : Icon.Moon, group: "Quick actions", keywords: "theme dark light" });
    actions.push({ label: "Log out", run: logout, icon: Icon.LogOut, group: "Account", keywords: "sign out" });
    return [...actions, ...nav];
  }, [user.role, theme, toggleTheme, logout]);

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col fixed top-0 left-0 bottom-0 w-[264px] bg-ink-950 z-40 border-r border-white/[0.06]">
        <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
        <div className="relative px-5 h-16 flex items-center">
          <Link href="/dashboard" aria-label="Dashboard home"><Logo size={34} compact /></Link>
        </div>
        <div className="relative px-3">
          <button onClick={() => setPaletteOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] text-ink-400 text-[13px] hover:bg-white/[0.07] hover:text-ink-200 transition-colors">
            <Icon.Search width={15} height={15} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[10px] font-semibold text-ink-500 ring-1 ring-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
        </div>
        <nav className="relative flex-1 py-1 px-3 overflow-y-auto" aria-label="Main">
          <MenuList pathname={pathname} role={user.role} variant="sidebar" />
        </nav>
        <div className="relative p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
            <Avatar name={user.name} initials={user.avatar} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-[13px] font-semibold truncate">{user.name}</div>
              <div className="text-ink-500 text-[11px] capitalize truncate">{user.role}{user.club && user.club !== "All Clubs" ? ` · ${user.club}` : ""}</div>
            </div>
            <button onClick={toggleTheme} className="text-ink-500 hover:text-white hover:bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title={theme === "dark" ? "Light mode" : "Dark mode"} aria-label="Toggle theme">
              {theme === "dark" ? <Icon.Sun width={15} height={15} /> : <Icon.Moon width={15} height={15} />}
            </button>
            <button onClick={logout} className="text-ink-500 hover:text-white hover:bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Log out" aria-label="Log out">
              <Icon.LogOut width={15} height={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-[264px] flex flex-col min-w-0 pb-20 md:pb-0">
        <header className="h-14 md:h-16 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl border-b border-ink-900/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="md:hidden" aria-label="Dashboard home"><LogoMark size={30} /></Link>
            <div className="min-w-0">
              <div className="hidden md:block text-[11px] text-ink-400 font-medium">{roleLabel(user.role)}{user.club && user.club !== "All Clubs" ? ` · ${user.club}` : ""}</div>
              <h1 className="text-[15px] font-semibold text-ink-950 dark:text-white truncate">{activeItem?.label || "Overview"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPaletteOpen(true)} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5" aria-label="Search">
              <Icon.Search width={18} height={18} />
            </button>
            <button onClick={toggleTheme} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5" aria-label="Toggle theme">
              {theme === "dark" ? <Icon.Sun width={17} height={17} /> : <Icon.Moon width={17} height={17} />}
            </button>
            <Link href="/dashboard/notices" className="hidden md:flex w-9 h-9 rounded-xl items-center justify-center text-ink-500 hover:text-ink-900 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 transition-colors" aria-label="Notices">
              <Icon.Bell width={17} height={17} />
            </Link>
            <Link href="/dashboard/profile" className="hidden md:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-ink-100 dark:hover:bg-white/5 transition-colors">
              <Avatar name={user.name} initials={user.avatar} size={28} />
              <span className="text-[13px] font-semibold text-ink-800 dark:text-ink-100">{user.name.split(" ")[0]}</span>
            </Link>
          </div>
        </header>
        <main className="px-4 sm:px-6 lg:px-8 2xl:px-10 py-5 sm:py-7 flex-1 animate-fadeIn w-full max-w-[1760px] mx-auto">{canAccessPath(user.role, pathname) ? children : <NoAccess />}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-ink-950/90 backdrop-blur-xl border-t border-ink-900/[0.06] dark:border-white/[0.06] flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Tabs">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab);
          return (
            <Link key={tab.href} href={tab.href} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${active ? "text-ink-950 dark:text-white" : "text-ink-400"}`}>
              <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${active ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : ""}`}>
                <tab.icon width={20} height={20} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className={`text-[10.5px] ${active ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setSheetOpen(true)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 ${!onATab ? "text-ink-950 dark:text-white" : "text-ink-400"}`}>
          <span className={`w-12 h-7 rounded-full flex items-center justify-center ${!onATab ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : ""}`}>
            <Icon.Menu width={20} height={20} strokeWidth={!onATab ? 2.2 : 1.8} />
          </span>
          <span className={`text-[10.5px] ${!onATab ? "font-semibold" : "font-medium"}`}>More</span>
        </button>
      </nav>

      {sheetOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-ink-950/50 backdrop-blur-sm z-50 animate-fadeIn" onClick={() => setSheetOpen(false)} />
          <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-ink-900 rounded-t-3xl max-h-[85vh] flex flex-col animate-slideUp shadow-popover" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="w-10 h-1.5 bg-ink-200 dark:bg-ink-700 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-ink-100 dark:border-white/[0.06] flex-shrink-0">
              <Avatar name={user.name} initials={user.avatar} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-ink-900 dark:text-white text-sm font-semibold truncate">{user.name}</div>
                <div className="text-ink-400 text-[11px] capitalize">{user.role}{user.club && user.club !== "All Clubs" ? ` · ${user.club}` : ""}</div>
              </div>
              <button onClick={logout} className="text-ink-500 active:text-red-500 w-10 h-10 rounded-xl flex items-center justify-center" aria-label="Log out">
                <Icon.LogOut width={18} height={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-3 pb-3">
              <MenuList pathname={pathname} role={user.role} onNavigate={() => setSheetOpen(false)} variant="sheet" />
            </div>
          </div>
        </>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
    </div>
  );
}

function roleLabel(role) {
  return ROLE_LABELS[role] || "Member";
}

// Shown instead of a page the current role isn't allowed to open.
function NoAccess() {
  return (
    <div className="max-w-lg mx-auto mt-10 text-center rounded-3xl bg-white dark:bg-ink-900/70 shadow-card dark:ring-1 dark:ring-white/[0.07] p-10">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center"><Icon.Lock width={24} height={24} /></div>
      <h2 className="font-display text-xl font-semibold text-ink-950 dark:text-white mt-5">You don&apos;t have access to this page</h2>
      <p className="text-sm text-ink-500 dark:text-ink-400 mt-2">Your role doesn&apos;t include this area. If you think this is a mistake, ask an administrator.</p>
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 bg-ink-950 text-white dark:bg-white dark:text-ink-950 font-semibold text-sm px-4 py-2.5 rounded-xl">Back to dashboard</Link>
    </div>
  );
}
