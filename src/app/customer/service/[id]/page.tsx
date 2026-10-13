"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight, BadgeCheck, CalendarCheck, CalendarDays, Check, ChevronDown, ChevronRight, CircleAlert, Clock,
  FileText, ImagePlus, MessageSquareText, Moon, PackageCheck, ShieldCheck, Sparkles, Stethoscope, Sun,
  Sunrise, Sunset, ThumbsUp, Upload, Wallet, Wrench, X, type LucideIcon,
} from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { estimateBookingPrice, setCurrentRole } from "@/lib/store";
import { APPLIANCE_CATEGORIES, TIME_SLOTS, formatPrice, type Service } from "@/lib/types";
import { CATEGORY_MEDIA, PHOTOS, serviceImage } from "@/lib/media";
import { loadBookingDraft, localDateString, saveBookingDraft } from "@/lib/booking-draft";
import { Button, EmptyState, Input, LoadingSpinner, PriceTag, Rating, ServiceArt, Textarea } from "@/components/ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const OTHER = "__other";
const MAX_PHOTOS = 5;

/* ── Date & slot helpers (local time) ─────────────────────────── */

/** Minutes after midnight at which a "9:00 AM - 11:00 AM" slot starts. */
function slotStartMinutes(slot: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function slotIcon(slot: string): LucideIcon {
  const start = slotStartMinutes(slot);
  if (start < 11 * 60) return Sunrise;
  if (start < 15 * 60) return Sun;
  if (start < 17 * 60) return Sunset;
  return Moon;
}

function formatLongDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

interface DayOption {
  iso: string;
  top: string;
  day: number;
  month: string;
  /** Every slot on this day has already started */
  full: boolean;
}

function buildDays(now: Date): DayOption[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const lastStart = Math.max(...TIME_SLOTS.map(slotStartMinutes));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return {
      iso: localDateString(d),
      top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      full: i === 0 && lastStart <= nowMinutes,
    };
  });
}

/** Arrow-key navigation for a role="radiogroup" of buttons: moves focus and selects. */
function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])'));
  if (radios.length === 0) return;
  e.preventDefault();
  const current = radios.indexOf(document.activeElement as HTMLButtonElement);
  let next = current;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = radios.length - 1;
  else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % radios.length;
  else next = (current - 1 + radios.length) % radios.length;
  radios[next].focus();
  radios[next].click();
}

/** Only the checked radio (or the first one) is in the tab order. */
const rovingTab = (checked: boolean, isFirst: boolean, anyChecked: boolean) => (checked || (!anyChecked && isFirst) ? 0 : -1);

const chipClass = (selected: boolean) =>
  cx(
    "inline-flex items-center justify-center gap-1.5 border text-sm font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-50 disabled:text-gray-300 disabled:shadow-none",
    selected
      ? "border-brand-500 bg-brand-50 text-brand-700 shadow-[0_0_0_1px_theme(colors.brand.500)]"
      : "border-surface-200 bg-white text-gray-700 hover:-translate-y-px hover:border-gray-400 hover:shadow-sm",
  );

/* ── Static content ───────────────────────────────────────────── */

const PROMISES: { icon: LucideIcon; label: string }[] = [
  { icon: BadgeCheck, label: "Verified technicians" },
  { icon: FileText, label: "Quote before any work" },
  { icon: ShieldCheck, label: "30-day repair warranty" },
];

const INCLUDED: string[] = [
  "Visit and full diagnosis by a verified technician",
  "Itemised quote for labour and parts, shared before any work starts",
  "Repair carried out only after you approve the quote",
  "Work area cleaned up after the job",
  "30-day warranty on the repair",
];

const NOT_INCLUDED: string[] = [
  "Spare parts — quoted separately at listed prices",
  "Civil, plumbing or electrical work outside the appliance",
];

const HOW_IT_WORKS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: CalendarCheck, title: "Book a slot", body: "Pick a 2-hour window that suits you." },
  { icon: Stethoscope, title: "Inspection", body: "A verified technician diagnoses the problem at your home." },
  { icon: ThumbsUp, title: "Approve the quote", body: "See an itemised quote and decide before any work begins." },
  { icon: Wallet, title: "Pay after the repair", body: "UPI, card or cash once the job is done." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What does the inspection fee cover?",
    a: "It covers the technician's visit and a full diagnosis of your appliance. You'll see it as a separate line in your price summary.",
  },
  {
    q: "When do I pay?",
    a: "Nothing is charged when you book. Once the repair is done, you pay by UPI, card or cash for the quote you approved.",
  },
  {
    q: "Are spare parts included in the starting price?",
    a: "No. If a part needs replacing, the technician adds it to your quote with its price so you can approve it first.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "Yes. Cancellation is free until the technician is on the way. You can manage everything from My bookings.",
  },
];

/* ── Page ─────────────────────────────────────────────────────── */

function ServiceBookingContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useDemoState();
  const serviceId = decodeURIComponent(String(params.id ?? ""));
  const service = state.services.find((s) => s.id === serviceId);

  useEffect(() => { setCurrentRole("customer"); }, []);

  if (!service || !service.enabled) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-surface-200 bg-white animate-scale-in">
        <EmptyState
          icon={<Wrench aria-hidden />}
          title="This service isn't available"
          description="It may have been removed or is temporarily paused. Browse our other appliance repair services instead."
          action={
            <Link
              href="/customer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Browse services <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
      </div>
    );
  }

  return <ServiceBooking key={service.id} service={service} initialIssue={searchParams.get("issue")} onContinue={() => router.push("/customer/checkout")} />;
}

function ServiceBooking({ service, initialIssue, onContinue }: { service: Service; initialIssue: string | null; onContinue: () => void }) {
  const categoryName = APPLIANCE_CATEGORIES.find((c) => c.id === service.category)?.name ?? "Appliance";
  const estimate = estimateBookingPrice(service);
  const savings = service.listPricePaise && service.listPricePaise > service.startingPricePaise
    ? service.listPricePaise - service.startingPricePaise
    : 0;

  /* Gallery */
  const gallery = useMemo(() => {
    const media = CATEGORY_MEDIA[service.category];
    const list: { src: StaticImageData; alt: string }[] = [];
    const push = (src: StaticImageData | undefined, alt: string) => {
      if (src && !list.some((x) => x.src.src === src.src)) list.push({ src, alt });
    };
    push(serviceImage(service), `${service.name}`);
    push(media?.cover, `${categoryName} at home`);
    media?.gallery.forEach((g, i) => push(g, `${categoryName} photo ${i + 2}`));
    push(PHOTOS.technicianRepair, "Homelyo technician repairing an appliance");
    return list.slice(0, 5);
  }, [service, categoryName]);
  const [active, setActive] = useState(0);

  /* Form state */
  const presetIssue = initialIssue && service.commonIssues.includes(initialIssue) ? initialIssue : "";
  // An issue from the URL that isn't in the list becomes "Something else" with the text prefilled.
  const [issue, setIssue] = useState(presetIssue || (initialIssue ? OTHER : ""));
  const [otherIssue, setOtherIssue] = useState(initialIssue && !presetIssue ? initialIssue : "");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [attempted, setAttempted] = useState(false);

  // Clock is client-only so server and client markup match; refresh every minute.
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Coming back from checkout ("Change") → restore what was chosen.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const d = loadBookingDraft();
    if (!d || d.serviceId !== service.id) return;
    if (service.commonIssues.includes(d.issue)) setIssue(d.issue);
    else { setIssue(OTHER); setOtherIssue(d.issue); }
    setDescription(d.description ?? "");
    setBrand(d.brand && service.brands.includes(d.brand) ? d.brand : "");
    setPhotos(d.photoNames ?? []);
    if (d.appointmentDate >= localDateString()) {
      setDate(d.appointmentDate);
      setSlot(d.appointmentSlot);
    }
  }, [service]);

  const days = useMemo(() => (now ? buildDays(now) : []), [now]);
  const today = now ? localDateString(now) : "";
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const slotPast = (s: string, d = date) => !!now && d === today && slotStartMinutes(s) <= nowMinutes;

  // Drop a date/slot that has expired while the page was open.
  useEffect(() => {
    if (!now) return;
    if (date && date < today) { setDate(""); setSlot(""); return; }
    if (slot && slotPast(slot)) setSlot("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const finalIssue = issue === OTHER ? otherIssue.trim() : issue;
  const missing: { key: "issue" | "date" | "slot"; label: string; target: string }[] = [];
  if (!finalIssue) missing.push({ key: "issue", label: issue === OTHER ? "Describe the problem" : "Choose the problem", target: "section-problem" });
  if (!date) missing.push({ key: "date", label: "Pick a date", target: "section-slot" });
  if (!slot) missing.push({ key: "slot", label: "Pick a time slot", target: "section-slot" });
  const ready = missing.length === 0;

  const pickDate = (iso: string) => {
    setDate(iso);
    if (slot && slotPast(slot, iso)) setSlot("");
  };

  const addFiles = (files: FileList | null) => {
    const names = Array.from(files ?? []).filter((f) => f.type.startsWith("image/")).map((f) => f.name);
    if (names.length === 0) return;
    setPhotos((prev) => Array.from(new Set([...prev, ...names])).slice(0, MAX_PHOTOS));
  };

  const goToMissing = () => {
    setAttempted(true);
    const first = missing[0];
    if (first) document.getElementById(first.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleContinue = () => {
    if (!ready) { goToMissing(); return; }
    saveBookingDraft({
      serviceId: service.id,
      applianceCategory: service.category,
      brand: brand || undefined,
      issue: finalIssue,
      description: description.trim() || undefined,
      appointmentDate: date,
      appointmentSlot: slot,
      photoNames: photos.length ? photos : undefined,
    });
    onContinue();
  };

  const stagger = (i: number) => ({ animationDelay: `${80 + i * 70}ms` });
  const issueChips = [...service.commonIssues, OTHER];
  const issueAnyChecked = issueChips.includes(issue);

  return (
    <div className="min-w-0">
      {/* ── Hero: gallery + details ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0 animate-fade-up">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-100 shadow-card">
            {gallery.map((g, i) => (
              <div
                key={g.src.src}
                className={cx(
                  "absolute inset-0 transition-[opacity,transform] duration-700 ease-out",
                  i === active ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
                )}
                aria-hidden={i !== active}
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  priority={i === 0}
                  placeholder="blur"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
                  className={cx("object-cover", i === active && "animate-ken-burns")}
                />
              </div>
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" aria-hidden /> {categoryName}
            </span>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-gray-800 shadow-pop backdrop-blur animate-float">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                </span>
                30-day warranty on every repair
              </span>
              <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur">
                {active + 1}/{gallery.length}
              </span>
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Photos">
              {gallery.map((g, i) => (
                <button
                  key={g.src.src}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1}: ${g.alt}`}
                  aria-pressed={i === active}
                  className={cx(
                    "relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-xl transition-all duration-300 sm:h-16 sm:w-20",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                    i === active ? "ring-2 ring-brand-500 ring-offset-2" : "opacity-70 hover:opacity-100",
                  )}
                >
                  <Image src={g.src} alt="" fill sizes="80px" placeholder="blur" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-500 animate-fade-up" style={stagger(0)} aria-label="Breadcrumb">
            <Link href="/customer" className="transition-colors hover:text-gray-900">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />
            <Link href={`/customer/category/${service.category}`} className="transition-colors hover:text-gray-900">{categoryName}</Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />
            <span className="min-w-0 truncate font-medium text-gray-900" aria-current="page">{service.name}</span>
          </nav>

          <h1 className="mt-3 text-[28px] font-bold leading-tight text-gray-900 animate-fade-up sm:text-4xl" style={stagger(1)}>
            {service.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 animate-fade-up" style={stagger(2)}>
            <Rating value={service.ratingAvg} count={service.ratingCount} className="text-sm" />
            {service.durationMins && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                <Clock className="h-3.5 w-3.5" aria-hidden /> About {service.durationMins} mins
              </span>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-surface-200 bg-gradient-to-br from-white to-surface-50 p-4 animate-fade-up" style={stagger(3)}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <PriceTag price={service.startingPricePaise} list={service.listPricePaise} prefix="Starts at" className="text-2xl" />
              {savings > 0 && (
                <span className="rounded-md bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
                  Save {formatPrice(savings)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-gray-600">
              + {estimate.visitFeePaise > 0 ? `${formatPrice(estimate.visitFeePaise)} inspection fee` : "free inspection"} · pay after the repair
            </p>
          </div>

          <p className="mt-4 text-[15px] leading-7 text-gray-600 animate-fade-up" style={stagger(4)}>{service.description}</p>

          <ul className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3" aria-label="Homelyo promise">
            {PROMISES.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-[13px] font-medium leading-tight text-gray-800 animate-fade-up min-[420px]:flex-col min-[420px]:items-start"
                style={stagger(5 + i)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden flex-wrap items-center gap-4 animate-fade-up md:flex" style={stagger(8)}>
            <Button
              size="lg"
              onClick={() => document.getElementById("section-problem")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="sheen px-7 font-semibold"
            >
              Book now <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <span className="text-sm text-gray-500">No payment needed to book</span>
          </div>
        </div>
      </div>

      {/* ── Booking form + summary ────────────────────────────── */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-5">
          {/* 1 · Problem */}
          <SectionCard
            id="section-problem"
            step={1}
            icon={MessageSquareText}
            title="What's the problem?"
            subtitle="Pick the closest match. It helps the technician bring the right tools."
            done={!!finalIssue}
            delay={0}
          >
            <div
              role="radiogroup"
              aria-label="Problem"
              aria-required="true"
              onKeyDown={radioKeys}
              className="flex flex-wrap gap-2"
            >
              {issueChips.map((value, i) => {
                const selected = issue === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={rovingTab(selected, i === 0, issueAnyChecked)}
                    onClick={() => setIssue(value)}
                    className={cx(chipClass(selected), "h-10 rounded-full px-4")}
                  >
                    {selected ? <Check className="h-4 w-4 animate-scale-in" strokeWidth={2.5} aria-hidden /> : null}
                    {value === OTHER ? "Something else" : value}
                  </button>
                );
              })}
            </div>
            {attempted && !finalIssue && issue !== OTHER && <InlineError>Choose the problem you&apos;re facing</InlineError>}

            {issue === OTHER && (
              <div className="animate-fade-up">
                <Input
                  label="Describe the problem"
                  required
                  value={otherIssue}
                  onChange={(e) => setOtherIssue(e.target.value)}
                  placeholder="e.g. Display shows E4 error"
                  maxLength={120}
                  error={attempted && !otherIssue.trim() ? "Tell us briefly what's wrong" : undefined}
                  autoFocus
                />
              </div>
            )}

            {service.brands.length > 0 && (
              <div>
                <p id="brand-label" className="mb-2 text-sm font-medium text-gray-700">
                  Brand <span className="font-normal text-gray-400">(optional)</span>
                </p>
                <div role="radiogroup" aria-labelledby="brand-label" onKeyDown={radioKeys} className="flex flex-wrap gap-2">
                  {service.brands.map((b, i) => {
                    const selected = brand === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={rovingTab(selected, i === 0, !!brand)}
                        onClick={() => setBrand(selected ? "" : b)}
                        className={cx(chipClass(selected), "h-9 rounded-lg px-3.5")}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Textarea
              label="Anything else we should know? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When did it start? Any error codes, noises or leaks?"
              maxLength={500}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Photos <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <label
                htmlFor="problem-photos"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                className={cx(
                  "group flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed px-4 py-4 transition-all",
                  "focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100",
                  dragOver ? "border-brand-500 bg-brand-50" : "border-surface-300 hover:border-brand-300 hover:bg-brand-50/40",
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform group-hover:-translate-y-0.5">
                  {dragOver ? <Upload className="h-5 w-5" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">
                    <span className="text-brand-600">Add photos</span> or drag them here
                  </span>
                  <span className="block text-xs text-gray-500">Model sticker, error code or the damage. Up to {MAX_PHOTOS} photos.</span>
                </span>
                <input
                  id="problem-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
              {photos.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected photos">
                  {photos.map((name) => (
                    <li key={name} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 py-1 pl-2.5 pr-1 text-xs text-gray-700 animate-scale-in">
                      <ImagePlus className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                      <span className="max-w-[12rem] truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => setPhotos((p) => p.filter((n) => n !== name))}
                        className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>

          {/* 2 · Slot */}
          <SectionCard
            id="section-slot"
            step={2}
            icon={CalendarDays}
            title="Pick a slot"
            subtitle="The technician arrives within the 2-hour window you choose."
            done={!!date && !!slot}
            delay={80}
          >
            <div>
              <p id="date-label" className="mb-2 text-sm font-medium text-gray-700">Date</p>
              {days.length === 0 ? (
                <div className="flex gap-2 overflow-hidden" aria-hidden>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="h-[76px] w-[68px] shrink-0 animate-shimmer rounded-xl bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 bg-[length:200%_100%]" />
                  ))}
                </div>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
                  <div role="radiogroup" aria-labelledby="date-label" onKeyDown={radioKeys} className="flex w-max gap-2 sm:grid sm:w-full sm:grid-cols-7">
                    {days.map((d, i) => {
                      const selected = date === d.iso;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={`${d.top === "Today" || d.top === "Tomorrow" ? `${d.top}, ` : ""}${formatLongDate(d.iso)}${d.full ? " (no slots left)" : ""}`}
                          tabIndex={rovingTab(selected, i === (days[0].full ? 1 : 0), !!date && days.some((x) => x.iso === date))}
                          disabled={d.full}
                          onClick={() => pickDate(d.iso)}
                          className={cx(chipClass(selected), "h-[76px] w-[68px] flex-col gap-0.5 rounded-xl sm:w-auto")}
                        >
                          <span className={cx("text-[11px] font-medium", selected ? "text-brand-600" : "text-gray-500")}>{d.top}</span>
                          <span className="text-xl font-semibold leading-none tabular-nums">{d.day}</span>
                          <span className={cx("text-[11px]", selected ? "text-brand-600" : "text-gray-400")}>{d.full ? "Full" : d.month}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {attempted && !date && <InlineError>Pick a date for the visit</InlineError>}
            </div>

            <div>
              <p id="slot-label" className="mb-2 text-sm font-medium text-gray-700">Time</p>
              {!date ? (
                <p className="flex items-center gap-2 rounded-xl bg-surface-100 px-3 py-3 text-sm text-gray-500">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden /> Pick a date to see available times
                </p>
              ) : (
                <div key={date} role="radiogroup" aria-labelledby="slot-label" onKeyDown={radioKeys} className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
                  {TIME_SLOTS.map((s, i) => {
                    const selected = slot === s;
                    const past = slotPast(s);
                    const Icon = slotIcon(s);
                    const firstOpen = TIME_SLOTS.find((x) => !slotPast(x));
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={past}
                        tabIndex={rovingTab(selected, s === firstOpen, !!slot)}
                        onClick={() => setSlot(s)}
                        className={cx(chipClass(selected), "h-12 justify-start gap-2.5 rounded-xl px-3.5 tabular-nums animate-fade-up")}
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <Icon className={cx("h-4 w-4", selected ? "text-brand-600" : past ? "text-gray-300" : "text-gray-400")} aria-hidden />
                        <span className="whitespace-nowrap">{s.replace(" - ", " – ")}</span>
                        {past && <span className="ml-auto text-[11px] font-normal">Started</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {attempted && date && !slot && <InlineError>Pick a time slot</InlineError>}
            </div>
          </SectionCard>

          {/* 3 · Details */}
          <SectionCard id="section-details" step={3} icon={PackageCheck} title="What's included" delay={160}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ul className="space-y-3">
                {INCLUDED.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Not included</p>
                <ul className="space-y-3">
                  {NOT_INCLUDED.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-100 text-gray-500">
                        <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-surface-200">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px]">
                <div className="p-4 sm:p-5">
                  <h3 className="text-[15px] font-semibold text-gray-900">How it works</h3>
                  <ol className="mt-4 space-y-4">
                    {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
                      <li key={title} className="relative flex gap-3">
                        {i < HOW_IT_WORKS.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-20px)] w-px bg-surface-200" aria-hidden />}
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-4 ring-white">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 pt-1">
                          <p className="text-sm font-semibold text-gray-900">{title}</p>
                          <p className="text-sm text-gray-500">{body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="relative hidden md:block">
                  <Image src={PHOTOS.technicianPortrait} alt="A Homelyo technician" fill sizes="200px" placeholder="blur" className="object-cover" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[15px] font-semibold text-gray-900">Frequently asked questions</h3>
              <div className="divide-y divide-surface-200 rounded-2xl border border-surface-200">
                {FAQS.map((f) => (
                  <details key={f.q} className="group px-4 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                      {f.q}
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="pb-4 text-sm leading-6 text-gray-600 group-open:animate-fade-in">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Summary (desktop) */}
        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block" aria-label="Booking summary">
          <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-3 border-b border-surface-200 p-4">
              <ServiceArt category={service.category} serviceId={service.id} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-gray-900">{service.name}</p>
                <p className="truncate text-sm text-gray-500">{finalIssue || "Problem not selected"}{brand ? ` · ${brand}` : ""}</p>
              </div>
            </div>

            <div className="space-y-2 border-b border-surface-200 px-4 py-3 text-sm">
              <p className={cx("flex items-center gap-2", date ? "text-gray-800" : "text-gray-400")}>
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                {date ? formatLongDate(date) : "Date not selected"}
              </p>
              <p className={cx("flex items-center gap-2 tabular-nums", slot ? "text-gray-800" : "text-gray-400")}>
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                {slot ? slot.replace(" - ", " – ") : "Time not selected"}
              </p>
            </div>

            <PriceLines visitFeePaise={estimate.visitFeePaise} startingPricePaise={estimate.startingPricePaise} totalPaise={estimate.totalPaise} />

            <div className="p-4 pt-0">
              <Button size="lg" onClick={handleContinue} disabled={!ready} className="w-full font-semibold">
                Continue to checkout <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              {!ready && (
                <ul className="mt-3 space-y-1.5" aria-label="Still needed">
                  {[
                    { k: "issue", label: "Choose the problem", ok: !!finalIssue },
                    { k: "date", label: "Pick a date", ok: !!date },
                    { k: "slot", label: "Pick a time slot", ok: !!slot },
                  ].map((m) => (
                    <li key={m.k} className={cx("flex items-center gap-2 text-xs transition-colors", m.ok ? "text-accent-600" : "text-gray-500")}>
                      <span className={cx("flex h-4 w-4 items-center justify-center rounded-full border transition-colors", m.ok ? "border-accent-500 bg-accent-500 text-white" : "border-surface-300")}>
                        {m.ok && <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden />}
                      </span>
                      {m.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <ul className="mt-4 space-y-2.5 rounded-2xl bg-surface-100 px-4 py-4 text-sm text-gray-700">
            {PROMISES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {label}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Mobile: sticky bottom bar (sticky, so it never covers the page footer) */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-surface-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums text-gray-900">{formatPrice(estimate.totalPaise)}</span>
              <span className="text-xs text-gray-500">est. total</span>
            </p>
            <p className={cx("truncate text-xs", ready ? "text-accent-600" : "text-gray-500")}>
              {ready ? `${formatLongDate(date)} · ${slot.split(" - ")[0]}` : missing[0].label}
            </p>
          </div>
          {ready ? (
            <Button size="lg" onClick={handleContinue} className="shrink-0 px-5 font-semibold">
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={goToMissing} className="shrink-0 px-5 font-semibold">
              {missing[0].key === "issue" ? "Choose problem" : missing[0].key === "date" ? "Pick date" : "Pick time"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────── */

function SectionCard({
  id, step, icon: Icon, title, subtitle, done, delay = 0, children,
}: {
  id: string; step: number; icon: LucideIcon; title: string; subtitle?: string; done?: boolean; delay?: number; children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-2xl border border-surface-200 bg-white p-4 shadow-card animate-fade-up sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          className={cx(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
            done ? "bg-accent-500 text-white" : "bg-brand-50 text-brand-600",
          )}
        >
          {done ? <Check key="done" className="h-5 w-5 animate-scale-in" strokeWidth={2.75} aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white ring-2 ring-white">
            {step}
          </span>
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={`${id}-title`} className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {done && <span className="sr-only">Completed</span>}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function PriceLines({ visitFeePaise, startingPricePaise, totalPaise }: { visitFeePaise: number; startingPricePaise: number; totalPaise: number }) {
  return (
    <div className="p-4">
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Inspection fee</dt>
          <dd className="tabular-nums text-gray-900">{visitFeePaise > 0 ? formatPrice(visitFeePaise) : "Free"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Repair starts at</dt>
          <dd className="tabular-nums text-gray-900">{formatPrice(startingPricePaise)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-dashed border-surface-300 pt-2.5">
          <dt className="font-semibold text-gray-900">Estimated total</dt>
          <dd className="text-base font-semibold tabular-nums text-gray-900">{formatPrice(totalPaise)}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-xl bg-surface-100 px-3 py-2.5 text-xs leading-5 text-gray-600">
        Final price confirmed in an itemised quote after inspection. Pay after the repair.
      </p>
    </div>
  );
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger-600 animate-fade-in" role="alert">
      <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {children}
    </p>
  );
}

export default function ServiceBookingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ServiceBookingContent />
    </Suspense>
  );
}
