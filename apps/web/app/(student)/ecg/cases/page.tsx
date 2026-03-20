"use client";

import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function ECGCasesPage() {
  const { hasEntitlement, isLoading, plan } = useGating();

  if (!isLoading && plan === "free" && !hasEntitlement("ecg.cases")) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          variant="locked"
          title="ECG Clinical Cases"
          description="Advanced ECG cases are available for Pro members. Upgrade to access full patient history and AI-driven report feedback."
        />
      </div>
    );
  }

  if (isLoading) return null;

  return <ECGWorkbench initialMode="case-based" />
}
