"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Download,
  ClipboardList,
  Building2,
  Search,
  X,
  ChevronRight,
  Heart,
  Zap,
  Brain,
  AlertCircle,
  Activity,
  BookOpen,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceCard = {
  id: string
  title: string
  category: string
  icon: typeof Heart
  color: string
  preview: string
  content: React.ReactNode
}

type Download = {
  id: string
  title: string
  category: string
  size: string
  url: string
}

type CaseRecord = {
  id: string
  name: string
  modality: "ECG" | "CT" | "X-Ray"
  date: string
  score: "Excellent" | "Satisfactory" | "Needs Review"
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const REFERENCES: ReferenceCard[] = [
  {
    id: "normal-labs",
    title: "Normal Lab Values",
    category: "General",
    icon: Activity,
    color: "#0066FF",
    preview: "Na, K, Cl, BUN, Cr, CBC, LFTs and more",
    content: (
      <div className="space-y-6">
        {[
          {
            group: "Electrolytes",
            rows: [
              ["Sodium (Na)", "135–145 mEq/L"],
              ["Potassium (K)", "3.5–5.0 mEq/L"],
              ["Chloride (Cl)", "98–107 mEq/L"],
              ["Bicarbonate (HCO₃)", "22–29 mEq/L"],
              ["Calcium (Ca)", "8.5–10.5 mg/dL"],
              ["Magnesium (Mg)", "1.7–2.2 mg/dL"],
              ["Phosphorus (P)", "2.5–4.5 mg/dL"],
            ],
          },
          {
            group: "Renal",
            rows: [
              ["BUN", "7–20 mg/dL"],
              ["Creatinine", "0.6–1.2 mg/dL"],
              ["eGFR", "≥ 60 mL/min/1.73m²"],
            ],
          },
          {
            group: "CBC",
            rows: [
              ["WBC", "4.5–11.0 × 10³/µL"],
              ["Hemoglobin (M)", "13.5–17.5 g/dL"],
              ["Hemoglobin (F)", "12.0–15.5 g/dL"],
              ["Hematocrit (M)", "41–53%"],
              ["Hematocrit (F)", "36–46%"],
              ["Platelets", "150–400 × 10³/µL"],
            ],
          },
          {
            group: "Liver",
            rows: [
              ["ALT", "7–56 U/L"],
              ["AST", "10–40 U/L"],
              ["ALP", "44–147 U/L"],
              ["Total Bilirubin", "0.1–1.2 mg/dL"],
              ["Albumin", "3.5–5.0 g/dL"],
            ],
          },
          {
            group: "Glucose / Metabolic",
            rows: [
              ["Fasting glucose", "70–100 mg/dL"],
              ["HbA1c", "< 5.7% normal"],
              ["Total cholesterol", "< 200 mg/dL"],
              ["LDL", "< 100 mg/dL optimal"],
              ["HDL (M)", "> 40 mg/dL"],
              ["HDL (F)", "> 50 mg/dL"],
              ["Triglycerides", "< 150 mg/dL"],
            ],
          },
        ].map(({ group, rows }) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9B9A94" }}>{group}</p>
            <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #E8E6DF" }}>
              {rows.map(([name, val], i) => (
                <div key={name} className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: i % 2 === 0 ? "white" : "#F8F7F2" }}>
                  <span className="text-sm" style={{ color: "#0E0F12" }}>{name}</span>
                  <span className="text-sm font-semibold" style={{ color: "#0066FF" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "ecg-criteria",
    title: "ECG Criteria",
    category: "Cardiology",
    icon: Heart,
    color: "#EF4444",
    preview: "Rate, rhythm, intervals, axis, STEMI criteria",
    content: (
      <div className="space-y-6">
        {[
          {
            group: "Normal Values",
            rows: [
              ["Heart rate", "60–100 bpm"],
              ["PR interval", "120–200 ms (3–5 small squares)"],
              ["QRS duration", "< 120 ms (< 3 small squares)"],
              ["QT interval (corrected)", "< 440 ms (M), < 460 ms (F)"],
              ["QTc formula (Bazett)", "QT / √RR"],
            ],
          },
          {
            group: "STEMI Criteria",
            rows: [
              ["Inferior (II, III, aVF)", "ST ↑ ≥ 1 mm in ≥ 2 leads"],
              ["Lateral (I, aVL, V5–V6)", "ST ↑ ≥ 1 mm in ≥ 2 leads"],
              ["Anterior (V1–V4)", "ST ↑ ≥ 2 mm (M) / ≥ 1.5 mm (F) in ≥ 2 leads"],
              ["Posterior", "ST ↓ V1–V3 + tall R waves"],
            ],
          },
          {
            group: "Bundle Branch Blocks",
            rows: [
              ["LBBB (QRS ≥ 120 ms)", "Broad notched R in I, aVL, V5-V6; deep S in V1"],
              ["RBBB (QRS ≥ 120 ms)", "rSR' in V1; broad S in I, V5-V6"],
            ],
          },
          {
            group: "Arrhythmias — Quick ID",
            rows: [
              ["AFib", "Irregularly irregular, absent P waves, fibrillatory baseline"],
              ["AFlutter", "Sawtooth flutter waves, usually 2:1 block → rate ~150"],
              ["SVT", "Narrow complex tachycardia, P waves often hidden"],
              ["VT", "Wide complex tachycardia, AV dissociation, fusion beats"],
              ["VFib", "Chaotic, no organised complexes"],
              ["1° AVB", "PR > 200 ms, all P waves conduct"],
              ["2° AVB Mobitz I", "Progressive PR lengthening → dropped beat"],
              ["2° AVB Mobitz II", "Constant PR → sudden dropped beat"],
              ["3° AVB", "Complete dissociation of P and QRS"],
            ],
          },
        ].map(({ group, rows }) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9B9A94" }}>{group}</p>
            <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #E8E6DF" }}>
              {rows.map(([name, val], i) => (
                <div key={name} className="flex items-start justify-between gap-4 px-4 py-2.5" style={{ backgroundColor: i % 2 === 0 ? "white" : "#F8F7F2" }}>
                  <span className="text-sm" style={{ color: "#0E0F12" }}>{name}</span>
                  <span className="text-right text-sm font-semibold" style={{ color: "#EF4444" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "drug-dosing",
    title: "Drug Dosing Ranges",
    category: "Pharmacology",
    icon: AlertCircle,
    color: "#F59E0B",
    preview: "Common emergency & ward medications",
    content: (
      <div className="space-y-6">
        {[
          {
            group: "Cardiac",
            rows: [
              ["Aspirin (ACS)", "300 mg PO loading, 75–100 mg OD maintenance"],
              ["Clopidogrel (ACS)", "300–600 mg loading, 75 mg OD"],
              ["Metoprolol (IV)", "2.5–5 mg IV q5min up to 3 doses"],
              ["Amiodarone (AF)", "300 mg IV over 20–60 min, then 900 mg/24h"],
              ["Adenosine (SVT)", "6 mg rapid IV push; 12 mg if no response"],
              ["Atropine (Bradycardia)", "0.5 mg IV, repeat q3–5min to max 3 mg"],
            ],
          },
          {
            group: "Analgesics / Sedation",
            rows: [
              ["Morphine", "2.5–5 mg IV q4h PRN"],
              ["Fentanyl", "1–2 µg/kg IV/IM"],
              ["Midazolam (sedation)", "0.02–0.1 mg/kg IV titrate"],
              ["Lorazepam (seizure)", "0.1 mg/kg IV (max 4 mg)"],
            ],
          },
          {
            group: "Antibiotics (Common)",
            rows: [
              ["Amoxicillin", "500 mg–1 g PO TDS"],
              ["Co-amoxiclav", "625 mg PO TDS or 1.2 g IV TDS"],
              ["Piperacillin-tazobactam", "4.5 g IV q6–8h"],
              ["Vancomycin", "15–20 mg/kg IV q8–12h (aim trough 15–20)"],
              ["Ceftriaxone", "1–2 g IV OD"],
            ],
          },
          {
            group: "Fluids / Resuscitation",
            rows: [
              ["0.9% NaCl bolus (sepsis)", "250–500 mL IV over 15 min, reassess"],
              ["Adrenaline (anaphylaxis)", "0.5 mg (500 µg) IM, may repeat at 5 min"],
              ["Noradrenaline (shock)", "0.01–3 µg/kg/min IV infusion"],
              ["Dextrose 50% (hypoglycaemia)", "50 mL (25 g) IV over 1–3 min"],
            ],
          },
        ].map(({ group, rows }) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9B9A94" }}>{group}</p>
            <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #E8E6DF" }}>
              {rows.map(([name, val], i) => (
                <div key={name} className="flex items-start justify-between gap-4 px-4 py-2.5" style={{ backgroundColor: i % 2 === 0 ? "white" : "#F8F7F2" }}>
                  <span className="text-sm font-medium" style={{ color: "#0E0F12" }}>{name}</span>
                  <span className="text-right text-xs font-semibold" style={{ color: "#F59E0B", maxWidth: "55%" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "gcs",
    title: "Glasgow Coma Scale",
    category: "Neurology",
    icon: Brain,
    color: "#8B5CF6",
    preview: "Eye, verbal, motor scoring — 3 to 15",
    content: (
      <div className="space-y-6">
        {[
          {
            group: "Eye Opening (E)",
            rows: [
              ["4", "Spontaneous"],
              ["3", "To voice"],
              ["2", "To pain"],
              ["1", "None"],
            ],
            color: "#8B5CF6",
          },
          {
            group: "Verbal Response (V)",
            rows: [
              ["5", "Orientated"],
              ["4", "Confused"],
              ["3", "Inappropriate words"],
              ["2", "Sounds only"],
              ["1", "None"],
            ],
            color: "#8B5CF6",
          },
          {
            group: "Motor Response (M)",
            rows: [
              ["6", "Obeys commands"],
              ["5", "Localises to pain"],
              ["4", "Withdraws from pain"],
              ["3", "Flexion (Decorticate)"],
              ["2", "Extension (Decerebrate)"],
              ["1", "None"],
            ],
            color: "#8B5CF6",
          },
        ].map(({ group, rows, color }) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9B9A94" }}>{group}</p>
            <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #E8E6DF" }}>
              {rows.map(([score, label], i) => (
                <div key={score} className="flex items-center gap-4 px-4 py-2.5" style={{ backgroundColor: i % 2 === 0 ? "white" : "#F8F7F2" }}>
                  <span className="w-6 text-center text-lg font-bold" style={{ color }}>{score}</span>
                  <span className="text-sm" style={{ color: "#0E0F12" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-[10px] p-4" style={{ backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF" }}>
          <p className="text-sm font-bold" style={{ color: "#0047CC" }}>Interpretation</p>
          <div className="mt-2 space-y-1 text-sm" style={{ color: "#0047CC" }}>
            <p>13–15 — Mild brain injury</p>
            <p>9–12 — Moderate brain injury</p>
            <p>3–8 — Severe brain injury (intubation threshold ≤ 8)</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "acls",
    title: "ACLS Algorithms",
    category: "Emergency",
    icon: Zap,
    color: "#EF4444",
    preview: "Cardiac arrest, pulseless rhythms, tachycardia/bradycardia",
    content: (
      <div className="space-y-6">
        {[
          {
            group: "Cardiac Arrest — Universal Algorithm",
            steps: [
              "Confirm cardiac arrest: unresponsive, no breathing, no pulse",
              "Activate emergency response; get AED/defibrillator",
              "Start CPR: 30:2, 100–120 compressions/min, 5–6 cm depth",
              "Attach monitor/defibrillator",
              "Shockable (VF/pulseless VT)? → Shock 200 J biphasic, resume CPR",
              "Non-shockable (Asystole/PEA)? → Continue CPR",
              "Adrenaline 1 mg IV/IO q3–5min",
              "Amiodarone 300 mg IV (VF/pVT after 3rd shock)",
              "Identify and treat reversible causes (4 H's and 4 T's)",
            ],
          },
          {
            group: "4 H's and 4 T's",
            steps: [
              "Hypoxia — ensure adequate oxygenation",
              "Hypovolaemia — IV fluid challenge",
              "Hypo/Hyperkalaemia — check electrolytes/ECG",
              "Hypothermia — warm the patient",
              "Tension pneumothorax — needle decompression",
              "Tamponade — pericardiocentesis",
              "Toxins/Overdose — antidote/supportive care",
              "Thrombosis (PE/MI) — thrombolysis/PCI",
            ],
          },
          {
            group: "Tachycardia with Pulse",
            steps: [
              "Haemodynamically unstable? → Synchronised DC cardioversion",
              "Narrow complex regular? → Vagal manoeuvres → Adenosine 6 mg IV",
              "Narrow complex irregular? → Rate control (beta-blocker / digoxin)",
              "Wide complex regular? → Amiodarone 300 mg IV over 20–60 min",
              "Wide complex irregular? → Expert help; consider Mg if torsades",
            ],
          },
          {
            group: "Bradycardia with Pulse",
            steps: [
              "Haemodynamically unstable? → Atropine 0.5 mg IV (max 3 mg)",
              "No response to atropine? → Transcutaneous pacing",
              "Consider adrenaline 2–10 µg/min or dopamine 2–10 µg/kg/min",
              "Prepare for transvenous pacing",
              "Identify and treat underlying cause",
            ],
          },
        ].map(({ group, steps }) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9B9A94" }}>{group}</p>
            <div className="space-y-1.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-[8px] px-3 py-2.5" style={{ backgroundColor: "white", border: "1px solid #E8E6DF" }}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#EF4444" }}>
                    {i + 1}
                  </span>
                  <span className="text-sm" style={{ color: "#0E0F12" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
]

const DOWNLOADS: Download[] = [
  { id: "1", title: "ECG Interpretation Cheat Sheet", category: "Cardiology", size: "420 KB", url: "#" },
  { id: "2", title: "ACLS Quick Reference Card", category: "Emergency", size: "310 KB", url: "#" },
  { id: "3", title: "Normal Lab Values Pocket Guide", category: "General", size: "190 KB", url: "#" },
  { id: "4", title: "Chest X-Ray Systematic Approach", category: "Radiology", size: "540 KB", url: "#" },
  { id: "5", title: "Glasgow Coma Scale Reference", category: "Neurology", size: "85 KB", url: "#" },
  { id: "6", title: "Antibiotic Prescribing Guide", category: "Pharmacology", size: "720 KB", url: "#" },
  { id: "7", title: "CT Head: Stroke vs Bleed", category: "Radiology", size: "610 KB", url: "#" },
  { id: "8", title: "Drug Dosing Quick Reference", category: "Pharmacology", size: "450 KB", url: "#" },
  { id: "9", title: "Sepsis Six Protocol", category: "Emergency", size: "120 KB", url: "#" },
]

const CASES: CaseRecord[] = [
  { id: "1", name: "Anterior STEMI Presentation", modality: "ECG", date: "Mar 14, 2026", score: "Excellent" },
  { id: "2", name: "Massive PE on CT Pulmonary Angiogram", modality: "CT", date: "Mar 12, 2026", score: "Satisfactory" },
  { id: "3", name: "Tension Pneumothorax — CXR", modality: "X-Ray", date: "Mar 10, 2026", score: "Excellent" },
  { id: "4", name: "AF with RVR", modality: "ECG", date: "Mar 8, 2026", score: "Needs Review" },
  { id: "5", name: "Subdural Haematoma — CT Head", modality: "CT", date: "Mar 5, 2026", score: "Satisfactory" },
  { id: "6", name: "Complete Heart Block", modality: "ECG", date: "Mar 3, 2026", score: "Excellent" },
  { id: "7", name: "Lobar Consolidation — CXR", modality: "X-Ray", date: "Feb 28, 2026", score: "Satisfactory" },
  { id: "8", name: "Hyperkalaemia ECG Changes", modality: "ECG", date: "Feb 25, 2026", score: "Needs Review" },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Cardiology: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  Emergency: { bg: "#FFF7ED", text: "#92400E", border: "#FED7AA" },
  Neurology: { bg: "#F5F3FF", text: "#5B21B6", border: "#DDD6FE" },
  Radiology: { bg: "#EEF3FF", text: "#0047CC", border: "#C7D9FF" },
  Pharmacology: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  General: { bg: "#F8F7F2", text: "#6B6A65", border: "#E8E6DF" },
}

const SCORE_COLORS = {
  Excellent: { bg: "#ECFDF5", text: "#15803D", border: "#BBF7D0" },
  Satisfactory: { bg: "#FFF7ED", text: "#92400E", border: "#FED7AA" },
  "Needs Review": { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
}

const MODALITY_COLORS = {
  ECG: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  CT: { bg: "#EEF3FF", text: "#0047CC", border: "#C7D9FF" },
  "X-Ray": { bg: "#F5F3FF", text: "#5B21B6", border: "#DDD6FE" },
}

const TABS = [
  { id: "references", label: "Clinical References", icon: BookOpen },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "cases", label: "Case Archive", icon: ClipboardList },
  { id: "institution", label: "Institution Materials", icon: Building2 },
] as const

type TabId = (typeof TABS)[number]["id"]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.General
  return (
    <span className="inline-flex items-center rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
      style={{ letterSpacing: "0.1em", backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {category}
    </span>
  )
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9B9A94" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[9px] pl-10 pr-10 text-sm outline-none"
        style={{ border: "1.5px solid #E8E6DF", backgroundColor: "white", color: "#0E0F12" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X className="h-4 w-4" style={{ color: "#9B9A94" }} />
        </button>
      )}
    </div>
  )
}

function ReferenceModal({ card, onClose }: { card: ReferenceCard; onClose: () => void }) {
  const Icon = card.icon
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8" style={{ backgroundColor: "rgba(14,15,18,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative w-full max-w-2xl rounded-[16px] pb-8" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[16px] px-7 py-5" style={{ backgroundColor: "white", borderBottom: "1px solid #F0EEE8" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[9px]" style={{ backgroundColor: card.color + "15" }}>
              <Icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: "#9B9A94" }}>{card.category}</p>
              <h2 className="text-base font-bold" style={{ color: "#0E0F12" }}>{card.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[7px] transition-colors" style={{ backgroundColor: "#F8F7F2" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E8E6DF")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F8F7F2")}>
            <X className="h-4 w-4" style={{ color: "#6B6A65" }} />
          </button>
        </div>
        {/* Content */}
        <div className="px-7 pt-6">{card.content}</div>
      </div>
    </div>
  )
}

// ─── Tab sections ─────────────────────────────────────────────────────────────

function ClinicalReferences({ search }: { search: string }) {
  const [activeCard, setActiveCard] = useState<ReferenceCard | null>(null)

  const filtered = useMemo(() =>
    REFERENCES.filter((r) =>
      !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase())
    ), [search])

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => setActiveCard(card)}
              className="group flex flex-col rounded-[12px] p-5 text-left transition-all"
              style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D9FF"; e.currentTarget.style.backgroundColor = "#FAFAF9" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E6DF"; e.currentTarget.style.backgroundColor = "white" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-[9px]" style={{ backgroundColor: card.color + "15" }}>
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "#9B9A94" }} />
              </div>
              <div className="mt-3">
                <Badge category={card.category} />
                <p className="mt-2 text-sm font-bold" style={{ color: "#0E0F12" }}>{card.title}</p>
                <p className="mt-1 text-xs" style={{ color: "#9B9A94" }}>{card.preview}</p>
              </div>
            </button>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <div className="mt-4 rounded-[12px] p-10 text-center text-sm" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#9B9A94" }}>
          No references match your search.
        </div>
      )}
      {activeCard && <ReferenceModal card={activeCard} onClose={() => setActiveCard(null)} />}
    </>
  )
}

function DownloadsSection({ search }: { search: string }) {
  const filtered = useMemo(() =>
    DOWNLOADS.filter((d) =>
      !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase())
    ), [search])

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div key={item.id} className="flex flex-col rounded-[12px] p-5" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ backgroundColor: "#F8F7F2" }}>
                <FileText className="h-5 w-5" style={{ color: "#6B6A65" }} />
              </div>
              <Badge category={item.category} />
            </div>
            <p className="mt-3 text-sm font-bold" style={{ color: "#0E0F12" }}>{item.title}</p>
            <p className="mt-1 text-xs" style={{ color: "#9B9A94" }}>PDF · {item.size}</p>
            <div className="mt-4 flex-1 flex items-end">
              <Button asChild size="sm" className="w-full gap-2">
                <a href={item.url} download>
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-4 rounded-[12px] p-10 text-center text-sm" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#9B9A94" }}>
          No downloads match your search.
        </div>
      )}
    </>
  )
}

function CaseArchive({ search }: { search: string }) {
  const [modalityFilter, setModalityFilter] = useState<string>("All")
  const [scoreFilter, setScoreFilter] = useState<string>("All")

  const filtered = useMemo(() =>
    CASES.filter((c) => {
      if (modalityFilter !== "All" && c.modality !== modalityFilter) return false
      if (scoreFilter !== "All" && c.score !== scoreFilter) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [search, modalityFilter, scoreFilter])

  const FilterPill = ({ value, current, onChange }: { value: string; current: string; onChange: (v: string) => void }) => (
    <button
      onClick={() => onChange(value)}
      className="rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-all"
      style={{
        backgroundColor: current === value ? "#0E0F12" : "white",
        color: current === value ? "white" : "#6B6A65",
        border: current === value ? "1.5px solid #0E0F12" : "1.5px solid #E8E6DF",
      }}
    >
      {value}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {["All", "ECG", "CT", "X-Ray"].map((v) => (
            <FilterPill key={v} value={v} current={modalityFilter} onChange={setModalityFilter} />
          ))}
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: "#E8E6DF" }} />
        <div className="flex flex-wrap gap-1.5">
          {["All", "Excellent", "Satisfactory", "Needs Review"].map((v) => (
            <FilterPill key={v} value={v} current={scoreFilter} onChange={setScoreFilter} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[12px] p-10 text-center text-sm" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#9B9A94" }}>
          No cases match your filters.
        </div>
      ) : (
        <div className="rounded-[12px] overflow-hidden" style={{ border: "1.5px solid #E8E6DF", backgroundColor: "white" }}>
          <div className="hidden grid-cols-[1fr_100px_120px_120px_90px] gap-4 px-5 py-3 sm:grid"
            style={{ borderBottom: "1px solid #F0EEE8" }}>
            {["Case", "Modality", "Date", "Score", ""].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: "#9B9A94" }}>{h}</p>
            ))}
          </div>
          {filtered.map((c, i) => {
            const sc = SCORE_COLORS[c.score]
            const mc = MODALITY_COLORS[c.modality]
            return (
              <div
                key={c.id}
                className="flex flex-col gap-3 px-5 py-4 sm:grid sm:grid-cols-[1fr_100px_120px_120px_90px] sm:items-center sm:gap-4"
                style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F0EEE8" : "none" }}
              >
                <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>{c.name}</p>
                <span className="inline-flex w-fit items-center rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ letterSpacing: "0.1em", backgroundColor: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}>
                  {c.modality}
                </span>
                <p className="text-xs" style={{ color: "#9B9A94" }}>{c.date}</p>
                <span className="inline-flex w-fit items-center rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ letterSpacing: "0.1em", backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                  {c.score}
                </span>
                <Button size="sm">Review</Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InstitutionMaterials() {
  const hasContent = false

  return (
    <>
      <div className="mt-4">
        {hasContent ? null : (
          <div className="flex flex-col items-center justify-center rounded-[12px] px-8 py-16 text-center"
            style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
            {/* Subtle illustration */}
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[16px]" style={{ backgroundColor: "#F8F7F2" }}>
              <Building2 className="h-8 w-8" style={{ color: "#E8E6DF" }} />
            </div>
            <p className="text-base font-bold" style={{ color: "#0E0F12" }}>No materials yet</p>
            <p className="mt-2 max-w-xs text-sm" style={{ color: "#9B9A94" }}>
              Your institution hasn't uploaded any materials yet. Check back later or contact your administrator.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const { user } = useAuth()
  const isInstitutionStudent = user?.primary_role === "institution"
  const [activeTab, setActiveTab] = useState<TabId>("references")
  const [tabSearch, setTabSearch] = useState("")

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Tab bar + search combined */}
      <div className="mb-5 flex items-center gap-2 rounded-[10px] p-1.5" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
        <div className="flex flex-1 flex-wrap gap-1">
          {TABS.filter((t) => t.id !== "institution" || isInstitutionStudent).map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setTabSearch("") }}
                className="flex items-center gap-1.5 rounded-[7px] px-3 py-2 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? "#0066FF" : "transparent",
                  color: isActive ? "white" : "#6B6A65",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#F8F7F2" }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            )
          })}
        </div>
        {/* Inline search */}
        <div className="relative shrink-0 w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "#9B9A94" }} />
          <input
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 w-full rounded-[7px] pl-8 pr-7 text-sm outline-none"
            style={{ border: "1.5px solid #E8E6DF", backgroundColor: "#F8F7F2", color: "#0E0F12" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
          />
          {tabSearch && (
            <button onClick={() => setTabSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3" style={{ color: "#9B9A94" }} />
            </button>
          )}
        </div>
      </div>

      {/* Section content */}
      {activeTab === "references" && <ClinicalReferences search={tabSearch} />}
      {activeTab === "downloads" && <DownloadsSection search={tabSearch} />}
      {activeTab === "cases" && <CaseArchive search={tabSearch} />}
      {activeTab === "institution" && <InstitutionMaterials />}
    </div>
  )
}
