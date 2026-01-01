"use client";

import { useGating } from "@/contexts/GatingContext";
import { LockedState } from "@/components/LockedState";

export default function LearnPage() {
  const { plan, isLoading } = useGating();

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (plan === "free") {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LockedState
          title="Learning Hub"
          description="Access detailed ECG modules, anatomy guides, and interactive lessons. Upgrade to Pro to unlock the full learning library."
        />
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-8">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-slate-900">Learning Hub</h2>
        <p className="mt-2 text-sm text-slate-500">
          Curated ECG lessons, quick refreshers, and guided drills will appear here. Stay tuned as we expand the library.
        </p>
        <div className="mt-6 space-y-4">
          {[
            "12-lead setup and placement",
            "Rhythm analysis checklist",
            "Axis deviation essentials",
            "Ischemia and infarction patterns",
          ].map((topic) => (
            <div key={topic} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">{topic}</p>
              <p className="text-xs text-slate-500">Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
