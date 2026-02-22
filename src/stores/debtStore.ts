import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/formatters';

export interface Debt {
  id: string;
  name: string;
  currentBalance: number;
  originalBalance: number;
  apr: number;
  minimumPayment: number;
  monthlyPayment: number;
  linkedCategoryId?: string;
  isPrimary: boolean;
  startDate: string;
  targetPayoffDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  transactionId?: string;
  date: string;
  totalAmount: number;
  principalPaid: number;
  interestPaid: number;
  balanceAfter: number;
  createdAt: string;
}

interface DebtStore {
  debts: Debt[];
  payments: DebtPayment[];

  addDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  getDebt: (id: string) => Debt | undefined;
  getPrimaryDebt: () => Debt | undefined;

  addPayment: (payment: Omit<DebtPayment, 'id' | 'createdAt'>) => string;
  getPaymentsForDebt: (debtId: string) => DebtPayment[];

  reset: () => void;
}

export const useDebtStore = create<DebtStore>()(
  persist(
    (set, get) => ({
      debts: [],
      payments: [],

      addDebt: (debt) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          debts: [...state.debts, { ...debt, id, createdAt: now, updatedAt: now }],
        }));
        return id;
      },

      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id
              ? { ...d, ...updates, updatedAt: new Date().toISOString() }
              : d
          ),
        })),

      deleteDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        })),

      getDebt: (id) => get().debts.find((d) => d.id === id),

      getPrimaryDebt: () => get().debts.find((d) => d.isPrimary),

      addPayment: (payment) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          payments: [...state.payments, { ...payment, id, createdAt: now }],
        }));
        return id;
      },

      getPaymentsForDebt: (debtId) =>
        get()
          .payments.filter((p) => p.debtId === debtId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

      reset: () => set({ debts: [], payments: [] }),
    }),
    {
      name: 'pesa-debts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
