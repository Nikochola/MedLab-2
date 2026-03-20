/**
 * Pre-made cases for each track unit.
 * ECG simulation units use ECGWaveformParams only.
 * ECG case units use full PatientCase.
 * X-Ray units use XRayCase (which maps to XRayWorkbench's internal type).
 */
import type { PatientCase } from "@/components/case-based/CaseGenerator"
import type { ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"
import type { XRayCase } from "@/components/xray/XRayWorkbench"
import type { WorkupCase } from "@/components/clinical/ClinicalWorkupMode"

// ── ECG Simulation presets (ECGWaveformParams only) ──────────────────────────

export const ECG_SIMULATION_PRESETS: Record<string, ECGWaveformParams> = {
  "ecg-u1": {
    // 12-Lead Grid: clean normal sinus, rate 72 — focus on lead orientation
    heartRate: 72,
    rhythm: "normal",
    abnormalities: {},
  },
  "ecg-u2": {
    // Normal Sinus Rhythm: textbook NSR for criteria identification
    heartRate: 68,
    rhythm: "normal",
    abnormalities: {},
  },
  "ecg-u3": {
    // Rate Calculation: tachycardia — easy big-box count (300 ÷ 2 = 150)
    heartRate: 150,
    rhythm: "tachycardia",
    abnormalities: {},
  },
  "ecg-u4": {
    // Axis Determination: left axis deviation for quadrant method practice
    heartRate: 78,
    rhythm: "normal",
    abnormalities: { leftAxis: true },
  },
  "ecg-u5": {
    // Interval Analysis: slight bradycardia to lengthen intervals for measurement
    heartRate: 55,
    rhythm: "bradycardia",
    abnormalities: {},
  },
  "ecg-u6": {
    // Bundle Branch Blocks: normal rate, waveform morphology focus (RBBB-like)
    heartRate: 80,
    rhythm: "normal",
    abnormalities: { rightAxis: true },
  },
  "ecg-u9": {
    // Ischaemia & STEMI Patterns: anterior ST elevation for pattern recognition
    heartRate: 88,
    rhythm: "normal",
    abnormalities: { stElevation: true, qWaves: true },
  },
}

// ── ECG Case presets (full PatientCase) ─────────────────────────────────────

export const ECG_CASE_PRESETS: Record<string, PatientCase> = {
  "ecg-u7": {
    id: "track-ecg-u7",
    age: 38,
    gender: "female",
    chiefComplaint: "Near-syncope and a heart rate of 34 bpm found at triage",
    historyOfPresentIllness:
      "A 38-year-old female presents after two episodes of near-syncope at work. Paramedics found her heart rate at 34 bpm. She denies chest pain but reports increasing fatigue over 3 weeks. No previous cardiac history. She recently started lithium for bipolar disorder.",
    pastMedicalHistory: "Bipolar disorder (recently started lithium), no cardiac history",
    vitalSigns: {
      bloodPressure: "98/60",
      heartRate: 34,
      respiratoryRate: 14,
      temperature: "36.8°C",
      oxygenSaturation: "97% on room air",
    },
    clinicalContext:
      "Emergency department. Bradycardia workup. Lithium toxicity and sick sinus syndrome on the differential. ECG on your screen — interpret the rhythm and recommend the next step.",
    ecgParams: {
      heartRate: 34,
      rhythm: "bradycardia",
      abnormalities: {},
    },
  },

  "ecg-u8": {
    id: "track-ecg-u8",
    age: 70,
    gender: "male",
    chiefComplaint: "Episodic dizziness and pre-syncopal episodes for 5 days",
    historyOfPresentIllness:
      "A 70-year-old male with known ischaemic heart disease presents with 5 days of dizziness and two near-fainting episodes. No chest pain. His Holter from 2 years ago was normal. He takes bisoprolol 5 mg OD and aspirin.",
    pastMedicalHistory: "Ischaemic heart disease (PCI 2019), hypertension, type 2 diabetes",
    vitalSigns: {
      bloodPressure: "118/74",
      heartRate: 44,
      respiratoryRate: 16,
      temperature: "36.7°C",
      oxygenSaturation: "96% on room air",
    },
    clinicalContext:
      "Cardiology ward assessment. ECG shows bradycardia with a pattern suggesting advanced AV conduction disease. Identify the degree of AV block, explain the features, and outline acute management.",
    ecgParams: {
      heartRate: 44,
      rhythm: "bradycardia",
      abnormalities: { leftAxis: true },
    },
  },

  "ecg-u10": {
    id: "track-ecg-u10",
    age: 58,
    gender: "male",
    chiefComplaint: "Central crushing chest pain radiating to left arm — onset 45 minutes ago",
    historyOfPresentIllness:
      "A 58-year-old male with a 45-minute history of severe crushing chest pain (9/10) radiating to the left arm and jaw. Associated with diaphoresis, nausea, and a sense of impending doom. He took two aspirin en route. This is his first cardiac event.",
    pastMedicalHistory: "Hypertension, hyperlipidaemia, 30-pack-year smoking history (quit 5 years ago)",
    vitalSigns: {
      bloodPressure: "156/98",
      heartRate: 94,
      respiratoryRate: 20,
      temperature: "37.0°C",
      oxygenSaturation: "95% on room air",
    },
    clinicalContext:
      "Resus bay, Emergency department. Immediate ECG obtained on arrival. Identify the STEMI territory, name the likely culprit vessel, list one STEMI equivalent to exclude, and state the immediate management steps.",
    ecgParams: {
      heartRate: 94,
      rhythm: "normal",
      abnormalities: { stElevation: true, qWaves: false, tWaveInversion: false },
    },
  },

  "ecg-u11": {
    id: "track-ecg-u11",
    age: 45,
    gender: "female",
    chiefComplaint: "Sudden-onset palpitations, lightheadedness, and mild dyspnoea for 90 minutes",
    historyOfPresentIllness:
      "A 45-year-old female presents with rapid, irregular palpitations that started abruptly 90 minutes ago. She feels slightly lightheaded but has not fainted. No chest pain. She has had two similar shorter episodes over the past month, both self-terminating.",
    pastMedicalHistory: "Obesity (BMI 34), moderate alcohol use, no prior ECGs on record",
    vitalSigns: {
      bloodPressure: "112/74",
      heartRate: 142,
      respiratoryRate: 22,
      temperature: "37.1°C",
      oxygenSaturation: "96% on room air",
    },
    clinicalContext:
      "Acute medical unit. Tachyarrhythmia workup. ECG shows fast irregular activity. Classify the rhythm, assess haemodynamic stability, state your immediate management, and name two reversible causes to investigate.",
    ecgParams: {
      heartRate: 142,
      rhythm: "afib",
      abnormalities: {},
    },
  },

  "ecg-u12": {
    id: "track-ecg-u12",
    age: 68,
    gender: "male",
    chiefComplaint: "Generalised weakness and missed dialysis session",
    historyOfPresentIllness:
      "A 68-year-old male on maintenance haemodialysis (thrice weekly) missed his last session due to transportation issues. He presents with generalised weakness, mild confusion, and muscle cramps. No chest pain or palpitations reported.",
    pastMedicalHistory: "End-stage renal disease on haemodialysis, type 2 diabetes, peripheral arterial disease",
    vitalSigns: {
      bloodPressure: "178/102",
      heartRate: 58,
      respiratoryRate: 18,
      temperature: "36.6°C",
      oxygenSaturation: "95% on room air",
    },
    clinicalContext:
      "Emergency department. Missed dialysis with likely hyperkalaemia. ECG obtained immediately. Identify the ECG features of hyperkalaemia, grade the severity based on ECG findings, and outline emergency management before dialysis access.",
    ecgParams: {
      heartRate: 58,
      rhythm: "bradycardia",
      abnormalities: { tWaveInversion: true, stDepression: true },
    },
  },
}

// ── X-Ray Case presets ──────────────────────────────────────────────────────

export const XRAY_CASE_PRESETS: Record<string, XRayCase> = {
  // Simulation units: same XRayCase format but used in simulation mode
  "xray-u1": {
    id: "track-xray-u1",
    diagnosis: "Normal PA Chest Radiograph",
    patient: "28-year-old male",
    history: "Pre-employment health screen, no symptoms.",
    indication: "Assess projection, technical quality, and normal anatomy before reading pathology",
    technicalQuality: "PA erect, full inspiration, no rotation",
    findings: ["Clear lung fields bilaterally", "Normal cardiac silhouette (CTR < 0.5)", "No pleural abnormality"],
    impressionOptions: ["Normal chest radiograph", "Mild cardiomegaly", "Right lower lobe opacity", "Bilateral pleural effusions"],
    correctImpression: "Normal chest radiograph",
    teachingPearl: "On a true PA film, the medial clavicular heads are equidistant from the spinous process and the posterior ribs are visible through the cardiac shadow when inspiration is adequate.",
    pathology: "normal",
    severity: "mild",
    view: "PA",
  },

  "xray-u2": {
    id: "track-xray-u2",
    diagnosis: "Normal Chest with Complete Systematic Read",
    patient: "35-year-old female",
    history: "Pre-operative chest radiograph for elective knee replacement.",
    indication: "Apply the full ABCDE systematic approach on a clean film",
    technicalQuality: "PA view, good rotation and exposure",
    findings: ["Airway midline", "Lung fields clear", "Cardiac borders sharply defined", "Diaphragm and costophrenic angles normal", "No bony abnormality"],
    impressionOptions: ["No acute cardiopulmonary abnormality", "Early left ventricular enlargement", "Mild bilateral effusions", "Apical scarring bilaterally"],
    correctImpression: "No acute cardiopulmonary abnormality",
    teachingPearl: "ABCDE: Airway, Breathing zones, Cardiac silhouette, Diaphragm + costophrenics, Everything else (bones, soft tissue, lines). Apply in the same order every time.",
    pathology: "normal",
    severity: "mild",
    view: "PA",
  },

  "xray-u3": {
    id: "track-xray-u3",
    diagnosis: "Normal Lung Field Anatomy for Zone Mapping",
    patient: "42-year-old male",
    history: "Insurance medical, asymptomatic.",
    indication: "Map normal lung zones and describe density patterns",
    technicalQuality: "PA view, adequate exposure",
    findings: ["Upper, middle and lower zones clearly visible", "No focal opacity", "Normal vascular markings"],
    impressionOptions: ["Normal lung fields", "Bilateral interstitial markings", "Subtle right middle lobe infiltrate", "Left lower lobe consolidation"],
    correctImpression: "Normal lung fields",
    teachingPearl: "Divide each lung into upper (above anterior 2nd rib), middle (2nd–4th rib), and lower zones. Vascular markings should taper smoothly from hilum to periphery.",
    pathology: "normal",
    severity: "mild",
    view: "PA",
  },

  "xray-u4": {
    id: "track-xray-u4",
    diagnosis: "Mild Cardiomegaly — Cardiac Silhouette Study",
    patient: "58-year-old female",
    history: "Fatigue and ankle oedema. Referred by GP.",
    indication: "Measure cardiothoracic ratio and assess cardiac borders",
    technicalQuality: "PA erect, full inspiration",
    findings: ["Cardiothoracic ratio 0.55", "Left heart border convex", "Mild upper lobe vascular diversion", "No focal consolidation"],
    impressionOptions: ["Mild cardiomegaly with upper lobe diversion", "Normal cardiac silhouette", "Pericardial effusion", "Right middle lobe consolidation"],
    correctImpression: "Mild cardiomegaly with upper lobe diversion",
    teachingPearl: "CTR > 0.5 on a PA film suggests cardiomegaly. The left heart border is formed by the aortic knuckle, pulmonary trunk, left atrial appendage, and left ventricle.",
    pathology: "cardiomegaly",
    severity: "mild",
    view: "PA",
  },

  "xray-u5": {
    id: "track-xray-u5",
    diagnosis: "Moderate Right Pleural Effusion",
    patient: "66-year-old male",
    history: "Progressive breathlessness and right-sided dullness on percussion.",
    indication: "Assess pleural spaces and detect effusion",
    technicalQuality: "PA view, adequate",
    findings: ["Dense opacity right lower zone with meniscus contour", "Blunting of right costophrenic angle", "Tracheal and mediastinal midline", "No pneumothorax"],
    impressionOptions: ["Moderate right pleural effusion", "Right lower lobe pneumonia", "Right hemidiaphragm elevation", "Normal right base"],
    correctImpression: "Moderate right pleural effusion",
    teachingPearl: "Pleural fluid blunts the costophrenic angle at ~200 mL. A meniscus sign (concave upper border) distinguishes free fluid from consolidation.",
    pathology: "pleural_effusion",
    severity: "moderate",
    view: "PA",
  },

  "xray-u6": {
    id: "track-xray-u6",
    diagnosis: "Superior Mediastinal Widening",
    patient: "72-year-old male",
    history: "Sudden severe tearing chest pain radiating to the back.",
    indication: "Assess mediastinal contour and tracheal position",
    technicalQuality: "Portable AP, mild rotation",
    findings: ["Superior mediastinum widened > 8 cm", "Trachea deviated slightly to right", "Left apical pleural cap present", "Normal lung parenchyma"],
    impressionOptions: ["Superior mediastinal widening — aortic pathology not excluded", "Normal mediastinal width", "Large anterior mediastinal mass", "Right paratracheal lymphadenopathy only"],
    correctImpression: "Superior mediastinal widening — aortic pathology not excluded",
    teachingPearl: "A mediastinal width > 8 cm on a PA film (or any widening on AP) with chest pain should prompt urgent CT aorta to exclude dissection. AP projection overestimates mediastinal width.",
    pathology: "cardiomegaly",
    severity: "severe",
    view: "AP",
  },

  "xray-u7": {
    id: "track-xray-u7",
    diagnosis: "Right Lower Lobe Community-Acquired Pneumonia",
    patient: "52-year-old male",
    history: "5 days of fever (38.9°C), productive cough with rust-coloured sputum, and right-sided pleuritic chest pain. Works as a bus driver. No recent travel.",
    indication: "Evaluate for infective consolidation",
    technicalQuality: "PA erect, adequate inspiration",
    findings: ["Dense right lower lobe airspace consolidation", "Air bronchograms visible", "Preserved right heart border", "No effusion on this projection"],
    impressionOptions: ["Right lower lobe pneumonia", "Right middle lobe pneumonia", "Large right pleural effusion", "Pulmonary infarction"],
    correctImpression: "Right lower lobe pneumonia",
    teachingPearl: "The right heart border is formed by the right middle lobe. Preservation of this border means the opacity is NOT in the right middle lobe — it's the right lower lobe. This is the silhouette sign.",
    pathology: "pneumonia",
    severity: "moderate",
    view: "PA",
  },

  "xray-u8": {
    id: "track-xray-u8",
    diagnosis: "Left Tension Pneumothorax",
    patient: "24-year-old male",
    history: "Sudden severe left-sided pleuritic pain and dyspnoea after a gym session. Increasingly distressed in the ambulance.",
    indication: "Rule out pneumothorax and assess mediastinal shift",
    technicalQuality: "Portable AP (patient too distressed for PA), adequate exposure",
    findings: [
      "Complete absence of left lung markings",
      "Visible left pleural line",
      "Trachea deviated to the right",
      "Left hemidiaphragm depressed",
      "Mediastinum shifted to the right",
    ],
    impressionOptions: [
      "Left tension pneumothorax — urgent decompression required",
      "Left simple pneumothorax — observe",
      "Left pleural effusion",
      "Left lower lobe collapse",
    ],
    correctImpression: "Left tension pneumothorax — urgent decompression required",
    teachingPearl: "Tension pneumothorax is a clinical diagnosis — do not wait for X-ray confirmation if haemodynamically unstable. On CXR, contralateral tracheal shift and ipsilateral diaphragm depression are key differentiators from simple pneumothorax.",
    pathology: "pneumothorax",
    severity: "severe",
    view: "AP",
  },

  "xray-u9": {
    id: "track-xray-u9",
    diagnosis: "Bilateral Interstitial Infiltrates — Ground-Glass Pattern",
    patient: "61-year-old immunocompromised male",
    history: "3-week history of worsening breathlessness, dry cough, and low-grade fever. On long-term prednisolone for rheumatoid arthritis.",
    indication: "Evaluate bilateral lung disease pattern",
    technicalQuality: "PA view, adequate",
    findings: [
      "Bilateral diffuse ground-glass haziness",
      "Perihilar predominance",
      "No consolidation",
      "No pleural effusion",
      "Normal cardiac silhouette",
    ],
    impressionOptions: [
      "Bilateral interstitial pattern — PCP or viral pneumonia most likely in this context",
      "Bilateral community-acquired pneumonia",
      "Pulmonary oedema",
      "Normal chest radiograph",
    ],
    correctImpression: "Bilateral interstitial pattern — PCP or viral pneumonia most likely in this context",
    teachingPearl: "Ground-glass opacity on CXR is less specific than on CT but bilateral perihilar haziness without cardiomegaly in an immunocompromised patient should raise PCP as the top differential.",
    pathology: "pneumonia",
    severity: "moderate",
    view: "PA",
  },

  "xray-u10": {
    id: "track-xray-u10",
    diagnosis: "Acute Pulmonary Oedema",
    patient: "78-year-old female",
    history: "Presented at 3 AM with sudden severe breathlessness, orthopnoea, and pink frothy sputum. History of ischaemic heart disease and poor compliance with furosemide.",
    indication: "Assess for pulmonary oedema and cardiac decompensation",
    technicalQuality: "Portable AP, supine, adequate",
    findings: [
      "Bat-wing perihilar airspace shadowing",
      "Bilateral small pleural effusions",
      "Upper lobe vascular diversion",
      "Kerley B lines at right lung base",
      "Cardiomegaly (CTR 0.6 on AP — AP overestimates)",
    ],
    impressionOptions: [
      "Acute pulmonary oedema with cardiomegaly",
      "Bilateral community-acquired pneumonia",
      "Bilateral pleural effusions — cause unclear",
      "Normal chest radiograph",
    ],
    correctImpression: "Acute pulmonary oedema with cardiomegaly",
    teachingPearl: "The '5 Bs' of pulmonary oedema on CXR: Bat-wing opacities, Blunted costophrenic angles, Bronchial cuffing, Basal Kerley B lines, Bigger heart (cardiomegaly). Not all need to be present.",
    pathology: "cardiomegaly",
    severity: "severe",
    view: "AP",
  },

  "xray-u11": {
    id: "track-xray-u11",
    diagnosis: "Solitary Right Upper Lobe Pulmonary Nodule",
    patient: "62-year-old male",
    history: "Incidental 2.3 cm right upper lobe lesion found on CXR done for insurance. 40 pack-year smoking history. No haemoptysis, weight loss, or cough.",
    indication: "Characterise solitary pulmonary nodule and determine next steps",
    technicalQuality: "PA and lateral, good quality",
    findings: [
      "2.3 cm rounded right upper lobe opacity",
      "Irregular/spiculated margins",
      "No calcification pattern identified",
      "No satellite nodules",
      "No mediastinal lymphadenopathy visible",
    ],
    impressionOptions: [
      "Solitary pulmonary nodule — high risk features, urgent CT chest required",
      "Granuloma — benign calcification pattern, 2-year follow-up",
      "Pneumonic consolidation — treat and repeat",
      "Normal chest radiograph",
    ],
    correctImpression: "Solitary pulmonary nodule — high risk features, urgent CT chest required",
    teachingPearl: "Spiculated margins, upper lobe location, size > 2 cm, and heavy smoking history are all high-risk features. Apply Fleischner Society guidelines: solid nodule > 6 mm in high-risk patient → CT at 3 months.",
    pathology: "pneumonia",
    severity: "moderate",
    view: "PA",
  },

  "xray-u12": {
    id: "track-xray-u12",
    diagnosis: "Malpositioned Central Venous Catheter",
    patient: "55-year-old male, post-right subclavian central line insertion",
    history: "CXR obtained immediately after right subclavian CVC insertion in ICU. No immediate complications reported by the operator.",
    indication: "Confirm central line position and exclude pneumothorax",
    technicalQuality: "Portable AP, post-procedure",
    findings: [
      "CVC tip projected over right atrium (too far advanced)",
      "No pneumothorax identified",
      "No haemothorax",
      "Right lung clear",
    ],
    impressionOptions: [
      "CVC tip in right atrium — should be withdrawn to SVC/RA junction",
      "CVC correctly positioned at SVC-RA junction",
      "CVC malpositioned into right internal jugular vein",
      "Right-sided pneumothorax — chest drain required",
    ],
    correctImpression: "CVC tip in right atrium — should be withdrawn to SVC/RA junction",
    teachingPearl: "Ideal CVC tip position is at the SVC-RA junction (level of carina or just below). A tip in the right atrium risks arrhythmia, perforation, and pericardial tamponade. Always check for pneumothorax after subclavian or internal jugular insertion.",
    pathology: "normal",
    severity: "mild",
    view: "AP",
  },
}

// ── Clinical Workup cases ─────────────────────────────────────────────────────
// Only ecg-u10 (Acute STEMI) uses this mode for now.

export const CLINICAL_WORKUP_CASES: Record<string, WorkupCase> = {
  "ecg-u10": {
    chiefComplaint: "Central crushing chest pain radiating to the left arm — onset 45 minutes ago",
    age: 58,
    gender: "male",
    history:
      "A 58-year-old male with a 45-minute history of severe crushing central chest pain (9/10) radiating to the left arm and jaw. Associated with diaphoresis and nausea. He took two aspirin tablets en route. This is his first cardiac event. Pain started at rest while watching television.",
    pastMedicalHistory:
      "Hypertension (on amlodipine), hyperlipidaemia (on atorvastatin), 30 pack-year smoking history — quit 5 years ago. No previous cardiac investigations.",
    auscultation: {
      heart: "Regular rate and rhythm, rate 94 bpm. S1 and S2 present. Soft S4 gallop audible at the apex. No murmurs or rubs.",
      lungs: "Vesicular breath sounds bilaterally. Fine bibasal crackles present (left > right). No wheeze or pleural rub.",
    },
    vitals: {
      bp: "156/98",
      hr: 94,
      rr: 20,
      temp: "37.0°C",
      spo2: "95%",
    },
    labResults: [
      { name: "Troponin I (high-sens)", value: "2.4", unit: "ng/mL", flag: "critical" },
      { name: "CK-MB", value: "88", unit: "U/L", flag: "high" },
      { name: "BNP", value: "182", unit: "pg/mL", flag: "high" },
      { name: "Haemoglobin", value: "13.8", unit: "g/dL" },
      { name: "WBC", value: "12.4", unit: "×10³/µL", flag: "high" },
      { name: "Sodium", value: "138", unit: "mEq/L" },
      { name: "Potassium", value: "4.1", unit: "mEq/L" },
      { name: "Creatinine", value: "98", unit: "µmol/L" },
      { name: "Random glucose", value: "8.2", unit: "mmol/L", flag: "high" },
      { name: "INR", value: "1.0", unit: "" },
    ],
    ecgParams: {
      heartRate: 94,
      rhythm: "normal",
      abnormalities: { stElevation: true, qWaves: false, tWaveInversion: false },
    },
    expectedDiagnosis: "Acute anterior STEMI — immediate PCI activation required",
    teachingPoints: [
      "Elevated troponin confirms myocardial injury, but STEMI diagnosis and cath lab activation should be based on ECG — do not wait for troponin results.",
      "The soft S4 gallop reflects reduced LV compliance from acute ischaemia. Bibasal crackles suggest early Killip class II heart failure.",
      "Stress hyperglycaemia (elevated glucose in a non-diabetic) is a poor prognostic marker in ACS — it reflects a catecholamine surge and correlates with larger infarct size.",
      "Management: Dual antiplatelet therapy (aspirin + ticagrelor/clopidogrel), activate cath lab, IV access × 2, continuous monitoring, oxygen only if SpO₂ < 94%.",
    ],
  },
}

// Helper to get preset for any unit
export type UnitPreset =
  | { type: "ecg-sim"; params: ECGWaveformParams }
  | { type: "ecg-case"; patientCase: PatientCase }
  | { type: "xray"; xrayCase: XRayCase }
  | { type: "workup"; workupCase: WorkupCase }

export function getUnitPreset(unitId: string): UnitPreset | null {
  if (CLINICAL_WORKUP_CASES[unitId]) {
    return { type: "workup", workupCase: CLINICAL_WORKUP_CASES[unitId] }
  }
  if (ECG_SIMULATION_PRESETS[unitId]) {
    return { type: "ecg-sim", params: ECG_SIMULATION_PRESETS[unitId] }
  }
  if (ECG_CASE_PRESETS[unitId]) {
    return { type: "ecg-case", patientCase: ECG_CASE_PRESETS[unitId] }
  }
  if (XRAY_CASE_PRESETS[unitId]) {
    return { type: "xray", xrayCase: XRAY_CASE_PRESETS[unitId] }
  }
  return null
}
