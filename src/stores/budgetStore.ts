import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryGroupType } from '../utils/constants';
import { generateId, getMonthLabel } from '../utils/formatters';

export interface Month {
  id: string;
  year: number;
  month: number;
  label: string;
  incomeAssumption: number;
  isSetupComplete: boolean;
  createdAt: string;
  lockedAt?: string;
}

export interface Category {
  id: string;
  monthId: string;
  group: CategoryGroupType;
  name: string;
  description: string;
  projected: number;
  sortOrder: number;
  isFixed: boolean;
  accentColor?: string;
  reminderId?: string;
  createdAt: string;
}

interface BudgetStore {
  months: Month[];
  categories: Category[];

  // Month CRUD
  addMonth: (month: Omit<Month, 'id' | 'createdAt'>) => string;
  updateMonth: (id: string, updates: Partial<Month>) => void;
  lockMonth: (id: string) => void;
  getMonth: (id: string) => Month | undefined;
  getMonthByDate: (year: number, month: number) => Month | undefined;
  getCurrentMonth: () => Month | undefined;
  getPastMonths: () => Month[];

  // Category CRUD
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => string;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategoriesForMonth: (monthId: string) => Category[];
  getCategory: (id: string) => Category | undefined;

  // Bulk operations
  addCategories: (categories: Omit<Category, 'id' | 'createdAt'>[]) => void;

  // Reset
  reset: () => void;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      months: [],
      categories: [],

      addMonth: (month) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          months: [
            ...state.months,
            { ...month, id, createdAt: now },
          ],
        }));
        return id;
      },

      updateMonth: (id, updates) =>
        set((state) => ({
          months: state.months.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      lockMonth: (id) =>
        set((state) => ({
          months: state.months.map((m) =>
            m.id === id ? { ...m, lockedAt: new Date().toISOString() } : m
          ),
        })),

      getMonth: (id) => get().months.find((m) => m.id === id),

      getMonthByDate: (year, month) =>
        get().months.find((m) => m.year === year && m.month === month),

      getCurrentMonth: () => {
        const now = new Date();
        const current = get().months.find(
          (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
        );
        if (current) return current;
        // Return most recent month
        const sorted = [...get().months].sort(
          (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month)
        );
        return sorted[0];
      },

      getPastMonths: () => {
        const now = new Date();
        const currentKey = now.getFullYear() * 12 + now.getMonth() + 1;
        return get()
          .months.filter((m) => m.year * 12 + m.month < currentKey)
          .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));
      },

      addCategory: (category) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          categories: [...state.categories, { ...category, id, createdAt: now }],
        }));
        return id;
      },

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      getCategoriesForMonth: (monthId) =>
        get().categories.filter((c) => c.monthId === monthId),

      getCategory: (id) => get().categories.find((c) => c.id === id),

      addCategories: (categories) => {
        const now = new Date().toISOString();
        const newCategories = categories.map((c) => ({
          ...c,
          id: generateId(),
          createdAt: now,
        }));
        set((state) => ({
          categories: [...state.categories, ...newCategories],
        }));
      },

      reset: () => set({ months: [], categories: [] }),
    }),
    {
      name: 'pesa-budget',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
