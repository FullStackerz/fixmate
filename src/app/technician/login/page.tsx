"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { LoadingSpinner } from "@/components/ui";
import { PHOTOS } from "@/lib/media";

function TechnicianLogin() {
  const next = useSearchParams().get("next");
  return (
    <LoginForm
      role="technician"
      title="FixMate Partner sign in"
      subtitle="See your job offers, send quotes and complete repairs."
      defaultNext="/technician"
      allowedPrefix="/technician"
      next={next}
      photo={PHOTOS.technicianPortrait}
      photoCaption={{ title: "Your jobs, in one place", body: "New offers arrive instantly. Accept, navigate, quote and get paid." }}
    />
  );
}

export default function TechnicianLoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TechnicianLogin />
    </Suspense>
  );
}
