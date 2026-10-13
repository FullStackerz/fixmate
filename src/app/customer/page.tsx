"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { StaticImageData } from "next/image";
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, FileText, Headset,
  Search, ShieldCheck, X,
} from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { APPLIANCE_CATEGORIES, formatPrice, type Service } from "@/lib/types";
import { CATEGORY_MEDIA, PHOTOS } from "@/lib/media";
import {
  EmptyState, LoadingSpinner, Photo, PriceTag, Rating, Reveal, SectionHeading, ServiceArt, StatusBadge,
} from "@/components/ui";
import { setCurrentRole } from "@/lib/store";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Sentence-case labels used on this page (the data layer stores title case). */
const CATEGORY_COPY: Record<string, { tile: string; title: string }> = {
  ac: { tile: "AC", title: "AC repair & service" },
  refrigerator: { tile: "Refrigerator", title: "Refrigerator repair & service" },
  washing_machine: { tile: "Washing machine", title: "Washing machine repair & service" },
  microwave: { tile: "Microwave", title: "Microwave repair" },
  dishwasher: { tile: "Dishwasher", title: "Dishwasher repair & installation" },
};
const copyFor = (id: string) => {
  const fallback = APPLIANCE_CATEGORIES.find((c) => c.id === id)?.name ?? id;
  return CATEGORY_COPY[id] ?? { tile: fallback, title: fallback };
};

const PROMISES = [
  { icon: BadgeCheck, title: "Verified technicians", body: "ID and background checked" },
  { icon: FileText, title: "Itemised quote first", body: "Approve every part and charge" },
  { icon: ShieldCheck, title: "30-day repair warranty", body: "Same issue fixed at no labour cost" },
  { icon: Headset, title: "Support on every booking", body: "Phone and chat, start to finish" },
];

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const durationLabel = (mins?: number) => {
  if (!mins) return undefined;
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} mins` : `${h} hr${h > 1 ? "s" : ""}`;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function matchesQuery(s: Service, q: string) {
  if (!q) return true;
  const haystack = [
    s.name, s.description, s.category, copyFor(s.category).title,
    APPLIANCE_CATEGORIES.find((c) => c.id === s.category)?.name ?? "",
    ...s.commonIssues, ...s.brands,
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/* ── Hero carousel ─────────────────────────────────────────────── */
interface Slide {
  image: StaticImageData;
  alt: string;
  eyebrow: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
}

function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const t = window.setTimeout(() => go(index + 1), 5000);
    return () => window.clearTimeout(t);
  }, [index, paused, reduced, count, go]);

  if (count === 0) return null;

  const arrow = cx(
    "absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-md backdrop-blur transition-all hover:bg-white sm:flex",
    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100", focusRing,
  );

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers and highlights"
      className="group relative h-[260px] overflow-hidden rounded-3xl bg-gray-900 shadow-pop sm:h-[300px] lg:h-[360px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start === null || end === undefined) return;
        if (Math.abs(end - start) > 40) go(index + (end < start ? 1 : -1));
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={s.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            className={cx("absolute inset-0 transition-opacity duration-700 ease-out", active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0")}
          >
            <Photo
              src={s.image}
              alt={s.alt}
              zoom={false}
              className="!absolute inset-0"
              imgClassName={cx("transition-transform ease-out", active ? "scale-[1.07] duration-[6000ms]" : "scale-100 duration-700")}
              sizes="(max-width: 1152px) 100vw, 1104px"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:hidden" aria-hidden />
            <div className="relative flex h-full max-w-[34rem] flex-col justify-center p-5 pb-10 text-white sm:p-10">
              <p
                key={`e-${active}`}
                className={cx("w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur", active && "animate-fade-up")}
              >
                {s.eyebrow}
              </p>
              <h2
                key={`t-${active}`}
                className={cx("mt-3 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-4xl", active && "animate-fade-up")}
                style={{ animationDelay: "90ms" }}
              >
                {s.title}
              </h2>
              <p
                key={`s-${active}`}
                className={cx("mt-2 line-clamp-2 text-sm text-white/85 sm:text-base", active && "animate-fade-up")}
                style={{ animationDelay: "180ms" }}
              >
                {s.sub}
              </p>
              <Link
                href={s.href}
                tabIndex={active ? 0 : -1}
                className={cx(
                  "mt-4 inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-brand-50 sm:mt-6 sm:h-11 sm:px-5",
                  focusRing,
                )}
              >
                {s.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} className={cx(arrow, "left-4")} aria-label="Previous slide">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(index + 1)} className={cx(arrow, "right-4")} aria-label="Next slide">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-5">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cx("relative h-2 overflow-hidden rounded-full transition-all duration-300", i === index ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/80", focusRing)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ── Horizontal scroll row ─────────────────────────────────────── */
function ScrollRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="list"
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
    >
      {children}
    </div>
  );
}

function ServiceCard({ svc }: { svc: Service }) {
  const off = svc.listPricePaise !== undefined && svc.listPricePaise > svc.startingPricePaise
    ? Math.round((1 - svc.startingPricePaise / svc.listPricePaise) * 100)
    : 0;
  return (
    <Link
      role="listitem"
      href={`/customer/service/${svc.id}`}
      className={cx("group w-[170px] shrink-0 snap-start rounded-2xl transition-transform duration-300 hover:-translate-y-1 sm:w-[210px] lg:w-auto", focusRing)}
    >
      <div className="relative">
        <ServiceArt
          category={svc.category}
          serviceId={svc.id}
          className="aspect-[4/3] w-full rounded-2xl shadow-card transition-shadow duration-300 group-hover:shadow-card-hover"
          sizes="(max-width: 640px) 170px, (max-width: 1024px) 210px, 270px"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-accent-700 shadow-sm backdrop-blur">
            {off}% off
          </span>
        )}
        <span className="absolute bottom-2 right-2 inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-brand-600 opacity-100 shadow-md transition-all duration-300 lg:translate-y-1 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-visible:translate-y-0 lg:group-focus-visible:opacity-100">
          Book
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-gray-900 group-hover:underline">{svc.name}</h3>
      <Rating value={svc.ratingAvg} count={svc.ratingCount} className="mt-1" />
      <div className="mt-0.5 text-sm">
        <PriceTag price={svc.startingPricePaise} list={svc.listPricePaise} />
      </div>
    </Link>
  );
}

/* ── Search result row ─────────────────────────────────────────── */
function ResultRow({ svc }: { svc: Service }) {
  const duration = durationLabel(svc.durationMins);
  return (
    <li>
      <Link
        href={`/customer/service/${svc.id}`}
        className={cx("group flex items-center gap-4 rounded-2xl border border-surface-200 bg-white p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-surface-300 hover:shadow-card-hover sm:p-4", focusRing)}
      >
        <ServiceArt
          category={svc.category}
          serviceId={svc.id}
          className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-28"
          sizes="112px"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">{copyFor(svc.category).tile}</p>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold text-gray-900 group-hover:underline">{svc.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Rating value={svc.ratingAvg} count={svc.ratingCount} />
            {duration && (
              <span className="inline-flex items-center gap-1 text-[13px] text-gray-500">
                <Clock className="h-3.5 w-3.5" aria-hidden />{duration}
              </span>
            )}
          </div>
          <PriceTag price={svc.startingPricePaise} list={svc.listPricePaise} prefix="Starts at" className="mt-1 text-sm" />
        </div>
        <span className="hidden h-9 shrink-0 items-center gap-1 rounded-lg border border-brand-200 px-3 text-sm font-semibold text-brand-600 transition-colors group-hover:bg-brand-50 sm:inline-flex">
          View <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 sm:hidden" aria-hidden />
      </Link>
    </li>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
function CustomerHomeContent() {
  const state = useDemoState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const query = (searchParams.get("q") ?? "").trim();
  const redirectCategory = categoryParam && APPLIANCE_CATEGORIES.some((c) => c.id === categoryParam) ? categoryParam : null;

  const [hello, setHello] = useState("Hello");

  useEffect(() => {
    setCurrentRole("customer");
    setHello(greeting());
  }, []);

  // Category selection now lives on its own page.
  useEffect(() => {
    if (redirectCategory) router.replace(`/customer/category/${redirectCategory}`);
  }, [redirectCategory, router]);

  const services = useMemo(() => state.services.filter((s) => s.enabled), [state.services]);
  const results = useMemo(() => (query ? services.filter((s) => matchesQuery(s, query)) : []), [services, query]);

  const categories = useMemo(
    () =>
      APPLIANCE_CATEGORIES.map((c) => {
        const list = services.filter((s) => s.category === c.id);
        return { id: c.id, list, from: list.length ? Math.min(...list.map((s) => s.startingPricePaise)) : null };
      }),
    [services],
  );
  const fromOf = (id: string) => categories.find((c) => c.id === id)?.from ?? null;

  const mostBooked = useMemo(
    () => [...services].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)).slice(0, 8),
    [services],
  );

  const customer = state.customers[0];
  const firstName = customer?.name?.split(" ")[0];
  const customerId = customer?.id ?? "cust_001";
  const activeBookings = state.bookings.filter(
    (b) => b.customerId === customerId && !["closed", "cancelled"].includes(b.status),
  );
  const latest = activeBookings[0];
  const latestService = latest ? state.services.find((s) => s.id === latest.serviceId) : undefined;

  const acFrom = fromOf("ac");
  const fridgeFrom = fromOf("refrigerator");
  const washerFrom = fromOf("washing_machine");
  const slides: Slide[] = [
    {
      image: CATEGORY_MEDIA.ac.gallery[0] ?? CATEGORY_MEDIA.ac.cover,
      alt: "Split air conditioner on a living room wall",
      eyebrow: "Beat the heat",
      title: "AC service before summer",
      sub: acFrom !== null ? `Filter, coil and drain cleaning from ${formatPrice(acFrom)}` : "Filter, coil and drain cleaning by trained technicians",
      cta: "Book AC service",
      href: "/customer/category/ac",
    },
    {
      image: PHOTOS.technicianRepair,
      alt: "Technician repairing an appliance",
      eyebrow: "Upfront pricing",
      title: "You approve the quote before any work",
      sub: "An itemised quote for parts and labour, with a 30-day repair warranty.",
      cta: "Browse repairs",
      href: "#categories",
    },
    {
      image: CATEGORY_MEDIA.refrigerator.gallery[0] ?? CATEGORY_MEDIA.refrigerator.cover,
      alt: "Refrigerator in a bright kitchen",
      eyebrow: "Fridge not cooling?",
      title: "Refrigerator repair at home",
      sub: fridgeFrom !== null ? `Cooling, leaks and noise fixed, from ${formatPrice(fridgeFrom)}` : "Cooling, leaks and noise fixed by experts",
      cta: "Fix my fridge",
      href: "/customer/category/refrigerator",
    },
    {
      image: CATEGORY_MEDIA.washing_machine.gallery[0] ?? CATEGORY_MEDIA.washing_machine.cover,
      alt: "Washing machine drum close-up",
      eyebrow: "Laundry day saved",
      title: "Washing machine repair and drum cleaning",
      sub: washerFrom !== null ? `Front-load and top-load, from ${formatPrice(washerFrom)}` : "Front-load and top-load machines",
      cta: "Book now",
      href: "/customer/category/washing_machine",
    },
  ];

  if (redirectCategory) {
    return <div className="py-24"><LoadingSpinner /></div>;
  }

  const clearSearch = () => router.replace("/customer", { scroll: false });

  return (
    <div className="space-y-12 overflow-x-clip pb-6 sm:space-y-14">
      {/* Greeting */}
      <header className="animate-fade-up">
        <p className="text-sm font-medium text-gray-500">{hello}{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-[32px] sm:leading-10">
          {query ? "Search results" : "What needs fixing today?"}
        </h1>
      </header>

      {/* Search results */}
      {query && (
        <section aria-labelledby="results-heading" className="-mt-6 animate-fade-up sm:-mt-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <h2 id="results-heading">
              {results.length} {results.length === 1 ? "service" : "services"} for{" "}
              <span className="font-semibold text-gray-900">“{query}”</span>
            </h2>
            <button
              type="button"
              onClick={clearSearch}
              className={cx("inline-flex items-center gap-1 rounded-full border border-surface-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:border-surface-300 hover:text-gray-900", focusRing)}
            >
              <X className="h-3 w-3" aria-hidden />Clear search
            </button>
          </div>
          {results.length > 0 ? (
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {results.map((svc) => <ResultRow key={svc.id} svc={svc} />)}
            </ul>
          ) : (
            <div className="mt-4 rounded-2xl border border-surface-200">
              <EmptyState
                icon={<Search aria-hidden />}
                title="No services match your search"
                description={`We couldn't find a service for “${query}”. Try a different keyword or pick an appliance below.`}
              />
            </div>
          )}
        </section>
      )}

      {/* Hero carousel */}
      {!query && (
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <HeroCarousel slides={slides} />
        </div>
      )}

      {/* Active booking */}
      {latest && (
        <Reveal>
          <section aria-labelledby="active-heading" className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card">
            <div className="flex">
              <ServiceArt
                category={latest.applianceCategory}
                serviceId={latest.serviceId}
                className="w-24 shrink-0 rounded-none sm:w-48"
                sizes="(max-width: 640px) 96px, 192px"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="active-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Your active booking{activeBookings.length > 1 && <span className="hidden sm:inline">{` · ${activeBookings.length} in progress`}</span>}
                    </h2>
                    <StatusBadge status={latest.status} />
                  </div>
                  <p className="mt-2 truncate text-base font-semibold text-gray-900">
                    {latest.priceSnapshot?.serviceName ?? latestService?.name ?? latest.issue}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-gray-400" aria-hidden />{formatDate(latest.appointmentDate)}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" aria-hidden />{latest.appointmentSlot}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {activeBookings.length > 1 && (
                    <Link href="/customer/bookings" className={cx("hidden h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-gray-600 sm:inline-flex hover:bg-surface-100 hover:text-gray-900", focusRing)}>
                      All bookings
                    </Link>
                  )}
                  <Link
                    href={`/customer/bookings/${latest.id}`}
                    className={cx("inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600", focusRing)}
                  >
                    Track booking <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* Categories */}
      <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-28">
        <Reveal>
          <SectionHeading title="Book by appliance" subtitle="Pick your appliance to see services, prices and time slots." />
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const media = CATEGORY_MEDIA[cat.id];
            if (!media) return null;
            const wide = i < 2;
            return (
              <Reveal
                key={cat.id}
                delay={i * 70}
                className={cx(i === 0 && "col-span-2", wide ? "lg:col-span-3" : "lg:col-span-2")}
              >
                <Link
                  href={`/customer/category/${cat.id}`}
                  className={cx("group relative block overflow-hidden rounded-2xl text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop", focusRing)}
                >
                  <Photo
                    src={media.cover}
                    alt=""
                    overlay
                    className={cx("w-full", i === 0 ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/5] sm:aspect-[4/3]", wide ? "lg:aspect-[16/9]" : "lg:aspect-[4/3]")}
                    sizes={wide ? "(max-width: 1024px) 50vw, 540px" : "(max-width: 1024px) 50vw, 360px"}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
                    <h3 className="text-base font-semibold leading-5 sm:text-xl">{copyFor(cat.id).tile}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-white/80 sm:text-sm sm:leading-5">{media.tagline}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {cat.from !== null && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">From {formatPrice(cat.from)}</span>
                      )}
                      <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 transition-transform duration-300 group-hover:translate-x-0.5 sm:flex" aria-hidden>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Most booked */}
      {mostBooked.length > 0 && (
        <Reveal as="section">
          <SectionHeading title="Most booked services" subtitle="Highest-rated repairs from customers near you." />
          <ScrollRow label="Most booked services">
            {mostBooked.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
          </ScrollRow>
        </Reveal>
      )}

      {/* Promise */}
      <Reveal as="section">
        <div className="grid overflow-hidden rounded-3xl bg-gray-900 text-white md:grid-cols-[1fr_1.4fr]">
          <div className="relative min-h-[180px]">
            <Photo
              src={PHOTOS.technicianPortrait}
              alt="A verified Homelyo technician"
              className="!absolute inset-0"
              sizes="(max-width: 768px) 100vw, 460px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent md:bg-gradient-to-l" aria-hidden />
          </div>
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
            <p className="relative text-sm font-medium text-brand-300">Every booking includes</p>
            <h2 className="relative mt-1 text-2xl font-bold tracking-tight">The Homelyo promise</h2>
            <ul className="relative mt-6 grid gap-5 sm:grid-cols-2">
              {PROMISES.map((p) => (
                <li key={p.title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
                    <p.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                    <p className="mt-0.5 text-[13px] text-white/65">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* Help strip */}
      <Reveal>
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-surface-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-gray-900">Not sure what is wrong?</p>
              <p className="text-sm text-gray-600">Pick your appliance and book an inspection. Your technician diagnoses it on site.</p>
            </div>
          </div>
          <Link
            href="#categories"
            className={cx("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-surface-200 px-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-surface-50", focusRing)}
          >
            Choose appliance <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

export default function CustomerHomePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CustomerHomeContent />
    </Suspense>
  );
}
