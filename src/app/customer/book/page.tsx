"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui";

/** Old links (/customer/book?service=<id>) now go to the service booking page. */
function BookRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");

  useEffect(() => {
    router.replace(serviceId ? `/customer/service/${encodeURIComponent(serviceId)}` : "/customer");
  }, [router, serviceId]);

  return <LoadingSpinner />;
}

export default function BookRepairPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BookRedirect />
    </Suspense>
  );
}
