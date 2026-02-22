import { addMonths, format } from 'date-fns';

export interface DebtProjection {
  monthsToPayoff: number;
  totalInterestRemaining: number;
  payoffDate: string;
  milestones: { percent: number; date: string; label: string }[];
}

export interface PaymentSimulation {
  newMonthsToPayoff: number;
  newPayoffDate: string;
  monthsSaved: number;
  interestSaved: number;
}

export function calculateDebtProjection(
  currentBalance: number,
  apr: number,
  monthlyPayment: number,
  originalBalance: number
): DebtProjection {
  const monthlyRate = apr / 12;

  if (monthlyPayment <= currentBalance * monthlyRate) {
    return {
      monthsToPayoff: Infinity,
      totalInterestRemaining: Infinity,
      payoffDate: 'Never',
      milestones: [],
    };
  }

  if (currentBalance <= 0) {
    return {
      monthsToPayoff: 0,
      totalInterestRemaining: 0,
      payoffDate: format(new Date(), 'MMMM yyyy'),
      milestones: [],
    };
  }

  const monthsToPayoff = Math.ceil(
    -Math.log(1 - (monthlyRate * currentBalance) / monthlyPayment) /
      Math.log(1 + monthlyRate)
  );

  // Calculate total interest by simulating payments
  let balance = currentBalance;
  let totalInterest = 0;
  const now = new Date();
  const totalPaidSoFar = originalBalance - currentBalance;
  const milestones: { percent: number; date: string; label: string }[] = [];
  const milestonePercents = [25, 50, 75, 100];

  for (let i = 0; i < monthsToPayoff && balance > 0; i++) {
    const interest = balance * monthlyRate;
    const principal = Math.min(monthlyPayment - interest, balance);
    totalInterest += interest;
    balance -= principal;

    const totalPaid = totalPaidSoFar + (originalBalance - currentBalance - balance + (currentBalance - balance));
    const percentPaid = ((originalBalance - Math.max(balance, 0)) / originalBalance) * 100;

    for (const mp of milestonePercents) {
      if (
        percentPaid >= mp &&
        !milestones.find((m) => m.percent === mp)
      ) {
        const date = addMonths(now, i + 1);
        milestones.push({
          percent: mp,
          date: format(date, 'MMMM yyyy'),
          label: mp === 100 ? 'Debt Free!' : `${mp}% paid`,
        });
      }
    }
  }

  const payoffDate = format(addMonths(now, monthsToPayoff), 'MMMM yyyy');

  return {
    monthsToPayoff,
    totalInterestRemaining: Math.round(totalInterest),
    payoffDate,
    milestones,
  };
}

export function simulatePayment(
  currentBalance: number,
  apr: number,
  currentMonthlyPayment: number,
  newMonthlyPayment: number,
  originalBalance: number
): PaymentSimulation {
  const current = calculateDebtProjection(currentBalance, apr, currentMonthlyPayment, originalBalance);
  const simulated = calculateDebtProjection(currentBalance, apr, newMonthlyPayment, originalBalance);

  return {
    newMonthsToPayoff: simulated.monthsToPayoff,
    newPayoffDate: simulated.payoffDate,
    monthsSaved:
      current.monthsToPayoff === Infinity
        ? 0
        : current.monthsToPayoff - simulated.monthsToPayoff,
    interestSaved:
      current.totalInterestRemaining === Infinity
        ? 0
        : current.totalInterestRemaining - simulated.totalInterestRemaining,
  };
}
