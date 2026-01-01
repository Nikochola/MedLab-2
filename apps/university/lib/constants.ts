export const ECG_LEADS = [
  "I", "II", "III",
  "aVR", "aVL", "aVF",
  "V1", "V2", "V3", "V4", "V5", "V6"
] as const;

export const INTERPRETATION_STEPS = [
  "heart-rate",
  "rhythm",
  "p-wave",
  "qrs",
  "axis",
  "st-t",
  "final-impression"
] as const;

export type InterpretationStep = typeof INTERPRETATION_STEPS[number];

export const STEP_QUESTIONS: Record<InterpretationStep, string> = {
  "heart-rate": "What is the heart rate? (Count the number of QRS complexes and multiply appropriately)",
  "rhythm": "What is the rhythm? (e.g., normal sinus rhythm, atrial fibrillation)",
  "p-wave": "Describe the P-wave and PR interval",
  "qrs": "Describe the QRS morphology and duration",
  "axis": "What is the axis? (Normal, Left, or Right)",
  "st-t": "Are there any ST-T abnormalities?",
  "final-impression": "What is your final ECG interpretation?"
};

