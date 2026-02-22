import { differenceInMonths } from 'date-fns';

export type GoalStatus = 'ON_TRACK' | 'BEHIND' | 'AT_RISK' | 'COMPLETE' | 'ONGOING';

export function calculateMonthlyRequired(
  targetAmount: number,
  currentBalance: number,
  targetDate?: string
): number {
  if (!targetDate) return 0;
  const monthsRemaining = differenceInMonths(new Date(targetDate), new Date());
  if (monthsRemaining <= 0) return targetAmount - currentBalance;
  return Math.ceil((targetAmount - currentBalance) / monthsRemaining);
}

export function calculateGoalStatus(
  targetAmount: number,
  currentBalance: number,
  targetDate?: string,
  recurrence?: string
): GoalStatus {
  if (recurrence === 'ONGOING') return 'ONGOING';
  if (currentBalance >= targetAmount) return 'COMPLETE';
  if (!targetDate) return 'ON_TRACK';

  const monthsRemaining = differenceInMonths(new Date(targetDate), new Date());
  const percentFunded = currentBalance / targetAmount;

  if (monthsRemaining <= 0) return 'AT_RISK';
  if (monthsRemaining <= 2 && percentFunded < 0.8) return 'AT_RISK';

  // Expected progress: linear projection
  const totalMonths = differenceInMonths(new Date(targetDate), new Date(Date.now() - (currentBalance / targetAmount) * monthsRemaining * 30 * 24 * 60 * 60 * 1000));
  const expectedPercent = 1 - monthsRemaining / (monthsRemaining + (currentBalance > 0 ? monthsRemaining * (currentBalance / targetAmount) / (1 - currentBalance / targetAmount) : monthsRemaining));

  if (percentFunded < expectedPercent * 0.8) return 'BEHIND';
  return 'ON_TRACK';
}

export function getGoalStatusColor(status: GoalStatus): string {
  switch (status) {
    case 'ON_TRACK':
    case 'COMPLETE':
      return '#16A34A';
    case 'BEHIND':
      return '#D97706';
    case 'AT_RISK':
      return '#DC2626';
    case 'ONGOING':
      return '#2563EB';
  }
}

export function getGoalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'On track';
    case 'BEHIND':
      return 'Behind';
    case 'AT_RISK':
      return 'At risk';
    case 'COMPLETE':
      return 'Complete!';
    case 'ONGOING':
      return 'Ongoing';
  }
}
