"use client";

import React, {
  ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes,
  ReactNode, useEffect, useId, useRef, useState,
} from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import {
  AirVent, Refrigerator, WashingMachine, Microwave, UtensilsCrossed, Wrench,
  X, ChevronRight, ChevronDown, Inbox, LoaderCircle, CircleCheck, CircleX, TriangleAlert, Info, Star,
  LucideIcon,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { useToasts } from "@/lib/hooks";
import { serviceImage } from "@/lib/media";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/* ── Button ───────────────────────────────────────────────────── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, children, className = "", disabled, type = "button", ...props }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
    accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-sm",
    secondary: "bg-white text-gray-800 border border-surface-200 hover:bg-surface-50 hover:border-surface-300 shadow-sm",
    outline: "border border-surface-300 bg-white text-brand-600 font-semibold hover:bg-brand-50 hover:border-brand-200 shadow-sm",
    danger: "bg-danger-500 text-white hover:bg-danger-600 shadow-sm",
    ghost: "text-gray-600 hover:bg-surface-100 hover:text-gray-900",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-[13px] gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-[15px] gap-2",
  };
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center whitespace-nowrap font-medium rounded-lg transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0",
        variants[variant], sizes[size], className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ── Form fields ──────────────────────────────────────────────── */
const fieldBase =
  "w-full rounded-lg border bg-white text-sm text-gray-900 placeholder:text-gray-400 transition-colors " +
  "focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500 disabled:bg-surface-100 disabled:text-gray-500";

function FieldShell({ id, label, required, error, hint, children }: {
  id: string; label?: string; required?: boolean; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-danger-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-xs text-danger-600">
          <CircleX className="h-3.5 w-3.5" aria-hidden />{error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export function Input({ label, error, hint, id, icon: Icon, className = "", ...props }: InputFieldProps) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <FieldShell id={inputId} label={label} required={props.required} error={error} hint={hint}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />}
        <input
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cx(fieldBase, "h-10 px-3", Icon && "pl-9", error ? "border-danger-400" : "border-surface-200", className)}
          {...props}
        />
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function Select({ label, error, hint, options, placeholder, id, className = "", ...props }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <FieldShell id={selectId} label={label} required={props.required} error={error} hint={hint}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error || undefined}
          className={cx(fieldBase, "h-10 appearance-none pl-3 pr-9 truncate", error ? "border-danger-400" : "border-surface-200", className)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      </div>
    </FieldShell>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, id, className = "", ...props }: TextareaFieldProps) {
  const autoId = useId();
  const textareaId = id || autoId;
  return (
    <FieldShell id={textareaId} label={label} required={props.required} error={error} hint={hint}>
      <textarea
        id={textareaId}
        rows={3}
        aria-invalid={!!error || undefined}
        className={cx(fieldBase, "px-3 py-2.5 resize-y", error ? "border-danger-400" : "border-surface-200", className)}
        {...props}
      />
    </FieldShell>
  );
}

/* ── Badge ────────────────────────────────────────────────────── */
interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "brand";
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", dot, className = "" }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-surface-100 text-gray-700 ring-surface-200",
    success: "bg-accent-50 text-accent-700 ring-accent-600/20",
    warning: "bg-warning-50 text-warning-700 ring-warning-600/20",
    danger: "bg-danger-50 text-danger-700 ring-danger-600/20",
    info: "bg-brand-50 text-brand-700 ring-brand-600/20",
    brand: "bg-brand-500 text-white ring-brand-500",
    outline: "bg-white text-gray-600 ring-surface-300",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", variants[variant], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Booking status pill — colour plus text label, never colour alone. */
export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const label = (STATUS_LABELS as Record<string, string>)[status] || status;
  const color = (STATUS_COLORS as Record<string, string>)[status] || "bg-surface-100 text-gray-700 ring-surface-200";
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", color, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

/* ── Card ─────────────────────────────────────────────────────── */
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover, onClick }: CardProps) {
  return (
    <div
      className={cx(
        "bg-white rounded-xl border border-surface-200 shadow-card transition-all duration-150",
        hover && "hover:shadow-card-hover hover:border-surface-300 cursor-pointer",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </div>
  );
}

/** Standard card heading row: title, optional description, optional right-side action. */
export function CardHeader({ title, description, action, icon: Icon, className = "" }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: LucideIcon; className?: string;
}) {
  return (
    <div className={cx("flex justify-between gap-4 px-5 pt-5 pb-4", description ? "items-start" : "items-center", className)}>
      <div className={cx("flex gap-3 min-w-0", description ? "items-start" : "items-center")}>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-gray-600">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Modal/Dialog ─────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes: Record<string, string> = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={cx("relative w-full bg-white shadow-pop animate-slide-up max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl", sizes[size])}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-surface-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-surface-100 hover:text-gray-700"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="mb-6 text-sm text-gray-600">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ── Empty State ──────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-4 py-14 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-gray-500 [&_svg]:h-6 [&_svg]:w-6">
        {icon ?? <Inbox aria-hidden />}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 mb-5 max-w-sm text-sm text-gray-500">{description}</p>
      {action}
    </div>
  );
}

/* ── Page Header ──────────────────────────────────────────────── */
interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
          {breadcrumbs.map((bc, i) => (
            <React.Fragment key={`${bc.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />}
              {bc.href ? (
                <Link href={bc.href} className="transition-colors hover:text-gray-900">{bc.label}</Link>
              ) : (
                <span className="font-medium text-gray-900" aria-current="page">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-[28px] sm:leading-9">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500 sm:text-[15px]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ── Loading / Skeleton ───────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cx("animate-shimmer rounded bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 bg-[length:200%_100%]", className)} />;
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <div className="flex justify-center py-10" role="status" aria-label="Loading">
      <LoaderCircle className={cx("animate-spin text-brand-500", sizes[size])} />
    </div>
  );
}

/* ── Toasts ───────────────────────────────────────────────────── */
export function ToastContainer() {
  const toasts = useToasts();
  const styles: Record<string, { icon: LucideIcon; color: string }> = {
    success: { icon: CircleCheck, color: "text-accent-500" },
    error: { icon: CircleX, color: "text-danger-500" },
    warning: { icon: TriangleAlert, color: "text-warning-500" },
    info: { icon: Info, color: "text-brand-500" },
  };
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:top-auto sm:left-auto sm:right-6 sm:bottom-6" aria-live="polite">
      {toasts.map((t) => {
        const { icon: Icon, color } = styles[t.type] ?? styles.info;
        return (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-pop animate-slide-up">
            <Icon className={cx("mt-0.5 h-5 w-5 shrink-0", color)} aria-hidden />
            <span className="leading-5">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  tone?: "brand" | "accent" | "warning" | "danger" | "neutral";
  className?: string;
}

export function KpiCard({ label, value, icon, trend, tone = "neutral", className = "" }: KpiCardProps) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    accent: "bg-accent-50 text-accent-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
    neutral: "bg-surface-100 text-gray-600",
  };
  return (
    <Card className={cx("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && (
          <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", tones[tone])}>{icon}</span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      {trend && <p className="mt-1 text-xs text-gray-500">{trend}</p>}
    </Card>
  );
}

/* ── Appliance category icon ──────────────────────────────────── */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ac: AirVent,
  refrigerator: Refrigerator,
  washing_machine: WashingMachine,
  microwave: Microwave,
  dishwasher: UtensilsCrossed,
};

const CATEGORY_TONES: Record<string, string> = {
  ac: "bg-sky-50 text-sky-600",
  refrigerator: "bg-brand-50 text-brand-600",
  washing_machine: "bg-violet-50 text-violet-600",
  microwave: "bg-orange-50 text-orange-600",
  dishwasher: "bg-teal-50 text-teal-600",
};

export function CategoryIcon({ category, size = "md", className = "" }: { category: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? Wrench;
  const sizes = { sm: "h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4", md: "h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5", lg: "h-12 w-12 rounded-xl [&_svg]:h-6 [&_svg]:w-6" };
  return (
    <span className={cx("flex shrink-0 items-center justify-center", sizes[size], CATEGORY_TONES[category] ?? "bg-surface-100 text-gray-600", className)}>
      <Icon aria-hidden />
    </span>
  );
}

/* ── Avatar ───────────────────────────────────────────────────── */
export function Avatar({ name, initials, size = "md", className = "" }: { name?: string; initials?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const text = initials || (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white", sizes[size], className)} aria-hidden>
      {text}
    </span>
  );
}

/* ── Segmented tabs ───────────────────────────────────────────── */
export function Tabs<T extends string>({ value, onChange, options, className = "" }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; className?: string;
}) {
  return (
    <div className={cx("flex gap-1 overflow-x-auto scrollbar-none rounded-lg bg-surface-100 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cx("rounded-full px-1.5 text-xs tabular-nums", value === o.value ? "bg-brand-50 text-brand-700" : "bg-surface-200 text-gray-600")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Description list item ────────────────────────────────────── */
export function DetailItem({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

/* ── Horizontal bar (labelled, for simple charts) ─────────────── */
export function BarRow({ label, value, max, color = "bg-brand-500", suffix }: { label: ReactNode; value: number; max: number; color?: string; suffix?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate text-gray-600">{label}</span>
      <div className="h-2 rounded-full bg-surface-100" role="presentation">
        <div className={cx("h-2 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-medium tabular-nums text-gray-900">{value}{suffix}</span>
    </div>
  );
}

/* ── Marketplace building blocks ──────────────────────────────── */

/** Compact count: 6800 → "6.8K", 128400 → "128K", 1200000 → "1.2M". */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

const ART_TONES: Record<string, { bg: string; fg: string; ring: string }> = {
  ac: { bg: "from-sky-100 via-sky-50 to-cyan-100", fg: "text-sky-700", ring: "bg-sky-200/60" },
  refrigerator: { bg: "from-indigo-100 via-slate-50 to-blue-100", fg: "text-indigo-700", ring: "bg-indigo-200/60" },
  washing_machine: { bg: "from-violet-100 via-fuchsia-50 to-purple-100", fg: "text-violet-700", ring: "bg-violet-200/60" },
  microwave: { bg: "from-orange-100 via-amber-50 to-rose-100", fg: "text-orange-700", ring: "bg-orange-200/60" },
  dishwasher: { bg: "from-teal-100 via-emerald-50 to-teal-50", fg: "text-teal-700", ring: "bg-teal-200/60" },
};

/** Illustrated thumbnail used where a marketplace would show a service photo. */
/**
 * Service/category thumbnail. Shows the real photo for the service (or its category);
 * falls back to an illustrated tile when no photo exists (e.g. admin-created services).
 */
export function ServiceArt({
  category, serviceId, className = "", iconClassName = "h-1/2 w-1/2", sizes = "(max-width: 768px) 50vw, 320px", priority, photo = true,
}: {
  category: string; serviceId?: string; className?: string; iconClassName?: string; sizes?: string; priority?: boolean; photo?: boolean;
}) {
  const Icon = CATEGORY_ICONS[category] ?? Wrench;
  const tone = ART_TONES[category] ?? { bg: "from-surface-100 to-surface-200", fg: "text-gray-600", ring: "bg-white/50" };
  const img = photo ? serviceImage({ id: serviceId, category }) : undefined;
  return (
    <div
      className={cx(
        "group/art isolate flex items-center justify-center overflow-hidden bg-gradient-to-br",
        // Defaults only when the caller doesn't set its own positioning/radius (no class merging in this kit).
        !/(absolute|fixed|sticky)/.test(className) && "relative",
        !/rounded(-|)/.test(className) && "rounded-xl",
        tone.bg,
        className,
      )}
      aria-hidden
    >
      {img ? (
        <Image
          src={img}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          className="object-cover transition-transform duration-700 ease-out group-hover/art:scale-[1.06] group-hover:scale-[1.06]"
        />
      ) : (
        <>
          <span className={cx("absolute -right-[18%] -top-[18%] h-[62%] w-[62%] rounded-full", tone.ring)} />
          <span className="absolute -bottom-[22%] -left-[12%] h-[55%] w-[55%] rounded-full bg-white/50" />
          <Icon className={cx("relative drop-shadow-sm", tone.fg, iconClassName)} strokeWidth={1.4} />
        </>
      )}
    </div>
  );
}

/** Responsive photo with optional hover zoom and bottom gradient for overlaid text. */
export function Photo({
  src, alt, className = "", imgClassName = "", sizes = "100vw", priority, zoom = true, overlay = false, kenBurns = false,
}: {
  src: StaticImageData; alt: string; className?: string; imgClassName?: string; sizes?: string; priority?: boolean;
  zoom?: boolean; overlay?: boolean; kenBurns?: boolean;
}) {
  return (
    <div className={cx("group/photo overflow-hidden bg-surface-100", !/(^|\s)!?(absolute|fixed|sticky)(\s|$)/.test(className) && "relative", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        className={cx(
          "object-cover",
          zoom && "transition-transform duration-700 ease-out group-hover/photo:scale-[1.05] group-hover:scale-[1.05]",
          kenBurns && "animate-ken-burns",
          imgClassName,
        )}
      />
      {overlay && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />}
    </div>
  );
}

/** Fades/slides children in when they scroll into view (respects prefers-reduced-motion via CSS). */
export function Reveal({
  children, className = "", delay = 0, as: Tag = "div",
}: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={(node: HTMLElement | null) => { ref.current = node; }}
      className={cx("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** "★ 4.81 (128K)" rating line. */
export function Rating({ value, count, className = "" }: { value?: number; count?: number; className?: string }) {
  if (value === undefined) return null;
  return (
    <span className={cx("inline-flex items-center gap-1 text-[13px] text-gray-600", className)}>
      <Star className="h-3.5 w-3.5 fill-gray-800 text-gray-800" aria-hidden />
      <span className="font-medium text-gray-800 tabular-nums">{value.toFixed(2)}</span>
      {count !== undefined && <span className="tabular-nums">({formatCount(count)})</span>}
      <span className="sr-only">out of 5{count !== undefined ? ` from ${count} ratings` : ""}</span>
    </span>
  );
}

/** Price with optional struck-through reference price. Amounts are in paise. */
export function PriceTag({ price, list, prefix, className = "" }: { price: number; list?: number; prefix?: string; className?: string }) {
  const fmt = (p: number) => {
    const whole = p % 100 === 0;
    return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
  };
  return (
    <span className={cx("inline-flex items-baseline gap-1.5", className)}>
      {prefix && <span className="text-[13px] text-gray-500">{prefix}</span>}
      <span className="font-semibold tabular-nums text-gray-900">{fmt(price)}</span>
      {list !== undefined && list > price && (
        <span className="text-[13px] tabular-nums text-gray-400 line-through">{fmt(list)}</span>
      )}
    </span>
  );
}

/** Section heading row: title on the left, optional "See all"-style action on the right. */
export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
