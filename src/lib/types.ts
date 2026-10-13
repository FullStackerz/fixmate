/* ── Domain Types for FixMate ─────────────────────────────────────── */

export type UserRole = "customer" | "technician" | "admin";

export type BookingStatus =
  | "pending_assignment"
  | "assigned"
  | "en_route"
  | "arrived"
  | "diagnosing"
  | "quote_pending"
  | "quote_approved"
  | "quote_rejected"
  | "repairing"
  | "completed"
  | "payment_pending"
  | "closed"
  | "cancelled"
  | "disputed";

export type QuoteStatus = "draft" | "pending" | "approved" | "rejected" | "superseded";

export type PaymentStatus = "not_started" | "pending" | "succeeded" | "failed" | "refunded";

export type StockMovementType = "received" | "reserved" | "released" | "consumed" | "returned" | "adjustment";

export interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  visitFeePaise: number;
  startingPricePaise: number;
  enabled: boolean;
  brands: string[];
  commonIssues: string[];
  /** Typical visit duration in minutes */
  durationMins?: number;
  /** Average customer rating (0–5) and number of ratings */
  ratingAvg?: number;
  ratingCount?: number;
  /** Reference price shown struck through when higher than startingPricePaise */
  listPricePaise?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  brands: string[];
  servicePinCodes: string[];
  verificationStatus: "pending" | "approved" | "rejected";
  online: boolean;
  ratingDemo: number;
  completedJobs: number;
  avatar: string;
  kycDocuments: { type: string; status: string; submittedAt: string }[];
  kycDecisionReason?: string;
}

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  kind: "labor" | "part" | "fee" | "tax" | "discount";
}

export interface Quote {
  id: string;
  bookingId: string;
  version: number;
  diagnosis: string;
  lines: QuoteLine[];
  totalPaise: number;
  status: QuoteStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface BookingAddress {
  label: string;
  fullAddress: string;
  pinCode: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  sender: UserRole;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface AssignmentAttempt {
  technicianId: string;
  outcome: "offered" | "accepted" | "declined" | "blocked";
  note?: string;
  at: string;
}

export interface Booking {
  id: string;
  customerId: string;
  technicianId?: string;
  serviceId: string;
  applianceCategory: string;
  brand?: string;
  issue: string;
  description?: string;
  address: BookingAddress;
  appointmentDate: string;
  appointmentSlot: string;
  status: BookingStatus;
  quoteIds: string[];
  activeQuoteId?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paidAt?: string;
  /** false = offered to technician but not yet accepted; undefined on older records = accepted */
  assignmentAccepted?: boolean;
  assignmentAttempts?: AssignmentAttempt[];
  /** Catalogue prices captured at booking time so later catalogue edits do not change this booking */
  priceSnapshot?: { serviceName: string; visitFeePaise: number; startingPricePaise: number };
  partsUsed?: { partId: string; quantity: number }[];
  completionNotes?: string;
  cancelReason?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockPart {
  id: string;
  sku: string;
  name: string;
  category: string;
  compatibleAppliances: string[];
  quantityOnHand: number;
  quantityReserved: number;
  unitCostPaise: number;
  sellingPricePaise: number;
  reorderThreshold: number;
}

export interface StockMovement {
  id: string;
  partId: string;
  type: StockMovementType;
  quantity: number;
  bookingId?: string;
  reason: string;
  createdAt: string;
}

export interface DemoState {
  customers: Customer[];
  technicians: Technician[];
  services: Service[];
  bookings: Booking[];
  quotes: Quote[];
  messages: ChatMessage[];
  parts: StockPart[];
  stockMovements: StockMovement[];
  currentRole: UserRole;
  initialized: boolean;
}

/* ── Status flow definitions ──────────────────────────────────────── */

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_assignment: ["assigned", "cancelled"],
  assigned: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["diagnosing", "cancelled"],
  diagnosing: ["quote_pending"],
  quote_pending: ["quote_approved", "quote_rejected", "cancelled"],
  quote_approved: ["repairing"],
  quote_rejected: ["diagnosing", "cancelled"],
  repairing: ["completed"],
  completed: ["payment_pending", "closed"],
  payment_pending: ["closed"],
  closed: [],
  cancelled: [],
  disputed: ["closed", "cancelled"],
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_assignment: "Awaiting assignment",
  assigned: "Technician assigned",
  en_route: "On the way",
  arrived: "Technician arrived",
  diagnosing: "Inspecting",
  quote_pending: "Quote awaiting approval",
  quote_approved: "Quote approved",
  quote_rejected: "Quote declined",
  repairing: "Repair in progress",
  completed: "Repair completed",
  payment_pending: "Payment due",
  closed: "Closed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending_assignment: "bg-warning-50 text-warning-700 ring-warning-600/20",
  assigned: "bg-brand-50 text-brand-700 ring-brand-600/20",
  en_route: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  arrived: "bg-violet-50 text-violet-700 ring-violet-600/20",
  diagnosing: "bg-sky-50 text-sky-700 ring-sky-600/20",
  quote_pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  quote_approved: "bg-teal-50 text-teal-700 ring-teal-600/20",
  quote_rejected: "bg-danger-50 text-danger-700 ring-danger-600/20",
  repairing: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  completed: "bg-accent-50 text-accent-700 ring-accent-600/20",
  payment_pending: "bg-orange-50 text-orange-700 ring-orange-600/20",
  closed: "bg-surface-100 text-gray-700 ring-gray-500/20",
  cancelled: "bg-surface-100 text-gray-500 ring-gray-400/20 line-through decoration-gray-400/60",
  disputed: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

/** Solid colour per status for charts/bars (paired with text labels). */
export const STATUS_BAR_COLORS: Record<BookingStatus, string> = {
  pending_assignment: "bg-warning-400",
  assigned: "bg-brand-500",
  en_route: "bg-indigo-500",
  arrived: "bg-violet-500",
  diagnosing: "bg-sky-500",
  quote_pending: "bg-amber-400",
  quote_approved: "bg-teal-500",
  quote_rejected: "bg-danger-400",
  repairing: "bg-cyan-500",
  completed: "bg-accent-500",
  payment_pending: "bg-orange-400",
  closed: "bg-gray-400",
  cancelled: "bg-gray-300",
  disputed: "bg-rose-500",
};

export const APPLIANCE_CATEGORIES = [
  { id: "ac", name: "Air Conditioner" },
  { id: "refrigerator", name: "Refrigerator" },
  { id: "washing_machine", name: "Washing Machine" },
  { id: "microwave", name: "Microwave" },
  { id: "dishwasher", name: "Dishwasher" },
];

export const TIME_SLOTS = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "1:00 PM - 3:00 PM",
  "3:00 PM - 5:00 PM",
  "5:00 PM - 7:00 PM",
];

/** Format paise to INR string */
export function formatPrice(paise: number): string {
  const whole = paise % 100 === 0;
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

/** Generate a simple unique ID */
export function generateId(prefix: string = ""): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${ts}_${rand}` : `${ts}_${rand}`;
}
