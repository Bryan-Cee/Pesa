import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/formatters';

export type GoalType = 'HOLIDAY' | 'INSURANCE' | 'EMERGENCY_FUND' | 'SINKING_FUND' | 'CUSTOM';
export type GoalRecurrence = 'ONE_OFF' | 'ANNUAL' | 'CUSTOM_MONTHS' | 'ONGOING';

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  type: GoalType;
  targetAmount: number;
  currentBalance: number;
  targetDate?: string;
  recurrence: GoalRecurrence;
  recurrenceMonths?: number;
  monthlyRequired: number;
  linkedCategoryId?: string;
  annualTarget?: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  transactionId?: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
}

interface GoalStore {
  goals: SavingsGoal[];
  contributions: GoalContribution[];

  addGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  archiveGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  getGoal: (id: string) => SavingsGoal | undefined;
  getActiveGoals: () => SavingsGoal[];

  addContribution: (contribution: Omit<GoalContribution, 'id' | 'createdAt'>) => string;
  getContributionsForGoal: (goalId: string) => GoalContribution[];

  reset: () => void;
}

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      contributions: [],

      addGoal: (goal) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          goals: [...state.goals, { ...goal, id, createdAt: now, updatedAt: now }],
        }));
        return id;
      },

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? { ...g, ...updates, updatedAt: new Date().toISOString() }
              : g
          ),
        })),

      archiveGoal: (id) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? { ...g, isArchived: true, updatedAt: new Date().toISOString() }
              : g
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),

      getGoal: (id) => get().goals.find((g) => g.id === id),

      getActiveGoals: () => get().goals.filter((g) => !g.isArchived),

      addContribution: (contribution) => {
        const id = generateId();
        const now = new Date().toISOString();
        // Update goal balance
        const goal = get().goals.find((g) => g.id === contribution.goalId);
        if (goal) {
          set((state) => ({
            goals: state.goals.map((g) =>
              g.id === contribution.goalId
                ? {
                    ...g,
                    currentBalance: g.currentBalance + contribution.amount,
                    updatedAt: now,
                  }
                : g
            ),
            contributions: [
              ...state.contributions,
              { ...contribution, id, createdAt: now },
            ],
          }));
        } else {
          set((state) => ({
            contributions: [
              ...state.contributions,
              { ...contribution, id, createdAt: now },
            ],
          }));
        }
        return id;
      },

      getContributionsForGoal: (goalId) =>
        get()
          .contributions.filter((c) => c.goalId === goalId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

      reset: () => set({ goals: [], contributions: [] }),
    }),
    {
      name: 'pesa-goals',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
