// lib/xp/xpConfig.ts

// XP Award Values
// Table source: Implementation Plan Section 1
export const XP_VALUES = {
    ECG_STEP_CORRECT_FIRST_TRY: 15,
    ECG_STEP_CORRECT_WITH_HINTS: 8,
    ECG_SIMULATION_COMPLETE: 50,
    ECG_SIMULATION_PERFECT_BONUS: 10, // No hints used

    CASE_SUBMISSION: 30,
    CASE_ACCURACY_BONUS: 20, // Critical fields correct
    CASE_DIAGNOSIS_MATCH: 15,

    DAILY_FIRST_ACTIVITY: 10,
    STREAK_BONUS_PER_DAY: 5, // Capped at 25
    STREAK_BONUS_CAP: 25,

    WELCOME_BACK_BONUS: 25, // Return after 7+ days
    MASTERY_ACHIEVEMENT: 100, // One-time bonus
} as const;

export type XPActionType =
    | 'ecg_step_correct'
    | 'ecg_step_complete'
    | 'ecg_simulation_complete'
    | 'case_submit'
    | 'daily_login';

interface XPContext {
    isFirstTry?: boolean;
    hintsUsed?: number;
    streakDays?: number;
    accuracy?: number; // 0-1
    isPerfect?: boolean;
}

export function calculateXPForAction(action: XPActionType, context: XPContext = {}): { amount: number; reason: string } {
    let amount = 0;
    let reasons: string[] = [];

    switch (action) {
        case 'ecg_step_correct':
            if (context.isFirstTry) {
                amount += XP_VALUES.ECG_STEP_CORRECT_FIRST_TRY;
                reasons.push("Correct answer (first try)");
            } else {
                amount += XP_VALUES.ECG_STEP_CORRECT_WITH_HINTS;
                reasons.push("Correct answer");
            }
            break;

        case 'ecg_simulation_complete':
            amount += XP_VALUES.ECG_SIMULATION_COMPLETE;
            reasons.push("Simulation completed");

            if (context.isPerfect) {
                amount += XP_VALUES.ECG_SIMULATION_PERFECT_BONUS;
                reasons.push("Perfect run bonus");
            }
            break;

        case 'case_submit':
            amount += XP_VALUES.CASE_SUBMISSION;
            reasons.push("Case submitted");

            if (context.accuracy && context.accuracy >= 0.9) {
                amount += XP_VALUES.CASE_ACCURACY_BONUS;
                reasons.push("High accuracy bonus");
            }
            break;

        case 'daily_login':
            amount += XP_VALUES.DAILY_FIRST_ACTIVITY;
            reasons.push("Daily activity");

            if (context.streakDays && context.streakDays > 0) {
                const bonus = Math.min(context.streakDays * XP_VALUES.STREAK_BONUS_PER_DAY, XP_VALUES.STREAK_BONUS_CAP);
                amount += bonus;
                reasons.push(`${context.streakDays}d streak bonus`);
            }
            break;
    }

    return { amount, reason: reasons.join(", ") };
}

// Leveling Logic
// Exponential curve: Level L requires roughly (L^2 * 100) XP
export function calculateLevel(totalXP: number): number {
    if (totalXP < 0) return 1;
    // Inverse of xp = level^2 * 100  => level = sqrt(xp / 100)
    // +1 because we start at level 1 with 0 XP
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

export function calculateXPForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100;
}

export function getLevelProgress(totalXP: number) {
    const currentLevel = calculateLevel(totalXP);
    const nextLevel = currentLevel + 1;

    const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
    const nextLevelXP = Math.pow(currentLevel, 2) * 100;

    const progressInLevel = totalXP - currentLevelXP;
    const levelSpan = nextLevelXP - currentLevelXP;

    return {
        currentLevel,
        nextLevel,
        progressPercent: Math.min(100, Math.max(0, (progressInLevel / levelSpan) * 100)),
        xpToNextLevel: nextLevelXP - totalXP
    };
}
