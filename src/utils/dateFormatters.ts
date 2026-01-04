/**
 * Date formatting utilities following WhatsApp's conventions.
 */

import { format, isToday, isYesterday, differenceInDays, startOfDay } from 'date-fns';

/**
 * Format a date for the sidebar chat list.
 * - Today: "Today" or time (HH:mm)
 * - Yesterday: "Yesterday"
 * - This week: Weekday name (e.g., "Monday")
 * - Older: DD/MM/YYYY
 */
export function formatChatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    if (isToday(date)) {
        return format(date, 'HH:mm');
    }

    if (isYesterday(date)) {
        return 'Yesterday';
    }

    const daysDiff = differenceInDays(startOfDay(now), startOfDay(date));

    if (daysDiff < 7) {
        return format(date, 'EEEE'); // Full weekday name
    }

    return format(date, 'dd/MM/yyyy');
}

/**
 * Format a date for message date separators (between message groups).
 * - Today: "TODAY"
 * - Yesterday: "YESTERDAY"  
 * - This week: Weekday name (e.g., "MONDAY")
 * - Older: "MMMM D, YYYY" (e.g., "December 25, 2025")
 */
export function formatDateSeparator(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    if (isToday(date)) {
        return 'TODAY';
    }

    if (isYesterday(date)) {
        return 'YESTERDAY';
    }

    const daysDiff = differenceInDays(startOfDay(now), startOfDay(date));

    if (daysDiff < 7) {
        return format(date, 'EEEE').toUpperCase(); // Full weekday name
    }

    return format(date, 'MMMM d, yyyy').toUpperCase();
}

/**
 * Get the date key for grouping messages by day.
 * Returns a string like "2025-12-25" for comparison.
 */
export function getDateKey(timestamp: number): string {
    return format(new Date(timestamp), 'yyyy-MM-dd');
}

/**
 * Check if two timestamps are on different days.
 */
export function isDifferentDay(timestamp1: number, timestamp2: number): boolean {
    return getDateKey(timestamp1) !== getDateKey(timestamp2);
}
