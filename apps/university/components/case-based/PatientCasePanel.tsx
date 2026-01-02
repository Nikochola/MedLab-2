"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PatientCase } from "./CaseGenerator"
import { Activity, Calendar, Heart, User } from "lucide-react"

interface PatientCasePanelProps {
  case: PatientCase
}

export function PatientCasePanel({ case: patientCase }: PatientCasePanelProps) {
  return (
    <div className="h-full bg-card p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Patient Case</h2>
          <p className="text-sm text-muted-foreground">Review the clinical information</p>
        </div>

        {/* Demographics */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Age:</span>
              <span className="font-medium">{patientCase.age} years old</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gender:</span>
              <span className="font-medium capitalize">{patientCase.gender}</span>
            </div>
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Blood Pressure</div>
                <div className="text-lg font-semibold">{patientCase.vitalSigns.bloodPressure} mmHg</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Respiratory Rate</div>
                <div className="text-lg font-semibold">{patientCase.vitalSigns.respiratoryRate} /min</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Temperature</div>
                <div className="text-lg font-semibold">{patientCase.vitalSigns.temperature}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Oxygen Saturation</div>
                <div className="text-lg font-semibold">{patientCase.vitalSigns.oxygenSaturation}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chief Complaint */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Chief Complaint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{patientCase.chiefComplaint}</p>
          </CardContent>
        </Card>

        {/* History of Present Illness */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">History of Present Illness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {patientCase.historyOfPresentIllness}
            </p>
          </CardContent>
        </Card>

        {/* Past Medical History */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Past Medical History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{patientCase.pastMedicalHistory}</p>
          </CardContent>
        </Card>

        {/* Clinical Context */}
        <Card className="bg-primary/10 border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Clinical Context</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{patientCase.clinicalContext}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
