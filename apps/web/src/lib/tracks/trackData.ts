export type UnitType = "simulation" | "case"
export type Difficulty = "Beginner" | "Intermediate" | "Advanced"

export type TrackUnit = {
  id: string
  number: number
  title: string
  description: string
  type: UnitType
  difficulty: Difficulty
  durationMin: number
  href: string
  topic: string // passed as ?topic= to the sim page
}

export type Track = {
  id: string
  title: string
  subtitle: string
  description: string
  modality: "ECG" | "X-Ray"
  accent: string
  accentLight: string
  units: TrackUnit[]
}

export const ECG_TRACK: Track = {
  id: "ecg-fundamentals",
  title: "ECG Fundamentals",
  subtitle: "12 curated units · Beginner → Advanced",
  description:
    "A structured curriculum covering everything from lead orientation to complex arrhythmia management. Each unit builds on the last.",
  modality: "ECG",
  accent: "#0066FF",
  accentLight: "#EEF3FF",
  units: [
    {
      id: "ecg-u1",
      number: 1,
      title: "The 12-Lead Grid",
      description:
        "Understand the spatial orientation of all 12 leads, bipolar vs augmented limb leads, and how the hexaxial reference system maps electrical vectors.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 8,
      href: "/ecg/practice",
      topic: "12-lead orientation",
    },
    {
      id: "ecg-u2",
      number: 2,
      title: "Normal Sinus Rhythm",
      description:
        "Define the diagnostic criteria for NSR, identify P-wave morphology in each lead, and practise distinguishing NSR from near-normal variants.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 10,
      href: "/ecg/practice",
      topic: "normal sinus rhythm",
    },
    {
      id: "ecg-u3",
      number: 3,
      title: "Rate Calculation",
      description:
        "Master the 300-method, 1500-method, and 6-second strip technique. Calculate rates across bradycardia, tachycardia, and irregular rhythms.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 10,
      href: "/ecg/practice",
      topic: "heart rate calculation",
    },
    {
      id: "ecg-u4",
      number: 4,
      title: "Axis Determination",
      description:
        "Use the quadrant method with leads I and aVF to classify normal, left, right, and extreme axis deviation. Identify axis shifts as clues to pathology.",
      type: "simulation",
      difficulty: "Intermediate",
      durationMin: 12,
      href: "/ecg/practice",
      topic: "electrical axis",
    },
    {
      id: "ecg-u5",
      number: 5,
      title: "Interval Analysis",
      description:
        "Measure PR, QRS, and QT/QTc intervals with precision. Learn Bazett's formula and recognise clinically significant interval prolongation.",
      type: "simulation",
      difficulty: "Intermediate",
      durationMin: 12,
      href: "/ecg/practice",
      topic: "PR QRS QT intervals",
    },
    {
      id: "ecg-u6",
      number: 6,
      title: "Bundle Branch Blocks",
      description:
        "Differentiate LBBB from RBBB using RSR' in V1, broad S waves, and concordance rules. Understand why LBBB changes ischaemia interpretation (Sgarbossa).",
      type: "simulation",
      difficulty: "Intermediate",
      durationMin: 15,
      href: "/ecg/practice",
      topic: "bundle branch block LBBB RBBB",
    },
    {
      id: "ecg-u7",
      number: 7,
      title: "Bradyarrhythmia Cases",
      description:
        "A patient presents with near-syncope and a rate of 38. Work through three bradycardia cases: sinus arrest, junctional escape, and complete AV dissociation.",
      type: "case",
      difficulty: "Intermediate",
      durationMin: 20,
      href: "/ecg/cases",
      topic: "bradyarrhythmia sinus arrest AV block",
    },
    {
      id: "ecg-u8",
      number: 8,
      title: "AV Block Spectrum",
      description:
        "Three patients with varying PR behaviour. Classify each degree of AV block, identify Mobitz I vs II, and choose the appropriate management pathway.",
      type: "case",
      difficulty: "Intermediate",
      durationMin: 20,
      href: "/ecg/cases",
      topic: "AV block first second third degree Mobitz",
    },
    {
      id: "ecg-u9",
      number: 9,
      title: "Ischaemia & STEMI Patterns",
      description:
        "Identify hyperacute T waves, ST elevation, ST depression, and T-wave inversions across anterior, inferior, lateral, and posterior territories.",
      type: "simulation",
      difficulty: "Advanced",
      durationMin: 15,
      href: "/ecg/practice",
      topic: "STEMI ischaemia ST changes T wave",
    },
    {
      id: "ecg-u10",
      number: 10,
      title: "Acute STEMI",
      description:
        "A 58-year-old with central crushing chest pain, diaphoresis, and an ECG on your screen. Identify the culprit territory, STEMI equivalent, and activate the right pathway.",
      type: "case",
      difficulty: "Advanced",
      durationMin: 25,
      href: "/ecg/cases",
      topic: "acute STEMI NSTEMI culprit artery",
    },
    {
      id: "ecg-u11",
      number: 11,
      title: "Tachyarrhythmia Gauntlet",
      description:
        "Five rapid-fire cases: narrow-complex SVT, monomorphic VT, atrial fibrillation with RVR, atrial flutter with 2:1 block, and WPW pre-excitation.",
      type: "case",
      difficulty: "Advanced",
      durationMin: 30,
      href: "/ecg/cases",
      topic: "tachyarrhythmia SVT VT AF flutter WPW",
    },
    {
      id: "ecg-u12",
      number: 12,
      title: "Electrolyte ECG Changes",
      description:
        "Peaked T waves, flattened P waves, sine-wave pattern, U waves, and QT prolongation. Identify the electrolyte disturbance from ECG findings alone.",
      type: "case",
      difficulty: "Advanced",
      durationMin: 25,
      href: "/ecg/cases",
      topic: "hyperkalaemia hypokalaemia hypercalcaemia ECG",
    },
  ],
}

export const XRAY_TRACK: Track = {
  id: "chest-xray",
  title: "Chest X-Ray Interpretation",
  subtitle: "12 curated units · Beginner → Advanced",
  description:
    "A systematic curriculum from projection assessment to complex pathology. Build a reliable ABCDE method you can apply under pressure.",
  modality: "X-Ray",
  accent: "#0E0F12",
  accentLight: "#F5F5F3",
  units: [
    {
      id: "xray-u1",
      number: 1,
      title: "Projection & Quality Assessment",
      description:
        "Distinguish PA from AP views, assess rotation using the clavicle-spinous process distance, and evaluate inspiratory effort before reading any pathology.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 8,
      href: "/xray/practice",
      topic: "PA AP projection rotation inspiration quality",
    },
    {
      id: "xray-u2",
      number: 2,
      title: "The ABCDE Approach",
      description:
        "Apply a structured read: Airway midline, Breathing zones, Cardiac borders, Diaphragm contours, Everything else (bones, soft tissue, lines). Practice on three clean films.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 10,
      href: "/xray/practice",
      topic: "ABCDE systematic CXR approach",
    },
    {
      id: "xray-u3",
      number: 3,
      title: "Lung Field Anatomy",
      description:
        "Map the normal lung zones, identify the horizontal and oblique fissures, and describe lucency vs opacity using density descriptors.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 10,
      href: "/xray/practice",
      topic: "lung zones fissures opacity lucency anatomy",
    },
    {
      id: "xray-u4",
      number: 4,
      title: "Cardiac Silhouette",
      description:
        "Calculate the cardiothoracic ratio, identify left and right heart border contributors, and recognise cardiomegaly vs projection artefact.",
      type: "simulation",
      difficulty: "Beginner",
      durationMin: 10,
      href: "/xray/practice",
      topic: "cardiac silhouette CTR cardiomegaly borders",
    },
    {
      id: "xray-u5",
      number: 5,
      title: "Pleural Space Assessment",
      description:
        "Detect pleural effusions via costophrenic angle blunting and meniscus sign. Differentiate free from loculated fluid. Identify subtle pneumothorax lung edge.",
      type: "simulation",
      difficulty: "Intermediate",
      durationMin: 12,
      href: "/xray/practice",
      topic: "pleural effusion pneumothorax costophrenic",
    },
    {
      id: "xray-u6",
      number: 6,
      title: "Mediastinal Contours",
      description:
        "Assess tracheal position, aortic knuckle, and superior mediastinal width. Recognise widening causes: aortic dissection, lymphoma, goitre.",
      type: "simulation",
      difficulty: "Intermediate",
      durationMin: 12,
      href: "/xray/practice",
      topic: "mediastinum widening trachea aorta lymph",
    },
    {
      id: "xray-u7",
      number: 7,
      title: "Community-Acquired Pneumonia",
      description:
        "A febrile patient with productive cough and reduced breath sounds at the right base. Locate the consolidation, identify the lobe, and plan the next step.",
      type: "case",
      difficulty: "Intermediate",
      durationMin: 20,
      href: "/xray/cases",
      topic: "pneumonia consolidation lobar community-acquired",
    },
    {
      id: "xray-u8",
      number: 8,
      title: "Pneumothorax: Simple vs Tension",
      description:
        "Two CXRs — one simple, one tension. Identify the absent lung markings, tracheal shift, and mediastinal displacement. Decide immediate management for each.",
      type: "case",
      difficulty: "Intermediate",
      durationMin: 20,
      href: "/xray/cases",
      topic: "pneumothorax tension simple tracheal shift",
    },
    {
      id: "xray-u9",
      number: 9,
      title: "Interstitial Patterns",
      description:
        "Differentiate reticular, nodular, and ground-glass opacification. Associate each pattern with fibrosis, oedema, infection, or malignancy. Bilateral vs unilateral clues.",
      type: "simulation",
      difficulty: "Advanced",
      durationMin: 15,
      href: "/xray/practice",
      topic: "interstitial reticular nodular ground-glass pattern",
    },
    {
      id: "xray-u10",
      number: 10,
      title: "Pulmonary Oedema",
      description:
        "An elderly patient with acute breathlessness and bilateral crackles. Identify bat-wing opacities, Kerley B lines, upper lobe diversion, and pleural effusions.",
      type: "case",
      difficulty: "Advanced",
      durationMin: 25,
      href: "/xray/cases",
      topic: "pulmonary oedema Kerley bat-wing upper lobe diversion",
    },
    {
      id: "xray-u11",
      number: 11,
      title: "Solitary Pulmonary Nodule",
      description:
        "A 2.3 cm right upper lobe lesion in a 62-year-old ex-smoker. Apply Fleischner Society criteria, characterise the nodule margins, and decide the investigation pathway.",
      type: "case",
      difficulty: "Advanced",
      durationMin: 25,
      href: "/xray/cases",
      topic: "solitary pulmonary nodule Fleischner malignancy",
    },
    {
      id: "xray-u12",
      number: 12,
      title: "Post-Procedure Films",
      description:
        "Review CXRs after central line insertion, endotracheal intubation, and chest drain placement. Identify correct positioning and common malpositions requiring urgent action.",
      type: "case",
      difficulty: "Advanced",
      durationMin: 25,
      href: "/xray/cases",
      topic: "central line ETT chest drain malpositioning post-procedure",
    },
  ],
}

export const ALL_TRACKS: Track[] = [ECG_TRACK, XRAY_TRACK]

export function getTrackById(id: string): Track | undefined {
  return ALL_TRACKS.find((t) => t.id === id)
}
