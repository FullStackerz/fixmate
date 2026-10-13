"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Info, PackageSearch } from "lucide-react";
import { useDemoState, showToast } from "@/lib/hooks";
import { setCurrentRole, updateService, createService } from "@/lib/store";
import { APPLIANCE_CATEGORIES, formatPrice } from "@/lib/types";
import { PageHeader, Card, Badge, Button, Modal, Input, Select, Textarea, Tabs, CategoryIcon, EmptyState } from "@/components/ui";

type FormErrors = Partial<Record<"name" | "category" | "visitFee" | "price", string>>;

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        checked ? "bg-accent-500" : "bg-surface-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminServicesPage() {
  const state = useDemoState();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVisitFee, setEditVisitFee] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editCategory, setEditCategory] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => { setCurrentRole("admin"); }, []);

  const services = state.services.filter(
    (s) => categoryFilter === "all" || s.category === categoryFilter
  );

  const groups = APPLIANCE_CATEGORIES
    .map((c) => ({ cat: { id: c.id, name: c.name }, items: services.filter((s) => s.category === c.id) }))
    .filter((g) => g.items.length > 0);
  const knownIds = new Set(APPLIANCE_CATEGORIES.map((c) => c.id));
  const uncategorised = services.filter((s) => !knownIds.has(s.category));
  if (uncategorised.length > 0) groups.push({ cat: { id: "other", name: "Other" }, items: uncategorised });

  const enabledCount = state.services.filter((s) => s.enabled).length;

  const openEdit = (id: string) => {
    const svc = state.services.find((s) => s.id === id);
    if (!svc) return;
    setErrors({});
    setEditId(id);
    setEditName(svc.name);
    setEditDesc(svc.description);
    setEditVisitFee(String(svc.visitFeePaise / 100));
    setEditPrice(String(svc.startingPricePaise / 100));
    setEditEnabled(svc.enabled);
    setEditCategory(svc.category);
  };

  const openCreate = () => {
    setErrors({});
    setCreateOpen(true);
    setEditName("");
    setEditDesc("");
    setEditVisitFee("0");
    setEditPrice("");
    setEditEnabled(true);
    setEditCategory(categoryFilter !== "all" ? categoryFilter : "");
  };

  const validate = (requireCategory: boolean): boolean => {
    const next: FormErrors = {};
    if (!editName.trim()) next.name = "Enter a service name";
    if (requireCategory && !editCategory) next.category = "Choose a category";
    if (!editPrice) next.price = "Enter a starting price";
    else if (!(parseFloat(editPrice) >= 0)) next.price = "Enter a valid amount";
    if (editVisitFee && !(parseFloat(editVisitFee) >= 0)) next.visitFee = "Enter a valid amount";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveEdit = () => {
    if (!editId || !validate(false)) {
      showToast("Please fix the highlighted fields", "error");
      return;
    }
    try {
      updateService(editId, {
        name: editName,
        description: editDesc,
        visitFeePaise: Math.round(parseFloat(editVisitFee || "0") * 100),
        startingPricePaise: Math.round(parseFloat(editPrice) * 100),
        enabled: editEnabled,
      });
      showToast("Service updated", "success");
      setEditId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update service", "error");
    }
  };

  const handleCreate = () => {
    if (!validate(true)) {
      showToast("Please fix the highlighted fields", "error");
      return;
    }
    try {
      createService({
        category: editCategory,
        name: editName,
        description: editDesc,
        visitFeePaise: Math.round(parseFloat(editVisitFee || "0") * 100),
        startingPricePaise: Math.round(parseFloat(editPrice) * 100),
        enabled: editEnabled,
        brands: [],
        commonIssues: [],
      });
      showToast("Service created", "success");
      setCreateOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create service", "error");
    }
  };

  const handleToggle = (id: string) => {
    const svc = state.services.find((s) => s.id === id);
    if (!svc) return;
    updateService(id, { enabled: !svc.enabled });
    showToast(svc.enabled ? `${svc.name} disabled` : `${svc.name} enabled`, "info");
  };

  const isEditing = !!editId;
  const formOpen = isEditing || createOpen;
  const closeForm = () => { setEditId(null); setCreateOpen(false); };

  return (
    <div>
      <PageHeader
        title="Services"
        description={`${state.services.length} services in the catalogue · ${enabledCount} available to customers`}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden />New service</Button>}
      />

      <Tabs
        value={categoryFilter}
        onChange={setCategoryFilter}
        className="mb-6 w-full sm:w-fit"
        options={[
          { value: "all", label: "All", count: state.services.length },
          ...APPLIANCE_CATEGORIES.map((c) => ({
            value: c.id,
            label: c.name,
            count: state.services.filter((s) => s.category === c.id).length,
          })),
        ]}
      />

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PackageSearch aria-hidden />}
            title="No services in this category"
            description="Create a service to make it bookable by customers."
            action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" aria-hidden />New service</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map(({ cat, items }) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <div className="mb-3 flex items-center gap-3">
                <CategoryIcon category={cat.id} size="sm" />
                <h2 id={`cat-${cat.id}`} className="text-[15px] font-semibold text-gray-900">{cat.name}</h2>
                <span className="text-sm text-gray-500 tabular-nums">{items.length}</span>
              </div>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-surface-200">
                  {items.map((svc) => (
                    <li key={svc.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
                      <div className={`min-w-0 flex-1 ${svc.enabled ? "" : "opacity-60"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900">{svc.name}</h3>
                          {!svc.enabled && <Badge>Disabled</Badge>}
                        </div>
                        {svc.description && <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{svc.description}</p>}
                        {svc.commonIssues.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {svc.commonIssues.slice(0, 4).map((issue) => (
                              <Badge key={issue} variant="outline">{issue}</Badge>
                            ))}
                            {svc.commonIssues.length > 4 && (
                              <Badge variant="outline">+{svc.commonIssues.length - 4} more</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <dl className={`flex gap-6 text-right ${svc.enabled ? "" : "opacity-60"}`}>
                          <div>
                            <dt className="text-xs text-gray-500">Inspection fee</dt>
                            <dd className="mt-0.5 text-sm font-medium tabular-nums text-gray-900">
                              {svc.visitFeePaise > 0 ? formatPrice(svc.visitFeePaise) : "Free"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Starts at</dt>
                            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{formatPrice(svc.startingPricePaise)}</dd>
                          </div>
                        </dl>
                        <div className="flex items-center gap-3 border-l border-surface-200 pl-4 sm:pl-6">
                          <Switch
                            checked={svc.enabled}
                            onChange={() => handleToggle(svc.id)}
                            label={`${svc.enabled ? "Disable" : "Enable"} ${svc.name}`}
                          />
                          <Button variant="ghost" size="sm" onClick={() => openEdit(svc.id)} aria-label={`Edit ${svc.name}`} className="!px-2">
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-sm text-gray-500">
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        Price changes apply to new bookings only. Existing bookings keep the price quoted at booking time.
      </p>

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={isEditing ? "Edit service" : "New service"}
        description={isEditing ? undefined : "Add a bookable service to the catalogue."}
        size="md"
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => { e.preventDefault(); if (isEditing) handleSaveEdit(); else handleCreate(); }}
        >
          {isEditing ? (
            <div className="flex items-center gap-3 rounded-lg bg-surface-50 p-3">
              <CategoryIcon category={editCategory} size="sm" />
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium text-gray-900">
                  {APPLIANCE_CATEGORIES.find((c) => c.id === editCategory)?.name || editCategory}
                </p>
              </div>
            </div>
          ) : (
            <Select
              label="Category"
              required
              value={editCategory}
              onChange={(e) => { setEditCategory(e.target.value); setErrors((p) => ({ ...p, category: undefined })); }}
              options={APPLIANCE_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select a category"
              error={errors.category}
            />
          )}
          <Input
            label="Service name"
            required
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
            placeholder="e.g. Gas refill"
            error={errors.name}
          />
          <Textarea
            label="Description"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="What the technician does during this service"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Inspection fee (₹)"
              type="number"
              inputMode="decimal"
              min="0"
              value={editVisitFee}
              onChange={(e) => { setEditVisitFee(e.target.value); setErrors((p) => ({ ...p, visitFee: undefined })); }}
              hint="Use 0 for free inspection"
              error={errors.visitFee}
            />
            <Input
              label="Starting price (₹)"
              required
              type="number"
              inputMode="decimal"
              min="0"
              value={editPrice}
              onChange={(e) => { setEditPrice(e.target.value); setErrors((p) => ({ ...p, price: undefined })); }}
              error={errors.price}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-200 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Available for booking</p>
              <p className="text-xs text-gray-500">Disabled services are hidden from customers.</p>
            </div>
            <Switch checked={editEnabled} onChange={() => setEditEnabled(!editEnabled)} label="Available for booking" />
          </div>
          {isEditing && (
            <p className="flex items-start gap-2 text-xs text-gray-500">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              Price changes apply to new bookings only. Existing bookings keep their original prices.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-surface-200 pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit">{isEditing ? "Save changes" : "Create service"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
