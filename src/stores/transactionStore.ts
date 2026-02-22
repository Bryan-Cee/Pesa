import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/formatters';

export type TransactionType = 'ACTUAL' | 'FUTURE_PAID' | 'FUTURE_PENDING';

export interface Transaction {
  id: string;
  monthId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  eventDate?: string;
  type: TransactionType;
  note?: string;
  rawSms?: string;
  reminderId?: string;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TransactionStore {
  transactions: Transaction[];

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  markAsPaid: (id: string) => void;

  getTransactionsForMonth: (monthId: string) => Transaction[];
  getTransactionsForCategory: (categoryId: string) => Transaction[];
  getTransaction: (id: string) => Transaction | undefined;
  getUpcomingPayments: (days: number) => Transaction[];

  // Computed helpers
  getActualForCategory: (categoryId: string) => number;
  getCommittedForCategory: (categoryId: string) => number;

  reset: () => void;
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (tx) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          transactions: [
            ...state.transactions,
            { ...tx, id, createdAt: now, updatedAt: now },
          ],
        }));
        return id;
      },

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      markAsPaid: (id) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id
              ? {
                  ...t,
                  type: 'FUTURE_PAID' as TransactionType,
                  isPaid: true,
                  date: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        })),

      getTransactionsForMonth: (monthId) =>
        get().transactions.filter((t) => t.monthId === monthId),

      getTransactionsForCategory: (categoryId) =>
        get()
          .transactions.filter((t) => t.categoryId === categoryId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

      getTransaction: (id) => get().transactions.find((t) => t.id === id),

      getUpcomingPayments: (days) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return get()
          .transactions.filter(
            (t) =>
              t.type === 'FUTURE_PENDING' &&
              new Date(t.date) >= now &&
              new Date(t.date) <= cutoff
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },

      getActualForCategory: (categoryId) =>
        get()
          .transactions.filter(
            (t) =>
              t.categoryId === categoryId &&
              (t.type === 'ACTUAL' || t.type === 'FUTURE_PAID')
          )
          .reduce((sum, t) => sum + t.amount, 0),

      getCommittedForCategory: (categoryId) =>
        get()
          .transactions.filter(
            (t) => t.categoryId === categoryId && t.type === 'FUTURE_PENDING'
          )
          .reduce((sum, t) => sum + t.amount, 0),

      reset: () => set({ transactions: [] }),
    }),
    {
      name: 'pesa-transactions',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
