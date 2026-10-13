"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Star, Phone, MapPin, FileText, ShieldCheck, ShieldX, ShieldAlert, Users, X, Briefcase,
  CircleCheck, IndianRupee, MessageSquareText, UserRoundSearch,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import { setCurrentRole, updateTechnicianVerification } from "@/lib/store";
import { APPLIANCE_CATEGORIES, formatPrice, Technician } from "@/lib/types";
import {
  PageHeader, Card, Badge, Button, Modal, Input, Textarea, EmptyState, Tabs, Avatar, CategoryIcon,
} from "@/components/ui";

type StatusFilter = "all" | Technician["verificationStatus"];

const KYC_META: Record<Technician["verificationStatus"], { label: string; variant: "success" | "warning" | "danger" }> = {
  approved: { label: "Approved", variant: "success" },
  pending: { label: "Pending review", variant: "warning" },
  rejected: { label: "Rejected", variant: "danger" },
};

const DOC_META: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  verified: { label: "Verified", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  rejected: { label: "Rejected", variant: "danger" },
};

const categoryName = (id: string) => APPLIANCE_CATEGORIES.find((c) => c.id === id)?.name || id;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function KycBadge({ status }: { status: Technician["verificationStatus"] }) {
  const meta = KYC_META[status];
  return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
}

function Availability({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`h-2 w-2 rounded-full ${online ? "bg-accent-500" : "bg-gray-300"}`} aria-hidden />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export default function AdminTechniciansPage() {
  const state = useDemoState();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [kycAction, setKycAction] = useState<"approved" | "rejected" | null>(null);
  const [kycReason, setKycReason] = useState("");

  useEffect(() => { setCurrentRole("admin"); }, []);

  const counts = useMemo(() => {
    const c = { all: state.technicians.length, approved: 0, pending: 0, rejected: 0 };
    state.technicians.forEach((t) => { c[t.verificationStatus] += 1; });
    return c;
  }, [state.technicians]);

  const technicians = state.technicians
    .filter((t) => statusFilter === "all" || t.verificationStatus === statusFilter)
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.phone.includes(q) || t.servicePinCodes.some((p) => p.includes(q));
    });

  const tech = state.technicians.find((t) => t.id === selectedTech);
  const techBookings = tech ? state.bookings.filter((b) => b.technicianId === tech.id) : [];
  const completedBookings = techBookings.filter((b) => b.status === "completed" || b.status === "closed");
  const completedCount = completedBookings.length;
  const earningsPaise = completedBookings.reduce((sum, b) => {
    const quote = b.activeQuoteId ? state.quotes.find((q) => q.id === b.activeQuoteId) : undefined;
    return sum + (quote?.totalPaise ?? 0);
  }, 0);

  const handleKyc = () => {
    if (!selectedTech || !kycAction) return;
    try {
      updateTechnicianVerification(selectedTech, kycAction, kycReason);
      showToast(
        kycAction === "approved" ? `${tech?.name ?? "Technician"} approved` : `${tech?.name ?? "Technician"} rejected`,
        kycAction === "approved" ? "success" : "warning",
      );
      setKycAction(null);
      setKycReason("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update verification", "error");
    }
  };

  const closeKyc = () => { setKycAction(null); setKycReason(""); };

  const detail = tech ? (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 border-b border-surface-200 p-5">
        <Avatar name={tech.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900">{tech.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500 tabular-nums">
            <Phone className="h-3.5 w-3.5" aria-hidden />{tech.phone}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <KycBadge status={tech.verificationStatus} />
            <Availability online={tech.online} />
          </div>
        </div>
        <button
          onClick={() => setSelectedTech(null)}
          className="sheet-hide -mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-surface-100 hover:text-gray-700"
          aria-label="Close technician details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-surface-200 border-b border-surface-200">
        {[
          { label: "Assigned", value: techBookings.length, icon: Briefcase },
          { label: "Completed", value: completedCount, icon: CircleCheck },
          { label: "Job value", value: formatPrice(earningsPaise), icon: IndianRupee },
        ].map((s) => (
          <div key={s.label} className="px-3 py-4 text-center">
            <p className="text-base font-semibold tabular-nums text-gray-900">{s.value}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-gray-500">
              <s.icon className="h-3 w-3" aria-hidden />{s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-5 p-5">
        {tech.kycDecisionReason && (
          <div className="flex gap-2.5 rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <div>
              <p className="text-xs font-medium text-gray-500">Verification note</p>
              <p className="mt-0.5 text-gray-800">{tech.kycDecisionReason}</p>
            </div>
          </div>
        )}

        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium text-gray-500">Rating</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-medium tabular-nums">{tech.ratingDemo > 0 ? tech.ratingDemo.toFixed(1) : "No ratings yet"}</span>
              <span className="text-gray-500">· {tech.completedJobs} lifetime jobs</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Skills</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {tech.skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-md bg-surface-50 py-0.5 pl-0.5 pr-2 text-xs font-medium text-gray-700 ring-1 ring-inset ring-surface-200">
                  <CategoryIcon category={s} size="sm" className="!h-6 !w-6 !rounded-md [&_svg]:!h-3.5 [&_svg]:!w-3.5" />
                  {categoryName(s)}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Service areas</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {tech.servicePinCodes.map((p) => (
                <Badge key={p} variant="outline"><MapPin className="h-3 w-3" aria-hidden /><span className="tabular-nums">{p}</span></Badge>
              ))}
            </dd>
          </div>
          {tech.brands.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-gray-500">Brands</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {tech.brands.map((b) => <Badge key={b}>{b}</Badge>)}
              </dd>
            </div>
          )}
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">KYC documents</h3>
          {tech.kycDocuments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-surface-300 p-4 text-center text-sm text-gray-500">No documents submitted</p>
          ) : (
            <ul className="divide-y divide-surface-200 rounded-lg border border-surface-200">
              {tech.kycDocuments.map((doc, i) => {
                const meta = DOC_META[doc.status] ?? { label: doc.status, variant: "warning" as const };
                return (
                  <li key={`${doc.type}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-gray-500">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{doc.type}</p>
                      <p className="text-xs text-gray-500">Submitted {formatDate(doc.submittedAt)}</p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {tech.verificationStatus !== "approved" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setKycAction("rejected")}>
              <ShieldX className="h-4 w-4 text-danger-500" aria-hidden />Reject
            </Button>
            <Button variant="accent" onClick={() => setKycAction("approved")}>
              <ShieldCheck className="h-4 w-4" aria-hidden />Approve
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setKycAction("rejected")}>
            <ShieldAlert className="h-4 w-4 text-danger-500" aria-hidden />Revoke approval
          </Button>
        )}
      </div>
    </Card>
  ) : null;

  return (
    <div>
      <PageHeader
        title="Technicians"
        description="Review partner profiles, verify KYC documents and manage who can receive jobs."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "approved", label: "Approved", count: counts.approved },
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "rejected", label: "Rejected", count: counts.rejected },
          ]}
          className="lg:w-auto"
        />
        <div className="w-full lg:w-80">
          <Input
            icon={Search}
            placeholder="Search name, phone or PIN code"
            aria-label="Search technicians"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 self-start overflow-hidden">
          {technicians.length === 0 ? (
            <EmptyState
              icon={<UserRoundSearch aria-hidden />}
              title="No technicians found"
              description="Try a different search term or status filter."
              action={(search || statusFilter !== "all") ? (
                <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>
              ) : undefined}
            />
          ) : (
            <>
            <ul className="divide-y divide-surface-200 md:hidden">
              {technicians.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTech(t.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-50 focus:outline-none focus-visible:bg-brand-50"
                  >
                    <div className="relative">
                      <Avatar name={t.name} />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${t.online ? "bg-accent-500" : "bg-gray-300"}`} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-gray-900">{t.name}</p>
                        <KycBadge status={t.verificationStatus} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 tabular-nums">
                        <span>{t.phone}</span>
                        <span aria-hidden>·</span>
                        {t.ratingDemo > 0 ? (
                          <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />{t.ratingDemo.toFixed(1)}</span>
                        ) : <span>New</span>}
                        <span aria-hidden>·</span>
                        <span>{t.completedJobs} jobs</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{t.skills.map(categoryName).join(", ")}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50 text-left text-xs font-medium text-gray-500">
                    <th scope="col" className="px-4 py-3 font-medium">Technician</th>
                    <th scope="col" className="px-4 py-3 font-medium">Skills</th>
                    <th scope="col" className="px-4 py-3 font-medium">Service PINs</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Rating</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Jobs</th>
                    <th scope="col" className="px-4 py-3 font-medium">KYC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {technicians.map((t) => {
                    const isSelected = selectedTech === t.id;
                    return (
                      <tr
                        key={t.id}
                        tabIndex={0}
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => setSelectedTech(t.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTech(t.id); } }}
                        className={`cursor-pointer transition-colors focus:outline-none focus-visible:bg-brand-50 ${isSelected ? "bg-brand-50/60" : "hover:bg-surface-50"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar name={t.name} size="sm" />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${t.online ? "bg-accent-500" : "bg-gray-300"}`}
                                aria-hidden
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{t.name}</p>
                              <p className="text-xs text-gray-500 tabular-nums">
                                {t.phone}<span className="sr-only">, {t.online ? "online" : "offline"}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex -space-x-1">
                            {t.skills.map((s) => (
                              <span key={s} title={categoryName(s)} className="rounded-lg ring-2 ring-white">
                                <CategoryIcon category={s} size="sm" />
                                <span className="sr-only">{categoryName(s)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {t.servicePinCodes.slice(0, 2).join(", ")}
                          {t.servicePinCodes.length > 2 && <span className="text-gray-400"> +{t.servicePinCodes.length - 2}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 tabular-nums text-gray-900">
                            {t.ratingDemo > 0 ? (<><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />{t.ratingDemo.toFixed(1)}</>) : <span className="text-gray-400">New</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{t.completedJobs}</td>
                        <td className="px-4 py-3"><KycBadge status={t.verificationStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>

        <aside className="hidden lg:block">
          <div className="sticky top-6">
            {detail ?? (
              <Card>
                <EmptyState
                  icon={<Users aria-hidden />}
                  title="No technician selected"
                  description="Select a technician to view their profile, documents and verification status."
                />
              </Card>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile / tablet: details render in a sheet */}
      <div className="lg:hidden">
        <Modal open={!!tech && !kycAction} onClose={() => setSelectedTech(null)} title="Technician profile">
          <div className="-m-5 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&_.sheet-hide]:hidden">{detail}</div>
        </Modal>
      </div>

      <Modal
        open={!!kycAction}
        onClose={closeKyc}
        title={kycAction === "approved" ? "Approve technician" : tech?.verificationStatus === "approved" ? "Revoke approval" : "Reject technician"}
        description={tech?.name}
        size="sm"
      >
        <p className="mb-4 text-sm text-gray-600">
          {kycAction === "approved"
            ? "Once approved, this technician becomes eligible for job assignments in their service areas."
            : "This technician will stop receiving new job assignments until their documents are approved."}
        </p>
        <Textarea
          label="Reason"
          hint="Optional. Shown on the technician's profile as the verification note."
          value={kycReason}
          onChange={(e) => setKycReason(e.target.value)}
          placeholder={kycAction === "approved" ? "e.g. Documents verified against originals" : "e.g. PAN card image is unreadable"}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeKyc}>Cancel</Button>
          <Button variant={kycAction === "approved" ? "accent" : "danger"} onClick={handleKyc}>
            {kycAction === "approved" ? "Approve" : tech?.verificationStatus === "approved" ? "Revoke" : "Reject"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
