"use client";

import { useEffect } from "react";
import { ClipboardList, IndianRupee, ReceiptText, CircleX, PackageX, Users } from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { setCurrentRole, getAnalytics } from "@/lib/store";
import { STATUS_LABELS, STATUS_BAR_COLORS, APPLIANCE_CATEGORIES, BookingStatus, formatPrice } from "@/lib/types";
import { PageHeader, Card, CardHeader, KpiCard, BarRow, CategoryIcon, Avatar, EmptyState } from "@/components/ui";

const DAY_MS = 86_400_000;

export default function AdminAnalyticsPage() {
  const state = useDemoState();

  useEffect(() => { setCurrentRole("admin"); }, []);

  const analytics = getAnalytics(state);

  // Booking volume per day (last 14 days, by booking creation date)
  const now = new Date();
  const dailyVolume: { key: string; weekday: string; day: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = d.toISOString().split("T")[0];
    const count = state.bookings.filter((b) => b.createdAt.split("T")[0] === key).length;
    dailyVolume.push({
      key,
      weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
      day: d.toLocaleDateString("en-IN", { day: "numeric" }),
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      count,
    });
  }
  const periodTotal = dailyVolume.reduce((sum, d) => sum + d.count, 0);
  const peakDaily = Math.max(...dailyVolume.map((d) => d.count), 0);
  // Round the axis up to a "nice" even value so the midpoint gridline is a whole number.
  const axisStep = peakDaily < 10 ? 2 : peakDaily < 50 ? 10 : 50;
  const axisMax = Math.max(axisStep, Math.ceil((peakDaily + 1) / axisStep) * axisStep);
  const gridLines = [axisMax, axisMax / 2, 0];

  const statusRows = [...analytics.statusBreakdown].sort((a, b) => b.count - a.count);
  const maxStatusCount = Math.max(...statusRows.map((s) => s.count), 1);

  const categoryRows = [...analytics.categoryBreakdown].sort((a, b) => b.count - a.count);
  const maxCategoryCount = Math.max(...categoryRows.map((c) => c.count), 1);

  const techRows = [...analytics.techPerformance].sort((a, b) => b.completed - a.completed || b.accepted - a.accepted);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Booking demand, fulfilment and team performance" />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total bookings" value={analytics.totalBookings} icon={<ClipboardList />} tone="brand" trend={`${analytics.activeJobs} active · ${analytics.completedJobs} completed`} />
        <KpiCard label="Revenue" value={formatPrice(analytics.demoRevenue)} icon={<IndianRupee />} tone="accent" trend="From paid bookings" />
        <KpiCard label="Avg order value" value={analytics.avgOrderValue > 0 ? formatPrice(analytics.avgOrderValue) : "—"} icon={<ReceiptText />} tone="brand" trend="Per completed job" />
        <KpiCard label="Cancellation rate" value={`${analytics.cancellationRate}%`} icon={<CircleX />} tone={analytics.cancellationRate >= 20 ? "danger" : "neutral"} trend={`${analytics.cancelledJobs} cancelled`} />
        <KpiCard label="Low-stock items" value={analytics.lowStockCount} icon={<PackageX />} tone={analytics.lowStockCount > 0 ? "warning" : "neutral"} trend="At or below reorder level" className="col-span-2 md:col-span-1" />
      </div>

      {/* Booking volume */}
      <Card>
        <CardHeader
          title="Booking volume"
          description="New bookings per day, last 14 days"
          action={
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-gray-900">{periodTotal}</p>
              <p className="text-xs text-gray-500">bookings</p>
            </div>
          }
        />
        <div className="px-5 pb-5">
          <div className="flex gap-3">
            {/* Y axis */}
            <div className="relative h-48 w-6 shrink-0 text-right text-[11px] tabular-nums text-gray-400" aria-hidden>
              {gridLines.map((v, i) => (
                <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - v / axisMax) * 100}%` }}>{v}</span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              {/* Plot */}
              <div className="relative h-48">
                {gridLines.map((v, i) => (
                  <div
                    key={i}
                    className={`absolute inset-x-0 border-t ${v === 0 ? "border-surface-300" : "border-dashed border-surface-200"}`}
                    style={{ top: `${(1 - v / axisMax) * 100}%` }}
                    aria-hidden
                  />
                ))}
                <ol className="relative flex h-full items-end gap-1 sm:gap-2" aria-label="Bookings per day">
                  {dailyVolume.map((d) => {
                    const height = d.count > 0 ? Math.max((d.count / axisMax) * 100, 3) : 0;
                    return (
                      <li key={d.key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                        <span className="sr-only">{d.label}: {d.count} bookings</span>
                        {d.count > 0 && (
                          <span className="mb-1 text-[11px] font-medium tabular-nums text-gray-600" aria-hidden>{d.count}</span>
                        )}
                        <div
                          className="w-full max-w-[28px] rounded-t-[4px] bg-brand-500 transition-colors group-hover:bg-brand-600"
                          style={{ height: `${height}%` }}
                          title={`${d.label}: ${d.count} booking${d.count === 1 ? "" : "s"}`}
                          aria-hidden
                        />
                      </li>
                    );
                  })}
                </ol>
              </div>
              {/* X axis */}
              <div className="mt-2 flex gap-1 sm:gap-2" aria-hidden>
                {dailyVolume.map((d, i) => (
                  <div key={d.key} className="flex-1 text-center leading-tight">
                    <span className={`block text-[11px] tabular-nums text-gray-500 ${i % 2 === 1 && i !== dailyVolume.length - 1 ? "invisible sm:visible" : ""}`}>{d.day}</span>
                    <span className="hidden text-[10px] text-gray-400 sm:block">{d.weekday}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {periodTotal === 0 && (
            <p className="mt-4 text-center text-sm text-gray-500">No new bookings in the last 14 days.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status distribution */}
        <Card>
          <CardHeader title="Status distribution" description="Where every booking currently stands" />
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

        {/* Category popularity */}
        <Card>
          <CardHeader title="Category popularity" description="Share of bookings by appliance" />
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

      {/* Technician performance */}
      <Card className="overflow-hidden">
        <CardHeader title="Technician performance" description="Jobs assigned and completed per technician" />
        {techRows.length === 0 ? (
          <EmptyState icon={<Users />} title="No technicians" description="Onboard technicians to see their performance." />
        ) : (
          <div className="overflow-x-auto border-t border-surface-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-surface-50 text-left text-xs font-medium text-gray-500">
                  <th scope="col" className="px-4 py-3 font-medium sm:pl-5">Technician</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Assigned</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Completed</th>
                  <th scope="col" className="px-4 py-3 font-medium sm:pr-5">Completion rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {techRows.map((tp) => {
                  const rate = tp.accepted > 0 ? Math.round((tp.completed / tp.accepted) * 100) : 0;
                  const barColor = rate >= 60 ? "bg-accent-500" : rate > 0 ? "bg-warning-400" : "bg-surface-300";
                  return (
                    <tr key={tp.name} className="transition-colors hover:bg-surface-50">
                      <td className="px-4 py-3 sm:pl-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={tp.name} size="sm" />
                          <span className="font-medium text-gray-900">{tp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{tp.accepted}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{tp.completed}</td>
                      <td className="px-4 py-3 sm:pr-5">
                        {tp.accepted === 0 ? (
                          <span className="text-gray-400">No jobs yet</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-24 rounded-full bg-surface-100" aria-hidden>
                              <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.max(rate, 2)}%` }} />
                            </div>
                            <span className="w-10 text-right font-medium tabular-nums text-gray-900">{rate}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
