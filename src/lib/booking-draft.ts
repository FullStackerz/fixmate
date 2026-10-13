/**
 * Booking draft: what the customer chose on the service page, carried to checkout.
 * Kept in sessionStorage (per tab) — it is not a booking until checkout calls createBooking().
 */
export interface BookingDraft {
  serviceId: string;
  applianceCategory: string;
  brand?: string;
  issue: string;
  description?: string;
  appointmentDate: string;
  appointmentSlot: string;
  photoNames?: string[];
  savedAt: string;
}

const KEY = "fixmate_booking_draft";

export function saveBookingDraft(draft: Omit<BookingDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch (e) {
    console.warn("Could not store booking draft for checkout.", e);
  }
}

export function loadBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<BookingDraft>;
    if (!d.serviceId || !d.applianceCategory || !d.issue || !d.appointmentDate || !d.appointmentSlot) return null;
    return d as BookingDraft;
  } catch (e) {
    console.warn("Booking draft could not be read; starting over.", e);
    return null;
  }
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch (e) {
    console.warn("Could not clear booking draft.", e);
  }
}

/** Local calendar date as YYYY-MM-DD (matches the store's date validation). */
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
