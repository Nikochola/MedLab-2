"use client";

import { XRayWorkbench } from "@/components/xray/XRayWorkbench"
import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function CTPracticePage() {
  const { hasEntitlement, isLoading, plan } = useGating();

  if (!isLoading && plan === "free" && !hasEntitlement("ct.practice")) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          variant="limit"
          title="Daily Limit Reached"
          description="You've completed your free CT practice sessions for today. Upgrade to Pro for unlimited access."
        />
      </div>
    );
  }

  if (isLoading) return null;

  return <XRayWorkbench initialMode="simulation" modality="CT" />
}
