"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { LoadingSpinner } from "@/components/ui";
import { PHOTOS } from "@/lib/media";

function AdminLogin() {
  const next = useSearchParams().get("next");
  return (
    <LoginForm
      role="admin"
      title="Operations console"
      subtitle="Sign in with your FixMate staff account."
      defaultNext="/admin"
      allowedPrefix="/admin"
      next={next}
      photo={PHOTOS.toolsFlatlay}
      photoCaption={{ title: "Run FixMate in real time", body: "Bookings, technicians, catalogue and inventory, updated live." }}
    />
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminLogin />
    </Suspense>
  );
}
