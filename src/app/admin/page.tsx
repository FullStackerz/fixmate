"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList, Hourglass, Wrench, CircleCheck, IndianRupee, ShieldAlert, ArrowRight,
  ChartColumn, LayoutGrid, Users, Tags, Boxes, TriangleAlert, UserRoundX, Clock, FileText,
  PackageX, CircleCheckBig, LucideIcon,
} from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { setCurrentRole, getAnalytics, isLowStock, getAvailableQuantity } from "@/lib/store";
import { STATUS_LABELS, STATUS_BAR_COLORS, APPLIANCE_CATEGORIES, BookingStatus, formatPrice } from "@/lib/types";
import { PageHeader, Card, CardHeader, KpiCard, BarRow, StatusBadge, CategoryIcon, EmptyState, Badge } from "@/components/ui";

function formatDay(date: string) {
  const d = new Date(date.length <= 10 ? `${date}T00:00:00` : date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const QUICK_LINKS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/admin/bookings", label: "Bookings", description: "Assign and manage jobs", icon: ClipboardList },
  { href: "/admin/technicians", label: "Technicians", description: "KYC and availability", icon: Users },
  { href: "/admin/services", label: "Services", description: "Catalogue and pricing", icon: Tags },
  { href: "/admin/inventory", label: "Inventory", description: "Parts and stock levels", icon: Boxes },
  { href: "/admin/analytics", label: "Analytics", description: "Trends and performance", icon: ChartColumn },
];

export default function AdminOverviewPage() {
  const state = useDemoState();

  useEffect(() => { setCurrentRole("admin"); }, []);

  const analytics = getAnalytics(state);

  const recentBookings = [...state.bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const lowStockParts = state.parts.filter(isLowStock);
  const unassigned = state.bookings.filter((b) => b.status === "pending_assignment");
  const pendingOffers = state.bookings.filter((b) => b.status === "assigned" && b.assignmentAccepted === false);
  const awaitingQuote = state.bookings.filter((b) => b.status === "quote_pending");

  const statusRows = [...analytics.statusBreakdown].sort((a, b) => b.count - a.count);
  const maxStatusCount = Math.max(...statusRows.map((s) => s.count), 1);
  const categoryRows = [...analytics.categoryBreakdown].sort((a, b) => b.count - a.count);
  const maxCategoryCount = Math.max(...categoryRows.map((c) => c.count), 1);

  const exceptions: { key: string; icon: LucideIcon; tone: string; title: string; detail: string; count: number; href: string }[] = [
    {
      key: "unassigned", icon: UserRoundX, tone: "bg-warning-50 text-warning-600",
      title: "Unassigned bookings", detail: "Waiting for a technician to be assigned",
      count: unassigned.length, href: "/admin/bookings",
    },
    {
      key: "offers", icon: Clock, tone: "bg-brand-50 text-brand-600",
      title: "Offers not yet accepted", detail: "Technician has not confirmed the job",
      count: pendingOffers.length, href: "/admin/bookings",
    },
    {
      key: "quotes", icon: FileText, tone: "bg-amber-50 text-amber-600",
      title: "Quotes awaiting customer", detail: "Customer approval is pending",
      count: awaitingQuote.length, href: "/admin/bookings",
    },
  ].filter((e) => e.count > 0);

  const attentionCount = exceptions.length + lowStockParts.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Today's operations at a glance"
        actions={
          <Link
            href="/admin/bookings"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Manage bookings <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 2xl:grid-cols-6">
        <KpiCard label="Total bookings" value={analytics.totalBookings} icon={<ClipboardList />} tone="brand" />
        <KpiCard label="Awaiting assignment" value={analytics.pendingAssignment} icon={<Hourglass />} tone="warning" />
        <KpiCard label="Active jobs" value={analytics.activeJobs} icon={<Wrench />} tone="brand" />
        <KpiCard label="Completed" value={analytics.completedJobs} icon={<CircleCheck />} tone="accent" />
        <KpiCard label="Revenue" value={formatPrice(analytics.demoRevenue)} icon={<IndianRupee />} tone="accent" />
        <KpiCard label="Open disputes" value={analytics.openSupportIssues} icon={<ShieldAlert />} tone={analytics.openSupportIssues > 0 ? "danger" : "neutral"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Recent bookings */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent bookings"
            description="Latest requests across all services"
            action={
              <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {recentBookings.length === 0 ? (
            <EmptyState icon={<ClipboardList />} title="No bookings yet" description="New customer bookings will appear here." />
          ) : (
            <div className="overflow-x-auto border-t border-surface-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-surface-50 text-left text-xs font-medium text-gray-500">
                    <th scope="col" className="px-4 py-3 font-medium sm:pl-5">Booking</th>
                    <th scope="col" className="px-4 py-3 font-medium">Service</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium sm:pr-5">Appointment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {recentBookings.map((b) => {
                    const svc = state.services.find((s) => s.id === b.serviceId);
                    return (
                      <tr key={b.id} className="transition-colors hover:bg-surface-50">
                        <td className="px-4 py-3 sm:pl-5">
                          <Link href={`/admin/bookings?booking=${encodeURIComponent(b.id)}`} className="whitespace-nowrap font-mono text-xs font-medium text-brand-600 hover:underline">
                            {b.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={b.applianceCategory} size="sm" />
                            <span className="max-w-[200px] truncate font-medium text-gray-900">
                              {svc?.name ?? b.priceSnapshot?.serviceName ?? b.serviceId}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-500 sm:pr-5">{formatDay(b.appointmentDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Needs attention */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Needs attention"
            icon={TriangleAlert}
            description={attentionCount === 0 ? "Nothing requires action right now" : "Exceptions to resolve"}
            action={attentionCount > 0 ? <Badge variant="warning">{attentionCount}</Badge> : undefined}
          />
          {attentionCount === 0 ? (
            <div className="flex items-center gap-3 border-t border-surface-200 px-5 py-6 text-sm text-gray-600">
              <CircleCheckBig className="h-5 w-5 text-accent-500" aria-hidden />
              All bookings are on track and stock levels are healthy.
            </div>
          ) : (
            <ul className="divide-y divide-surface-200 border-t border-surface-200">
              {exceptions.map((e) => (
                <li key={e.key}>
                  <Link href={e.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-50">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${e.tone}`}>
                      <e.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{e.title}</span>
                      <span className="block truncate text-xs text-gray-500">{e.detail}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-gray-900">{e.count}</span>
                  </Link>
                </li>
              ))}
              {lowStockParts.map((p) => (
                <li key={p.id}>
                  <Link href="/admin/inventory" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
                      <PackageX className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{p.name}</span>
                      <span className="block text-xs text-gray-500">
                        <span className="font-mono">{p.sku}</span> · reorder at {p.reorderThreshold}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-danger-600">{getAvailableQuantity(p)}</span>
                      <span className="block text-[11px] text-gray-500">available</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking status */}
        <Card>
          <CardHeader title="Bookings by status" description={`${analytics.totalBookings} bookings in total`} />
          <div className="space-y-3 px-5 pb-5">
            {statusRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No bookings yet.</p>
            ) : statusRows.map((item) => (
              <BarRow
                key={item.status}
                label={STATUS_LABELS[item.status as BookingStatus] ?? item.status}
                value={item.count}
                max={maxStatusCount}
                color={STATUS_BAR_COLORS[item.status as BookingStatus] ?? "bg-gray-400"}
              />
            ))}
          </div>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader title="Bookings by category" description="Demand across appliance types" />
          <ul className="space-y-4 px-5 pb-5">
            {categoryRows.length === 0 ? (
              <li className="py-6 text-center text-sm text-gray-500">No bookings yet.</li>
            ) : categoryRows.map((item) => {
              const cat = APPLIANCE_CATEGORIES.find((c) => c.id === item.category);
              const share = analytics.totalBookings > 0 ? Math.round((item.count / analytics.totalBookings) * 100) : 0;
              const width = Math.max(2, Math.round((item.count / maxCategoryCount) * 100));
              return (
                <li key={item.category} className="flex items-center gap-3">
                  <CategoryIcon category={item.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-gray-900">{cat?.name ?? item.category}</span>
                      <span className="shrink-0 tabular-nums text-gray-500">
                        <span className="font-medium text-gray-900">{item.count}</span> · {share}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-100">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader title="Shortcuts" icon={LayoutGrid} />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-lg border border-surface-200 p-3 transition-colors hover:border-surface-300 hover:bg-surface-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-gray-600 group-hover:bg-brand-50 group-hover:text-brand-600">
                <link.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{link.label}</span>
                <span className="block truncate text-xs text-gray-500">{link.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
