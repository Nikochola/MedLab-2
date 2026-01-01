"use client";

import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function ECGCasesPage() {
  const { hasEntitlement, isLoading } = useGating();

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!hasEntitlement("ecg.cases")) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          title="ECG Case Studies"
          description="Master clinical ECG interpretation with structured real-world cases. Subscribe to Pro to unlock all cases and advanced feedback."
        />
      </div>
    );
  }

  return <ECGWorkbench initialMode="case-based" />
}
