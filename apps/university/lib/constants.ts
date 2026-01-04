export const ECG_LEADS = [
  "I", "II", "III",
  "aVR", "aVL", "aVF",
  "V1", "V2", "V3", "V4", "V5", "V6"
] as const;

export const INTERPRETATION_STEPS = [
  "heart-rate",
  "rhythm",
  "p-wave",
  "pr-interval",
  "qrs-duration",
  "axis",
  "st-t"
] as const;

export type InterpretationStep = typeof INTERPRETATION_STEPS[number];

export const STEP_QUESTIONS: Record<InterpretationStep, string> = {
  "heart-rate": "What is the heart rate? (Count the number of QRS complexes and multiply appropriately)",
  "rhythm": "What is the rhythm? (Sinus regular, sinus irregular, non-sinus regular, non-sinus irregular)",
  "p-wave": "Describe the P-wave (present/absent, upright/inverted)",
  "pr-interval": "What is the PR interval in milliseconds? (If not measurable, say N/A)",
  "qrs-duration": "What is the QRS duration in milliseconds?",
  "axis": "What is the axis? (Normal, Left, or Right)",
  "st-t": "Are there any ST-T abnormalities?"
};
