import { format, differenceInDays, endOfMonth } from 'date-fns';

export function formatKes(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return `KES ${(amount / 1000).toFixed(0)}K`;
  }
  return `KES ${amount.toLocaleString('en-US')}`;
}

export function formatVariance(variance: number): string {
  const prefix = variance > 0 ? '\u2193 ' : variance < 0 ? '\u2191 ' : '';
  return `${prefix}${formatKes(Math.abs(variance))}`;
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatDateRelative(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = differenceInDays(d, now);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  return format(d, 'EEE dd MMM');
}

export function daysRemainingInMonth(date: Date = new Date()): number {
  return differenceInDays(endOfMonth(date), date);
}

export function getMonthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
