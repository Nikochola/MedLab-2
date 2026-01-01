"use client";

import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function ECGPracticePage() {
  const { hasEntitlement, isLoading, plan } = useGating();

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  // If free user hits limit
  if (plan === "free" && !hasEntitlement("ecg.practice")) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          title="Daily Limit Reached"
          description="You've completed your 3 free ECG practice sessions for today. Upgrade to Pro for unlimited practice and advanced clinical cases."
        />
      </div>
    );
  }

  return <ECGWorkbench initialMode="simulation" />
}
