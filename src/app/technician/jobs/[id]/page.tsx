"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Ban, Check, ChevronDown, CircleAlert, CircleCheckBig, ClipboardList, ExternalLink, FileText, Hourglass,
  Info, MapPin, MapPinCheck, MessageSquare, Navigation, Package, Phone, Plus, ScanSearch, Send,
  Star, Trash2, UserRound, Wallet, Wrench, X, LucideIcon,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import {
  setCurrentRole, transitionBooking, claimOpenJob, acceptAssignment, declineAssignment,
  submitQuote, completeRepair, sendDemoMessage, getManualTransitions,
  getBookingMessages, calculateQuoteTotal, getAvailableQuantity, PartUsage,
} from "@/lib/store";
import {
  STATUS_LABELS, APPLIANCE_CATEGORIES, formatPrice, BookingStatus, QuoteLine, QuoteStatus, Booking,
} from "@/lib/types";
import {
  PageHeader, Card, CardHeader, Badge, Button, Modal, Input, Textarea, Select, EmptyState,
  StatusBadge, CategoryIcon, Avatar, DetailItem,
} from "@/components/ui";

const TECH_ID = "tech_001";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const LINE_KINDS: { value: QuoteLine["kind"]; label: string }[] = [
  { value: "labor", label: "Labour" },
  { value: "part", label: "Part" },
  { value: "fee", label: "Fee" },
  { value: "tax", label: "Tax" },
  { value: "discount", label: "Discount" },
];

const QUOTE_STATUS: Record<QuoteStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Draft", variant: "default" },
  pending: { label: "Awaiting approval", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Declined", variant: "danger" },
  superseded: { label: "Superseded", variant: "default" },
};

/** Progress steps shown in the mini-timeline; `reached` lists every status at or beyond the step. */
const PROGRESS_STEPS: { label: string; statuses: BookingStatus[] }[] = [
  { label: "Job accepted", statuses: ["assigned"] },
  { label: "On the way", statuses: ["en_route"] },
  { label: "Arrived", statuses: ["arrived"] },
  { label: "Inspection", statuses: ["diagnosing", "quote_rejected"] },
  { label: "Quote approval", statuses: ["quote_pending"] },
  { label: "Repair", statuses: ["quote_approved", "repairing"] },
  { label: "Completed", statuses: ["completed", "payment_pending", "closed"] },
];

const fieldClass =
  "h-10 w-full rounded-lg border border-surface-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 " +
  "transition-colors focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500";

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function Callout({ tone, icon: Icon, title, children }: {
  tone: "info" | "warning" | "danger" | "success" | "neutral"; icon: LucideIcon; title: string; children?: ReactNode;
}) {
  const tones = {
    info: "bg-brand-50 border-brand-100 text-brand-700",
    warning: "bg-warning-50 border-warning-200 text-warning-700",
    danger: "bg-danger-50 border-danger-200 text-danger-700",
    success: "bg-accent-50 border-accent-200 text-accent-700",
    neutral: "bg-surface-50 border-surface-200 text-gray-700",
  };
  return (
    <div className={cx("flex gap-3 rounded-lg border p-4", tones[tone])}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

function StepHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function RouteMap() {
  return (
    <div className="relative h-36 overflow-hidden rounded-lg border border-surface-200 bg-[#eef2f6]" aria-hidden>
      <svg viewBox="0 0 320 144" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {/* parks / blocks */}
        <rect x="18" y="14" width="64" height="38" rx="6" fill="#dcefe3" />
        <rect x="214" y="92" width="80" height="40" rx="6" fill="#dcefe3" />
        <rect x="120" y="18" width="70" height="30" rx="4" fill="#e3e8ef" />
        <rect x="24" y="92" width="72" height="34" rx="4" fill="#e3e8ef" />
        <rect x="236" y="16" width="62" height="44" rx="4" fill="#e3e8ef" />
        {/* streets */}
        <g stroke="#ffffff" strokeLinecap="round">
          <path d="M0 72 H320" strokeWidth="10" />
          <path d="M104 0 V144" strokeWidth="8" />
          <path d="M206 0 V144" strokeWidth="8" />
          <path d="M0 22 L60 70" strokeWidth="5" />
          <path d="M206 108 H320" strokeWidth="5" />
          <path d="M104 40 H206" strokeWidth="5" />
        </g>
        {/* route */}
        <path d="M44 112 V72 H206 V40 H262" fill="none" stroke="#c7d7fe" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 112 V72 H206 V40 H262" fill="none" className="stroke-brand-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* origin */}
        <circle cx="44" cy="112" r="9" className="fill-brand-500" opacity="0.18" />
        <circle cx="44" cy="112" r="5" fill="#fff" className="stroke-brand-500" strokeWidth="3" />
        {/* destination pin */}
        <g transform="translate(262 40)">
          <ellipse cx="0" cy="2" rx="7" ry="2.5" fill="#0f172a" opacity="0.15" />
          <path d="M0 0 C-9 -11 -11 -15 -11 -20 A11 11 0 0 1 11 -20 C11 -15 9 -11 0 0 Z" className="fill-danger-500" />
          <circle cx="0" cy="-20" r="4" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}

export default function TechJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const state = useDemoState();
  const bookingId = params.id as string;

  // Message times depend on the browser's stored data, so render them only after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setCurrentRole("technician");
    setMounted(true);
  }, []);

  const booking = state.bookings.find((b) => b.id === bookingId);
  const service = booking ? state.services.find((s) => s.id === booking.serviceId) : null;
  const customer = booking ? state.customers.find((c) => c.id === booking.customerId) : null;
  const tech = state.technicians.find((t) => t.id === TECH_ID);
  const activeQuote = booking?.activeQuoteId ? state.quotes.find((q) => q.id === booking.activeQuoteId) : null;
  const cat = booking ? APPLIANCE_CATEGORIES.find((c) => c.id === booking.applianceCategory) : null;
  const messages = booking ? getBookingMessages(state, booking.id) : [];

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [partsUsed, setPartsUsed] = useState<PartUsage[]>([]);
  const [partToAdd, setPartToAdd] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [busy, setBusy] = useState(false);

  // Quote form state
  const [diagnosis, setDiagnosis] = useState("");
  const [quoteLines, setQuoteLines] = useState<Omit<QuoteLine, "id">[]>([
    { description: "", quantity: 1, unitPricePaise: 0, kind: "labor" },
  ]);

  // Keep the chat scrolled to the latest message without moving the page.
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!booking) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList aria-hidden />}
          title="Job not found"
          description={`We couldn't find a job with booking ID ${bookingId}. It may have been reassigned or removed.`}
          action={
            <Button variant="secondary" onClick={() => router.push("/technician")}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to jobs
            </Button>
          }
        />
      </Card>
    );
  }

  const isUnassigned = booking.status === "pending_assignment";
  const isMine = booking.technicianId === TECH_ID;
  const isPendingOffer = isMine && booking.status === "assigned" && booking.assignmentAccepted === false;
  const isOtherTechsJob = !!booking.technicianId && !isMine;

  const run = (action: () => void, success: string, type: "success" | "info" = "success") => {
    if (busy) return;
    setBusy(true);
    try {
      action();
      showToast(success, type);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptJob = () =>
    run(() => {
      if (isUnassigned) claimOpenJob(booking.id, TECH_ID);
      else acceptAssignment(booking.id, TECH_ID);
    }, "Job accepted. It's now in your active jobs.");

  const handleDeclineJob = () =>
    run(() => {
      declineAssignment(booking.id, TECH_ID);
      router.push("/technician");
    }, "Offer declined. The job has been returned to the open pool.", "info");

  const handleTransition = (nextStatus: BookingStatus) =>
    run(() => {
      transitionBooking(booking.id, nextStatus);
    }, `Status updated: ${STATUS_LABELS[nextStatus]}`);

  const handleSubmitQuote = () => {
    if (!diagnosis.trim()) {
      showToast("Add a diagnosis before sending the quote", "error");
      return;
    }
    const validLines = quoteLines.filter((l) => l.description.trim() && l.unitPricePaise > 0);
    if (validLines.length === 0) {
      showToast("Add at least one line item with a description and price", "error");
      return;
    }
    run(() => {
      submitQuote(booking.id, { diagnosis, lines: validLines });
      setQuoteOpen(false);
    }, "Quote sent to the customer for approval");
  };

  const handleAddPart = () => {
    const qty = parseInt(partQty, 10);
    const part = state.parts.find((p) => p.id === partToAdd);
    if (!part) {
      showToast("Choose a part", "error");
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      showToast("Quantity must be at least 1", "error");
      return;
    }
    const already = partsUsed.find((p) => p.partId === part.id)?.quantity ?? 0;
    if (already + qty > part.quantityOnHand) {
      showToast(`Only ${part.quantityOnHand} × ${part.name} in stock`, "error");
      return;
    }
    setPartsUsed(already
      ? partsUsed.map((p) => (p.partId === part.id ? { ...p, quantity: p.quantity + qty } : p))
      : [...partsUsed, { partId: part.id, quantity: qty }]);
    setPartToAdd("");
    setPartQty("1");
  };

  const handleComplete = () =>
    run(() => {
      completeRepair(booking.id, completionNotes, partsUsed);
      setCompleteOpen(false);
      setPartsUsed([]);
    }, partsUsed.length ? "Job completed. Parts used have been deducted from inventory." : "Job marked as completed");

  const handleSendMessage = () => {
    if (!chatMsg.trim()) return;
    try {
      sendDemoMessage(booking.id, "technician", tech?.name.split(" ")[0] || "Technician", chatMsg.trim());
      setChatMsg("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Message not sent", "error");
    }
  };

  const addQuoteLine = () => {
    setQuoteLines([...quoteLines, { description: "", quantity: 1, unitPricePaise: 0, kind: "part" }]);
  };

  const updateQuoteLine = (idx: number, field: string, value: string | number) => {
    const updated = [...quoteLines];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuoteLines(updated);
  };

  const removeQuoteLine = (idx: number) => {
    if (quoteLines.length <= 1) return;
    setQuoteLines(quoteLines.filter((_, i) => i !== idx));
  };

  const quoteTotal = calculateQuoteTotal(quoteLines);

  // Primary workflow transition for this status (only for the assigned technician)
  const getWorkflowAction = (): { label: string; status: BookingStatus; variant: "primary" | "accent"; icon: LucideIcon; title: string; description: string } | null => {
    if (!isMine) return null;
    const allowed = getManualTransitions(booking);
    if (booking.status === "assigned" && allowed.includes("en_route")) {
      return {
        label: "Start navigation", status: "en_route", variant: "primary", icon: Navigation,
        title: "Head to the customer",
        description: "Let the customer know you're on the way. Use the navigation card for directions.",
      };
    }
    if (booking.status === "en_route") {
      return {
        label: "Mark as arrived", status: "arrived", variant: "primary", icon: MapPinCheck,
        title: "Arrived at the address?",
        description: "Mark yourself as arrived once you reach the customer's location.",
      };
    }
    if (booking.status === "arrived") {
      return {
        label: "Start inspection", status: "diagnosing", variant: "primary", icon: ScanSearch,
        title: "Inspect the appliance",
        description: "Check the appliance and identify the fault before preparing a quote.",
      };
    }
    if (booking.status === "quote_approved") {
      return {
        label: "Start repair", status: "repairing", variant: "accent", icon: Wrench,
        title: "Quote approved",
        description: "The customer has approved your quote. You can begin the repair now.",
      };
    }
    return null;
  };

  const workflowAction = getWorkflowAction();
  const canSubmitQuote = isMine && (booking.status === "diagnosing" || booking.status === "quote_rejected");
  const canComplete = isMine && booking.status === "repairing";

  const firstName = customer?.name?.split(" ")[0] || "Customer";
  const fullAddress = `${booking.address.fullAddress}, ${booking.address.pinCode}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const serviceName = service?.name || booking.priceSnapshot?.serviceName || "Repair service";

  const renderNextStep = () => {
    if (isUnassigned) {
      return (
        <div className="space-y-4">
          <StepHeading icon={ClipboardList} title="Open job near you" description="This job hasn't been assigned yet. Accept it to add it to your schedule." />
          <Button onClick={handleAcceptJob} variant="accent" size="lg" className="w-full sm:w-auto" disabled={busy}>
            <Check className="h-4 w-4" aria-hidden />
            Accept job
          </Button>
        </div>
      );
    }
    if (isPendingOffer) {
      return (
        <div className="space-y-4">
          <StepHeading icon={ClipboardList} title="New job offer" description="This job has been offered to you. Accept it to confirm the visit, or decline to return it to the open pool." />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAcceptJob} variant="accent" size="lg" disabled={busy}>
              <Check className="h-4 w-4" aria-hidden />
              Accept offer
            </Button>
            <Button onClick={handleDeclineJob} variant="secondary" size="lg" disabled={busy}>
              <X className="h-4 w-4" aria-hidden />
              Decline
            </Button>
          </div>
        </div>
      );
    }
    if (isOtherTechsJob) {
      return (
        <Callout tone="neutral" icon={Info} title="Assigned to another partner">
          You can view this job, but only the assigned partner can update it.
        </Callout>
      );
    }
    if (workflowAction) {
      const Icon = workflowAction.icon;
      return (
        <div className="space-y-4">
          <StepHeading icon={Icon} title={workflowAction.title} description={workflowAction.description} />
          <Button
            onClick={() => handleTransition(workflowAction.status)}
            disabled={busy}
            variant={workflowAction.variant}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {workflowAction.label}
          </Button>
        </div>
      );
    }
    if (canSubmitQuote) {
      const rejected = booking.status === "quote_rejected";
      return (
        <div className="space-y-4">
          {rejected ? (
            <Callout tone="danger" icon={CircleAlert} title="Quote declined">
              The customer declined your last quote. Review the diagnosis and send a revised quote.
            </Callout>
          ) : (
            <StepHeading icon={FileText} title="Send a quote" description="Share your diagnosis and an itemised quote. Repair can begin once the customer approves it." />
          )}
          <Button onClick={() => setQuoteOpen(true)} size="lg" className="w-full sm:w-auto">
            <FileText className="h-4 w-4" aria-hidden />
            {rejected ? "Send revised quote" : "Send quote"}
          </Button>
        </div>
      );
    }
    if (booking.status === "quote_pending") {
      return (
        <Callout tone="warning" icon={Hourglass} title="Waiting for customer approval">
          Your quote has been sent. You can start the repair as soon as the customer approves it.
        </Callout>
      );
    }
    if (canComplete) {
      return (
        <div className="space-y-4">
          <StepHeading icon={Wrench} title="Repair in progress" description="When the repair is done, add your notes and any parts used to close out the job." />
          <Button onClick={() => setCompleteOpen(true)} variant="accent" size="lg" className="w-full sm:w-auto">
            <CircleCheckBig className="h-4 w-4" aria-hidden />
            Complete job
          </Button>
        </div>
      );
    }
    if (booking.status === "payment_pending") {
      return (
        <Callout tone="info" icon={Wallet} title="Awaiting payment">
          The repair is complete. The customer will be prompted to pay.
        </Callout>
      );
    }
    if (booking.status === "completed" || booking.status === "closed") {
      return (
        <Callout tone="success" icon={CircleCheckBig} title="Job completed">
          {booking.rating ? (
            <span className="flex items-center gap-2">
              Customer rating
              <span className="flex" aria-label={`${booking.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cx("h-4 w-4", n <= (booking.rating ?? 0) ? "fill-current text-amber-400" : "text-gray-300")} aria-hidden />
                ))}
              </span>
            </span>
          ) : (
            "Great work. The customer can now rate this visit."
          )}
        </Callout>
      );
    }
    if (booking.status === "cancelled") {
      return (
        <Callout tone="neutral" icon={Ban} title="Booking cancelled">
          {booking.cancelReason ? `Reason: ${booking.cancelReason}` : "This booking was cancelled. No further action is needed."}
        </Callout>
      );
    }
    if (booking.status === "disputed") {
      return (
        <Callout tone="danger" icon={CircleAlert} title="Under review">
          This job is being reviewed by the FixMate support team. They&rsquo;ll contact you if anything is needed.
        </Callout>
      );
    }
    return (
      <Callout tone="neutral" icon={Info} title="No action needed">
        There&rsquo;s nothing for you to do on this job right now.
      </Callout>
    );
  };

  return (
    <div>
      <PageHeader
        title={serviceName}
        description={booking.issue}
        breadcrumbs={[
          { label: "Jobs", href: "/technician" },
          { label: booking.id },
        ]}
        actions={
          isPendingOffer
            ? <Badge variant="info" dot className="px-3 py-1 text-sm">Awaiting your response</Badge>
            : <StatusBadge status={booking.status} className="px-3 py-1 text-sm" />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="p-5">
            <p className="mb-4 text-xs font-medium text-gray-500">Next step</p>
            {renderNextStep()}
          </Card>

          <Card>
            <CardHeader title="Job details" icon={ClipboardList} />
            <dl className="grid gap-x-6 gap-y-4 border-t border-surface-200 px-5 py-5 sm:grid-cols-2">
              <DetailItem
                label="Appliance"
                value={
                  <span className="flex items-center gap-2">
                    <CategoryIcon category={booking.applianceCategory} size="sm" />
                    <span>{cat?.name || "Appliance"}{booking.brand ? ` · ${booking.brand}` : ""}</span>
                  </span>
                }
              />
              <DetailItem label="Booking ID" value={<span className="font-mono">{booking.id}</span>} />
              <DetailItem label="Service" value={serviceName} />
              <DetailItem label="Scheduled" value={<>{formatDate(booking.appointmentDate)}<span className="block text-gray-500">{booking.appointmentSlot}</span></>} />
              <DetailItem label="Reported issue" value={booking.issue} className="sm:col-span-2" />
              {booking.description && (
                <DetailItem label="Customer notes" value={booking.description} className="sm:col-span-2" />
              )}
              {booking.priceSnapshot && (
                <DetailItem label="Visit fee" value={<span className="tabular-nums">{formatPrice(booking.priceSnapshot.visitFeePaise)}</span>} />
              )}
              {booking.completionNotes && (
                <DetailItem label="Completion notes" value={booking.completionNotes} className="sm:col-span-2" />
              )}
              {booking.partsUsed && booking.partsUsed.length > 0 && (
                <DetailItem
                  label="Parts used"
                  className="sm:col-span-2"
                  value={
                    <ul className="space-y-0.5">
                      {booking.partsUsed.map((u) => (
                        <li key={u.partId} className="tabular-nums">
                          {state.parts.find((p) => p.id === u.partId)?.name ?? u.partId} × {u.quantity}
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
            </dl>
          </Card>

          {activeQuote && (
            <Card>
              <CardHeader
                title={`Quote${activeQuote.version > 1 ? ` (revision ${activeQuote.version})` : ""}`}
                icon={FileText}
                action={<Badge variant={QUOTE_STATUS[activeQuote.status].variant}>{QUOTE_STATUS[activeQuote.status].label}</Badge>}
              />
              <div className="border-t border-surface-200 px-5 py-5">
                <p className="text-xs font-medium text-gray-500">Diagnosis</p>
                <p className="mt-1 text-sm text-gray-900">{activeQuote.diagnosis}</p>
                <table className="mt-5 w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 text-left text-xs text-gray-500">
                      <th scope="col" className="pb-2 font-medium">Item</th>
                      <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">Qty</th>
                      <th scope="col" className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {activeQuote.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-2.5 pr-3">
                          <p className="text-gray-900">{line.description}</p>
                          <p className="text-xs text-gray-500">
                            {LINE_KINDS.find((k) => k.value === line.kind)?.label ?? line.kind}
                            <span className="tabular-nums sm:hidden"> · {line.quantity} × {formatPrice(line.unitPricePaise)}</span>
                          </p>
                        </td>
                        <td className="hidden py-2.5 text-right tabular-nums text-gray-600 sm:table-cell">{line.quantity}</td>
                        <td className={cx("py-2.5 text-right tabular-nums", line.kind === "discount" ? "text-accent-700" : "text-gray-900")}>
                          {line.kind === "discount" ? "−" : ""}{formatPrice(line.unitPricePaise * line.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-surface-200">
                      <th scope="row" className="pt-3 text-left font-semibold text-gray-900">Total</th>
                      <td className="hidden sm:table-cell" />
                      <td className="pt-3 text-right text-base font-semibold tabular-nums text-gray-900">{formatPrice(activeQuote.totalPaise)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Messages" description={`Chat with ${firstName} about this job`} icon={MessageSquare} />
            <div className="border-t border-surface-200">
              <div ref={messagesRef} className="h-64 space-y-3 overflow-y-auto bg-surface-50 px-4 py-4 sm:px-5" aria-live="polite">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageSquare className="h-6 w-6 text-gray-300" aria-hidden />
                    <p className="mt-2 text-sm text-gray-500">No messages yet. Say hello to {firstName}.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender === "technician";
                    return (
                      <div key={msg.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cx(
                            "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[75%]",
                            mine ? "rounded-br-md bg-brand-500 text-white" : "rounded-bl-md border border-surface-200 bg-white text-gray-800"
                          )}
                        >
                          <p className={cx("mb-0.5 text-xs", mine ? "text-white/75" : "text-gray-500")}>
                            {msg.senderName}
                            {mounted && formatTime(msg.timestamp) && <span> · {formatTime(msg.timestamp)}</span>}
                          </p>
                          <p className="break-words">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form
                className="flex gap-2 border-t border-surface-200 p-3 sm:px-5"
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              >
                <label htmlFor="chat-input" className="sr-only">Message</label>
                <input
                  id="chat-input"
                  type="text"
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder="Write a message…"
                  className={cx(fieldClass, "min-w-0 flex-1")}
                  autoComplete="off"
                />
                <Button type="submit" disabled={!chatMsg.trim()} aria-label="Send message">
                  <Send className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Customer" icon={UserRound} />
            <div className="border-t border-surface-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={firstName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{firstName}</p>
                  {customer?.phone ? (
                    <a
                      href={`tel:${customer.phone.replace(/\s+/g, "")}`}
                      className="mt-0.5 inline-flex items-center gap-1.5 text-sm tabular-nums text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {customer.phone}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-500">Phone not available</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Navigation" icon={Navigation} />
            <div className="space-y-4 border-t border-surface-200 px-5 py-4">
              <RouteMap />
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-gray-900">{booking.address.label}</p>
                  <p className="break-words text-gray-600">{booking.address.fullAddress}</p>
                  <p className="tabular-nums text-gray-500">PIN {booking.address.pinCode}</p>
                </div>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-surface-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:border-surface-300 hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open in Maps
              </a>
            </div>
          </Card>

          <Card>
            <CardHeader title="Job progress" icon={Package} />
            <div className="border-t border-surface-200 px-5 py-4">
              <ProgressTimeline booking={booking} />
            </div>
          </Card>
        </div>
      </div>

      {/* Send quote modal */}
      <Modal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        title="Send quote"
        description="The customer will review and approve this quote before you start the repair."
        size="lg"
      >
        <div className="space-y-5">
          <Textarea
            label="Diagnosis"
            required
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="What did you find? e.g. Compressor relay failed; gas pressure normal."
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">Line items</legend>
            <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_4.5rem_7rem_2.5rem] gap-2 px-0.5 pb-1.5 text-xs font-medium text-gray-500 sm:grid">
              <span>Description</span>
              <span>Type</span>
              <span>Qty</span>
              <span>Unit price (₹)</span>
              <span className="sr-only">Remove</span>
            </div>
            <div className="space-y-3 sm:space-y-2">
              {quoteLines.map((line, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 gap-2 rounded-lg border border-surface-200 p-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_4.5rem_7rem_2.5rem] sm:items-center sm:border-0 sm:p-0"
                >
                  <div className="col-span-3 flex items-end gap-2 sm:col-span-1">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`ql-desc-${idx}`} className="mb-1 block text-xs font-medium text-gray-500 sm:sr-only">
                        Description
                      </label>
                      <input
                        id={`ql-desc-${idx}`}
                        className={fieldClass}
                        value={line.description}
                        onChange={(e) => updateQuoteLine(idx, "description", e.target.value)}
                        placeholder="e.g. Compressor relay"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuoteLine(idx)}
                      disabled={quoteLines.length <= 1}
                      aria-label={`Remove line ${idx + 1}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-40 sm:hidden"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`ql-kind-${idx}`} className="mb-1 block text-xs font-medium text-gray-500 sm:sr-only">Type</label>
                    <div className="relative">
                      <select
                        id={`ql-kind-${idx}`}
                        className={cx(fieldClass, "appearance-none pl-3 pr-8")}
                        value={line.kind}
                        onChange={(e) => updateQuoteLine(idx, "kind", e.target.value)}
                      >
                        {LINE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`ql-qty-${idx}`} className="mb-1 block text-xs font-medium text-gray-500 sm:sr-only">Qty</label>
                    <input
                      id={`ql-qty-${idx}`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      className={cx(fieldClass, "tabular-nums")}
                      value={String(line.quantity)}
                      onChange={(e) => updateQuoteLine(idx, "quantity", Math.max(1, parseInt(e.target.value || "1", 10) || 1))}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`ql-price-${idx}`} className="mb-1 block text-xs font-medium text-gray-500 sm:sr-only">Unit price (₹)</label>
                    <input
                      id={`ql-price-${idx}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      className={cx(fieldClass, "tabular-nums")}
                      value={line.unitPricePaise ? String(line.unitPricePaise / 100) : ""}
                      onChange={(e) => updateQuoteLine(idx, "unitPricePaise", Math.round(parseFloat(e.target.value || "0") * 100))}
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuoteLine(idx)}
                    disabled={quoteLines.length <= 1}
                    aria-label={`Remove line ${idx + 1}`}
                    className="hidden h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-40 sm:flex"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={addQuoteLine} className="mt-2 -ml-1">
              <Plus className="h-4 w-4" aria-hidden />
              Add line
            </Button>
          </fieldset>
          <div className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-600">Quote total</span>
            <span className="text-lg font-semibold tabular-nums text-gray-900">{formatPrice(quoteTotal)}</span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setQuoteOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitQuote} disabled={busy}>
              <Send className="h-4 w-4" aria-hidden />
              Send to customer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete job modal */}
      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete job"
        description="Summarise the work done and record any parts you used."
        size="md"
      >
        <div className="space-y-5">
          <Textarea
            label="Completion notes"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="e.g. Replaced compressor relay, tested cooling for 15 minutes."
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Parts used</p>
            <p className="mb-2 mt-0.5 text-xs text-gray-500">Selected parts are deducted from inventory when you complete the job.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Select
                  aria-label="Part used"
                  value={partToAdd}
                  onChange={(e) => setPartToAdd(e.target.value)}
                  placeholder="Select a part"
                  options={state.parts.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${getAvailableQuantity(p)} available)`,
                  }))}
                />
              </div>
              <div className="flex gap-2">
                <div className="w-24">
                  <Input aria-label="Quantity used" type="number" min="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} className="tabular-nums" />
                </div>
                <Button variant="secondary" onClick={handleAddPart} disabled={!partToAdd} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add
                </Button>
              </div>
            </div>
            {partsUsed.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No parts added.</p>
            ) : (
              <ul className="mt-3 divide-y divide-surface-200 rounded-lg border border-surface-200">
                {partsUsed.map((u) => {
                  const part = state.parts.find((p) => p.id === u.partId);
                  return (
                    <li key={u.partId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-gray-900">
                        {part?.name ?? u.partId}
                        <span className="ml-1.5 tabular-nums text-gray-500">× {u.quantity}</span>
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                        onClick={() => setPartsUsed(partsUsed.filter((p) => p.partId !== u.partId))}
                        aria-label={`Remove ${part?.name ?? "part"}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleComplete} disabled={busy}>
              <CircleCheckBig className="h-4 w-4" aria-hidden />
              Complete job
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProgressTimeline({ booking }: { booking: Booking }) {
  if (booking.status === "pending_assignment") {
    return <p className="text-sm text-gray-500">Progress will appear here once the job is accepted.</p>;
  }
  if (booking.status === "cancelled" || booking.status === "disputed") {
    return (
      <p className="text-sm text-gray-500">
        {booking.status === "cancelled" ? "This booking was cancelled." : "This job is under review."}
      </p>
    );
  }
  const offerPending = booking.status === "assigned" && booking.assignmentAccepted === false;
  const currentIdx = offerPending ? -1 : PROGRESS_STEPS.findIndex((s) => s.statuses.includes(booking.status));
  const allDone = currentIdx === PROGRESS_STEPS.length - 1;

  return (
    <ol className="relative">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < currentIdx || (allDone && i === currentIdx);
        const current = i === currentIdx && !allDone;
        const last = i === PROGRESS_STEPS.length - 1;
        return (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                className={cx("absolute left-[9px] top-5 h-[calc(100%-12px)] w-0.5", done ? "bg-accent-500" : "bg-surface-200")}
                aria-hidden
              />
            )}
            <span
              className={cx(
                "relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                done && "bg-accent-500 text-white",
                current && "bg-white ring-2 ring-brand-500",
                !done && !current && "bg-white ring-2 ring-surface-200",
              )}
              aria-hidden
            >
              {done && <Check className="h-3 w-3" strokeWidth={3} />}
              {current && <span className="h-2 w-2 rounded-full bg-brand-500" />}
            </span>
            <span className={cx("text-sm", current ? "font-semibold text-gray-900" : done ? "text-gray-700" : "text-gray-400")}>
              {step.label}
              {current && <span className="sr-only"> (current step)</span>}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
