"use client";

import { useState, useEffect } from "react";
import {
  Search, X, UserPlus, ArrowRightLeft, Ban, ClipboardList, MousePointerClick, Clock, Info,
  MapPin, ShieldAlert,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import { setCurrentRole, assignTechnician, cancelBooking, transitionBooking, getManualTransitions } from "@/lib/store";
import {
  STATUS_LABELS, formatPrice, VALID_TRANSITIONS, BookingStatus, Booking, DemoState, PaymentStatus,
  AssignmentAttempt, APPLIANCE_CATEGORIES,
} from "@/lib/types";
import {
  PageHeader, Card, Badge, Button, Modal, Input, Select, EmptyState, Textarea, StatusBadge, CategoryIcon,
  Avatar, DetailItem,
} from "@/components/ui";

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "outline" }> = {
  not_started: { label: "Not started", variant: "outline" },
  pending: { label: "Pending", variant: "warning" },
  succeeded: { label: "Paid", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  refunded: { label: "Refunded", variant: "info" },
};

const ATTEMPT_STYLES: Record<AssignmentAttempt["outcome"], { label: string; dot: string; text: string }> = {
  offered: { label: "Offered", dot: "bg-brand-500", text: "text-brand-700" },
  accepted: { label: "Accepted", dot: "bg-accent-500", text: "text-accent-700" },
  declined: { label: "Declined", dot: "bg-warning-400", text: "text-warning-700" },
  blocked: { label: "Blocked", dot: "bg-danger-500", text: "text-danger-700" },
};

function formatDay(date: string) {
  const d = new Date(date.length <= 10 ? `${date}T00:00:00` : date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function categoryName(id: string) {
  return APPLIANCE_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function BookingDetail({ booking, state, onAssign, onChangeStatus, onCancel }: {
  booking: Booking;
  state: DemoState;
  onAssign: () => void;
  onChangeStatus: () => void;
  onCancel: () => void;
}) {
  const service = state.services.find((s) => s.id === booking.serviceId);
  const customer = state.customers.find((c) => c.id === booking.customerId);
  const tech = booking.technicianId ? state.technicians.find((t) => t.id === booking.technicianId) : null;
  const quote = booking.activeQuoteId ? state.quotes.find((q) => q.id === booking.activeQuoteId) : null;
  const payment = PAYMENT_LABELS[booking.paymentStatus] ?? { label: booking.paymentStatus, variant: "outline" as const };
  const canAssign = booking.status === "pending_assignment" || booking.status === "assigned";
  const canChangeStatus = getManualTransitions(booking).length > 0;
  const canCancel = VALID_TRANSITIONS[booking.status].includes("cancelled");
  const attempts = [...(booking.assignmentAttempts ?? [])].reverse();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CategoryIcon category={booking.applianceCategory} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{service?.name ?? booking.priceSnapshot?.serviceName ?? "Service"}</p>
          <p className="truncate text-sm text-gray-500">{booking.issue}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={booking.status} />
        <Badge variant={payment.variant}>Payment: {payment.label}</Badge>
      </div>

      {booking.status === "assigned" && booking.assignmentAccepted === false && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-50 px-3 py-2.5 text-sm text-warning-700">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Waiting for the technician to accept this job.
        </div>
      )}
      {booking.status === "cancelled" && booking.cancelReason && (
        <div className="flex items-start gap-2 rounded-lg bg-surface-100 px-3 py-2.5 text-sm text-gray-700">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          <span><span className="font-medium">Cancelled:</span> {booking.cancelReason}</span>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-surface-200 pt-5">
        <DetailItem label="Customer" value={customer?.name ?? "—"} />
        <DetailItem label="Phone" value={customer?.phone ? <span className="tabular-nums">{customer.phone}</span> : "—"} />
        <DetailItem label="Appointment" value={<span className="tabular-nums">{formatDay(booking.appointmentDate)}</span>} />
        <DetailItem label="Time slot" value={booking.appointmentSlot} />
        <DetailItem label="Appliance" value={[categoryName(booking.applianceCategory), booking.brand].filter(Boolean).join(" · ")} />
        <DetailItem
          label="Quote total"
          value={quote ? <span className="font-semibold tabular-nums">{formatPrice(quote.totalPaise)}</span> : <span className="text-gray-400">No quote yet</span>}
        />
        <DetailItem
          className="col-span-2"
          label="Address"
          value={
            <span className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
              <span>{booking.address.fullAddress}{booking.address.pinCode ? ` – ${booking.address.pinCode}` : ""}</span>
            </span>
          }
        />
      </dl>

      <div className="border-t border-surface-200 pt-5">
        <h4 className="mb-3 text-xs font-medium text-gray-500">Technician</h4>
        {tech ? (
          <div className="flex items-center gap-3">
            <Avatar name={tech.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{tech.name}</p>
              <p className="truncate text-xs tabular-nums text-gray-500">{tech.phone}</p>
            </div>
            {booking.assignmentAccepted === false
              ? <Badge variant="warning">Offer pending</Badge>
              : <Badge variant="success" dot>Confirmed</Badge>}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No technician assigned</p>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="border-t border-surface-200 pt-5">
          <h4 className="mb-3 text-xs font-medium text-gray-500">Assignment history</h4>
          <ol className="relative space-y-3 border-l border-surface-200 pl-4">
            {attempts.map((a, i) => {
              const t = state.technicians.find((x) => x.id === a.technicianId);
              const style = ATTEMPT_STYLES[a.outcome];
              return (
                <li key={`${a.technicianId}-${a.at}-${a.outcome}-${i}`} className="relative">
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${style.dot}`} aria-hidden />
                  <p className="text-sm text-gray-900">
                    <span className={`font-medium ${style.text}`}>{style.label}</span>
                    <span className="text-gray-500"> · </span>
                    {t?.name ?? a.technicianId}
                  </p>
                  {a.note && <p className="text-xs text-gray-500">{a.note}</p>}
                  <p className="text-xs tabular-nums text-gray-400">{formatDateTime(a.at)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {(canAssign || canChangeStatus || canCancel) && (
        <div className="flex flex-col gap-2 border-t border-surface-200 pt-5">
          {canAssign && (
            <Button onClick={onAssign} className="w-full">
              <UserPlus className="h-4 w-4" aria-hidden />
              {booking.technicianId ? "Reassign technician" : "Assign technician"}
            </Button>
          )}
          {canChangeStatus && (
            <Button variant="secondary" onClick={onChangeStatus} className="w-full">
              <ArrowRightLeft className="h-4 w-4" aria-hidden />
              Change status
            </Button>
          )}
          {canCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full !text-danger-600 hover:!bg-danger-50 hover:!text-danger-700">
              <Ban className="h-4 w-4" aria-hidden />
              Cancel booking
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  const state = useDemoState();
  const isDesktop = useIsDesktop();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTechId, setAssignTechId] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<BookingStatus | "">("");

  useEffect(() => {
    setCurrentRole("admin");
    const id = new URLSearchParams(window.location.search).get("booking");
    if (id) setSelectedBooking(id);
  }, []);

  const allStatuses = Array.from(new Set(state.bookings.map((b) => b.status)));

  const bookings = state.bookings
    .filter((b) => !statusFilter || b.status === statusFilter)
    .filter((b) => !dateFilter || b.appointmentDate === dateFilter)
    .filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const customer = state.customers.find((c) => c.id === b.customerId);
      const tech = b.technicianId ? state.technicians.find((t) => t.id === b.technicianId) : null;
      return b.id.toLowerCase().includes(q)
        || b.issue.toLowerCase().includes(q)
        || b.applianceCategory.includes(q)
        || categoryName(b.applianceCategory).toLowerCase().includes(q)
        || (customer?.name.toLowerCase().includes(q) ?? false)
        || (tech?.name.toLowerCase().includes(q) ?? false);
    });

  const hasFilters = !!(search || statusFilter || dateFilter);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setDateFilter(""); };

  const selected = state.bookings.find((b) => b.id === selectedBooking);
  const manualTransitions = selected ? getManualTransitions(selected) : [];
  const unapprovedCount = state.technicians.filter((t) => t.verificationStatus !== "approved").length;

  const handleAssign = () => {
    if (!selectedBooking || !assignTechId) return;
    try {
      assignTechnician(selectedBooking, assignTechId);
      showToast("Technician assigned. Waiting for them to accept.", "success");
      setAssignOpen(false);
      setAssignTechId("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not assign technician", "error");
    }
  };

  const handleCancel = () => {
    if (!selectedBooking) return;
    try {
      cancelBooking(selectedBooking, cancelReason || "Cancelled by admin");
      showToast("Booking cancelled", "info");
      setCancelOpen(false);
      setCancelReason("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not cancel booking", "error");
    }
  };

  const handleStatusChange = () => {
    if (!selectedBooking || !nextStatus) return;
    try {
      transitionBooking(selectedBooking, nextStatus as BookingStatus);
      showToast(`Status changed to ${STATUS_LABELS[nextStatus as BookingStatus]}`, "success");
      setStatusChangeOpen(false);
      setNextStatus("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "This status change is not allowed", "error");
    }
  };

  // When the detail panel is open on desktop, hide columns that the panel already shows.
  const panelCol = selected ? "lg:hidden 2xl:table-cell" : "";

  const detail = selected ? (
    <BookingDetail
      booking={selected}
      state={state}
      onAssign={() => setAssignOpen(true)}
      onChangeStatus={() => setStatusChangeOpen(true)}
      onCancel={() => setCancelOpen(true)}
    />
  ) : null;

  return (
    <div>
      <PageHeader
        title="Bookings"
        description={
          hasFilters
            ? `${bookings.length} of ${state.bookings.length} bookings match your filters`
            : `${state.bookings.length} bookings · assign technicians and manage job status`
        }
      />

      <div className={`grid gap-6 ${selected ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <Card className="min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-surface-200 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Input
                icon={Search}
                type="search"
                aria-label="Search bookings"
                placeholder="Search by ID, customer, issue or technician"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="min-w-0 sm:w-48">
                <Select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={allStatuses.map((s) => ({ value: s, label: STATUS_LABELS[s] || s }))}
                  placeholder="All statuses"
                />
              </div>
              <div className="min-w-0 sm:w-40">
                <Input
                  type="date"
                  aria-label="Filter by appointment date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="self-start sm:self-center">
                <X className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
            )}
          </div>

          {bookings.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title={hasFilters ? "No matching bookings" : "No bookings yet"}
              description={hasFilters ? "Try a different search term or clear the filters." : "New customer bookings will appear here."}
              action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full min-w-[760px] text-sm ${selected ? "lg:min-w-0" : ""}`}>
                <thead>
                  <tr className="bg-surface-50 text-left text-xs font-medium text-gray-500">
                    <th scope="col" className="px-4 py-3 font-medium">Booking</th>
                    <th scope="col" className="px-4 py-3 font-medium">Customer &amp; service</th>
                    <th scope="col" className={`px-4 py-3 font-medium ${panelCol}`}>Appointment</th>
                    <th scope="col" className="px-4 py-3 font-medium">Technician</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className={`px-4 py-3 text-right font-medium ${panelCol}`}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {bookings.map((b) => {
                    const svc = state.services.find((s) => s.id === b.serviceId);
                    const customer = state.customers.find((c) => c.id === b.customerId);
                    const tech = b.technicianId ? state.technicians.find((t) => t.id === b.technicianId) : null;
                    const quote = b.activeQuoteId ? state.quotes.find((q) => q.id === b.activeQuoteId) : null;
                    const isSelected = selectedBooking === b.id;
                    return (
                      <tr
                        key={b.id}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-brand-50/60" : "hover:bg-surface-50"}`}
                        onClick={() => setSelectedBooking(b.id)}
                      >
                        <td className={`px-4 py-3 ${isSelected ? "shadow-[inset_2px_0_0_theme(colors.brand.500)]" : ""}`}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedBooking(b.id); }}
                            aria-pressed={isSelected}
                            aria-label={`View booking ${b.id}`}
                            className="whitespace-nowrap rounded text-left font-mono text-xs font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            {b.id}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={b.applianceCategory} size="sm" />
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate font-medium text-gray-900">{customer?.name ?? "Customer"}</p>
                              <p className="max-w-[220px] truncate text-xs text-gray-500">{svc?.name ?? b.priceSnapshot?.serviceName ?? b.issue}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 ${panelCol}`}>
                          <p className="tabular-nums text-gray-900">{formatDay(b.appointmentDate)}</p>
                          <p className="text-xs text-gray-500">{b.appointmentSlot}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {tech ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={tech.name} size="sm" className="!h-6 !w-6 !text-[10px]" />
                              <span className="text-gray-700">{tech.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-gray-900 ${panelCol}`}>
                          {quote ? formatPrice(quote.totalPaise) : <span className="font-normal text-gray-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Desktop detail panel */}
        {selected && isDesktop && (
          <aside aria-label="Booking details">
            <Card className="sticky top-6 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Booking</p>
                  <h2 className="truncate font-mono text-sm font-semibold text-gray-900">{selected.id}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-surface-100 hover:text-gray-700"
                  aria-label="Close booking details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5">{detail}</div>
            </Card>
          </aside>
        )}
      </div>

      {!selected && bookings.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <MousePointerClick className="h-4 w-4" aria-hidden />
          Select a booking to see details and take action.
        </p>
      )}

      {/* Mobile detail */}
      <Modal
        open={!!selected && !isDesktop}
        onClose={() => setSelectedBooking(null)}
        title={selected ? `Booking ${selected.id}` : "Booking"}
      >
        {detail}
      </Modal>

      {/* Assign technician */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={selected?.technicianId ? "Reassign technician" : "Assign technician"}
        description={selected ? `${categoryName(selected.applianceCategory)} · ${formatDay(selected.appointmentDate)}, ${selected.appointmentSlot}` : undefined}
        size="sm"
      >
        <Select
          label="Technician"
          value={assignTechId}
          onChange={(e) => setAssignTechId(e.target.value)}
          options={state.technicians.map((t) => ({
            value: t.id,
            label: t.verificationStatus === "approved"
              ? `${t.name} · ${t.ratingDemo.toFixed(1)} rating${t.online ? "" : " · offline"}`
              : `${t.name} · KYC ${t.verificationStatus}, not assignable`,
          }))}
          placeholder="Choose a technician"
        />
        {unapprovedCount > 0 && (
          <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-warning-500" aria-hidden />
            Technicians without approved KYC cannot be assigned. Attempts are recorded in the booking history.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!assignTechId}>
            <UserPlus className="h-4 w-4" aria-hidden /> Assign
          </Button>
        </div>
      </Modal>

      {/* Cancel booking */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel booking"
        description="The customer and assigned technician will see this booking as cancelled."
        size="sm"
      >
        <Textarea
          label="Reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Customer requested cancellation"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep booking</Button>
          <Button variant="danger" onClick={handleCancel}>Cancel booking</Button>
        </div>
      </Modal>

      {/* Change status */}
      <Modal
        open={statusChangeOpen}
        onClose={() => setStatusChangeOpen(false)}
        title="Change status"
        description={selected ? `Currently: ${STATUS_LABELS[selected.status]}` : undefined}
        size="sm"
      >
        {selected && (
          <Select
            label="New status"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as BookingStatus)}
            options={manualTransitions.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            placeholder="Select a status"
          />
        )}
        <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          Quotes, payments and completion are updated through their own workflows.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStatusChangeOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusChange} disabled={!nextStatus}>Update status</Button>
        </div>
      </Modal>
    </div>
  );
}
