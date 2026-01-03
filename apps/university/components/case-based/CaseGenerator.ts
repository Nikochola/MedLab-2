import { ECGWaveformParams } from "../ecg/ECGWaveformGenerator"

export interface PatientCase {
  id: string
  age: number
  gender: "male" | "female"
  chiefComplaint: string
  historyOfPresentIllness: string
  pastMedicalHistory: string
  vitalSigns: {
    bloodPressure: string
    heartRate: number
    respiratoryRate: number
    temperature: string
    oxygenSaturation: string
  }
  clinicalContext: string
  ecgParams: ECGWaveformParams
  diagnosisOptions: string[]
  correctDiagnosis: string
}

const caseTemplates = [
  {
    scenarios: [
      {
        age: 65,
        gender: "male" as const,
        chiefComplaint: "Chest pain for 2 hours",
        historyOfPresentIllness:
          "65-year-old male presents with sudden onset of crushing chest pain that started 2 hours ago. Pain radiates to left arm and jaw. Associated with diaphoresis and nausea.",
        pastMedicalHistory: "Hypertension, hyperlipidemia, former smoker",
        vitalSigns: {
          bloodPressure: "150/95",
          heartRate: 95,
          respiratoryRate: 18,
          temperature: "98.6°F",
          oxygenSaturation: "98% on room air",
        },
        clinicalContext: "Emergency department evaluation for suspected acute coronary syndrome",
        ecgParams: {
          heartRate: 95,
          rhythm: "normal" as const,
          abnormalities: {
            stElevation: true,
            qWaves: false,
            tWaveInversion: false,
            stDepression: false,
          },
        },
        diagnosisOptions: [
          "Acute anterior STEMI",
          "Inferior STEMI",
          "Normal sinus rhythm",
          "Atrial fibrillation with RVR",
        ],
        correctDiagnosis: "Acute anterior STEMI",
      },
      {
        age: 45,
        gender: "female" as const,
        chiefComplaint: "Palpitations and dizziness",
        historyOfPresentIllness:
          "45-year-old female with 3-day history of rapid, irregular heartbeat. Reports feeling dizzy and short of breath with minimal exertion.",
        pastMedicalHistory: "Obesity, anxiety disorder",
        vitalSigns: {
          bloodPressure: "110/70",
          heartRate: 140,
          respiratoryRate: 22,
          temperature: "98.4°F",
          oxygenSaturation: "96% on room air",
        },
        clinicalContext: "Outpatient clinic visit for evaluation of new-onset arrhythmia",
        ecgParams: {
          heartRate: 140,
          rhythm: "afib" as const,
          abnormalities: {},
        },
        diagnosisOptions: [
          "Atrial fibrillation with RVR",
          "Supraventricular tachycardia",
          "Ventricular tachycardia",
          "Normal sinus rhythm",
        ],
        correctDiagnosis: "Atrial fibrillation with RVR",
      },
      {
        age: 72,
        gender: "male" as const,
        chiefComplaint: "Shortness of breath on exertion",
        historyOfPresentIllness:
          "72-year-old male with progressive dyspnea over 6 months. Now experiences shortness of breath walking one block. No chest pain.",
        pastMedicalHistory: "History of myocardial infarction 5 years ago, diabetes mellitus type 2",
        vitalSigns: {
          bloodPressure: "130/80",
          heartRate: 58,
          respiratoryRate: 16,
          temperature: "98.2°F",
          oxygenSaturation: "94% on room air",
        },
        clinicalContext: "Cardiology clinic follow-up for evaluation of heart failure symptoms",
        ecgParams: {
          heartRate: 58,
          rhythm: "bradycardia" as const,
          abnormalities: {
            qWaves: true,
            stDepression: true,
            leftAxis: true,
          },
        },
        diagnosisOptions: [
          "Sinus bradycardia with prior MI and ischemic changes",
          "Atrial flutter with slow ventricular response",
          "Normal ECG",
          "Hyperkalemia pattern",
        ],
        correctDiagnosis: "Sinus bradycardia with prior MI and ischemic changes",
      },
      {
        age: 35,
        gender: "male" as const,
        chiefComplaint: "Routine physical examination",
        historyOfPresentIllness:
          "35-year-old healthy male presents for annual physical examination. No current symptoms. Exercises regularly.",
        pastMedicalHistory: "None",
        vitalSigns: {
          bloodPressure: "120/80",
          heartRate: 72,
          respiratoryRate: 16,
          temperature: "98.6°F",
          oxygenSaturation: "99% on room air",
        },
        clinicalContext: "Routine preventive care visit",
        ecgParams: {
          heartRate: 72,
          rhythm: "normal" as const,
          abnormalities: {},
        },
        diagnosisOptions: [
          "Normal sinus rhythm",
          "Acute STEMI",
          "Atrial fibrillation",
          "Left bundle branch block",
        ],
        correctDiagnosis: "Normal sinus rhythm",
      },
      {
        age: 58,
        gender: "female" as const,
        chiefComplaint: "Chest discomfort",
        historyOfPresentIllness:
          "58-year-old female with intermittent chest discomfort over past week. Described as pressure-like, worse with activity. Relieved with rest.",
        pastMedicalHistory: "Hypertension, hypercholesterolemia, family history of CAD",
        vitalSigns: {
          bloodPressure: "145/90",
          heartRate: 88,
          respiratoryRate: 18,
          temperature: "98.5°F",
          oxygenSaturation: "97% on room air",
        },
        clinicalContext: "Cardiology consultation for evaluation of possible angina",
        ecgParams: {
          heartRate: 88,
          rhythm: "normal" as const,
          abnormalities: {
            stDepression: true,
            tWaveInversion: true,
          },
        },
        diagnosisOptions: [
          "Ischemia with ST depression (possible stable angina)",
          "Acute STEMI",
          "Pericarditis",
          "Atrial flutter",
        ],
        correctDiagnosis: "Ischemia with ST depression (possible stable angina)",
      },
    ],
  },
]

export function generateRandomCase(): PatientCase {
  const allScenarios = caseTemplates.flatMap((template) => template.scenarios)
  const randomScenario = allScenarios[Math.floor(Math.random() * allScenarios.length)]

  return {
    id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...randomScenario,
  }
}
