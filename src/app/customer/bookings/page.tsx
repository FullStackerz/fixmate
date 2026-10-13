"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Plus, Search, UserRound, ClipboardList } from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { setCurrentRole } from "@/lib/store";
import { Booking, formatPrice } from "@/lib/types";
import { EmptyState, Input, Tabs, StatusBadge, ServiceArt } from "@/components/ui";

type Group = "all" | "active" | "completed" | "cancelled";

const COMPLETED = ["completed", "closed"];

function groupOf(b: Booking): Exclude<Group, "all"> {
  if (b.status === "cancelled") return "cancelled";
  if (COMPLETED.includes(b.status)) return "completed";
  return "active";
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const linkBtnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

export default function BookingsListPage() {
  const state = useDemoState();
  const [group, setGroup] = useState<Group>("all");
  const [search, setSearch] = useState("");

  useEffect(() => { setCurrentRole("customer"); }, []);

  const mine = state.bookings.filter((b) => b.customerId === "cust_001");
  const counts = {
    all: mine.length,
    active: mine.filter((b) => groupOf(b) === "active").length,
    completed: mine.filter((b) => groupOf(b) === "completed").length,
    cancelled: mine.filter((b) => groupOf(b) === "cancelled").length,
  };

  const bookings = mine
    .filter((b) => group === "all" || groupOf(b) === group)
    .filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const svcName = state.services.find((s) => s.id === b.serviceId)?.name ?? "";
      return (
        b.id.toLowerCase().includes(q) ||
        b.issue.toLowerCase().includes(q) ||
        b.applianceCategory.toLowerCase().includes(q) ||
        svcName.toLowerCase().includes(q)
      );
    });

  const filtered = group !== "all" || !!search;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-[28px] sm:leading-9">My bookings</h1>
          <p className="mt-1 text-sm text-gray-500">Track visits, approve quotes and pay for completed repairs.</p>
        </div>
        <Link href="/customer" className={linkBtnPrimary}>
          <Plus className="h-4 w-4" aria-hidden /> Book a repair
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
          <Tabs<Group>
            value={group}
            onChange={setGroup}
            className="w-max"
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "completed", label: "Completed", count: counts.completed },
              { value: "cancelled", label: "Cancelled", count: counts.cancelled },
            ]}
          />
        </div>
        <div className="w-full md:w-72">
          <Input
            icon={Search}
            type="search"
            aria-label="Search bookings"
            placeholder="Search by ID, service or issue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-surface-200">
          <EmptyState
            icon={filtered ? <Search aria-hidden /> : <ClipboardList aria-hidden />}
            title={filtered ? "No bookings match" : "No bookings yet"}
            description={
              filtered
                ? "Try a different search or switch to another tab."
                : "Book a verified technician for your AC, fridge, washing machine or other appliance. You can track the visit, approve the quote and pay here."
            }
            action={
              <Link href="/customer" className={linkBtnPrimary}>
                Book a repair
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const service = state.services.find((s) => s.id === booking.serviceId);
            const tech = booking.technicianId ? state.technicians.find((t) => t.id === booking.technicianId) : null;
            const quote = booking.activeQuoteId ? state.quotes.find((q) => q.id === booking.activeQuoteId) : null;
            const serviceName = booking.priceSnapshot?.serviceName ?? service?.name ?? booking.serviceId;
            const paid = booking.paymentStatus === "succeeded";
            const estimate = booking.priceSnapshot
              ? booking.priceSnapshot.visitFeePaise + booking.priceSnapshot.startingPricePaise
              : service
                ? service.visitFeePaise + service.startingPricePaise
                : undefined;
            const amount = quote?.totalPaise ?? estimate;
            const amountLabel = paid ? "Paid" : quote ? "Quote" : "Estimate";

            return (
              <li key={booking.id}>
                <Link
                  href={`/customer/bookings/${booking.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-surface-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:gap-4"
                >
                  <ServiceArt category={booking.applianceCategory} serviceId={booking.serviceId} sizes="64px" className="h-16 w-16 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-gray-900">{serviceName}</p>
                        <p className="truncate text-sm text-gray-500">{booking.issue}</p>
                      </div>
                      <StatusBadge status={booking.status} className="self-start" />
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-600">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                        {formatDate(booking.appointmentDate)} · {booking.appointmentSlot}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                        <span className="truncate">{tech ? tech.name : "Technician not yet assigned"}</span>
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-surface-200 pt-3">
                      <span className="font-mono text-xs text-gray-500">{booking.id}</span>
                      <span className="flex items-center gap-2">
                        {amount !== undefined && (
                          <span className="text-sm text-gray-500">
                            {amountLabel} <span className="font-semibold tabular-nums text-gray-900">{formatPrice(amount)}</span>
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-600" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
