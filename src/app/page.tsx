"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Headset,
  LayoutGrid, Receipt, ShieldCheck, Sparkles, Star, Wrench, type LucideIcon,
} from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { APPLIANCE_CATEGORIES, formatPrice, type Service } from "@/lib/types";
import { CATEGORY_MEDIA, PHOTOS } from "@/lib/media";
import { Photo, PriceTag, Rating, Reveal, SectionHeading, ServiceArt } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/layout-shell";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const SHORT_NAMES: Record<string, string> = {
  ac: "AC",
  refrigerator: "Refrigerator",
  washing_machine: "Washing machine",
  microwave: "Microwave",
  dishwasher: "Dishwasher",
};

const ROW_TITLES: Record<string, string> = {
  ac: "AC repair & service",
  refrigerator: "Refrigerator repair",
  washing_machine: "Washing machine repair",
  microwave: "Microwave repair",
  dishwasher: "Dishwasher repair",
};

const STEPS: { title: string; body: string }[] = [
  { title: "Choose a service", body: "Pick your appliance and the problem. The inspection fee is shown before you book." },
  { title: "Pick a time slot", body: "Choose a two-hour visit window between 9 AM and 7 PM, any day of the week." },
  { title: "Approve the quote", body: "Your technician inspects the appliance and sends an itemised quote. Nothing starts until you approve." },
  { title: "Pay after the repair", body: "Pay by UPI, card or cash once the job is done and get a detailed receipt." },
];

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: BadgeCheck, title: "Verified technicians", body: "Every partner completes ID and background verification before taking jobs." },
  { icon: Receipt, title: "Upfront pricing", body: "A fixed inspection fee and an itemised quote, with no surprise charges." },
  { icon: ShieldCheck, title: "30-day repair warranty", body: "If the same issue returns within 30 days, we fix it at no labour cost." },
  { icon: Headset, title: "Real support", body: "Reach our support team by phone or chat throughout your booking." },
];

const MARQUEE_PROMISES = ["Verified technicians", "Itemised quotes", "30-day warranty", "Pay after the repair"];

/* ── Horizontal scroll row with desktop arrow buttons ─────────── */
function ScrollRow({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow = "absolute top-[34%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-surface-200 bg-white text-gray-800 shadow-md transition-colors hover:bg-surface-50 lg:flex";

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        role="list"
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {children}
      </div>
      {!edges.start && (
        <button type="button" onClick={() => scroll(-1)} className={cx(arrow, "-left-5")} aria-label={`Scroll ${label} left`}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      )}
      {!edges.end && (
        <button type="button" onClick={() => scroll(1)} className={cx(arrow, "-right-5")} aria-label={`Scroll ${label} right`}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function ServiceCard({ svc }: { svc: Service }) {
  return (
    <Link
      role="listitem"
      href={`/customer/service/${svc.id}`}
      className="group w-[160px] shrink-0 snap-start rounded-2xl transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-[200px] lg:w-[calc((100%-64px)/5)]"
    >
      <div className="relative">
        <ServiceArt
          category={svc.category}
          serviceId={svc.id}
          className="aspect-[4/5] w-full rounded-2xl shadow-card transition-shadow duration-300 group-hover:shadow-card-hover"
          sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 220px"
        />
        {svc.listPricePaise !== undefined && svc.listPricePaise > svc.startingPricePaise && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-accent-700 shadow-sm backdrop-blur">
            {Math.round((1 - svc.startingPricePaise / svc.listPricePaise) * 100)}% off
          </span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-gray-900 group-hover:underline">{svc.name}</h3>
      <Rating value={svc.ratingAvg} count={svc.ratingCount} className="mt-1" />
      <div className="mt-0.5 text-sm">
        <PriceTag price={svc.startingPricePaise} list={svc.listPricePaise} />
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const state = useDemoState();
  const services = state.services.filter((s) => s.enabled);

  const categories = APPLIANCE_CATEGORIES.map((cat) => {
    const list = services.filter((s) => s.category === cat.id);
    const from = list.length ? Math.min(...list.map((s) => s.startingPricePaise)) : null;
    return { ...cat, list, from };
  });
  const fromOf = (id: string) => categories.find((c) => c.id === id)?.from ?? null;

  const mostBooked = [...services].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)).slice(0, 8);

  const rated = services.filter((s) => s.ratingAvg !== undefined && s.ratingCount);
  const totalRatings = rated.reduce((n, s) => n + (s.ratingCount ?? 0), 0);
  const avgRating = totalRatings
    ? rated.reduce((n, s) => n + (s.ratingAvg ?? 0) * (s.ratingCount ?? 0), 0) / totalRatings
    : null;

  const brands = Array.from(new Set(services.flatMap((s) => s.brands)));
  const marqueeItems = [...brands.map((b) => ({ text: b, promise: false })), ...MARQUEE_PROMISES.map((p) => ({ text: p, promise: true }))];

  const acFrom = fromOf("ac");
  const fridgeFrom = fromOf("refrigerator");
  const washerFrom = fromOf("washing_machine");

  const spotlights = [
    {
      image: CATEGORY_MEDIA.ac.gallery[0] ?? CATEGORY_MEDIA.ac.cover,
      eyebrow: "Summer ready",
      title: "AC service before the heat",
      sub: acFrom !== null ? `Filter, coil and drain cleaning from ${formatPrice(acFrom)}` : "Filter, coil and drain cleaning",
      cta: "Book AC service",
      href: "/customer/category/ac",
    },
    {
      image: CATEGORY_MEDIA.refrigerator.gallery[0] ?? CATEGORY_MEDIA.refrigerator.cover,
      eyebrow: "Upfront pricing",
      title: "Itemised quote before any work",
      sub: fridgeFrom !== null ? `Fridge repairs from ${formatPrice(fridgeFrom)}. You approve every part first.` : "You approve every part and charge first.",
      cta: "See fridge repairs",
      href: "/customer/category/refrigerator",
    },
    {
      image: CATEGORY_MEDIA.washing_machine.gallery[0] ?? CATEGORY_MEDIA.washing_machine.cover,
      eyebrow: "30-day warranty",
      title: "Repairs that stay fixed",
      sub: washerFrom !== null ? `Washing machine repairs from ${formatPrice(washerFrom)}, backed for 30 days.` : "Same issue back within 30 days? We fix it free.",
      cta: "Fix my washer",
      href: "/customer/category/washing_machine",
    },
  ];

  const stats: { icon: LucideIcon; value: string; label: string; fill?: boolean }[] = [
    ...(avgRating !== null ? [{ icon: Star, value: avgRating.toFixed(1), label: "Service rating", fill: true }] : []),
    { icon: BadgeCheck, value: "Verified", label: "Technicians" },
    { icon: ShieldCheck, value: "30 days", label: "Repair warranty" },
  ];

  const categoryRows = [...categories]
    .filter((c) => c.list.length >= 2)
    .sort((a, b) => b.list.length - a.list.length)
    .slice(0, 2);

  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] bg-gradient-to-b from-brand-50/70 to-transparent" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12 lg:pb-16">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
              <div className="min-w-0">
                <p className="inline-flex animate-fade-up items-center gap-1.5 rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Visits 9 AM to 7 PM, every day
                </p>
                <h1
                  className="mt-4 animate-fade-up text-balance text-[34px] font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-[48px]"
                  style={{ animationDelay: "80ms" }}
                >
                  Home appliance repair, <span className="text-brand-600">done right</span> at your doorstep
                </h1>
                <p className="mt-3 max-w-lg animate-fade-up text-[15px] leading-6 text-gray-600 sm:text-base" style={{ animationDelay: "160ms" }}>
                  Verified technicians for ACs, fridges, washing machines and more. See the price first, pay after the job.
                </p>

                <div
                  className="mt-7 max-w-xl animate-fade-up rounded-2xl border border-surface-200 bg-white p-4 shadow-card sm:p-6 lg:max-w-none"
                  style={{ animationDelay: "240ms" }}
                >
                  <h2 className="text-lg font-semibold text-gray-600 sm:text-xl">What are you looking for?</h2>
                  <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4">
                    {categories.map((cat, i) => {
                      const media = CATEGORY_MEDIA[cat.id];
                      return (
                        <Link
                          key={cat.id}
                          href={`/customer/category/${cat.id}`}
                          className="group flex animate-scale-in flex-col items-center rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                          style={{ animationDelay: `${320 + i * 60}ms` }}
                        >
                          <span className="block w-full transition-transform duration-300 group-hover:-translate-y-1">
                            {media ? (
                              <Photo
                                src={media.cover}
                                alt=""
                                className="aspect-[4/3] w-full rounded-xl shadow-sm transition-shadow duration-300 group-hover:shadow-card-hover"
                                sizes="(max-width: 640px) 30vw, 160px"
                              />
                            ) : (
                              <ServiceArt category={cat.id} className="aspect-[4/3] w-full rounded-xl" sizes="160px" />
                            )}
                          </span>
                          <span className="mt-2 text-xs font-medium leading-4 text-gray-800 sm:text-[13px]">{SHORT_NAMES[cat.id] ?? cat.name}</span>
                          {cat.from !== null && (
                            <span className="mt-1 rounded-full bg-accent-50 px-1.5 py-px text-[10px] font-medium text-accent-700 sm:text-[11px]">
                              From {formatPrice(cat.from)}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                    <Link
                      href="/customer"
                      className="group flex animate-scale-in flex-col items-center rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                      style={{ animationDelay: "620ms" }}
                    >
                      <span className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 transition-transform duration-300 group-hover:-translate-y-1">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm sm:h-12 sm:w-12">
                          <LayoutGrid className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                        </span>
                      </span>
                      <span className="mt-2 text-xs font-medium leading-4 text-gray-800 sm:text-[13px]">All services</span>
                    </Link>
                  </div>
                </div>

                <dl className="mt-8 grid animate-fade-up grid-cols-3 gap-3 sm:flex sm:gap-10" style={{ animationDelay: "400ms" }}>
                  {stats.map((st) => (
                    <div key={st.label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <st.icon className={cx("h-6 w-6 shrink-0 text-gray-900 sm:h-7 sm:w-7", st.fill && "fill-gray-900")} strokeWidth={1.5} aria-hidden />
                      <div className="flex flex-col-reverse">
                        <dt className="text-xs text-gray-500 sm:text-sm">{st.label}</dt>
                        <dd className="text-base font-semibold leading-6 tabular-nums text-gray-900 sm:text-lg">{st.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Photo collage */}
              <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
                <div className="grid h-[340px] grid-cols-[1.35fr_1fr] grid-rows-2 gap-3 sm:h-[460px] sm:gap-4 lg:h-[560px]">
                  <Photo
                    src={PHOTOS.technicianRepair}
                    alt="FixMate technician repairing a home appliance"
                    className="row-span-2 rounded-3xl shadow-pop"
                    sizes="(max-width: 1024px) 58vw, 330px"
                    priority
                    kenBurns
                  />
                  <div className="animate-float">
                    <Photo
                      src={CATEGORY_MEDIA.ac.cover}
                      alt=""
                      className="h-full rounded-3xl shadow-card-hover"
                      sizes="(max-width: 1024px) 40vw, 240px"
                      priority
                    />
                  </div>
                  <Photo
                    src={CATEGORY_MEDIA.washing_machine.cover}
                    alt=""
                    className="rounded-3xl shadow-card-hover"
                    sizes="(max-width: 1024px) 40vw, 240px"
                  />
                </div>

                {/* Floating trust chip */}
                <div
                  className="absolute bottom-4 left-3 animate-float rounded-2xl border border-white/60 bg-white/80 p-3 pr-4 shadow-pop backdrop-blur-md sm:bottom-8 sm:left-6 lg:-left-8"
                  style={{ animationDelay: "-3s" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400" aria-hidden />
                      <BadgeCheck className="relative h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Verified technicians</p>
                      {avgRating !== null ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                          <Star className="h-3.5 w-3.5 fill-gray-900 text-gray-900" aria-hidden />
                          <span className="font-semibold tabular-nums text-gray-900">{avgRating.toFixed(1)}</span> average rating
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-gray-600">ID and background checked</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating slot chip */}
                <div
                  className="absolute right-3 top-[46%] hidden animate-float items-center gap-2 rounded-xl border border-white/60 bg-white/85 px-3 py-2 shadow-pop backdrop-blur-md sm:flex lg:-right-6"
                  style={{ animationDelay: "-1.5s" }}
                  aria-hidden
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-semibold text-gray-900">Slot booked · 1–3 PM</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Marquee strip ──────────────────────────────────────── */}
        {marqueeItems.length > 0 && (
          <section aria-label="Brands we repair" className="border-y border-surface-200 bg-surface-50 py-3.5">
            <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
                {[0, 1].map((copy) => (
                  <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 || undefined}>
                    {marqueeItems.map((item) => (
                      <li key={`${copy}-${item.text}`} className="flex items-center whitespace-nowrap px-5 text-sm sm:px-7">
                        {item.promise ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />{item.text}
                          </span>
                        ) : (
                          <span className="font-semibold tracking-wide text-gray-500">{item.text}</span>
                        )}
                        <span className="ml-5 h-1 w-1 rounded-full bg-gray-300 sm:ml-7" aria-hidden />
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Spotlight banners ──────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" aria-labelledby="spotlight-heading">
          <h2 id="spotlight-heading" className="sr-only">Highlights</h2>
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {spotlights.map((p, i) => (
              <Reveal key={p.title} delay={i * 90} className="w-[300px] shrink-0 snap-start sm:w-[340px] lg:w-auto">
                <Link
                  href={p.href}
                  className="group relative block h-[220px] overflow-hidden rounded-2xl text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:h-[240px]"
                >
                  <Photo src={p.image} alt="" overlay className="!absolute inset-0" sizes="(max-width: 1024px) 340px, 370px" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" aria-hidden />
                  <div className="relative flex h-full flex-col p-5">
                    <span className="w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
                      {p.eyebrow}
                    </span>
                    <h3 className="mt-3 max-w-[85%] text-xl font-bold leading-6 tracking-tight">{p.title}</h3>
                    <p className="mt-1.5 max-w-[85%] text-[13px] leading-5 text-white/85">{p.sub}</p>
                    <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-gray-900 transition-transform duration-300 group-hover:translate-x-0.5">
                      {p.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Most booked ────────────────────────────────────────── */}
        {mostBooked.length > 0 && (
          <Reveal as="section" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <SectionHeading title="Most booked services" subtitle="Top-rated repairs our customers book again and again." />
            <ScrollRow label="Most booked services">
              {mostBooked.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
            </ScrollRow>
          </Reveal>
        )}

        {/* ── Shop by appliance ──────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="appliances-heading">
          <Reveal>
            <div className="mb-5">
              <h2 id="appliances-heading" className="text-xl font-semibold text-gray-900 sm:text-2xl">Repair by appliance</h2>
              <p className="mt-1 text-sm text-gray-500">Specialists for every machine in your home.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {categories.map((cat, i) => {
              const media = CATEGORY_MEDIA[cat.id];
              if (!media) return null;
              return (
                <Reveal key={cat.id} delay={i * 70} className={cx(i === 0 && "col-span-2 lg:col-span-1")}>
                  <Link
                    href={`/customer/category/${cat.id}`}
                    className="group relative block overflow-hidden rounded-2xl text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    <Photo
                      src={media.cover}
                      alt=""
                      overlay
                      className={cx("w-full", i === 0 ? "aspect-[16/9] lg:aspect-[3/4]" : "aspect-[4/5] lg:aspect-[3/4]")}
                      sizes="(max-width: 1024px) 50vw, 220px"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                      <h3 className="text-base font-semibold leading-5 sm:text-lg">{SHORT_NAMES[cat.id] ?? cat.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-4 text-white/80">{media.tagline}</p>
                      {cat.from !== null && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">
                          From {formatPrice(cat.from)}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                        </p>
                      )}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── Per-category rows ──────────────────────────────────── */}
        {categoryRows.map((row) => (
          <Reveal as="section" key={row.id} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <SectionHeading
              title={ROW_TITLES[row.id] ?? row.name}
              action={
                <Link
                  href={`/customer/category/${row.id}`}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-surface-200 px-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  See all <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
            <ScrollRow label={ROW_TITLES[row.id] ?? row.name}>
              {row.list.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
            </ScrollRow>
          </Reveal>
        ))}

        {/* ── How it works ───────────────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-24 bg-surface-50 py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <Reveal className="relative">
              <Photo
                src={PHOTOS.toolsFlatlay}
                alt="Technician tools laid out before a repair"
                className="aspect-[4/3] w-full rounded-3xl shadow-pop lg:aspect-[4/5]"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
              <div className="absolute bottom-4 left-4 right-4 flex animate-float items-center gap-3 rounded-2xl border border-white/60 bg-white/85 p-3 shadow-pop backdrop-blur-md sm:right-auto">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Receipt className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Quote approved</p>
                  <p className="text-xs text-gray-600">Work starts only after you say yes</p>
                </div>
              </div>
            </Reveal>
            <div>
              <Reveal>
                <p className="text-sm font-semibold text-brand-600">How it works</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">From booking to fixed in four steps</h2>
              </Reveal>
              <ol className="mt-8 space-y-3">
                {STEPS.map((step, i) => (
                  <Reveal as="li" key={step.title} delay={i * 90}>
                    <div className="group flex gap-4 rounded-2xl border border-transparent bg-white p-4 shadow-card transition-all duration-300 hover:border-brand-100 hover:shadow-card-hover sm:p-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-base font-bold tabular-nums text-white transition-colors duration-300 group-hover:bg-brand-500">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">{step.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{step.body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Promise ────────────────────────────────────────────── */}
        <section id="promise" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
          <Reveal>
            <div className="grid gap-10 rounded-3xl border border-surface-200 p-6 sm:p-10 lg:grid-cols-[1fr_1.5fr]">
              <div>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-4 ring-brand-100">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.7} aria-hidden />
                  <Wrench className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-white p-1 text-brand-600 ring-1 ring-brand-100" strokeWidth={2} aria-hidden />
                </span>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-900">The FixMate promise</h2>
                <p className="mt-2 text-gray-600">Clear rules for every booking, so you always know what you are paying for and who is coming to your home.</p>
              </div>
              <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {PROMISES.map((p) => (
                  <li key={p.title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-gray-900">
                      <p.icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ── Partner CTA ────────────────────────────────────────── */}
        <section id="partners" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-6 sm:px-6">
          <Reveal>
            <Link
              href="/login"
              className="group relative grid overflow-hidden rounded-3xl bg-gray-900 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:grid-cols-[1.2fr_1fr]"
            >
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
              <div className="relative z-10 p-6 sm:p-10">
                <p className="text-sm font-medium text-brand-300">For professionals</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Are you an appliance technician?</h2>
                <p className="mt-2 max-w-md text-white/70">Register as a FixMate professional for steady jobs near you, transparent payouts and a simple app to manage your day.</p>
                <ul className="mt-5 space-y-2 text-sm text-white/85">
                  {["Jobs matched to your skills and area", "Weekly payouts with full breakdown", "Flexible hours, you choose your slots"].map((t) => (
                    <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-300" strokeWidth={2.5} aria-hidden />{t}</li>
                  ))}
                </ul>
                <span className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-gray-900 transition-colors group-hover:bg-brand-50">
                  Register as a professional <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
              <div className="relative min-h-[240px] md:min-h-full">
                <Photo
                  src={PHOTOS.technicianPortrait}
                  alt="A FixMate professional technician"
                  className="!absolute inset-0"
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-transparent md:bg-gradient-to-r" aria-hidden />
                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-pop backdrop-blur">
                  <Clock className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                  Choose your own hours
                </div>
              </div>
            </Link>
          </Reveal>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-brand-50 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex items-center gap-4">
                <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm sm:flex">
                  <CalendarCheck className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">Something not working?</h2>
                  <p className="mt-0.5 text-sm text-gray-600">Book a verified technician in under a minute.</p>
                </div>
              </div>
              <Link
                href="/customer"
                className="sheen inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Book a repair <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
