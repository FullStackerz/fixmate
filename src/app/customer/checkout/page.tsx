"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, Banknote, Building2, CalendarDays, Check, CircleAlert, Clock, CreditCard, FileText,
  Home, Lock, MapPin, Phone, Plus, ShieldCheck, ShoppingBag, Smartphone, Undo2, type LucideIcon,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import { createBooking, estimateBookingPrice, setCurrentRole } from "@/lib/store";
import { APPLIANCE_CATEGORIES, formatPrice, type BookingAddress } from "@/lib/types";
import { clearBookingDraft, loadBookingDraft, localDateString, type BookingDraft } from "@/lib/booking-draft";
import { Button, EmptyState, Input, LoadingSpinner, ServiceArt } from "@/components/ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const NEW = "__new";

const LABELS: { value: string; icon: LucideIcon }[] = [
  { value: "Home", icon: Home },
  { value: "Office", icon: Building2 },
  { value: "Other", icon: MapPin },
];

const labelIcon = (label: string) => LABELS.find((l) => l.value === label)?.icon ?? MapPin;

const PROMISES: { icon: LucideIcon; label: string }[] = [
  { icon: BadgeCheck, label: "Verified, background-checked technicians" },
  { icon: FileText, label: "Itemised quote before any work starts" },
  { icon: ShieldCheck, label: "30-day warranty on every repair" },
];

function slotStartMinutes(slot: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function formatLongDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  if (!keys.includes(e.key)) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > [role="radio"], :scope > * > [role="radio"]'));
  if (radios.length === 0) return;
  e.preventDefault();
  const current = radios.indexOf(document.activeElement as HTMLButtonElement);
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const next = (current + (forward ? 1 : -1) + radios.length) % radios.length;
  radios[next].focus();
  radios[next].click();
}

const addressKey = (a: BookingAddress) => `${a.fullAddress.trim().toLowerCase()}|${a.pinCode}`;

type Errors = Partial<Record<"fullAddress" | "pinCode", string>>;

export default function CheckoutPage() {
  const state = useDemoState();
  const router = useRouter();

  useEffect(() => { setCurrentRole("customer"); }, []);

  /* Draft (sessionStorage) — undefined while loading */
  const [draft, setDraft] = useState<BookingDraft | null | undefined>(undefined);
  useEffect(() => { setDraft(loadBookingDraft()); }, []);

  const service = draft ? state.services.find((s) => s.id === draft.serviceId) : undefined;
  const customer = state.customers[0];

  /* Saved addresses from previous bookings (most recent first, unique) */
  const savedAddresses = useMemo(() => {
    const seen = new Set<string>();
    const out: BookingAddress[] = [];
    const mine = state.bookings
      .filter((b) => !customer || b.customerId === customer.id)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const b of mine) {
      const k = addressKey(b.address);
      if (!seen.has(k)) { seen.add(k); out.push(b.address); }
    }
    return out.slice(0, 4);
  }, [state.bookings, customer]);

  const [selected, setSelected] = useState<string>("");
  const [label, setLabel] = useState("Home");
  const [fullAddress, setFullAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);

  // Default to the most recent saved address, or the new-address form.
  useEffect(() => {
    if (selected) return;
    setSelected(savedAddresses[0] ? addressKey(savedAddresses[0]) : NEW);
  }, [savedAddresses, selected]);

  // Animate the progress line after first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);

  if (draft === undefined) return <LoadingSpinner />;

  if (!draft || !service || !service.enabled) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-surface-200 bg-white animate-scale-in">
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title={draft && service && !service.enabled ? "This service is paused" : "Nothing to check out yet"}
          description={
            draft && service && !service.enabled
              ? "The service you picked isn't taking bookings right now. Choose another repair service to continue."
              : "Choose a service, describe the problem and pick a slot. You'll confirm the address here."
          }
          action={
            <Link href="/customer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
              Browse services
            </Link>
          }
        />
      </div>
    );
  }

  const categoryName = APPLIANCE_CATEGORIES.find((c) => c.id === service.category)?.name ?? "Appliance";
  const estimate = estimateBookingPrice(service);
  const savings = service.listPricePaise && service.listPricePaise > service.startingPricePaise
    ? service.listPricePaise - service.startingPricePaise
    : 0;
  const serviceHref = `/customer/service/${service.id}`;

  const now = new Date();
  const today = localDateString(now);
  const slotExpired =
    draft.appointmentDate < today ||
    (draft.appointmentDate === today && slotStartMinutes(draft.appointmentSlot) <= now.getHours() * 60 + now.getMinutes());

  const isNew = selected === NEW;
  const chosenSaved = savedAddresses.find((a) => addressKey(a) === selected);
  const newAddressValid = fullAddress.trim().length > 0 && /^\d{6}$/.test(pinCode);
  const addressReady = isNew ? newAddressValid : !!chosenSaved;
  const canConfirm = (isNew || !!chosenSaved) && !slotExpired && !submitting;

  const validateNew = (): boolean => {
    const errs: Errors = {};
    if (!fullAddress.trim()) errs.fullAddress = "Enter your house number, street and area";
    else if (fullAddress.trim().length < 8) errs.fullAddress = "Add a little more detail so the technician can find you";
    if (!pinCode) errs.pinCode = "Enter your PIN code";
    else if (!/^\d{6}$/.test(pinCode)) errs.pinCode = "PIN code must be 6 digits";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    setSubmitError("");
    if (slotExpired) {
      setSubmitError("Your selected time slot has already started. Please pick a new slot.");
      return;
    }
    let address: BookingAddress;
    if (isNew) {
      if (!validateNew()) {
        showToast("Please check the address details", "error");
        document.getElementById("checkout-address")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      address = { label, fullAddress: fullAddress.trim(), pinCode };
    } else if (chosenSaved) {
      address = chosenSaved;
    } else {
      setSubmitError("Choose an address for the visit.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    // Brief pause so the confirming state is visible and double taps are absorbed.
    await new Promise((r) => setTimeout(r, 450));
    try {
      const booking = createBooking({
        serviceId: draft.serviceId,
        applianceCategory: draft.applianceCategory,
        brand: draft.brand,
        issue: draft.issue,
        description: draft.description,
        address,
        appointmentDate: draft.appointmentDate,
        appointmentSlot: draft.appointmentSlot,
      });
      clearBookingDraft();
      showToast(`Booking ${booking.id} confirmed`, "success");
      router.push(`/customer/bookings/${booking.id}?new=1`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't create your booking. Please try again.";
      console.error("Booking failed", err);
      setSubmitError(message);
      showToast(message, "error");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const progress = addressReady ? 100 : 50;

  const confirmButton = (className = "") => (
    <Button size="lg" onClick={handleConfirm} loading={submitting} disabled={!canConfirm} className={cx("w-full font-semibold", className)}>
      {submitting ? "Confirming…" : "Confirm booking"}
    </Button>
  );

  const errorBox = submitError ? (
    <div className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 animate-fade-in" role="alert">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{submitError}</span>
    </div>
  ) : null;

  return (
    <div className="min-w-0">
      {/* ── Header + progress ─────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-5 sm:mb-8 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-up">
          <Link href={serviceHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {service.name}
          </Link>
          <h1 className="mt-2 text-[28px] font-bold leading-tight text-gray-900 sm:text-3xl">Checkout</h1>
        </div>

        <ol className="relative flex w-full max-w-md items-start justify-between animate-fade-up md:w-[26rem]" style={{ animationDelay: "80ms" }} aria-label="Checkout progress">
          <span className="absolute left-[16.66%] right-[16.66%] top-4 h-0.5 rounded-full bg-surface-200" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-500 to-brand-500 transition-[width] duration-1000 ease-out"
              style={{ width: mounted ? `${progress}%` : "0%" }}
            />
          </span>
          {[
            { label: "Service", status: "done" as const },
            { label: "Address", status: addressReady ? ("done" as const) : ("current" as const) },
            { label: "Confirm", status: addressReady ? ("current" as const) : ("upcoming" as const) },
          ].map((s, i) => (
            <li key={s.label} className="relative z-10 flex w-1/3 flex-col items-center gap-1.5" aria-current={s.status === "current" ? "step" : undefined}>
              <span
                className={cx(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-white transition-colors duration-500",
                  s.status === "done" && "bg-accent-500 text-white",
                  s.status === "current" && "bg-brand-500 text-white shadow-[0_0_0_4px_theme(colors.brand.100)]",
                  s.status === "upcoming" && "bg-surface-100 text-gray-400",
                )}
              >
                {s.status === "done" ? <Check className="h-4 w-4 animate-scale-in" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cx("text-xs font-medium", s.status === "upcoming" ? "text-gray-400" : "text-gray-900")}>
                {s.label}
                <span className="sr-only">{s.status === "done" ? " (completed)" : s.status === "current" ? " (current step)" : ""}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-5">
          {/* Booking for */}
          <section className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card animate-fade-up sm:p-5" style={{ animationDelay: "120ms" }} aria-labelledby="booking-for">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="booking-for" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Booking for</h2>
              <Link href={serviceHref} className="rounded-md px-2 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50">Change</Link>
            </div>
            <div className="flex gap-4">
              <ServiceArt category={service.category} serviceId={service.id} sizes="96px" className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900 sm:text-lg">{service.name}</p>
                <p className="mt-0.5 break-words text-sm text-gray-600">
                  {draft.issue}{draft.brand ? <span className="text-gray-400"> · {draft.brand}</span> : null}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 font-medium text-gray-700">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatLongDate(draft.appointmentDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 font-medium tabular-nums text-gray-700">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> {draft.appointmentSlot.replace(" - ", " – ")}
                  </span>
                  {draft.photoNames && draft.photoNames.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-1 font-medium text-gray-700">
                      {draft.photoNames.length} photo{draft.photoNames.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {slotExpired && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <span className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> This time slot has already started.
                </span>
                <Link href={serviceHref} className="font-semibold text-warning-700 underline underline-offset-2">Pick a new slot</Link>
              </div>
            )}
          </section>

          {/* Address */}
          <section
            id="checkout-address"
            className="scroll-mt-24 rounded-2xl border border-surface-200 bg-white p-4 shadow-card animate-fade-up sm:p-6"
            style={{ animationDelay: "200ms" }}
            aria-labelledby="address-title"
          >
            <div className="mb-4 flex items-start gap-3">
              <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300", addressReady ? "bg-accent-500 text-white" : "bg-brand-50 text-brand-600")}>
                {addressReady ? <Check className="h-5 w-5 animate-scale-in" strokeWidth={2.75} aria-hidden /> : <MapPin className="h-5 w-5" aria-hidden />}
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 id="address-title" className="text-lg font-semibold text-gray-900">Where should we come?</h2>
                <p className="text-sm text-gray-500">The technician will visit this address.</p>
              </div>
            </div>

            <div role="radiogroup" aria-labelledby="address-title" onKeyDown={radioKeys} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {savedAddresses.map((a) => {
                const k = addressKey(a);
                const checked = selected === k;
                const Icon = labelIcon(a.label);
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    onClick={() => { setSelected(k); setSubmitError(""); }}
                    className={cx(
                      "group relative flex min-w-0 items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                      checked ? "border-brand-500 bg-brand-50/60 shadow-[0_0_0_1px_theme(colors.brand.500)]" : "border-surface-200 hover:-translate-y-px hover:border-gray-400 hover:shadow-sm",
                    )}
                  >
                    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", checked ? "bg-brand-500 text-white" : "bg-surface-100 text-gray-600")}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{a.label}</span>
                      <span className="mt-0.5 block break-words text-sm text-gray-600">{a.fullAddress}</span>
                      <span className="mt-0.5 block text-xs tabular-nums text-gray-500">PIN {a.pinCode}</span>
                    </span>
                    <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", checked ? "border-brand-500 bg-brand-500" : "border-surface-300")} aria-hidden>
                      {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={isNew}
                tabIndex={isNew || savedAddresses.length === 0 ? 0 : -1}
                onClick={() => { setSelected(NEW); setSubmitError(""); }}
                className={cx(
                  "flex min-w-0 items-center gap-3 rounded-xl border border-dashed p-3.5 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                  isNew ? "border-brand-500 bg-brand-50/60" : "border-surface-300 hover:border-brand-300 hover:bg-brand-50/40",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Plus className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-brand-600">Add new address</span>
              </button>
            </div>

            {isNew && (
              <div className="mt-5 space-y-4 rounded-xl border border-surface-200 bg-surface-50/60 p-4 animate-fade-up sm:p-5">
                <div>
                  <p id="addr-label" className="mb-2 text-sm font-medium text-gray-700">Save as</p>
                  <div role="radiogroup" aria-labelledby="addr-label" onKeyDown={radioKeys} className="inline-grid grid-cols-3 gap-1 rounded-xl bg-white p-1 ring-1 ring-surface-200">
                    {LABELS.map(({ value, icon: Icon }) => {
                      const checked = label === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          tabIndex={checked ? 0 : -1}
                          onClick={() => setLabel(value)}
                          className={cx(
                            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:px-4",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                            checked ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:bg-surface-100",
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden /> {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Input
                  label="Full address"
                  required
                  value={fullAddress}
                  onChange={(e) => { setFullAddress(e.target.value); if (errors.fullAddress) setErrors((x) => ({ ...x, fullAddress: undefined })); }}
                  onBlur={(e) => { const v = e.target.value; if (v && v.trim().length < 8) setErrors((x) => ({ ...x, fullAddress: "Add a little more detail so the technician can find you" })); }}
                  placeholder="Flat / house no., street, area, city"
                  error={errors.fullAddress}
                  autoComplete="street-address"
                  className="bg-white"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="PIN code"
                    required
                    inputMode="numeric"
                    value={pinCode}
                    onChange={(e) => { setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6)); if (errors.pinCode) setErrors((x) => ({ ...x, pinCode: undefined })); }}
                    onBlur={(e) => { const v = e.target.value; if (v && !/^\d{6}$/.test(v)) setErrors((x) => ({ ...x, pinCode: "PIN code must be 6 digits" })); }}
                    placeholder="e.g. 560034"
                    maxLength={6}
                    error={errors.pinCode}
                    hint="6 digits"
                    autoComplete="postal-code"
                    className="bg-white tabular-nums"
                  />
                  <Input
                    label="Contact number"
                    icon={Phone}
                    value={customer ? `+91 ${customer.phone}` : ""}
                    readOnly
                    hint="From your profile"
                    className="bg-surface-100 tabular-nums text-gray-600"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card animate-fade-up sm:p-6" style={{ animationDelay: "280ms" }} aria-labelledby="payment-title">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <Lock className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="payment-title" className="text-lg font-semibold text-gray-900">Pay after service</h2>
                <p className="text-sm text-gray-500">Nothing is charged now. Pay once the repair is done.</p>
                <ul className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { icon: Smartphone, label: "UPI" },
                    { icon: CreditCard, label: "Card" },
                    { icon: Banknote, label: "Cash" },
                  ].map(({ icon: Icon, label: l }) => (
                    <li key={l} className="flex flex-col items-center gap-1.5 rounded-xl border border-surface-200 py-3 text-xs font-medium text-gray-700">
                      <Icon className="h-5 w-5 text-gray-500" aria-hidden /> {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Cancellation */}
          <section className="flex items-start gap-3 rounded-2xl bg-surface-100 p-4 animate-fade-up sm:p-5" style={{ animationDelay: "340ms" }} aria-labelledby="cancel-title">
            <Undo2 className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" aria-hidden />
            <div className="min-w-0">
              <h2 id="cancel-title" className="text-sm font-semibold text-gray-900">Cancellation policy</h2>
              <p className="mt-0.5 text-sm leading-6 text-gray-600">
                Free cancellation before the technician is on the way. Manage or cancel your visit from My bookings.
              </p>
            </div>
          </section>
        </div>

        {/* ── Summary ───────────────────────────────────────────── */}
        <aside className="min-w-0 lg:sticky lg:top-24" aria-label="Payment summary">
          <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card animate-fade-up" style={{ animationDelay: "160ms" }}>
            <div className="flex items-center gap-3 border-b border-surface-200 p-4 sm:p-5">
              <ServiceArt category={service.category} serviceId={service.id} sizes="48px" className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">Payment summary</h2>
                <p className="truncate text-sm text-gray-500">{service.name} · {categoryName}</p>
              </div>
            </div>
            <dl className="space-y-3 p-4 text-sm sm:p-5">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-600">Inspection fee</dt>
                <dd className="tabular-nums text-gray-900">{estimate.visitFeePaise > 0 ? formatPrice(estimate.visitFeePaise) : "Free"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-600">Repair starts at</dt>
                <dd className="flex items-baseline gap-1.5 tabular-nums text-gray-900">
                  {savings > 0 && <span className="text-xs text-gray-400 line-through">{formatPrice(service.listPricePaise ?? 0)}</span>}
                  {formatPrice(estimate.startingPricePaise)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-dashed border-surface-300 pt-3">
                <dt className="text-base font-semibold text-gray-900">Estimated total</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900">{formatPrice(estimate.totalPaise)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-accent-50 px-3 py-2 text-accent-700">
                  <dt className="text-sm font-medium">You save</dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatPrice(savings)}</dd>
                </div>
              )}
            </dl>
            <p className="mx-4 rounded-xl bg-surface-100 px-3 py-2.5 text-xs leading-5 text-gray-600 sm:mx-5">
              Final price confirmed in an itemised quote after inspection. Pay after the repair.
            </p>
            <div className="hidden space-y-3 p-5 lg:block">
              {errorBox}
              {confirmButton()}
              {!addressReady && !slotExpired && (
                <p className="text-center text-xs text-gray-500">{isNew ? "Enter your address and 6-digit PIN code to confirm" : "Choose an address to confirm"}</p>
              )}
            </div>
            <div className="h-4 lg:hidden" />
          </div>

          <ul className="mt-4 space-y-2.5 rounded-2xl bg-surface-100 px-4 py-4 text-sm text-gray-700 animate-fade-up" style={{ animationDelay: "240ms" }}>
            {PROMISES.map(({ icon: Icon, label: l }) => (
              <li key={l} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {l}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Mobile: sticky confirm bar */}
      <MobileBar>
        {errorBox && <div className="mb-3">{errorBox}</div>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tabular-nums text-gray-900">{formatPrice(estimate.totalPaise)}</p>
            <p className="truncate text-xs text-gray-500">{addressReady ? "Est. total · pay later" : isNew ? "Add your address" : "Choose an address"}</p>
          </div>
          {confirmButton("w-auto flex-1 px-4")}
        </div>
      </MobileBar>
    </div>
  );
}

function MobileBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-surface-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
      {children}
    </div>
  );
}
