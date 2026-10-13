"use client";

import React, { useState } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { UserRole } from "@/lib/types";
import { setCurrentRole } from "@/lib/store";
import { Button, Input } from "@/components/ui";
import { Logo } from "@/components/layout-shell";

interface LoginFormProps {
  role: UserRole;
  title: string;
  subtitle: string;
  defaultNext: string;
  allowedPrefix?: string;
  next?: string | null;
  photo?: StaticImageData;
  photoCaption?: {
    title: string;
    body: string;
  };
}

export function LoginForm({
  role,
  title,
  subtitle,
  defaultNext,
  allowedPrefix,
  next,
  photo,
  photoCaption,
}: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(
    role === "admin" ? "admin@fixmate.in" : "rajesh@fixmate.in"
  );
  const [password, setPassword] = useState("password123");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentRole(role);
    const target =
      next && (!allowedPrefix || next.startsWith(allowedPrefix))
        ? next
        : defaultNext;
    router.push(target);
  };

  return (
    <div className="flex min-h-screen bg-surface-50">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" aria-label="FixMate home">
              <Logo />
            </Link>
            <h1 className="mt-8 text-2xl font-semibold tracking-tight text-gray-900">
              {title}
            </h1>
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Email or phone
              </label>
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="mt-1"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full justify-center">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-200 pt-6 text-center text-xs text-gray-500">
            <p>Demo accounts are pre-filled.</p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
            >
              Switch demo role
            </Link>
          </div>
        </div>
      </div>

      {photo && (
        <div className="relative hidden w-0 flex-1 lg:block">
          <Image
            src={photo}
            alt={photoCaption?.title ?? ""}
            fill
            sizes="50vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {photoCaption && (
            <div className="absolute bottom-12 left-12 right-12 text-white">
              <h2 className="text-xl font-semibold">{photoCaption.title}</h2>
              <p className="mt-2 max-w-md text-sm text-white/80">
                {photoCaption.body}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
