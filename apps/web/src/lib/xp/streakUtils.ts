// lib/xp/streakUtils.ts
import { isSameDay, subDays, startOfDay, parseISO, differenceInCalendarDays } from 'date-fns';

export interface ActivityDate {
    date: Date;
}

/**
 * Calculates the current streak based on activity dates.
 * Relies on input dates being in the user's local timeframe context or consistent UTC.
 * 
 * Logic:
 * 1. Streak continues if there is activity TODAY or YESTERDAY.
 * 2. If no activity today/yesterday, streak is 0.
 * 3. Count backward consecutive days.
 */
export function calculateStreak(activityDates: Date[]): number {
    if (!activityDates || activityDates.length === 0) return 0;

    // 1. Sort descending and unique days
    const sortedDates = activityDates
        .map(d => startOfDay(d))
        .sort((a, b) => b.getTime() - a.getTime());

    // Deduplicate
    const uniqueDates: Date[] = [];
    let lastDate: number | null = null;

    for (const d of sortedDates) {
        const time = d.getTime();
        if (time !== lastDate) {
            uniqueDates.push(d);
            lastDate = time;
        }
    }

    if (uniqueDates.length === 0) return 0;

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const mostRecent = uniqueDates[0];

    // 2. Check if streak is broken
    // If most recent activity is older than yesterday, streak is broken
    if (!isSameDay(mostRecent, today) && !isSameDay(mostRecent, yesterday)) {
        return 0;
    }

    // 3. Count streak
    let streak = 0;
    let expectedDate = mostRecent;

    for (const date of uniqueDates) {
        if (isSameDay(date, expectedDate)) {
            streak++;
            expectedDate = subDays(expectedDate, 1);
        } else {
            // Gap found
            break;
        }
    }

    return streak;
}

/**
 * Checks if the user has already performed an activity today.
 * Used to prevent double-awarding "First Daily Activity" XP.
 */
export function hasActivityToday(lastActivityDateRaw: string | Date | null): boolean {
    if (!lastActivityDateRaw) return false;

    const lastDate = typeof lastActivityDateRaw === 'string'
        ? parseISO(lastActivityDateRaw)
        : lastActivityDateRaw;

    return isSameDay(lastDate, new Date());
}
