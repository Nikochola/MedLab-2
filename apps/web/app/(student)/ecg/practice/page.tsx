"use client";

import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function ECGPracticePage() {
  const { hasEntitlement, isLoading, plan } = useGating();

  // Check limit for free user only if not loading
  if (!isLoading && plan === "free" && !hasEntitlement("ecg.practice")) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          variant="limit"
          title="Daily Limit Reached"
          description="You've completed your 3 free ECG practice sessions for today. Upgrade to Pro for unlimited practice and advanced clinical cases."
        />
      </div>
    );
  }

  if (isLoading) return null;

  return <ECGWorkbench initialMode="simulation" />
}
