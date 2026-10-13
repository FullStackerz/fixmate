"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, UserRound, Wrench, LucideIcon } from "lucide-react";
import { useDemoState } from "@/lib/hooks";
import { setCurrentRole } from "@/lib/store";
import { UserRole } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/layout-shell";

interface AccountOption {
  role: UserRole;
  app: string;
  description: string;
  name: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}

export default function LoginPage() {
  const state = useDemoState();
  const router = useRouter();
  const customer = state.customers[0];
  const technician = state.technicians.find((t) => t.id === "tech_001");

  const accounts: AccountOption[] = [
    {
      role: "customer",
      app: "Customer",
      description: "Book repairs, approve quotes and track your technician.",
      name: customer?.name ?? "Customer",
      detail: customer?.phone ?? "",
      href: "/customer",
      icon: UserRound,
    },
    {
      role: "technician",
      app: "Service partner",
      description: "Accept jobs, send quotes and complete repairs.",
      name: technician?.name ?? "Technician",
      detail: technician?.phone ?? "",
      href: "/technician",
      icon: Wrench,
    },
    {
      role: "admin",
      app: "Operations",
      description: "Manage bookings, technicians, catalogue and inventory.",
      name: "Operations Admin",
      detail: "ops@fixmate.in",
      href: "/admin",
      icon: ShieldCheck,
    },
  ];

  const signIn = (account: AccountOption) => {
    setCurrentRole(account.role);
    router.push(account.href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="FixMate home"><Logo /></Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500">Choose the account you want to continue with.</p>
          </div>

          <div className="mt-8 space-y-3">
            {accounts.map((account) => (
              <button
                key={account.role}
                onClick={() => signIn(account)}
                className="group flex w-full items-center gap-4 rounded-xl border border-surface-200 bg-white p-4 text-left shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Avatar name={account.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">{account.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                      <account.icon className="h-3 w-3" aria-hidden />{account.app}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">{account.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-500" aria-hidden />
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-500">
            By continuing you agree to the FixMate Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
