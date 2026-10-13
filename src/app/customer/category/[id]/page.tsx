"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  BadgeCheck, CalendarCheck, ChevronDown, ChevronRight, CircleCheck, CircleMinus, Clock, FileText,
  ShieldCheck, Star, Wallet, Wrench, ArrowRight, SearchX,
} from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { APPLIANCE_CATEGORIES, formatPrice, type Service } from "@/lib/types";
import { CATEGORY_MEDIA, PHOTOS } from "@/lib/media";
import { CategoryIcon, EmptyState, Photo, PriceTag, Rating, Reveal, ServiceArt, formatCount } from "@/components/ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const CATEGORY_TITLES: Record<string, string> = {
  ac: "AC repair & service",
  refrigerator: "Refrigerator repair",
  washing_machine: "Washing machine repair",
  microwave: "Microwave repair",
  dishwasher: "Dishwasher repair",
};

const SHORT_NAMES: Record<string, string> = {
  ac: "AC",
  refrigerator: "Refrigerator",
  washing_machine: "Washing machine",
  microwave: "Microwave",
  dishwasher: "Dishwasher",
};

const HERO_CHIPS = [
  { icon: BadgeCheck, label: "Verified technicians" },
  { icon: FileText, label: "Itemised quote first" },
  { icon: ShieldCheck, label: "30-day warranty" },
];

const WHY = [
  { icon: BadgeCheck, title: "Verified professionals", body: "Background-checked and trained on major brands." },
  { icon: FileText, title: "Itemised quote first", body: "No work starts until you approve the quote." },
  { icon: Wallet, title: "Pay after the repair", body: "Settle the bill once the job is done." },
  { icon: ShieldCheck, title: "30-day repair warranty", body: "Same issue again? We fix it at no labour cost." },
];

const STEPS = [
  { title: "Book a slot", body: "Pick a service and a time that suits you." },
  { title: "Inspection & quote", body: "The technician diagnoses and shares an itemised quote." },
  { title: "Repair & pay", body: "Approve, get it fixed, then pay." },
];

function durationLabel(mins?: number) {
  if (!mins) return null;
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} mins` : `${h} hr${h > 1 ? "s" : ""}`;
}

/* ── Accordion (grid-rows height transition) ───────────────────── */
function Collapse({ open, id, children }: { open: boolean; id: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className={cx(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/* ── Service row ───────────────────────────────────────────────── */
function ServiceRow({ service, index }: { service: Service; index: number }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const href = `/customer/service/${service.id}`;
  const duration = durationLabel(service.durationMins);
  const issues = service.commonIssues.slice(0, 3);

  return (
    <Reveal delay={Math.min(index, 4) * 80}>
      <article className="group relative py-6 sm:py-7">
        <div className="flex gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            {index === 0 && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-accent-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-700">
                Most booked
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline">
                {service.name}
              </Link>
            </h3>
            <Rating value={service.ratingAvg} count={service.ratingCount} className="mt-1.5" />
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <PriceTag prefix="Starts at" price={service.startingPricePaise} list={service.listPricePaise} />
              {duration && (
                <span className="inline-flex items-center gap-1 text-[13px] text-gray-500">
                  <span aria-hidden>•</span>
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {duration}
                </span>
              )}
            </div>

            <div className="my-4 border-t border-dashed border-surface-300" />

            <ul className="space-y-1.5 text-[13px] leading-relaxed text-gray-600 sm:text-sm">
              <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />{service.description}</li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
                {service.visitFeePaise > 0
                  ? `Inspection fee ${formatPrice(service.visitFeePaise)}, shown upfront before you book`
                  : "No inspection fee, pay only for work you approve"}
              </li>
              {issues.length > 0 && (
                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
                  Fixes: {issues.join(", ").toLowerCase()}
                </li>
              )}
            </ul>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={detailsId}
              className="relative z-10 mt-3 inline-flex items-center gap-1 rounded-md text-sm font-semibold text-brand-600 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              {open ? "Hide details" : "View details"}
              <ChevronDown className={cx("h-4 w-4 transition-transform duration-300", open && "rotate-180")} aria-hidden />
            </button>
          </div>

          <div className="relative w-28 shrink-0 self-start sm:w-36">
            <ServiceArt
              category={service.category}
              serviceId={service.id}
              className="aspect-square w-full rounded-xl shadow-sm ring-1 ring-black/5"
              sizes="(max-width: 640px) 112px, 144px"
            />
            <Link
              href={href}
              className="absolute -bottom-4 left-1/2 z-10 inline-flex h-9 w-20 -translate-x-1/2 items-center justify-center rounded-lg border border-surface-300 bg-white text-sm font-semibold text-brand-600 shadow-md transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-label={`Book ${service.name}`}
            >
              Book
            </Link>
          </div>
        </div>

        <Collapse open={open} id={detailsId}>
          <div className="relative z-10 mt-5 grid gap-5 rounded-2xl bg-surface-50 p-4 ring-1 ring-surface-200 sm:grid-cols-2 sm:p-5">
            {service.commonIssues.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issues we fix</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {service.commonIssues.map((issue) => (
                    <Link
                      key={issue}
                      href={`${href}?issue=${encodeURIComponent(issue)}`}
                      tabIndex={open ? undefined : -1}
                      className="rounded-full border border-surface-200 bg-white px-3 py-1 text-[13px] text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-700"
                    >
                      {issue}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Included</p>
              <ul className="mt-2 space-y-1.5 text-[13px] text-gray-700">
                {[
                  "Inspection and diagnosis by a verified technician",
                  "Itemised quote before any work starts",
                  "30-day warranty on the repair",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Not included</p>
              <ul className="mt-2 space-y-1.5 text-[13px] text-gray-700">
                {[
                  "Spare parts, quoted separately and fitted only with your approval",
                  "Civil or electrical work outside the appliance",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><CircleMinus className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
            {service.brands.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brands we service</p>
                <p className="mt-1.5 text-[13px] text-gray-700">{service.brands.join(" · ")}</p>
              </div>
            )}
          </div>
        </Collapse>
      </article>
    </Reveal>
  );
}

/* ── FAQ ───────────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-surface-200 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium text-gray-900 focus:outline-none focus-visible:text-brand-700"
        >
          {q}
          <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-100 transition-all duration-300", open && "rotate-180 bg-brand-50 text-brand-600")}>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </h3>
      <Collapse open={open} id={id}>
        <p className="pb-4 pr-10 text-sm leading-relaxed text-gray-600">{a}</p>
      </Collapse>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function CategoryPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const state = useDemoState();
  const category = APPLIANCE_CATEGORIES.find((c) => c.id === id);
  const media = CATEGORY_MEDIA[id];

  const services = useMemo(
    () =>
      state.services
        .filter((s) => s.enabled && s.category === id)
        .sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)),
    [state.services, id],
  );

  const stats = useMemo(() => {
    let weight = 0;
    let sum = 0;
    for (const s of services) {
      if (s.ratingAvg !== undefined && s.ratingCount) {
        weight += s.ratingCount;
        sum += s.ratingAvg * s.ratingCount;
      }
    }
    const minPrice = services.length ? Math.min(...services.map((s) => s.startingPricePaise)) : undefined;
    return { rating: weight ? sum / weight : undefined, count: weight, minPrice };
  }, [services]);

  const issues = useMemo(() => {
    const map = new Map<string, Service>();
    for (const s of services) for (const issue of s.commonIssues) if (!map.has(issue)) map.set(issue, s);
    return Array.from(map.entries());
  }, [services]);

  if (!category || !media) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="We couldn't find that category"
          description="It may have moved, or the link is incorrect. Browse all appliance services instead."
          action={
            <Link href="/customer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
              Browse services <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
          {APPLIANCE_CATEGORIES.map((c) => (
            <Link key={c.id} href={`/customer/category/${c.id}`} className="inline-flex items-center gap-2 rounded-full border border-surface-200 py-1.5 pl-1.5 pr-3.5 text-sm text-gray-800 hover:border-gray-400">
              <CategoryIcon category={c.id} size="sm" className="!rounded-full" />
              {SHORT_NAMES[c.id] ?? c.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const title = CATEGORY_TITLES[id] ?? `${category.name} repair`;
  const short = SHORT_NAMES[id] ?? category.name;
  const gallery = [media.cover, ...media.gallery];
  const thumbs = media.gallery.length ? media.gallery : [PHOTOS.toolsFlatlay];
  const faqs = [
    {
      q: "Is there an inspection fee?",
      a: "Some services carry a small inspection fee, shown on the service card and at checkout before you confirm. Services marked “No inspection fee” have none.",
    },
    {
      q: "Will work start without my approval?",
      a: "No. After diagnosing the problem the technician shares an itemised quote. Work begins only once you approve it, and you can decline.",
    },
    {
      q: "When do I pay?",
      a: "You pay after the repair is complete, based on the approved quote and any inspection fee.",
    },
    {
      q: "Is the repair covered by a warranty?",
      a: "Yes. Repairs come with a 30-day warranty. If the same issue returns within 30 days, we fix it at no labour cost.",
    },
    {
      q: "What about spare parts?",
      a: `If your ${short.toLowerCase()} needs a part, it is listed separately on the quote with its price, and fitted only with your approval.`,
    },
  ];

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gray-900 text-white">
        <Photo src={media.cover} alt={`${short} being serviced`} className="!absolute inset-0 !bg-gray-900" sizes="(max-width: 1152px) 100vw, 1152px" priority zoom={false} kenBurns />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />

        <div className="relative flex min-h-[340px] items-end gap-8 p-5 sm:min-h-[400px] sm:p-8 lg:min-h-[420px] lg:p-10">
          <div className="max-w-xl">
            <nav aria-label="Breadcrumb" className="animate-fade-up text-[13px] text-white/75">
              <ol className="flex items-center gap-1">
                <li><Link href="/customer" className="hover:text-white">Home</Link></li>
                <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
                <li aria-current="page" className="text-white">{short}</li>
              </ol>
            </nav>
            <h1 className="mt-3 animate-fade-up text-3xl font-bold leading-tight tracking-tight [animation-delay:80ms] sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-2 animate-fade-up text-[15px] text-white/80 [animation-delay:140ms] sm:text-base">{media.tagline}</p>

            <div className="mt-4 flex animate-fade-up flex-wrap items-center gap-2.5 [animation-delay:200ms]">
              {stats.rating !== undefined && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-white text-white" aria-hidden />
                  <span className="font-semibold tabular-nums">{stats.rating.toFixed(2)}</span>
                  <span className="text-white/75 tabular-nums">({formatCount(stats.count)} ratings)</span>
                </span>
              )}
              {stats.minPrice !== undefined && (
                <span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-gray-900 shadow-sm">
                  From {formatPrice(stats.minPrice)}
                </span>
              )}
            </div>

            <ul className="mt-5 flex flex-wrap gap-2">
              {HERO_CHIPS.map((c, i) => (
                <li
                  key={c.label}
                  className="inline-flex animate-fade-up items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-md sm:text-[13px]"
                  style={{ animationDelay: `${280 + i * 90}ms` }}
                >
                  <c.icon className="h-3.5 w-3.5" aria-hidden />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative ml-auto hidden h-64 w-56 shrink-0 self-center lg:block" aria-hidden>
            {thumbs.slice(0, 2).map((src, i) => (
              <div
                key={i}
                className={cx(
                  "absolute animate-float overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/90",
                  i === 0 ? "right-0 top-0 h-44 w-40 rotate-3" : "bottom-0 left-0 h-40 w-36 -rotate-6",
                )}
                style={{ animationDelay: `${i * 1.4}s` }}
              >
                <Image src={src} alt="" fill sizes="160px" placeholder="blur" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category sub-nav ── */}
      <nav
        aria-label="Appliance categories"
        className="z-30 -mx-4 mt-5 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:sticky md:top-[73px]"
      >
        <ul className="scrollbar-none flex gap-2 overflow-x-auto">
          {APPLIANCE_CATEGORIES.map((c) => {
            const active = c.id === id;
            const img = CATEGORY_MEDIA[c.id]?.cover;
            return (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/customer/category/${c.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-medium transition-all",
                    active
                      ? "border-gray-900 bg-gray-900 text-white shadow-md"
                      : "border-surface-200 bg-white text-gray-800 hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-sm",
                  )}
                >
                  <span className="relative h-8 w-8 overflow-hidden rounded-full bg-surface-100">
                    {img && <Image src={img} alt="" fill sizes="32px" className="object-cover" />}
                  </span>
                  {SHORT_NAMES[c.id] ?? c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Main ── */}
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <section aria-labelledby="services-heading" className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="services-heading" className="text-xl font-semibold text-gray-900 sm:text-2xl">{short} services</h2>
              <p className="mt-1 text-sm text-gray-500">
                {services.length} {services.length === 1 ? "service" : "services"} · prices shown before you book
              </p>
            </div>
          </div>

          {services.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={<Wrench className="h-6 w-6" />}
                title={`No ${short.toLowerCase()} services available right now`}
                description="Please check back soon, or browse another appliance."
                action={<Link href="/customer" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Browse all services</Link>}
              />
            </div>
          ) : (
            <div className="mt-2 divide-y divide-surface-200">
              {services.map((s, i) => <ServiceRow key={s.id} service={s} index={i} />)}
            </div>
          )}
        </section>

        <aside className="min-w-0">
          <div className="space-y-5 lg:sticky lg:top-[146px]">
            <Reveal>
              <div className="rounded-2xl border border-surface-200 p-5">
                <h2 className="text-base font-semibold text-gray-900">Why Homelyo</h2>
                <ul className="mt-4 space-y-4">
                  {WHY.map((w) => (
                    <li key={w.title} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <w.icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-gray-900">{w.title}</span>
                        <span className="block text-[13px] text-gray-500">{w.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="relative h-52 overflow-hidden rounded-2xl">
                <Photo src={PHOTOS.technicianRepair} alt="Technician repairing an appliance" className="!absolute inset-0" sizes="(max-width: 1024px) 100vw, 340px" overlay />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Homelyo verified
                  </span>
                  <p className="mt-2 text-lg font-semibold leading-snug">Verified, background-checked technicians</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="rounded-2xl bg-surface-100 p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <CalendarCheck className="h-[18px] w-[18px]" aria-hidden /> How it works
                </h2>
                <ol className="relative mt-4 space-y-4">
                  <span className="absolute bottom-3 left-[13px] top-3 w-px bg-surface-300" aria-hidden />
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="relative flex gap-3">
                      <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">{i + 1}</span>
                      <span>
                        <span className="block text-sm font-medium text-gray-900">{s.title}</span>
                        <span className="block text-[13px] text-gray-600">{s.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        </aside>
      </div>

      {/* ── Common problems ── */}
      {issues.length > 0 && (
        <Reveal as="section" className="mt-16">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Common problems we fix</h2>
          <p className="mt-1 text-sm text-gray-500">Pick your problem to go straight to the right service.</p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {issues.map(([issue, svc]) => (
              <li key={issue}>
                <Link
                  href={`/customer/service/${svc.id}?issue=${encodeURIComponent(issue)}`}
                  className="group inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm"
                >
                  <Wrench className="h-4 w-4 text-gray-400 transition-colors group-hover:text-brand-500" aria-hidden />
                  {issue}
                  <ChevronRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* ── Gallery ── */}
      <Reveal as="section" className="mt-16">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Our work, in your home</h2>
        <div className="scrollbar-none -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {[...gallery, PHOTOS.technicianPortrait, PHOTOS.toolsFlatlay].slice(0, 3).map((src, i) => (
            <Photo
              key={i}
              src={src}
              alt={i < gallery.length ? `${short} in a home` : i === gallery.length ? "Homelyo technician" : "Technician tools"}
              className={cx("h-48 w-60 shrink-0 snap-start rounded-2xl sm:h-56 sm:w-auto", i === 0 && "sm:col-span-2")}
              sizes="(max-width: 640px) 240px, (max-width: 1152px) 50vw, 560px"
            />
          ))}
        </div>
      </Reveal>

      {/* ── FAQ ── */}
      <Reveal as="section" className="mt-16 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Frequently asked questions</h2>
          <p className="mt-2 text-sm text-gray-500">About booking {/^[aeiou]/i.test(short) ? "an" : "a"} {short === "AC" ? "AC" : short.toLowerCase()} technician with Homelyo.</p>
        </div>
        <div className="rounded-2xl border border-surface-200 px-5">
          {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </Reveal>
    </div>
  );
}
