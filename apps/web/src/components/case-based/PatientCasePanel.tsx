"use client"

import { Activity, Calendar, Heart, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PatientCase } from "./CaseGenerator"

interface PatientCasePanelProps {
  case: PatientCase
}

export function PatientCasePanel({ case: patientCase }: PatientCasePanelProps) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-4">
        <Card variant="conceptShell">
          <div>
            <h2 className="font-display text-2xl font-black text-[#232a39] dark:text-[#eaf0f8]">Patient Case</h2>
            <p className="mt-1 text-sm font-semibold text-[#6f7c8f] dark:text-[#b8c2d2]">Review the clinical information first.</p>
          </div>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-[#506178] dark:text-[#d4dceb]" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-semibold text-[#445063] dark:text-[#dbe3ef]">
            <div className="flex items-center justify-between">
              <span>Age</span>
              <span>{patientCase.age} years</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Gender</span>
              <span className="capitalize">{patientCase.gender}</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-[#506178] dark:text-[#d4dceb]" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm font-semibold text-[#445063] dark:text-[#dbe3ef]">
            <div className="rounded-xl border border-[#d8dde7] bg-[#f7f9fc] px-3 py-2 dark:border-[#505868] dark:bg-[#2f3540]">
              <p className="text-xs uppercase tracking-[0.08em] text-[#8a8592] dark:text-[#aeb8c8]">Blood pressure</p>
              <p className="mt-1">{patientCase.vitalSigns.bloodPressure} mmHg</p>
            </div>
            <div className="rounded-xl border border-[#d8dde7] bg-[#f7f9fc] px-3 py-2 dark:border-[#505868] dark:bg-[#2f3540]">
              <p className="text-xs uppercase tracking-[0.08em] text-[#8a8592] dark:text-[#aeb8c8]">Resp. rate</p>
              <p className="mt-1">{patientCase.vitalSigns.respiratoryRate} /min</p>
            </div>
            <div className="rounded-xl border border-[#d8dde7] bg-[#f7f9fc] px-3 py-2 dark:border-[#505868] dark:bg-[#2f3540]">
              <p className="text-xs uppercase tracking-[0.08em] text-[#8a8592] dark:text-[#aeb8c8]">Temperature</p>
              <p className="mt-1">{patientCase.vitalSigns.temperature}</p>
            </div>
            <div className="rounded-xl border border-[#d8dde7] bg-[#f7f9fc] px-3 py-2 dark:border-[#505868] dark:bg-[#2f3540]">
              <p className="text-xs uppercase tracking-[0.08em] text-[#8a8592] dark:text-[#aeb8c8]">SpO2</p>
              <p className="mt-1">{patientCase.vitalSigns.oxygenSaturation}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-[#506178] dark:text-[#d4dceb]" />
              Chief Complaint
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold text-[#4a586d] dark:text-[#dbe3ef]">
            {patientCase.chiefComplaint}
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">History of Present Illness</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-line text-sm font-semibold text-[#4a586d] dark:text-[#dbe3ef]">
            {patientCase.historyOfPresentIllness}
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-[#506178] dark:text-[#d4dceb]" />
              Past Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold text-[#4a586d] dark:text-[#dbe3ef]">
            {patientCase.pastMedicalHistory}
          </CardContent>
        </Card>

        <Card variant="conceptInset">
          <CardHeader>
            <CardTitle className="text-lg">Clinical Context</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold text-[#4a586d] dark:text-[#dbe3ef]">
            {patientCase.clinicalContext}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
