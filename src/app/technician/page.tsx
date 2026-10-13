"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck, Briefcase, CalendarDays, ChevronRight, CircleCheckBig, Clock, IndianRupee,
  Inbox, MapPin, ShieldAlert, Star, UserRound, Wrench,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import { setCurrentRole, toggleTechnicianOnline } from "@/lib/store";
import { APPLIANCE_CATEGORIES, formatPrice, Booking, BookingStatus } from "@/lib/types";
import {
  PageHeader, Card, Badge, KpiCard, EmptyState, StatusBadge, CategoryIcon, Avatar, Tabs,
} from "@/components/ui";

const TECH_ID = "tech_001";

type TabKey = "today" | "active" | "offers" | "completed";

const ACTIVE_STATUSES: BookingStatus[] = [
  "assigned", "en_route", "arrived", "diagnosing", "quote_pending", "quote_approved", "repairing",
];

function toIsoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

/** "Today", "Tomorrow", "Yesterday" or e.g. "Tue, 13 Oct". */
function formatJobDate(iso: string) {
  const now = new Date();
  const today = toIsoDate(now);
  const tomorrow = toIsoDate(new Date(now.getTime() + 86400000));
  const yesterday = toIsoDate(new Date(now.getTime() - 86400000));
  if (iso === today) return "Today";
  if (iso === tomorrow) return "Tomorrow";
  if (iso === yesterday) return "Yesterday";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function AvailabilitySwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-sm">
      <span id="availability-label" className="text-sm font-medium text-gray-700">
        Available for jobs
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby="availability-label"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          checked ? "bg-accent-500" : "bg-surface-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
          aria-hidden
        />
      </button>
    </div>
  );
}

export default function TechnicianDashboard() {
  const state = useDemoState();
  const [tab, setTab] = useState<TabKey>("today");
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    setCurrentRole("technician");
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  const tech = state.technicians.find((t) => t.id === TECH_ID);
  if (!tech) {
    return (
      <Card>
        <EmptyState
          icon={<UserRound aria-hidden />}
          title="Partner profile unavailable"
          description="We couldn't load your partner profile. Please refresh the page or contact partner support."
        />
      </Card>
    );
  }

  const firstName = tech.name.split(" ")[0];
  const allJobs = state.bookings.filter((b) => b.technicianId === TECH_ID);
  const today = toIsoDate(new Date());
  const todayJobs = allJobs.filter((b) => b.appointmentDate === today);
  const activeJobs = allJobs.filter((b) => ACTIVE_STATUSES.includes(b.status) && b.assignmentAccepted !== false);
  const completedJobs = allJobs.filter((b) => b.status === "completed" || b.status === "closed");

  // Offers: jobs an admin offered to this technician, plus unassigned jobs in the open pool
  const pendingOffers = state.bookings.filter(
    (b) =>
      b.status === "pending_assignment" ||
      (b.technicianId === TECH_ID && b.status === "assigned" && b.assignmentAccepted === false)
  );

  const tabJobs =
    tab === "today" ? todayJobs : tab === "active" ? activeJobs : tab === "completed" ? completedJobs : pendingOffers;

  const earnedQuotes = completedJobs
    .filter((b) => b.activeQuoteId && b.paymentStatus === "succeeded")
    .map((b) => state.quotes.find((q) => q.id === b.activeQuoteId))
    .filter(Boolean);
  const totalEarnings = earnedQuotes.reduce((s, q) => s + (q?.totalPaise || 0), 0);

  const handleToggleOnline = () => {
    toggleTechnicianOnline(TECH_ID);
    showToast(
      tech.online ? "You're offline. You won't receive new job offers." : "You're available. New job offers will appear here.",
      "info"
    );
  };

  const emptyCopy: Record<TabKey, { title: string; description: string; icon: ReactNode }> = {
    today: {
      title: "No jobs scheduled today",
      description: "Jobs booked for today will appear here. Check Offers for open jobs in your area.",
      icon: <CalendarDays aria-hidden />,
    },
    active: {
      title: "No active jobs",
      description: "Accepted jobs that are still in progress will show up here.",
      icon: <Wrench aria-hidden />,
    },
    offers: {
      title: "No new offers",
      description: tech.online
        ? "You're all caught up. New job offers will appear here as soon as they come in."
        : "You're currently offline. Turn on availability to start receiving job offers.",
      icon: <Inbox aria-hidden />,
    },
    completed: {
      title: "No completed jobs yet",
      description: "Jobs you finish will be listed here along with their final status.",
      icon: <CircleCheckBig aria-hidden />,
    },
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        description={`${greeting}, ${firstName}. Here's what's on your schedule.`}
        actions={<AvailabilitySwitch checked={tech.online} onChange={handleToggleOnline} />}
      />

      {/* Profile strip */}
      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Avatar name={tech.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="truncate text-base font-semibold text-gray-900">{tech.name}</p>
                {tech.verificationStatus === "approved" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                    <BadgeCheck className="h-4 w-4" aria-hidden />
                    Verified partner
                  </span>
                ) : (
                  <Badge variant="warning">
                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                    Verification pending
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-amber-400" aria-hidden />
                  <span className="font-medium tabular-nums text-gray-900">{tech.ratingDemo.toFixed(1)}</span>
                  <span className="sr-only">average rating</span>
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden />
                <span className="tabular-nums">{tech.completedJobs} jobs completed</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            {tech.skills.map((s) => (
              <Badge key={s} variant="default">
                {APPLIANCE_CATEGORIES.find((c) => c.id === s)?.name || s}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Today's jobs" value={todayJobs.length} icon={<CalendarDays aria-hidden />} tone="brand" />
        <KpiCard label="Active" value={activeJobs.length} icon={<Briefcase aria-hidden />} tone="warning" />
        <KpiCard label="Completed" value={completedJobs.length} icon={<CircleCheckBig aria-hidden />} tone="accent" />
        <KpiCard label="Total earnings" value={formatPrice(totalEarnings)} icon={<IndianRupee aria-hidden />} tone="neutral" />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <Tabs<TabKey>
          value={tab}
          onChange={setTab}
          className="w-full sm:w-fit"
          options={[
            { value: "today", label: "Today", count: todayJobs.length },
            { value: "active", label: "Active", count: activeJobs.length },
            { value: "offers", label: "Offers", count: pendingOffers.length },
            { value: "completed", label: "Completed", count: completedJobs.length },
          ]}
        />
      </div>

      {/* Job list */}
      <Card className="overflow-hidden">
        {tabJobs.length === 0 ? (
          <EmptyState icon={emptyCopy[tab].icon} title={emptyCopy[tab].title} description={emptyCopy[tab].description} />
        ) : (
          <ul className="divide-y divide-surface-200">
            {tabJobs.map((job) => (
              <li key={job.id}>
                <JobRow job={job} state={state} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function JobRow({ job, state }: { job: Booking; state: ReturnType<typeof useDemoState> }) {
  const svc = state.services.find((s) => s.id === job.serviceId);
  const customer = state.customers.find((c) => c.id === job.customerId);
  const isOffer = job.assignmentAccepted === false && job.technicianId === TECH_ID;
  const isOpen = job.status === "pending_assignment";

  return (
    <Link
      href={`/technician/jobs/${job.id}`}
      className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-surface-50 focus-visible:bg-surface-50 focus-visible:outline-none sm:gap-4 sm:px-5"
    >
      <CategoryIcon category={job.applianceCategory} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {svc?.name || job.priceSnapshot?.serviceName || "Repair service"}
              </p>
              <span className="font-mono text-xs text-gray-400">{job.id}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-gray-600">{job.issue}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {isOffer && <Badge variant="info" dot>New offer</Badge>}
            {isOpen && <Badge variant="outline">Open job</Badge>}
            {!isOpen && <StatusBadge status={job.status} />}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            {customer?.name?.split(" ")[0] || "Customer"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatJobDate(job.appointmentDate)} · {job.appointmentSlot}
          </span>
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{job.address.fullAddress}</span>
          </span>
        </div>
      </div>
      <ChevronRight
        className="mt-2.5 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
        aria-hidden
      />
    </Link>
  );
}
