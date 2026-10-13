/**
 * FixMate business rules. Every state change in the product goes through these functions.
 * They run on the server (see src/server/db.ts), which plugs in persistence via setStateAdapter().
 * Pure helpers (pricing, analytics, transitions) are also safe to import in the browser.
 */
import {
  DemoState, Booking, Quote, QuoteLine, ChatMessage, AssignmentAttempt,
  StockMovement, StockPart, BookingStatus, VALID_TRANSITIONS,
  generateId, UserRole, Service, Technician,
} from "./types";
import { createSeedData } from "./seed-data";

export interface StateAdapter {
  /** Returns a fresh, mutable copy of the current state. */
  load(): DemoState;
  /** Persists the new state (and publishes the change). */
  save(state: DemoState): void;
}

let adapter: StateAdapter | null = null;

export function setStateAdapter(next: StateAdapter): void {
  adapter = next;
}

function loadState(): DemoState {
  if (!adapter) throw new Error("FixMate data store is not initialised");
  return adapter.load();
}

function saveState(state: DemoState): void {
  if (!adapter) throw new Error("FixMate data store is not initialised");
  adapter.save(state);
}

/** Change notification is handled by the adapter's save(); kept as a hook point. */
function notify(): void {}

function findBookingIndex(state: DemoState, bookingId: string): number {
  const idx = state.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw new Error(`Booking ${bookingId} not found`);
  return idx;
}

export function resetDemoState(): DemoState {
  const fresh = createSeedData();
  saveState(fresh);
  notify();
  return fresh;
}

/* ── Booking operations ──────────────────────────────────────── */

export interface CreateBookingInput {
  serviceId: string;
  applianceCategory: string;
  brand?: string;
  issue: string;
  description?: string;
  address: { label: string; fullAddress: string; pinCode: string };
  appointmentDate: string;
  appointmentSlot: string;
}

function nextBookingId(state: DemoState): string {
  const max = state.bookings.reduce((m, b) => {
    const n = parseInt(b.id.replace(/^BK-/, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return `BK-${max + 1}`;
}

export function createBooking(input: CreateBookingInput, customerId: string): Booking {
  const state = loadState();
  if (!state.customers.some((c) => c.id === customerId)) throw new Error("Customer account not found");
  const service = state.services.find((s) => s.id === input.serviceId);
  if (!service || !service.enabled) throw new Error("Selected service is not available");
  if (!/^\d{6}$/.test(input.address.pinCode)) throw new Error("PIN code must be 6 digits");
  if (!input.issue.trim() || !input.address.fullAddress.trim()) {
    throw new Error("Issue and address are required");
  }
  const d = new Date();
  // Local calendar date (YYYY-MM-DD), matching the date the customer picked in the form.
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!input.appointmentDate || input.appointmentDate < today) {
    throw new Error("Appointment date cannot be in the past");
  }
  const now = new Date().toISOString();
  const booking: Booking = {
    id: nextBookingId(state),
    customerId,
    serviceId: input.serviceId,
    applianceCategory: input.applianceCategory,
    brand: input.brand,
    issue: input.issue,
    description: input.description,
    address: input.address,
    appointmentDate: input.appointmentDate,
    appointmentSlot: input.appointmentSlot,
    status: "pending_assignment",
    quoteIds: [],
    paymentStatus: "not_started",
    priceSnapshot: {
      serviceName: service.name,
      visitFeePaise: service.visitFeePaise,
      startingPricePaise: service.startingPricePaise,
    },
    createdAt: now,
    updatedAt: now,
  };
  state.bookings = [booking, ...state.bookings];
  saveState(state);
  notify();
  return booking;
}

export function cancelBooking(bookingId: string, reason: string): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if (!VALID_TRANSITIONS[booking.status].includes("cancelled")) {
    throw new Error(`Cannot cancel a booking that is ${booking.status.replace(/_/g, " ")}`);
  }
  booking.status = "cancelled";
  booking.cancelReason = reason.trim() || "No reason given";
  booking.updatedAt = new Date().toISOString();
  if (booking.activeQuoteId) {
    state.quotes = state.quotes.map((q) =>
      q.id === booking.activeQuoteId && q.status === "pending" ? { ...q, status: "superseded" } : q
    );
  }
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

function logAssignment(booking: Booking, technicianId: string, outcome: AssignmentAttempt["outcome"], note?: string): void {
  booking.assignmentAttempts = [
    ...(booking.assignmentAttempts ?? []),
    { technicianId, outcome, note, at: new Date().toISOString() },
  ];
}

export function assignTechnician(bookingId: string, technicianId: string): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const tech = state.technicians.find((t) => t.id === technicianId);
  if (!tech) throw new Error(`Technician ${technicianId} not found`);
  const booking = { ...state.bookings[idx] };
  if (tech.verificationStatus !== "approved") {
    logAssignment(booking, technicianId, "blocked", "Technician KYC not approved");
    state.bookings[idx] = booking;
    saveState(state);
    notify();
    throw new Error(`${tech.name} cannot be assigned: KYC is not approved`);
  }
  if (booking.status !== "pending_assignment" && booking.status !== "assigned") {
    throw new Error(`Cannot assign a technician when booking is ${booking.status.replace(/_/g, " ")}`);
  }
  booking.technicianId = technicianId;
  booking.assignmentAccepted = false;
  booking.status = "assigned";
  booking.updatedAt = new Date().toISOString();
  logAssignment(booking, technicianId, "offered");
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

/** Technician picks up an unassigned job from the open pool (offered + accepted in one step). */
export function claimOpenJob(bookingId: string, technicianId: string): Booking {
  assignTechnician(bookingId, technicianId);
  return acceptAssignment(bookingId, technicianId);
}

export function acceptAssignment(bookingId: string, technicianId: string): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if (booking.technicianId !== technicianId) throw new Error("This job is not assigned to you");
  if (booking.status !== "assigned") throw new Error(`Cannot accept a job that is ${booking.status.replace(/_/g, " ")}`);
  if (booking.assignmentAccepted) throw new Error("Job already accepted");
  booking.assignmentAccepted = true;
  booking.updatedAt = new Date().toISOString();
  logAssignment(booking, technicianId, "accepted");
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

export function declineAssignment(bookingId: string, technicianId: string): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if (booking.technicianId !== technicianId) throw new Error("This job is not assigned to you");
  if (booking.status !== "assigned" || booking.assignmentAccepted) {
    throw new Error("Only pending job offers can be declined");
  }
  booking.technicianId = undefined;
  booking.assignmentAccepted = undefined;
  booking.status = "pending_assignment";
  booking.updatedAt = new Date().toISOString();
  logAssignment(booking, technicianId, "declined");
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

/**
 * Statuses that must be reached through a dedicated action so related records stay consistent
 * (quotes, payments, inventory, assignment). transitionBooking refuses them.
 */
const DEDICATED_ACTIONS: Partial<Record<BookingStatus, string>> = {
  assigned: "Assign technician",
  quote_pending: "Submit quote",
  quote_approved: "Customer quote approval",
  quote_rejected: "Customer quote rejection",
  completed: "Mark repair complete",
  closed: "Record payment",
  cancelled: "Cancel booking",
};

/** Next statuses that may be set directly (by the technician workflow or an admin override). */
export function getManualTransitions(booking: Booking): BookingStatus[] {
  return VALID_TRANSITIONS[booking.status].filter((s) => {
    if (s === "closed" && booking.status === "disputed") return true;
    if (DEDICATED_ACTIONS[s]) return false;
    if (s === "en_route" && booking.assignmentAccepted === false) return false;
    return true;
  });
}

export function transitionBooking(bookingId: string, nextStatus: BookingStatus): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if (!VALID_TRANSITIONS[booking.status].includes(nextStatus)) {
    throw new Error(`Cannot move from ${booking.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}`);
  }
  if (!getManualTransitions(booking).includes(nextStatus)) {
    if (nextStatus === "en_route") throw new Error("The technician must accept the job first");
    throw new Error(`Use "${DEDICATED_ACTIONS[nextStatus]}" to move to ${nextStatus.replace(/_/g, " ")}`);
  }
  booking.status = nextStatus;
  booking.updatedAt = new Date().toISOString();
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

/* ── Quote operations ────────────────────────────────────────── */

export interface SubmitQuoteInput {
  diagnosis: string;
  lines: Omit<QuoteLine, "id">[];
}

/** Single source of truth for quote totals: discounts subtract, everything else adds. */
export function calculateQuoteTotal(lines: Pick<QuoteLine, "quantity" | "unitPricePaise" | "kind">[]): number {
  return lines.reduce((sum, l) => {
    const amount = l.quantity * l.unitPricePaise;
    return l.kind === "discount" ? sum - amount : sum + amount;
  }, 0);
}

export function submitQuote(bookingId: string, input: SubmitQuoteInput): Quote {
  const state = loadState();
  const bIdx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[bIdx] };
  if (booking.status !== "diagnosing" && booking.status !== "quote_rejected") {
    throw new Error("A quote can only be submitted during diagnosis or after a rejected quote");
  }
  if (!input.diagnosis.trim()) throw new Error("Diagnosis is required");
  if (input.lines.length === 0) throw new Error("Add at least one quote line");
  for (const l of input.lines) {
    if (!l.description.trim()) throw new Error("Every quote line needs a description");
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new Error("Quantities must be whole numbers above zero");
    if (!Number.isFinite(l.unitPricePaise) || l.unitPricePaise < 0) throw new Error("Prices cannot be negative");
  }
  const totalPaise = calculateQuoteTotal(input.lines);
  if (totalPaise <= 0) throw new Error("Quote total must be greater than zero");

  // Supersede the previous pending quote, if any
  if (booking.activeQuoteId) {
    state.quotes = state.quotes.map((q) =>
      q.id === booking.activeQuoteId && q.status === "pending" ? { ...q, status: "superseded" } : q
    );
  }

  const quote: Quote = {
    id: generateId("qt"),
    bookingId,
    version: booking.quoteIds.length + 1,
    diagnosis: input.diagnosis.trim(),
    lines: input.lines.map((l, i) => ({ ...l, description: l.description.trim(), id: generateId(`ql${i}`) })),
    totalPaise,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  state.quotes = [...state.quotes, quote];
  booking.quoteIds = [...booking.quoteIds, quote.id];
  booking.activeQuoteId = quote.id;
  booking.status = "quote_pending";
  booking.updatedAt = new Date().toISOString();
  state.bookings[bIdx] = booking;
  saveState(state);
  notify();
  return quote;
}

export function respondToQuote(bookingId: string, quoteId: string, decision: "approved" | "rejected"): Quote {
  const state = loadState();
  const bIdx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[bIdx] };
  const qIdx = state.quotes.findIndex((q) => q.id === quoteId);
  if (qIdx === -1) throw new Error(`Quote ${quoteId} not found`);
  const quote = { ...state.quotes[qIdx] };
  if (quote.bookingId !== bookingId) throw new Error("Quote does not belong to this booking");
  if (booking.activeQuoteId !== quoteId) throw new Error("This quote has been replaced by a newer one");
  if (booking.status !== "quote_pending" || quote.status !== "pending") {
    throw new Error("This quote is no longer awaiting a response");
  }

  const now = new Date().toISOString();
  quote.status = decision;
  quote.respondedAt = now;
  state.quotes[qIdx] = quote;
  booking.status = decision === "approved" ? "quote_approved" : "quote_rejected";
  booking.updatedAt = now;
  state.bookings[bIdx] = booking;

  saveState(state);
  notify();
  return quote;
}

/* ── Repair completion ───────────────────────────────────────── */

export interface PartUsage {
  partId: string;
  quantity: number;
}

export function completeRepair(bookingId: string, completionNotes: string, partsUsed: PartUsage[] = []): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if (booking.status !== "repairing") {
    throw new Error(`Cannot complete repair when status is ${booking.status.replace(/_/g, " ")}`);
  }
  const quote = state.quotes.find((q) => q.id === booking.activeQuoteId);
  if (!quote || quote.status !== "approved") throw new Error("Repair has no approved quote");

  // Applies every part consumption to this same state copy; any failure aborts before saving.
  for (const usage of partsUsed) {
    applyStockMovement(state, {
      partId: usage.partId,
      type: "consumed",
      quantity: usage.quantity,
      bookingId,
      reason: `Used in repair ${bookingId}`,
    });
  }

  booking.status = "completed";
  booking.completionNotes = completionNotes.trim() || "Repair completed.";
  booking.partsUsed = partsUsed.length > 0 ? partsUsed : undefined;
  booking.paymentStatus = "pending";
  booking.updatedAt = new Date().toISOString();
  state.bookings[idx] = booking;

  const techIdx = state.technicians.findIndex((t) => t.id === booking.technicianId);
  if (techIdx !== -1) {
    state.technicians[techIdx] = {
      ...state.technicians[techIdx],
      completedJobs: state.technicians[techIdx].completedJobs + 1,
    };
  }

  saveState(state);
  notify();
  return booking;
}

/* ── Demo payment ────────────────────────────────────────────── */

export function recordDemoPayment(bookingId: string, paymentMethod: string): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if ((booking.status !== "completed" && booking.status !== "payment_pending") || booking.paymentStatus !== "pending") {
    throw new Error("Payment is only available after the repair is completed");
  }
  booking.paymentStatus = "succeeded";
  booking.paymentMethod = paymentMethod;
  booking.paidAt = new Date().toISOString();
  booking.status = "closed";
  booking.updatedAt = booking.paidAt;
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

/* ── Rating ──────────────────────────────────────────────────── */

export function submitRating(bookingId: string, rating: number, feedback: string): Booking {
  const state = loadState();
  const idx = findBookingIndex(state, bookingId);
  const booking = { ...state.bookings[idx] };
  if (booking.status !== "completed" && booking.status !== "closed") {
    throw new Error("You can rate a booking after the repair is completed");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");
  booking.rating = rating;
  booking.feedback = feedback.trim();
  booking.updatedAt = new Date().toISOString();
  state.bookings[idx] = booking;
  saveState(state);
  notify();
  return booking;
}

/* ── Chat / Messages ─────────────────────────────────────────── */

export function sendDemoMessage(bookingId: string, sender: UserRole, senderName: string, text: string): ChatMessage {
  const state = loadState();
  findBookingIndex(state, bookingId);
  if (!text.trim()) throw new Error("Message cannot be empty");
  const msg: ChatMessage = {
    id: generateId("msg"),
    bookingId,
    sender,
    senderName,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  state.messages = [...state.messages, msg];
  saveState(state);
  notify();
  return msg;
}

export function getBookingMessages(state: DemoState, bookingId: string): ChatMessage[] {
  return state.messages.filter((m) => m.bookingId === bookingId);
}

/* ── Inventory / Stock ───────────────────────────────────────── */

export interface AddStockMovementInput {
  partId: string;
  type: StockMovement["type"];
  /** Positive for every type; adjustments may be negative to correct a count downwards. */
  quantity: number;
  bookingId?: string;
  reason: string;
}

export function getAvailableQuantity(part: StockPart): number {
  return part.quantityOnHand - part.quantityReserved;
}

export function isLowStock(part: StockPart): boolean {
  return getAvailableQuantity(part) <= part.reorderThreshold;
}

/** The single place stock balances change. Mutates the given state copy; throws without partial effects. */
function applyStockMovement(state: DemoState, input: AddStockMovementInput): StockMovement {
  const pIdx = state.parts.findIndex((p) => p.id === input.partId);
  if (pIdx === -1) throw new Error(`Part ${input.partId} not found`);
  const part = { ...state.parts[pIdx] };
  const qty = input.quantity;
  const available = getAvailableQuantity(part);

  if (!Number.isInteger(qty) || qty === 0) throw new Error("Quantity must be a whole number");
  if (input.type !== "adjustment" && qty < 0) throw new Error("Quantity must be positive");
  if (!input.reason.trim()) throw new Error("A reason is required");

  switch (input.type) {
    case "received":
    case "returned":
      part.quantityOnHand += qty;
      break;
    case "reserved":
      if (qty > available) throw new Error(`Only ${available} ${part.name} available to reserve`);
      part.quantityReserved += qty;
      break;
    case "released":
      if (qty > part.quantityReserved) throw new Error(`Only ${part.quantityReserved} reserved to release`);
      part.quantityReserved -= qty;
      break;
    case "consumed": {
      // Consume reserved stock first, then free stock — never more than is on hand.
      const fromReserved = Math.min(part.quantityReserved, qty);
      const fromAvailable = qty - fromReserved;
      if (fromAvailable > available) {
        throw new Error(`Not enough ${part.name} in stock (${part.quantityOnHand} on hand)`);
      }
      part.quantityReserved -= fromReserved;
      part.quantityOnHand -= qty;
      break;
    }
    case "adjustment":
      if (qty < 0 && -qty > available) {
        throw new Error(`Adjustment would make available stock negative (${available} available)`);
      }
      part.quantityOnHand += qty;
      break;
    default:
      throw new Error(`Unknown movement type ${String(input.type)}`);
  }

  state.parts[pIdx] = part;
  const movement: StockMovement = {
    id: generateId("sm"),
    partId: input.partId,
    type: input.type,
    quantity: qty,
    bookingId: input.bookingId,
    reason: input.reason.trim(),
    createdAt: new Date().toISOString(),
  };
  state.stockMovements = [...state.stockMovements, movement];
  return movement;
}

export function addStockMovement(input: AddStockMovementInput): StockMovement {
  const state = loadState();
  const movement = applyStockMovement(state, input);
  saveState(state);
  notify();
  return movement;
}

/* ── Service catalogue ───────────────────────────────────────── */

export function updateService(serviceId: string, updates: Partial<Omit<Service, "id">>): Service {
  const state = loadState();
  const idx = state.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) throw new Error(`Service ${serviceId} not found`);
  const service = { ...state.services[idx], ...updates };
  state.services[idx] = service;
  saveState(state);
  notify();
  return service;
}

export function createService(input: Omit<Service, "id">): Service {
  const state = loadState();
  const service: Service = { ...input, id: generateId("svc") };
  state.services.push(service);
  saveState(state);
  notify();
  return service;
}

/* ── Technician management ───────────────────────────────────── */

export function updateTechnicianVerification(
  technicianId: string,
  decision: "approved" | "rejected",
  reason?: string
): Technician {
  const state = loadState();
  const idx = state.technicians.findIndex((t) => t.id === technicianId);
  if (idx === -1) throw new Error(`Technician ${technicianId} not found`);
  const tech = { ...state.technicians[idx] };
  tech.verificationStatus = decision;
  tech.kycDecisionReason = reason?.trim() || undefined;
  state.technicians[idx] = tech;
  saveState(state);
  notify();
  return tech;
}

export function toggleTechnicianOnline(technicianId: string): Technician {
  const state = loadState();
  const idx = state.technicians.findIndex((t) => t.id === technicianId);
  if (idx === -1) throw new Error(`Technician ${technicianId} not found`);
  const tech = { ...state.technicians[idx] };
  tech.online = !tech.online;
  state.technicians[idx] = tech;
  saveState(state);
  notify();
  return tech;
}

/* ── Pricing ──────────────────────────────────────────────────── */

export interface PriceEstimate {
  visitFeePaise: number;
  startingPricePaise: number;
  totalPaise: number;
}

/** Booking-time estimate. The final amount comes from the technician quote. */
export function estimateBookingPrice(service: Pick<Service, "visitFeePaise" | "startingPricePaise">): PriceEstimate {
  return {
    visitFeePaise: service.visitFeePaise,
    startingPricePaise: service.startingPricePaise,
    totalPaise: service.visitFeePaise + service.startingPricePaise,
  };
}

/* ── Analytics ────────────────────────────────────────────────── */

export interface Analytics {
  totalBookings: number;
  pendingAssignment: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  demoRevenue: number;
  openSupportIssues: number;
  avgOrderValue: number;
  cancellationRate: number;
  categoryBreakdown: { category: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  lowStockCount: number;
  techPerformance: { name: string; completed: number; accepted: number }[];
}

export function getAnalytics(state: DemoState): Analytics {
  const { bookings, quotes, parts, technicians } = state;

  const totalBookings = bookings.length;
  const pendingAssignment = bookings.filter((b) => b.status === "pending_assignment").length;
  const activeStatuses: BookingStatus[] = ["assigned", "en_route", "arrived", "diagnosing", "quote_pending", "quote_approved", "repairing"];
  const activeJobs = bookings.filter((b) => activeStatuses.includes(b.status)).length;
  const completedJobs = bookings.filter((b) => b.status === "completed" || b.status === "closed").length;
  const cancelledJobs = bookings.filter((b) => b.status === "cancelled").length;

  const paidBookingIds = bookings
    .filter((b) => b.paymentStatus === "succeeded" && b.activeQuoteId)
    .map((b) => b.activeQuoteId!);
  const demoRevenue = quotes
    .filter((q) => paidBookingIds.includes(q.id))
    .reduce((sum, q) => sum + q.totalPaise, 0);

  const openSupportIssues = bookings.filter((b) => b.status === "disputed").length;
  const avgOrderValue = completedJobs > 0 ? Math.round(demoRevenue / completedJobs) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledJobs / totalBookings) * 100) : 0;

  const catMap = new Map<string, number>();
  bookings.forEach((b) => {
    catMap.set(b.applianceCategory, (catMap.get(b.applianceCategory) || 0) + 1);
  });
  const categoryBreakdown = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));

  const statusMap = new Map<string, number>();
  bookings.forEach((b) => {
    statusMap.set(b.status, (statusMap.get(b.status) || 0) + 1);
  });
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  const lowStockCount = parts.filter(isLowStock).length;

  const techPerformance = technicians.map((t) => {
    const techBookings = bookings.filter((b) => b.technicianId === t.id);
    const completed = techBookings.filter(
      (b) => b.status === "completed" || b.status === "closed"
    ).length;
    return { name: t.name, completed, accepted: techBookings.length };
  });

  return {
    totalBookings,
    pendingAssignment,
    activeJobs,
    completedJobs,
    cancelledJobs,
    demoRevenue,
    openSupportIssues,
    avgOrderValue,
    cancellationRate,
    categoryBreakdown,
    statusBreakdown,
    lowStockCount,
    techPerformance,
  };
}
