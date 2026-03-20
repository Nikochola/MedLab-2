"use client";

import { XRayWorkbench } from "@/components/xray/XRayWorkbench"
import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function XRayCasesPage() {
  const { hasEntitlement, isLoading, plan } = useGating();

  if (!isLoading && plan === "free" && !hasEntitlement("xray.cases")) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          variant="locked"
          title="X-Ray Clinical Cases"
          description="Clinical Cases are available for Pro members only. Upgrade to access full patient history and detailed report feedback."
        />
      </div>
    );
  }

  if (isLoading) return null;

  return <XRayWorkbench initialMode="case-based" />
}
