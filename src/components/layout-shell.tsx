"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Users, Tags, Boxes, ChartColumn, Wrench, House, CalendarPlus,
  Menu, X, ChevronsUpDown, LogOut, RotateCcw, UserRound, ShieldCheck, Check, MapPin, Search, LucideIcon,
} from "lucide-react";
import { ToastContainer, ConfirmDialog, Avatar } from "./ui";
import { useDemoState, showToast } from "@/lib/hooks";
import { resetDemoState } from "@/lib/store";
import { UserRole } from "@/lib/types";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

type NavLink = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: Record<UserRole, NavLink[]> = {
  customer: [
    { href: "/customer", label: "Services", icon: House, exact: true },
    { href: "/customer", label: "Book a repair", icon: CalendarPlus },
    { href: "/customer/bookings", label: "My bookings", icon: ClipboardList },
  ],
  technician: [
    { href: "/technician", label: "Jobs", icon: Wrench },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/admin/technicians", label: "Technicians", icon: Users },
    { href: "/admin/services", label: "Services", icon: Tags },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/analytics", label: "Analytics", icon: ChartColumn },
  ],
};

const WORKSPACES: { role: UserRole; label: string; href: string; icon: LucideIcon }[] = [
  { role: "customer", label: "Customer app", href: "/customer", icon: UserRound },
  { role: "technician", label: "Partner app", href: "/technician", icon: Wrench },
  { role: "admin", label: "Operations console", href: "/admin", icon: ShieldCheck },
];

function roleFromPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/customer")) return "customer";
  if (pathname.startsWith("/technician")) return "technician";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

function isActive(link: NavLink, pathname: string) {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + "/");
}

export function Logo({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cx("flex items-center gap-2", className)}>
      <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm", inverted ? "bg-white text-gray-900" : "bg-gray-900 text-white")}>
        <Wrench className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </span>
      <span className={cx("text-[17px] font-semibold tracking-tight", inverted ? "text-white" : "text-gray-900")}>Homelyo</span>
    </span>
  );
}

/** Account menu: shows the signed-in profile, lets the user switch between the apps they have access to. */
function AccountMenu({ role, placement = "down", onReset, compact }: {
  role: UserRole; placement?: "up" | "down"; onReset: () => void; compact?: boolean;
}) {
  const state = useDemoState();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const profile =
    role === "customer"
      ? { name: state.customers[0]?.name ?? "Customer", sub: state.customers[0]?.email ?? "" }
      : role === "technician"
        ? { name: state.technicians.find((t) => t.id === "tech_001")?.name ?? "Technician", sub: "Service partner" }
        : { name: "Operations Admin", sub: "ops@homelyo.in" };

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          "flex items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-surface-100",
          compact ? "p-1" : "w-full p-2",
        )}
      >
        <Avatar name={profile.name} size="sm" />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">{profile.name}</span>
              <span className="block truncate text-xs text-gray-500">{profile.sub}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            "absolute z-50 w-64 rounded-xl border border-surface-200 bg-white p-1.5 shadow-pop animate-fade-in",
            placement === "up" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-gray-900">{profile.name}</p>
            <p className="truncate text-xs text-gray-500">{profile.sub}</p>
          </div>
          <div className="my-1 h-px bg-surface-200" />
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Switch app</p>
          {WORKSPACES.map((w) => (
            <button
              key={w.role}
              role="menuitem"
              onClick={() => go(w.href)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 hover:bg-surface-100"
            >
              <w.icon className="h-4 w-4 text-gray-500" aria-hidden />
              <span className="flex-1 text-left">{w.label}</span>
              {w.role === role && <Check className="h-4 w-4 text-brand-500" aria-hidden />}
            </button>
          ))}
          <div className="my-1 h-px bg-surface-200" />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onReset(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 hover:bg-surface-100"
          >
            <RotateCcw className="h-4 w-4 text-gray-500" aria-hidden />
            Reset data
          </button>
          <button
            role="menuitem"
            onClick={() => go("/login")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 hover:bg-surface-100"
          >
            <LogOut className="h-4 w-4 text-gray-500" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Keeps the header search box in sync with ?q= on the services page. */
function SearchQuerySync({ onChange }: { onChange: (q: string) => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const q = pathname === "/customer" ? params.get("q") ?? "" : "";
  useEffect(() => onChange(q), [q, onChange]);
  return null;
}

/* ── Marketplace header & footer (landing + customer app) ─────── */
export function SiteHeader({ onReset }: { onReset?: () => void }) {
  const state = useDemoState();
  const router = useRouter();
  const signedIn = !!onReset;
  const [query, setQuery] = useState("");

  const lastAddress = state.bookings.find((b) => b.customerId === state.customers[0]?.id)?.address.fullAddress;
  const area = lastAddress ? lastAddress.split(",").slice(1).map((p) => p.trim()).filter(Boolean).join(", ") : "New Delhi";

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/customer?q=${encodeURIComponent(q)}` : "/customer");
  };

  const searchBox = (
    <form role="search" onSubmit={onSearch} className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for ‘AC service’"
        aria-label="Search services"
        className="h-11 w-full rounded-lg border border-surface-200 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none focus:ring-0"
      />
    </form>
  );

  const location = (
    <div className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-surface-200 px-3 text-sm text-gray-800" title={area}>
      <MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
      <span className="truncate">{area}</span>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200 bg-white">
      <Suspense fallback={null}><SearchQuerySync onChange={setQuery} /></Suspense>
      <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-3 px-4 sm:px-6 md:gap-4">
        <Link href={signedIn ? "/customer" : "/"} aria-label="Homelyo home" className="shrink-0"><Logo /></Link>
        <div className="hidden w-44 shrink-0 md:block lg:w-60">{location}</div>
        <div className="hidden max-w-md flex-1 md:block">{searchBox}</div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <>
              <Link
                href="/customer/bookings"
                className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-gray-800 hover:bg-surface-100"
                aria-label="My bookings"
              >
                <ClipboardList className="h-5 w-5" aria-hidden />
                <span className="hidden lg:inline">Bookings</span>
              </Link>
              <AccountMenu role="customer" onReset={onReset} compact />
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-800 hover:bg-surface-100">
                <UserRound className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
              <Link href="/customer" className="hidden h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 sm:inline-flex">
                Book a repair
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2 px-4 pb-3 md:hidden">
        {searchBox}
        <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{area}</span>
        </p>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Services",
      links: [
        { label: "AC repair & service", href: "/customer/category/ac" },
        { label: "Refrigerator repair", href: "/customer/category/refrigerator" },
        { label: "Washing machine repair", href: "/customer/category/washing_machine" },
        { label: "Microwave repair", href: "/customer/category/microwave" },
        { label: "Dishwasher repair", href: "/customer/category/dishwasher" },
      ],
    },
    {
      title: "For customers",
      links: [
        { label: "Book a repair", href: "/customer" },
        { label: "My bookings", href: "/customer/bookings" },
        { label: "Sign in", href: "/login" },
      ],
    },
    {
      title: "For professionals",
      links: [{ label: "Register as a professional", href: "/login" }, { label: "Partner sign in", href: "/login" }],
    },
  ];
  return (
    <footer className="mt-16 bg-surface-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-gray-600">Verified technicians for every home appliance, with upfront pricing.</p>
          </div>
          {columns.map((c) => (
            <div key={c.title}>
              <p className="text-base font-semibold text-gray-900">{c.title}</p>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {c.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="hover:text-gray-900">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-surface-300 pt-6 text-xs text-gray-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Homelyo. All rights reserved.</span>
          <span>support@homelyo.in · 1800-000-3491 · 9 AM – 9 PM, all days</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Customer layout ───────────────────────────────────────────── */
function CustomerShell({ children, onReset }: { children: React.ReactNode; onReset: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader onReset={onReset} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

/* ── Console layout (technician partner app & operations admin) ─ */
function ConsoleShell({ role, children, onReset }: { role: "technician" | "admin"; children: React.ReactNode; onReset: () => void }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [pathname]);
  const label = role === "admin" ? "Operations" : "Partner";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-2 px-5">
        <Link href={`/${role}`} className="flex items-center gap-2">
          <Logo />
          <span className="rounded-md bg-surface-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{label}</span>
        </Link>
        <button className="rounded-lg p-1.5 text-gray-500 hover:bg-surface-100 lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {NAV[role].map((l) => {
          const active = isActive(l, pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-surface-100 hover:text-gray-900",
              )}
            >
              <l.icon className={cx("h-[18px] w-[18px]", active ? "text-brand-600" : "text-gray-400")} aria-hidden />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-surface-200 p-3">
        <AccountMenu role={role} placement="up" onReset={onReset} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-surface-200 bg-white lg:block">{sidebar}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-950/40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-pop animate-fade-in">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-surface-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <button className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-surface-100" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link href={`/${role}`}><Logo /></Link>
        <div className="ml-auto"><AccountMenu role={role} onReset={onReset} compact /></div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [resetConfirm, setResetConfirm] = useState(false);
  // Account data lives in browser storage, so render after mount to avoid server/client mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const role = roleFromPath(pathname);

  if (!mounted) {
    return <div className="min-h-screen bg-surface-50" aria-busy="true" />;
  }

  const handleReset = () => {
    try {
      resetDemoState();
      showToast("Data has been reset", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not reset data", "error");
    }
    setResetConfirm(false);
  };

  const openReset = () => setResetConfirm(true);

  return (
    <>
      {role === "customer" ? (
        <CustomerShell onReset={openReset}>{children}</CustomerShell>
      ) : role ? (
        <ConsoleShell role={role} onReset={openReset}>{children}</ConsoleShell>
      ) : (
        children
      )}
      <ToastContainer />
      <ConfirmDialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset all data?"
        message="Bookings, technicians, inventory and messages will be restored to their initial state. This cannot be undone."
        confirmLabel="Reset data"
        danger
      />
    </>
  );
}
