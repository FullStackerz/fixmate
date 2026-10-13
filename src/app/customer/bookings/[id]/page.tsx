"use client";

import { Suspense, useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, Ban, Banknote, CalendarDays, Check, ChevronRight, CircleCheck, ClipboardList,
  CreditCard, FileSearch, MapPin, MessageSquare, Navigation, Printer, Receipt, Send,
  ShieldCheck, Smartphone, Star, StickyNote, TriangleAlert, UserRound, Wrench, X,
  type LucideIcon,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import {
  cancelBooking, respondToQuote, recordDemoPayment,
  sendDemoMessage, getBookingMessages, submitRating, setCurrentRole,
} from "@/lib/store";
import {
  APPLIANCE_CATEGORIES, formatPrice, VALID_TRANSITIONS,
  type BookingStatus, type Quote, type QuoteLine,
} from "@/lib/types";
import {
  Card, CardHeader, Badge, StatusBadge, Button, Modal, Textarea, EmptyState,
  Avatar, DetailItem, ServiceArt,
} from "@/components/ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ── Progress steps ───────────────────────────────────────────── */

const STEPS = ["Booked", "Assigned", "On the way", "Inspection", "Quote", "Repair", "Completed"] as const;

/** Index of the step currently in progress for each booking status. */
const STEP_INDEX: Record<BookingStatus, number> = {
  pending_assignment: 0,
  assigned: 1,
  en_route: 2,
  arrived: 3,
  diagnosing: 3,
  quote_pending: 4,
  quote_rejected: 4,
  quote_approved: 5,
  repairing: 5,
  completed: 7,
  payment_pending: 7,
  closed: 7,
  disputed: 7,
  cancelled: -1,
};

const PAYMENT_METHODS: { value: string; label: string; description: string; icon: LucideIcon }[] = [
  { value: "UPI", label: "UPI", description: "GPay, PhonePe, Paytm or any UPI app", icon: Smartphone },
  { value: "Card", label: "Card", description: "Credit or debit card", icon: CreditCard },
  { value: "Cash", label: "Cash", description: "Paid directly to the technician", icon: Banknote },
];

const QUOTE_BADGE: Record<string, { label: string; variant: "warning" | "success" | "danger" | "default" }> = {
  pending: { label: "Awaiting your approval", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Declined", variant: "danger" },
  superseded: { label: "Replaced", variant: "default" },
  draft: { label: "Draft", variant: "default" },
};

const KIND_LABELS: Record<QuoteLine["kind"], string> = {
  labor: "Labour",
  part: "Part",
  fee: "Fee",
  tax: "Tax",
  discount: "Discount",
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function lineAmount(line: QuoteLine) {
  const amount = formatPrice(line.unitPricePaise * line.quantity);
  return line.kind === "discount" ? `−${amount}` : amount;
}

function titleCase(s: string) {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const state = useDemoState();
  const bookingId = params.id as string;

  useEffect(() => { setCurrentRole("customer"); }, []);

  const booking = state.bookings.find((b) => b.id === bookingId);
  const service = booking ? state.services.find((s) => s.id === booking.serviceId) : null;
  const tech = booking?.technicianId ? state.technicians.find((t) => t.id === booking.technicianId) : null;
  const customer = booking ? state.customers.find((c) => c.id === booking.customerId) : null;
  const activeQuote = booking?.activeQuoteId ? state.quotes.find((q) => q.id === booking.activeQuoteId) : null;
  const messages = booking ? getBookingMessages(state, booking.id) : [];

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Keep the message list pinned to the newest message without scrolling the page itself.
  useEffect(() => {
    const pin = () => {
      const el = chatScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    pin();
    // Web fonts can change bubble heights after first paint; re-pin once they are ready.
    let active = true;
    document.fonts?.ready.then(() => { if (active) pin(); });
    return () => { active = false; };
  }, [messages.length]);

  if (!booking) {
    return (
      <Card>
        <EmptyState
          icon={<FileSearch aria-hidden />}
          title="Booking not found"
          description={`We couldn't find a booking with ID ${bookingId}. It may have been removed or the link is incorrect.`}
          action={
            <Button variant="secondary" onClick={() => router.push("/customer/bookings")}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to bookings
            </Button>
          }
        />
      </Card>
    );
  }

  const cat = APPLIANCE_CATEGORIES.find((c) => c.id === booking.applianceCategory);
  const canCancel = VALID_TRANSITIONS[booking.status].includes("cancelled");
  const canApproveQuote = booking.status === "quote_pending" && activeQuote?.status === "pending";
  const canPay = (booking.status === "completed" || booking.status === "payment_pending") && booking.paymentStatus === "pending";
  const canRate = (booking.status === "completed" || booking.status === "closed") && !booking.rating;
  const isPaid = booking.paymentStatus === "succeeded";
  const showLocation = !!tech && ["assigned", "en_route", "arrived"].includes(booking.status);
  const serviceName = booking.priceSnapshot?.serviceName ?? service?.name ?? "Appliance repair";
  const customerName = customer?.name ?? "Customer";
  const amountDue = activeQuote?.totalPaise;

  const handleCancel = () => {
    try {
      cancelBooking(booking.id, cancelReason.trim() || "Cancelled by customer");
      showToast("Your booking has been cancelled", "info");
      setCancelOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't cancel the booking", "error");
    }
  };

  const handleQuoteResponse = (decision: "approved" | "rejected") => {
    if (!activeQuote) return;
    try {
      respondToQuote(booking.id, activeQuote.id, decision);
      showToast(
        decision === "approved" ? "Quote approved. Your technician will start the repair." : "Quote declined. Your technician has been notified.",
        decision === "approved" ? "success" : "info",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't update the quote", "error");
    }
  };

  const handlePayment = () => {
    try {
      recordDemoPayment(booking.id, paymentMethod);
      showToast("Payment successful. Thank you!", "success");
      setPaymentOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Payment failed", "error");
    }
  };

  const handleRating = () => {
    try {
      submitRating(booking.id, rating, feedback);
      showToast("Thanks for your feedback", "success");
      setRatingOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't submit your rating", "error");
    }
  };

  const handleSendMessage = () => {
    const text = chatMsg.trim();
    if (!text) return;
    try {
      sendDemoMessage(booking.id, "customer", customerName.split(" ")[0], text);
      setChatMsg("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Message not sent", "error");
    }
  };

  const partsUsed = (booking.partsUsed ?? []).map((p) => ({
    ...p,
    name: state.parts.find((sp) => sp.id === p.partId)?.name ?? p.partId,
  }));

  return (
    <div className="min-w-0">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/customer" className="hover:text-gray-900">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />
        <Link href="/customer/bookings" className="hover:text-gray-900">My bookings</Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />
        <span className="font-mono text-[13px] font-medium text-gray-900" aria-current="page">{booking.id}</span>
      </nav>

      <Suspense fallback={null}>
        <BookingConfirmedBanner bookingId={booking.id} date={booking.appointmentDate} slot={booking.appointmentSlot} />
      </Suspense>

      <div className="mb-6 flex flex-col gap-4 border-b border-surface-200 pb-6 sm:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ServiceArt category={booking.applianceCategory} serviceId={booking.serviceId} sizes="80px" className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{serviceName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <StatusBadge status={booking.status} />
              <span className="min-w-0 break-words">{booking.issue}</span>
            </div>
          </div>
        </div>
        {(canCancel || canRate || canPay) && (
          <div className="flex flex-wrap items-center gap-2">
            {canCancel && (
              <Button variant="secondary" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" aria-hidden /> Cancel booking
              </Button>
            )}
            {canRate && (
              <Button variant="secondary" onClick={() => setRatingOpen(true)}>
                <Star className="h-4 w-4" aria-hidden /> Rate service
              </Button>
            )}
            {canPay && (
              <Button onClick={() => setPaymentOpen(true)} className="font-semibold">
                <CreditCard className="h-4 w-4" aria-hidden /> Pay now
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <ProgressCard status={booking.status} cancelReason={booking.cancelReason} />

          {canPay && amountDue !== undefined && (
            <Card className="flex flex-col gap-4 border-brand-200 bg-brand-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <CircleCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">Repair completed</p>
                  <p className="text-sm text-gray-600">
                    Amount due <span className="font-semibold tabular-nums text-gray-900">{formatPrice(amountDue)}</span>
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={() => setPaymentOpen(true)} className="w-full font-semibold sm:w-auto">
                Pay now
              </Button>
            </Card>
          )}

          {activeQuote && (
            <QuoteCard
              quote={activeQuote}
              canRespond={canApproveQuote}
              onApprove={() => handleQuoteResponse("approved")}
              onDecline={() => handleQuoteResponse("rejected")}
            />
          )}

          {(booking.completionNotes || partsUsed.length > 0) && (
            <Card>
              <CardHeader title="Work summary" description="Notes from your technician" icon={StickyNote} />
              <div className="space-y-4 px-5 pb-5">
                {booking.completionNotes && (
                  <p className="text-sm leading-6 text-gray-700">{booking.completionNotes}</p>
                )}
                {partsUsed.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-500">Parts used</p>
                    <ul className="divide-y divide-surface-100 rounded-lg border border-surface-200">
                      {partsUsed.map((p) => (
                        <li key={p.partId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate text-gray-700">{p.name}</span>
                          <span className="shrink-0 tabular-nums text-gray-500">Qty {p.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {booking.rating ? (
            <Card>
              <CardHeader title="Your rating" icon={Star} />
              <div className="px-5 pb-5">
                <StarDisplay value={booking.rating} size="h-5 w-5" />
                {booking.feedback && (
                  <p className="mt-3 text-sm leading-6 text-gray-700">&ldquo;{booking.feedback}&rdquo;</p>
                )}
              </div>
            </Card>
          ) : canRate ? (
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">How was your service?</p>
                <p className="text-sm text-gray-500">Your rating helps us keep service quality high.</p>
              </div>
              <Button variant="secondary" onClick={() => setRatingOpen(true)} className="w-full sm:w-auto">
                <Star className="h-4 w-4 fill-current text-amber-400" aria-hidden /> Rate service
              </Button>
            </Card>
          ) : null}

          {/* Chat */}
          <Card>
            <CardHeader
              title="Messages"
              description={tech ? `Chat with ${tech.name}` : "Messages about this booking"}
              icon={MessageSquare}
            />
            <div
              ref={chatScrollRef}
              className={cx("mx-5 flex flex-col-reverse overflow-y-auto rounded-lg border border-surface-200 bg-surface-50 p-4", messages.length > 0 ? "max-h-80" : "py-8")}
              aria-live="polite"
            >
              {/* column-reverse keeps the newest message in view without scrolling the page */}
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageSquare className="mb-2 h-6 w-6 text-gray-300" aria-hidden />
                    <p className="text-sm text-gray-500">No messages yet</p>
                    <p className="text-xs text-gray-400">Send a message to your technician about this job.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender === "customer";
                    return (
                      <div key={msg.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cx("flex max-w-[85%] flex-col sm:max-w-[75%]", mine ? "items-end" : "items-start")}>
                          <p className="mb-1 px-1 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{mine ? "You" : msg.senderName}</span>
                            <span className="mx-1.5 text-gray-300" aria-hidden>·</span>
                            <time dateTime={msg.timestamp} className="tabular-nums">{formatTime(msg.timestamp)}</time>
                          </p>
                          <div
                            className={cx(
                              "break-words rounded-2xl px-3.5 py-2 text-sm leading-6",
                              mine
                                ? "rounded-br-md bg-brand-500 text-white"
                                : "rounded-bl-md border border-surface-200 bg-white text-gray-800",
                            )}
                          >
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <form
              className="flex gap-2 p-5"
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            >
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <input
                id="chat-input"
                type="text"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                placeholder="Write a message…"
                autoComplete="off"
                className="h-10 min-w-0 flex-1 rounded-lg border border-surface-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
              <Button type="submit" disabled={!chatMsg.trim()} aria-label="Send message" className="w-10 px-0">
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </Card>
        </div>

        {/* ── Side column ── */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <Card>
            <CardHeader title="Booking details" icon={ClipboardList} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-surface-200 p-5">
              <DetailItem label="Booking ID" value={<span className="font-mono text-[13px]">{booking.id}</span>} />
              <DetailItem label="Appliance" value={cat?.name ?? titleCase(booking.applianceCategory)} />
              <DetailItem label="Brand" value={booking.brand || "Not specified"} />
              <DetailItem
                className="col-span-2"
                label="Appointment"
                value={
                  <span className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    <span>
                      {formatDate(booking.appointmentDate)}
                      <span className="block text-gray-500">{booking.appointmentSlot}</span>
                    </span>
                  </span>
                }
              />
              <DetailItem
                className="col-span-2"
                label="Address"
                value={
                  <span className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    <span className="min-w-0 break-words">
                      <span className="font-medium">{booking.address.label}</span>
                      <span className="block text-gray-500">
                        {booking.address.fullAddress} – {booking.address.pinCode}
                      </span>
                    </span>
                  </span>
                }
              />
              <DetailItem className="col-span-2" label="Issue" value={booking.issue} />
              {booking.description && (
                <DetailItem
                  className="col-span-2"
                  label="Description"
                  value={<span className="text-gray-600">{booking.description}</span>}
                />
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Your technician" icon={UserRound} />
            <div className="px-5 pb-5">
              {tech ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={tech.name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{tech.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current text-amber-400" aria-hidden />
                          <span className="font-medium tabular-nums text-gray-900">{tech.ratingDemo.toFixed(1)}</span>
                          <span className="sr-only">out of 5</span>
                        </span>
                        <span className="text-gray-300" aria-hidden>·</span>
                        <span className="tabular-nums">{tech.completedJobs} jobs completed</span>
                      </p>
                    </div>
                  </div>
                  {tech.verificationStatus === "approved" && (
                    <Badge variant="success">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified technician
                    </Badge>
                  )}
                  {tech.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tech.skills.map((s) => {
                        const name = APPLIANCE_CATEGORIES.find((c) => c.id === s)?.name ?? titleCase(s);
                        return <Badge key={s} variant="outline">{name}</Badge>;
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg bg-surface-50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-600">
                    <UserRound className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-sm text-gray-600">
                    {booking.status === "cancelled"
                      ? "No technician was assigned to this booking."
                      : "We're matching you with a verified technician near you. You'll be notified once someone is assigned."}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {showLocation && tech && <LocationCard status={booking.status} techName={tech.name} addressLabel={booking.address.label} />}

          <PaymentSummary
            category={booking.applianceCategory}
            serviceId={booking.serviceId}
            serviceName={serviceName}
            snapshot={booking.priceSnapshot ?? (service ? { visitFeePaise: service.visitFeePaise, startingPricePaise: service.startingPricePaise } : undefined)}
            quote={activeQuote ?? undefined}
            cancelled={booking.status === "cancelled"}
            isPaid={isPaid}
            canPay={canPay}
            paymentMethod={booking.paymentMethod}
            paidAt={booking.paidAt}
            onPay={() => setPaymentOpen(true)}
            onReceipt={() => setReceiptOpen(true)}
          />

        </aside>
      </div>

      {/* Receipt */}
      {activeQuote && (
        <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Receipt" description={`Booking ${booking.id}`} size="md">
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-4">
              <DetailItem label="Service" value={serviceName} />
              <DetailItem label="Technician" value={tech?.name ?? "—"} />
              <DetailItem label="Paid on" value={booking.paidAt ? formatDateTime(booking.paidAt) : "—"} />
              <DetailItem label="Payment method" value={booking.paymentMethod ?? "—"} />
            </dl>
            <QuoteTable quote={activeQuote} totalLabel="Total paid" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden /> Print
              </Button>
              <Button onClick={() => setReceiptOpen(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this booking?"
        description="Your technician will be notified. This can't be undone."
        size="sm"
      >
        <Textarea
          label="Reason (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Let us know why you're cancelling"
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep booking</Button>
          <Button variant="danger" onClick={handleCancel}>Cancel booking</Button>
        </div>
      </Modal>

      {/* Payment */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Pay for your repair" size="sm">
        {amountDue !== undefined && (
          <div className="mb-5 flex items-baseline justify-between rounded-lg bg-surface-50 px-4 py-3">
            <span className="text-sm text-gray-500">Amount due</span>
            <span className="text-xl font-semibold tabular-nums text-gray-900">{formatPrice(amountDue)}</span>
          </div>
        )}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Payment method</legend>
          <div className="space-y-2" role="radiogroup">
            {PAYMENT_METHODS.map((m) => {
              const selected = paymentMethod === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    selected ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-surface-200 hover:border-surface-300 hover:bg-surface-50",
                  )}
                >
                  <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected ? "bg-brand-500 text-white" : "bg-surface-100 text-gray-600")}>
                    <m.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{m.label}</span>
                    <span className="block truncate text-xs text-gray-500">{m.description}</span>
                  </span>
                  <span className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-brand-500 bg-brand-500 text-white" : "border-surface-300")}>
                    {selected && <Check className="h-3 w-3" aria-hidden />}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <Button size="lg" className="mt-5 w-full font-semibold" onClick={handlePayment}>
          {amountDue !== undefined ? `Confirm payment of ${formatPrice(amountDue)}` : "Confirm payment"}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Payments are secure and encrypted
        </p>
      </Modal>

      {/* Rating */}
      <Modal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title="Rate your service"
        description={tech ? `How did ${tech.name} do?` : undefined}
        size="sm"
      >
        <div className="mb-5 flex justify-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={rating === s}
              onClick={() => setRating(s)}
              aria-label={`${s} star${s > 1 ? "s" : ""}`}
              className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Star className={cx("h-8 w-8", s <= rating ? "fill-current text-amber-400" : "text-gray-300")} aria-hidden />
            </button>
          ))}
        </div>
        <Textarea
          label="Feedback (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tell us about your experience"
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setRatingOpen(false)}>Not now</Button>
          <Button onClick={handleRating}>Submit rating</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ── Local components ─────────────────────────────────────────── */

/* ── "Booking confirmed" celebration (arriving from checkout with ?new=1) ── */

const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 46 + (i % 3) * 12;
  return {
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist)}px`,
    color: ["bg-brand-500", "bg-accent-400", "bg-warning-400", "bg-brand-300"][i % 4],
    shape: i % 2 === 0 ? "h-2 w-2 rounded-full" : "h-1.5 w-3 rounded-sm",
    delay: `${(i % 4) * 40}ms`,
  };
});

function BookingConfirmedBanner({ bookingId, date, slot }: { bookingId: string; date: string; slot: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNew = searchParams.get("new") === "1";
  const [dismissed, setDismissed] = useState(false);
  if (!isNew || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    router.replace(`/customer/bookings/${bookingId}`, { scroll: false });
  };
  const when = new Date(`${date}T00:00:00`);
  const dateLabel = Number.isNaN(when.getTime())
    ? date
    : when.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section
      role="status"
      aria-label="Booking confirmed"
      className="relative mb-6 overflow-hidden rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 via-white to-brand-50 p-5 animate-scale-in sm:p-6"
    >
      <style>{`
        @keyframes fm-burst { 0% { transform: translate(-50%, -50%) scale(.4); opacity: 1 } 80% { opacity: 1 } 100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(160deg); opacity: 0 } }
        @keyframes fm-draw { from { stroke-dashoffset: 24 } to { stroke-dashoffset: 0 } }
      `}</style>
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-brand-100/60 blur-2xl" aria-hidden />
      <div className="relative flex items-start gap-4 sm:items-center sm:gap-5">
        <div className="relative h-14 w-14 shrink-0" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-accent-400/40 animate-pulse-ring [animation-iteration-count:3]" />
          {BURST.map((p, i) => (
            <span
              key={i}
              className={cx("absolute left-1/2 top-1/2 opacity-0", p.color, p.shape)}
              style={{
                "--tx": p.tx,
                "--ty": p.ty,
                animation: `fm-burst 900ms cubic-bezier(.2,.7,.3,1) ${p.delay} both`,
              } as CSSProperties}
            />
          ))}
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 shadow-lg shadow-accent-500/30 animate-scale-in">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} style={{ animation: "fm-draw 450ms 250ms ease-out both" }} />
            </svg>
          </span>
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Booking confirmed</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Your visit is booked for <span className="font-medium text-gray-900">{dateLabel}</span>, {slot}.
            We&apos;re assigning a verified technician and you&apos;ll see their details here. No payment needed until the repair is done.
          </p>
          <p className="mt-2 font-mono text-xs text-gray-500">Booking ID {bookingId}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
        aria-label="Dismiss confirmation"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

function StarDisplay({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cx(size, s <= value ? "fill-current text-amber-400" : "text-gray-200")} aria-hidden />
      ))}
    </div>
  );
}

function ProgressCard({ status, cancelReason }: { status: BookingStatus; cancelReason?: string }) {
  if (status === "cancelled") {
    return (
      <Card className="flex items-start gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-gray-500">
          <X className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-gray-900">This booking was cancelled</p>
          <p className="mt-0.5 text-sm text-gray-500">{cancelReason || "No reason was provided."}</p>
        </div>
      </Card>
    );
  }

  const current = STEP_INDEX[status];
  const allDone = current >= STEPS.length;

  return (
    <Card>
      <CardHeader
        title="Progress"
        icon={ClipboardList}
        description={allDone ? "All steps complete" : `Step ${current + 1} of ${STEPS.length}`}
      />
      {status === "quote_rejected" && (
        <p className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          You declined the quote. Your technician may send a revised one.
        </p>
      )}
      {status === "disputed" && (
        <p className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          This booking is under review by our support team.
        </p>
      )}

      {/* Desktop: horizontal stepper */}
      <ol className="hidden px-5 pb-6 pt-1 md:flex">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
              {i > 0 && (
                <span
                  className={cx("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-accent-500" : "bg-surface-200")}
                  aria-hidden
                />
              )}
              <StepDot done={done} active={active} index={i} />
              <span className={cx("mt-2 px-1 text-xs", active ? "font-semibold text-brand-700" : done ? "font-medium text-gray-900" : "text-gray-400")}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical stepper */}
      <ol className="px-5 pb-5 md:hidden">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const last = i === STEPS.length - 1;
          return (
            <li key={label} className="relative flex gap-3 pb-4 last:pb-0" aria-current={active ? "step" : undefined}>
              {!last && (
                <span className={cx("absolute left-4 top-8 h-[calc(100%-2rem)] w-0.5 -translate-x-1/2", done ? "bg-accent-500" : "bg-surface-200")} aria-hidden />
              )}
              <StepDot done={done} active={active} index={i} />
              <span className={cx("pt-1.5 text-sm", active ? "font-semibold text-brand-700" : done ? "font-medium text-gray-900" : "text-gray-400")}>
                {label}
                {active && <span className="ml-2 text-xs font-normal text-gray-500">In progress</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function StepDot({ done, active, index }: { done: boolean; active: boolean; index: number }) {
  return (
    <span
      className={cx(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        done && "bg-accent-500 text-white",
        active && "bg-brand-500 text-white ring-4 ring-brand-100",
        !done && !active && "border-2 border-surface-200 bg-white text-gray-400",
      )}
    >
      {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : index + 1}
    </span>
  );
}

function QuoteTable({ quote, totalLabel }: { quote: Quote; totalLabel: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-surface-200">
      <table className="w-full text-sm">
        <thead className="bg-surface-50 text-xs text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Item</th>
            <th scope="col" className="w-12 px-3 py-2 text-right font-medium">Qty</th>
            <th scope="col" className="w-24 px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {quote.lines.map((line) => (
            <tr key={line.id}>
              <td className="px-3 py-2.5 align-top">
                <span className="block break-words text-gray-900">{line.description}</span>
                <span className="text-xs text-gray-400">{KIND_LABELS[line.kind] ?? line.kind}</span>
              </td>
              <td className="px-3 py-2.5 text-right align-top tabular-nums text-gray-600">{line.quantity}</td>
              <td className={cx("whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums", line.kind === "discount" ? "text-accent-700" : "text-gray-900")}>
                {lineAmount(line)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-surface-200 bg-surface-50">
          <tr>
            <th scope="row" colSpan={2} className="px-3 py-3 text-left font-semibold text-gray-900">{totalLabel}</th>
            <td className="whitespace-nowrap px-3 py-3 text-right text-base font-semibold tabular-nums text-gray-900">
              {formatPrice(quote.totalPaise)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function QuoteCard({ quote, canRespond, onApprove, onDecline }: {
  quote: Quote; canRespond: boolean; onApprove: () => void; onDecline: () => void;
}) {
  const badge = QUOTE_BADGE[quote.status] ?? QUOTE_BADGE.draft;
  return (
    <Card className={cx(canRespond && "border-brand-200 ring-1 ring-brand-100")}>
      <CardHeader
        title="Diagnosis and quote"
        description={quote.version > 1 ? `Revised quote · version ${quote.version}` : undefined}
        icon={Wrench}
        action={<Badge variant={badge.variant} dot>{badge.label}</Badge>}
      />
      <div className="space-y-4 px-5 pb-5">
        <div className="rounded-lg bg-surface-50 p-3">
          <p className="text-xs font-medium text-gray-500">Technician&apos;s diagnosis</p>
          <p className="mt-1 text-sm leading-6 text-gray-800">{quote.diagnosis}</p>
        </div>
        <QuoteTable quote={quote} totalLabel="Total" />
        {canRespond && (
          <div className="flex flex-col gap-3 border-t border-surface-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">Work starts only after you approve. You pay once the repair is done.</p>
            <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
              <Button variant="secondary" onClick={onDecline}>Decline</Button>
              <Button onClick={onApprove}>
                <Check className="h-4 w-4" aria-hidden /> Approve quote
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function PaymentSummary({
  category, serviceId, serviceName, snapshot, quote, cancelled, isPaid, canPay, paymentMethod, paidAt, onPay, onReceipt,
}: {
  category: string;
  serviceId?: string;
  serviceName: string;
  snapshot?: { visitFeePaise: number; startingPricePaise: number };
  quote?: Quote;
  cancelled: boolean;
  isPaid: boolean;
  canPay: boolean;
  paymentMethod?: string;
  paidAt?: string;
  onPay: () => void;
  onReceipt: () => void;
}) {
  const badge = isPaid
    ? <Badge variant="success" dot>Paid</Badge>
    : canPay
      ? <Badge variant="warning" dot>Due</Badge>
      : cancelled
        ? <Badge variant="default">No charge</Badge>
        : null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <h2 className="text-lg font-semibold text-gray-900">Payment summary</h2>
        {badge}
      </div>
      <div className="flex items-center gap-3 px-5 pb-4">
        <ServiceArt category={category} serviceId={serviceId} sizes="48px" className="h-12 w-12 shrink-0 rounded-lg" />
        <p className="min-w-0 flex-1 text-sm font-medium text-gray-900">{serviceName}</p>
      </div>

      {quote ? (
        <dl className="space-y-3 border-t border-surface-200 px-5 py-4 text-sm">
          {quote.lines.map((line) => (
            <div key={line.id} className="flex justify-between gap-3">
              <dt className="min-w-0 break-words text-gray-600">
                {line.description}
                {line.quantity > 1 && <span className="tabular-nums text-gray-400"> × {line.quantity}</span>}
              </dt>
              <dd className={cx("shrink-0 tabular-nums", line.kind === "discount" ? "text-accent-700" : "text-gray-900")}>{lineAmount(line)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-dashed border-surface-300 pt-3">
            <dt className="font-semibold text-gray-900">{isPaid ? "Total paid" : canPay ? "Amount due" : "Quote total"}</dt>
            <dd className="text-base font-semibold tabular-nums text-gray-900">{formatPrice(quote.totalPaise)}</dd>
          </div>
        </dl>
      ) : snapshot ? (
        <dl className="space-y-3 border-t border-surface-200 px-5 py-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Inspection fee</dt>
            <dd className="tabular-nums text-gray-900">{snapshot.visitFeePaise > 0 ? formatPrice(snapshot.visitFeePaise) : "Free"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Service starting price</dt>
            <dd className="tabular-nums text-gray-900">{formatPrice(snapshot.startingPricePaise)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-dashed border-surface-300 pt-3">
            <dt className="font-semibold text-gray-900">Estimated total</dt>
            <dd className="text-base font-semibold tabular-nums text-gray-900">{formatPrice(snapshot.visitFeePaise + snapshot.startingPricePaise)}</dd>
          </div>
        </dl>
      ) : null}

      {isPaid ? (
        <div className="space-y-3 border-t border-surface-200 px-5 py-4">
          <dl className="grid grid-cols-2 gap-4">
            <DetailItem label="Method" value={paymentMethod ?? "—"} />
            {paidAt && <DetailItem label="Paid on" value={formatDateTime(paidAt)} />}
          </dl>
          {quote && (
            <Button variant="secondary" className="w-full" onClick={onReceipt}>
              <Receipt className="h-4 w-4" aria-hidden /> View receipt
            </Button>
          )}
        </div>
      ) : canPay ? (
        <div className="border-t border-surface-200 p-5">
          <Button size="lg" className="w-full font-semibold" onClick={onPay}>
            <CreditCard className="h-4 w-4" aria-hidden /> Pay now
          </Button>
        </div>
      ) : (
        <p className="mx-5 mb-5 rounded-lg bg-surface-100 px-3 py-2.5 text-xs leading-5 text-gray-600">
          {cancelled
            ? "This booking was cancelled. You have not been charged."
            : quote
              ? "Payable once the repair is complete."
              : "Final price is confirmed in an itemised quote after inspection. Pay after the repair."}
        </p>
      )}
    </Card>
  );
}

function LocationCard({ status, techName, addressLabel }: { status: BookingStatus; techName: string; addressLabel: string }) {
  const firstName = techName.split(" ")[0];
  const arrived = status === "arrived";
  const enRoute = status === "en_route";
  let headline: ReactNode;
  let sub: string;
  if (arrived) {
    headline = `${firstName} has arrived`;
    sub = `At your ${addressLabel.toLowerCase()} address`;
  } else if (enRoute) {
    headline = <>Arriving in <span className="tabular-nums">~15 min</span></>;
    sub = `${firstName} is on the way · 3.2 km away`;
  } else {
    headline = "Assigned for your slot";
    sub = `${firstName} will head out before your appointment`;
  }

  return (
    <Card>
      <CardHeader title="Technician location" icon={Navigation} />
      <div className="px-5 pb-5">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-surface-200 bg-[#eef2f6]">
          <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <defs>
              <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="320" height="200" fill="url(#map-grid)" />
            {/* parks and blocks */}
            <rect x="196" y="18" width="70" height="46" rx="6" fill="#dcfce7" />
            <rect x="24" y="128" width="58" height="50" rx="6" fill="#dcfce7" />
            <rect x="110" y="96" width="52" height="34" rx="4" fill="#e5e7eb" />
            {/* roads */}
            <path d="M0 80 H320" stroke="#fff" strokeWidth="12" />
            <path d="M0 150 C 90 140, 180 170, 320 150" stroke="#fff" strokeWidth="10" fill="none" />
            <path d="M96 0 V200" stroke="#fff" strokeWidth="10" />
            <path d="M232 0 C 222 70, 250 130, 236 200" stroke="#fff" strokeWidth="10" fill="none" />
            <path d="M0 30 L 140 200" stroke="#fff" strokeWidth="6" fill="none" />
            {/* route */}
            {!arrived && (
              <path
                d="M60 150 C 90 148, 96 120, 96 80 H 232 C 236 70, 240 56, 250 46"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={enRoute ? undefined : "2 8"}
                fill="none"
              />
            )}
          </svg>
          {/* home pin */}
          <span className="absolute -translate-x-1/2 -translate-y-full" style={{ left: "78%", top: "23%" }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shadow-md ring-4 ring-white">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
          </span>
          {/* technician pin */}
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={arrived ? { left: "72%", top: "26%" } : { left: "19%", top: "75%" }}
          >
            {enRoute && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/50" aria-hidden />}
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-md ring-4 ring-white">
              <Navigation className="h-4 w-4" aria-hidden />
            </span>
          </span>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{headline}</p>
            <p className="mt-0.5 text-sm text-gray-500">{sub}</p>
          </div>
          {enRoute && <Badge variant="info" dot>On the way</Badge>}
          {arrived && <Badge variant="success" dot>Arrived</Badge>}
        </div>
      </div>
    </Card>
  );
}
