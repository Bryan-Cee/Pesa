import { colors } from '../theme/colors';

export type CategoryGroupType =
  | 'DEBT_REPAYMENT'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'HOUSEHOLD'
  | 'VEHICLE'
  | 'SUBSCRIPTIONS'
  | 'ENTERTAINMENT'
  | 'TRAVEL'
  | 'CHARITY'
  | 'HEALTH'
  | 'CUSTOM';

export const CATEGORY_GROUP_META: Record<
  CategoryGroupType,
  { label: string; color: string; dimColor: string; sortOrder: number }
> = {
  DEBT_REPAYMENT: { label: 'Debt Repayment', color: colors.debtRed, dimColor: colors.debtRedDim, sortOrder: 0 },
  SAVINGS: { label: 'Savings', color: colors.savingsGreen, dimColor: colors.savingsGreenDim, sortOrder: 1 },
  INVESTMENT: { label: 'Investment', color: colors.investBlue, dimColor: colors.investBlueDim, sortOrder: 2 },
  HOUSEHOLD: { label: 'Household', color: colors.householdCoral, dimColor: colors.householdCoralDim, sortOrder: 3 },
  VEHICLE: { label: 'Vehicle', color: colors.vehicleTeal, dimColor: colors.vehicleTealDim, sortOrder: 4 },
  SUBSCRIPTIONS: { label: 'Subscriptions', color: colors.subsPurple, dimColor: colors.subsPurpleDim, sortOrder: 5 },
  ENTERTAINMENT: { label: 'Entertainment', color: colors.entertAmber, dimColor: colors.entertAmberDim, sortOrder: 6 },
  TRAVEL: { label: 'Travel', color: colors.travelSky, dimColor: colors.travelSkyDim, sortOrder: 7 },
  CHARITY: { label: 'Charity', color: colors.charityPink, dimColor: colors.charityPinkDim, sortOrder: 8 },
  HEALTH: { label: 'Health', color: colors.healthEmerald, dimColor: colors.healthEmeraldDim, sortOrder: 9 },
  CUSTOM: { label: 'Custom', color: colors.customGrey, dimColor: colors.customGreyDim, sortOrder: 10 },
};

export const CATEGORY_GROUP_ORDER: CategoryGroupType[] = [
  'DEBT_REPAYMENT',
  'SAVINGS',
  'INVESTMENT',
  'HOUSEHOLD',
  'VEHICLE',
  'SUBSCRIPTIONS',
  'ENTERTAINMENT',
  'TRAVEL',
  'CHARITY',
  'HEALTH',
  'CUSTOM',
];

export interface DefaultCategory {
  group: CategoryGroupType;
  name: string;
  description: string;
  projected: number;
  isFixed: boolean;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // DEBT_REPAYMENT
  { group: 'DEBT_REPAYMENT', name: 'SC Credit Card', description: 'Credit card balance and fees', projected: 130000, isFixed: true, sortOrder: 0 },

  // SAVINGS
  { group: 'SAVINGS', name: 'Etica Capital MMF', description: 'Emergency fund', projected: 20000, isFixed: false, sortOrder: 0 },
  { group: 'SAVINGS', name: 'SC MMF', description: 'Emergency fund', projected: 0, isFixed: false, sortOrder: 1 },
  { group: 'SAVINGS', name: 'Kimisitu Sacco', description: 'Sacco for emergency loans', projected: 3800, isFixed: true, sortOrder: 2 },

  // INVESTMENT
  { group: 'INVESTMENT', name: 'ESPP', description: 'Stocks', projected: 79245, isFixed: true, sortOrder: 0 },
  { group: 'INVESTMENT', name: 'Cytonn MMF', description: 'Short term investment', projected: 5000, isFixed: false, sortOrder: 1 },
  { group: 'INVESTMENT', name: 'Mansa-X', description: 'Long term investment', projected: 0, isFixed: false, sortOrder: 2 },

  // HOUSEHOLD
  { group: 'HOUSEHOLD', name: 'Rent', description: 'Housing', projected: 45000, isFixed: true, sortOrder: 0 },
  { group: 'HOUSEHOLD', name: 'WiFi', description: '', projected: 4200, isFixed: true, sortOrder: 1 },
  { group: 'HOUSEHOLD', name: 'Water Bill', description: '', projected: 500, isFixed: true, sortOrder: 2 },
  { group: 'HOUSEHOLD', name: 'Phone Bill', description: '', projected: 2000, isFixed: true, sortOrder: 3 },
  { group: 'HOUSEHOLD', name: 'Power Bill', description: '', projected: 2000, isFixed: true, sortOrder: 4 },
  { group: 'HOUSEHOLD', name: 'Groceries & Supplies', description: 'Shopping for household items', projected: 10000, isFixed: false, sortOrder: 5 },
  { group: 'HOUSEHOLD', name: 'Services & Maintenance', description: 'Maintenance and cleaning service', projected: 7500, isFixed: false, sortOrder: 6 },
  { group: 'HOUSEHOLD', name: 'Lunch', description: 'Daily lunch budget', projected: 10500, isFixed: false, sortOrder: 7 },

  // VEHICLE
  { group: 'VEHICLE', name: 'Carwash', description: 'Monthly car wash budget', projected: 3200, isFixed: false, sortOrder: 0 },
  { group: 'VEHICLE', name: 'Parking', description: 'Parking and entrance fees', projected: 2000, isFixed: false, sortOrder: 1 },
  { group: 'VEHICLE', name: 'Car Service', description: 'Irregular car service installment', projected: 6350, isFixed: false, sortOrder: 2 },
  { group: 'VEHICLE', name: 'Car Insurance', description: 'Irregular car insurance installment', projected: 8350, isFixed: false, sortOrder: 3 },

  // SUBSCRIPTIONS
  { group: 'SUBSCRIPTIONS', name: 'YouTube Premium', description: '', projected: 500, isFixed: true, sortOrder: 0 },
  { group: 'SUBSCRIPTIONS', name: 'Google One + Gemini', description: '', projected: 250, isFixed: true, sortOrder: 1 },
  { group: 'SUBSCRIPTIONS', name: 'Showmax', description: '', projected: 550, isFixed: true, sortOrder: 2 },
  { group: 'SUBSCRIPTIONS', name: 'Netflix', description: 'Paused', projected: 0, isFixed: false, sortOrder: 3 },
  { group: 'SUBSCRIPTIONS', name: 'Prime Video', description: 'Paused', projected: 0, isFixed: false, sortOrder: 4 },

  // ENTERTAINMENT
  { group: 'ENTERTAINMENT', name: 'Motorcross', description: '', projected: 3000, isFixed: false, sortOrder: 0 },
  { group: 'ENTERTAINMENT', name: 'Movies', description: '', projected: 2000, isFixed: false, sortOrder: 1 },
  { group: 'ENTERTAINMENT', name: 'Drinks', description: 'Wine tasting', projected: 2000, isFixed: false, sortOrder: 2 },
  { group: 'ENTERTAINMENT', name: 'Restaurants & Dates', description: 'Dinner with friends', projected: 4000, isFixed: false, sortOrder: 3 },
  { group: 'ENTERTAINMENT', name: 'Unplanned Eat Out', description: '', projected: 2000, isFixed: false, sortOrder: 4 },

  // TRAVEL
  { group: 'TRAVEL', name: 'Travel Spending', description: 'Spending during travel', projected: 3000, isFixed: false, sortOrder: 0 },
  { group: 'TRAVEL', name: 'I&M Travel Goals', description: 'Travel goals savings', projected: 1000, isFixed: false, sortOrder: 1 },
  { group: 'TRAVEL', name: 'Airbnb', description: 'Only if travel planned', projected: 0, isFixed: false, sortOrder: 2 },

  // CHARITY
  { group: 'CHARITY', name: 'Family Support', description: 'Charity basket', projected: 5000, isFixed: false, sortOrder: 0 },

  // HEALTH
  { group: 'HEALTH', name: 'Medical / Pharmacy', description: 'Buffer for unexpected health costs', projected: 2000, isFixed: false, sortOrder: 0 },
  { group: 'HEALTH', name: 'Personal Grooming', description: 'Haircuts, toiletries, etc.', projected: 2000, isFixed: false, sortOrder: 1 },
];

export const DEFAULT_DEBT = {
  name: 'SC Credit Card',
  currentBalance: 102050,
  originalBalance: 102050,
  apr: 0.24,
  minimumPayment: 5000,
  monthlyPayment: 130000,
  isPrimary: true,
};

export const DEFAULT_GOALS = [
  {
    name: 'Car Insurance',
    emoji: '\uD83D\uDE97',
    type: 'INSURANCE' as const,
    targetAmount: 100200,
    currentBalance: 0,
    recurrence: 'ANNUAL' as const,
    targetDate: '2027-01-01',
  },
  {
    name: 'Emergency Fund',
    emoji: '\uD83D\uDEA8',
    type: 'EMERGENCY_FUND' as const,
    targetAmount: 250000,
    currentBalance: 0,
    recurrence: 'ONGOING' as const,
  },
];

export const DEFAULT_REMINDERS = [
  { name: 'YouTube Premium', linkedType: 'CATEGORY' as const, amount: 500, recurrencePattern: 'MONTHLY_DATE' as const, leadTimeDays: 2 },
  { name: 'Google One + Gemini', linkedType: 'CATEGORY' as const, amount: 250, recurrencePattern: 'MONTHLY_DATE' as const, leadTimeDays: 2 },
  { name: 'Showmax', linkedType: 'CATEGORY' as const, amount: 550, recurrencePattern: 'MONTHLY_DATE' as const, leadTimeDays: 2 },
  { name: 'SC Credit Card Payment', linkedType: 'DEBT' as const, amount: 130000, recurrencePattern: 'MONTHLY_DATE' as const, leadTimeDays: 3 },
];
