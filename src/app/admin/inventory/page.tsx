"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Search, Boxes, TriangleAlert, Package, IndianRupee, History, X, ArrowUpRight, PackageSearch,
} from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import { setCurrentRole, addStockMovement, getAvailableQuantity, isLowStock } from "@/lib/store";
import { formatPrice, APPLIANCE_CATEGORIES, StockMovementType, StockPart } from "@/lib/types";
import {
  PageHeader, Card, CardHeader, Badge, Button, Modal, Input, Select, KpiCard, EmptyState, CategoryIcon,
} from "@/components/ui";

const MOVEMENT_TYPES: { value: StockMovementType; label: string; description: string }[] = [
  { value: "received", label: "Received", description: "Stock in from a supplier" },
  { value: "consumed", label: "Consumed", description: "Used on a job" },
  { value: "reserved", label: "Reserved", description: "Held for a booking" },
  { value: "released", label: "Released", description: "Reservation cancelled" },
  { value: "returned", label: "Returned", description: "Unused part returned to stock" },
  { value: "adjustment", label: "Adjustment", description: "Stock count correction" },
];

const MOVEMENT_BADGE: Record<StockMovementType, "success" | "danger" | "info" | "warning" | "default"> = {
  received: "success",
  returned: "success",
  consumed: "danger",
  reserved: "info",
  released: "default",
  adjustment: "warning",
};

/** Effect of a movement on available stock, as a signed number. */
function signedQuantity(type: StockMovementType, qty: number): number {
  switch (type) {
    case "consumed":
    case "reserved":
      return -qty;
    default:
      return qty;
  }
}

const categoryName = (id: string) => APPLIANCE_CATEGORIES.find((c) => c.id === id)?.name || id;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const nf = (n: number) => n.toLocaleString("en-IN");

export default function AdminInventoryPage() {
  const state = useDemoState();
  const [search, setSearch] = useState("");
  const [movementOpen, setMovementOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  // Movement form
  const [movePartId, setMovePartId] = useState("");
  const [moveType, setMoveType] = useState<string>("received");
  const [moveQty, setMoveQty] = useState("");
  const [moveReason, setMoveReason] = useState("");

  useEffect(() => { setCurrentRole("admin"); }, []);

  const parts = state.parts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      || categoryName(p.category).toLowerCase().includes(q);
  });

  const kpis = useMemo(() => ({
    skus: state.parts.length,
    lowStock: state.parts.filter((p) => isLowStock(p)).length,
    units: state.parts.reduce((s, p) => s + p.quantityOnHand, 0),
    valuePaise: state.parts.reduce((s, p) => s + p.quantityOnHand * p.unitCostPaise, 0),
  }), [state.parts]);

  const selectedPartData = state.parts.find((p) => p.id === selectedPart);
  const partMovements = selectedPart
    ? state.stockMovements.filter((m) => m.partId === selectedPart).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const handleMovement = () => {
    if (!movePartId || !moveQty || !moveReason.trim()) {
      showToast("Part, quantity and reason are required", "error");
      return;
    }
    const qty = Number(moveQty);
    if (!Number.isInteger(qty) || qty === 0 || (moveType !== "adjustment" && qty < 0)) {
      showToast(moveType === "adjustment" ? "Adjustment must be a non-zero whole number" : "Quantity must be a positive whole number", "error");
      return;
    }
    try {
      addStockMovement({
        partId: movePartId,
        type: moveType as StockMovementType,
        quantity: qty,
        reason: moveReason,
      });
      showToast("Stock movement recorded", "success");
      setMovementOpen(false);
      setMovePartId("");
      setMoveQty("");
      setMoveReason("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not record movement", "error");
    }
  };

  const openMovementFor = (partId: string) => {
    setMovePartId(partId);
    setMovementOpen(true);
  };

  const renderDetail = (part: StockPart, inSheet = false) => {
    const available = getAvailableQuantity(part);
    const low = isLowStock(part);
    return (
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 border-b border-surface-200 p-5">
          <CategoryIcon category={part.category} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900">{part.name}</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-500">{part.sku}</p>
            {low && <Badge variant="warning" dot className="mt-2">Low stock</Badge>}
          </div>
          {!inSheet && <button
            onClick={() => setSelectedPart(null)}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-surface-100 hover:text-gray-700"
            aria-label="Close part details"
          >
            <X className="h-4 w-4" />
          </button>}
        </div>

        <div className="grid grid-cols-3 divide-x divide-surface-200 border-b border-surface-200">
          {[
            { label: "On hand", value: part.quantityOnHand, cls: "text-gray-900" },
            { label: "Reserved", value: part.quantityReserved, cls: "text-gray-900" },
            { label: "Available", value: available, cls: low ? "text-warning-600" : "text-accent-600" },
          ].map((s) => (
            <div key={s.label} className="px-3 py-4 text-center">
              <p className={`text-lg font-semibold tabular-nums ${s.cls}`}>{nf(s.value)}</p>
              <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-surface-200 p-5 text-sm">
          <div><dt className="text-xs text-gray-500">Unit cost</dt><dd className="mt-0.5 tabular-nums text-gray-900">{formatPrice(part.unitCostPaise)}</dd></div>
          <div><dt className="text-xs text-gray-500">Selling price</dt><dd className="mt-0.5 font-medium tabular-nums text-gray-900">{formatPrice(part.sellingPricePaise)}</dd></div>
          <div><dt className="text-xs text-gray-500">Reorder at</dt><dd className="mt-0.5 tabular-nums text-gray-900">{nf(part.reorderThreshold)} units</dd></div>
          <div><dt className="text-xs text-gray-500">Category</dt><dd className="mt-0.5 text-gray-900">{categoryName(part.category)}</dd></div>
          {part.compatibleAppliances.length > 0 && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">Compatible with</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {part.compatibleAppliances.map((a) => <Badge key={a} variant="outline">{categoryName(a)}</Badge>)}
              </dd>
            </div>
          )}
        </dl>

        <CardHeader
          title="Movement history"
          icon={History}
          action={
            <Button size="sm" variant="secondary" onClick={() => openMovementFor(part.id)}>
              <Plus className="h-4 w-4" aria-hidden />Record
            </Button>
          }
          className="pb-3"
        />
        {partMovements.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-gray-500">No movements recorded for this part yet.</p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-surface-200 overflow-y-auto border-t border-surface-200">
            {partMovements.map((m) => {
              const signed = signedQuantity(m.type, m.quantity);
              const label = MOVEMENT_TYPES.find((t) => t.value === m.type)?.label ?? m.type;
              return (
                <li key={m.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={MOVEMENT_BADGE[m.type]}>{label}</Badge>
                      {m.bookingId && (
                        <Link
                          href={`/admin/bookings?booking=${encodeURIComponent(m.bookingId)}`}
                          className="inline-flex items-center gap-0.5 font-mono text-xs text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {m.bookingId.slice(-8).toUpperCase()}<ArrowUpRight className="h-3 w-3" aria-hidden />
                        </Link>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{m.reason}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(m.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${signed < 0 ? "text-danger-600" : "text-accent-600"}`}>
                    {signed > 0 ? "+" : "−"}{Math.abs(signed)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    );
  };

  const selectedType = MOVEMENT_TYPES.find((t) => t.value === moveType);
  const movePart = state.parts.find((p) => p.id === movePartId);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track spare parts, stock levels and every stock movement. Select a part to see its history."
        actions={
          <Button onClick={() => { setMovePartId(""); setMovementOpen(true); }}>
            <Plus className="h-4 w-4" aria-hidden />Record movement
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Total SKUs" value={nf(kpis.skus)} icon={<Boxes aria-hidden />} tone="brand" />
        <KpiCard
          label="Low-stock items"
          value={nf(kpis.lowStock)}
          icon={<TriangleAlert aria-hidden />}
          tone={kpis.lowStock > 0 ? "warning" : "neutral"}
          trend={kpis.lowStock > 0 ? "At or below reorder level" : "All parts above reorder level"}
        />
        <KpiCard label="Units on hand" value={nf(kpis.units)} icon={<Package aria-hidden />} tone="neutral" />
        <KpiCard label="Stock value at cost" value={formatPrice(kpis.valuePaise)} icon={<IndianRupee aria-hidden />} tone="accent" />
      </div>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${selectedPartData ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <Card className="min-w-0 self-start overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-surface-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-semibold text-gray-900">
              Parts <span className="ml-1 text-sm font-normal text-gray-500 tabular-nums">{parts.length}</span>
            </h2>
            <div className="w-full sm:w-72">
              <Input
                icon={Search}
                placeholder="Search name, SKU or category"
                aria-label="Search parts"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {parts.length === 0 ? (
            <EmptyState
              icon={<PackageSearch aria-hidden />}
              title="No parts match your search"
              description="Try a different part name, SKU or category."
              action={search ? <Button variant="secondary" size="sm" onClick={() => setSearch("")}>Clear search</Button> : undefined}
            />
          ) : (
            <>
            <ul className="divide-y divide-surface-200 md:hidden">
              {parts.map((p) => {
                const available = getAvailableQuantity(p);
                const isLow = isLowStock(p);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPart(p.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-50 focus:outline-none focus-visible:bg-brand-50"
                    >
                      <CategoryIcon category={p.category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{p.name}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          <span className="font-mono">{p.sku}</span> · {formatPrice(p.sellingPricePaise)}
                        </p>
                        {isLow && <Badge variant="warning" dot className="mt-1.5">Low stock</Badge>}
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-semibold tabular-nums ${isLow ? "text-warning-700" : "text-gray-900"}`}>{nf(available)}</p>
                        <p className="text-xs text-gray-500">available</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className={`w-full whitespace-nowrap text-sm ${selectedPartData ? "min-w-[760px] lg:min-w-0" : "min-w-[960px]"}`}>
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50 text-left text-xs font-medium text-gray-500">
                    <th scope="col" className="px-4 py-3 font-medium">Part</th>
                    <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">On hand</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Reserved</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Available</th>
                    <th scope="col" className={`px-4 py-3 text-right font-medium ${selectedPartData ? "lg:hidden" : ""}`}>Unit cost</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                    <th scope="col" className={`px-4 py-3 text-right font-medium ${selectedPartData ? "lg:hidden" : ""}`}>Reorder at</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {parts.map((p) => {
                    const available = getAvailableQuantity(p);
                    const isLow = isLowStock(p);
                    const isSelected = selectedPart === p.id;
                    return (
                      <tr
                        key={p.id}
                        tabIndex={0}
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => setSelectedPart(p.id)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPart(p.id); }
                        }}
                        className={`cursor-pointer transition-colors focus:outline-none focus-visible:bg-brand-50 ${isSelected ? "bg-brand-50/60" : "hover:bg-surface-50"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={p.category} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-500">{categoryName(p.category)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{nf(p.quantityOnHand)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-500">{nf(p.quantityReserved)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex min-w-[2.5rem] justify-end rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${
                            isLow ? "bg-warning-50 text-warning-700" : "text-accent-700"
                          }`}>{nf(available)}</span>
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums text-gray-600 ${selectedPartData ? "lg:hidden" : ""}`}>{formatPrice(p.unitCostPaise)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatPrice(p.sellingPricePaise)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums text-gray-500 ${selectedPartData ? "lg:hidden" : ""}`}>{nf(p.reorderThreshold)}</td>
                        <td className="px-4 py-3">
                          {isLow ? <Badge variant="warning" dot>Low stock</Badge> : <Badge variant="success" dot>In stock</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!px-2"
                            aria-label={`Record movement for ${p.name}`}
                            onClick={(e) => { e.stopPropagation(); openMovementFor(p.id); }}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>

        {selectedPartData && (
          <aside className="hidden lg:block">
            <div className="sticky top-6">{renderDetail(selectedPartData)}</div>
          </aside>
        )}
      </div>

      {/* Mobile / tablet: part details in a sheet */}
      <div className="lg:hidden">
        <Modal open={!!selectedPartData && !movementOpen} onClose={() => setSelectedPart(null)} title="Part details">
          <div className="-m-5 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
            {selectedPartData && renderDetail(selectedPartData, true)}
          </div>
        </Modal>
      </div>

      {/* Movement modal */}
      <Modal
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        title="Record stock movement"
        description="Every change to stock is logged with a reason."
        size="sm"
      >
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); handleMovement(); }}>
          <Select
            label="Part"
            required
            value={movePartId}
            onChange={(e) => setMovePartId(e.target.value)}
            options={state.parts.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
            placeholder="Select a part"
            hint={movePart ? `${nf(getAvailableQuantity(movePart))} available · ${nf(movePart.quantityReserved)} reserved` : undefined}
          />
          <Select
            label="Movement type"
            required
            value={moveType}
            onChange={(e) => setMoveType(e.target.value)}
            options={MOVEMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            hint={selectedType?.description}
          />
          <Input
            label="Quantity"
            required
            type="number"
            inputMode="numeric"
            value={moveQty}
            onChange={(e) => setMoveQty(e.target.value)}
            min={moveType === "adjustment" ? undefined : "1"}
            step="1"
            hint={moveType === "adjustment" ? "Use a negative number to correct a count downwards" : undefined}
          />
          <Input
            label="Reason"
            required
            value={moveReason}
            onChange={(e) => setMoveReason(e.target.value)}
            placeholder="e.g. Received from supplier"
          />
          <div className="flex flex-col-reverse gap-2 border-t border-surface-200 pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setMovementOpen(false)}>Cancel</Button>
            <Button type="submit">Record movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
