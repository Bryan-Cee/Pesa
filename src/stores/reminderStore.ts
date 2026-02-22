import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/formatters';

export type ReminderType = 'ONE_TIME' | 'RECURRING';
export type ReminderStatus = 'ACTIVE' | 'SNOOZED' | 'PAUSED' | 'COMPLETED';
export type RecurrencePattern =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY_DATE'
  | 'MONTHLY_LAST_DAY'
  | 'ANNUAL'
  | 'CUSTOM_DAYS';
export type LinkedType = 'TRANSACTION' | 'CATEGORY' | 'GOAL' | 'DEBT' | 'REVIEW' | 'STANDALONE';

export interface Reminder {
  id: string;
  name: string;
  type: ReminderType;
  linkedType: LinkedType;
  linkedId?: string;
  amount?: number;
  categoryId?: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceValue?: number;
  leadTimeDays: number;
  nextFireDate: string;
  dueDate?: string;
  message: string;
  status: ReminderStatus;
  snoozedUntil?: string;
  expoNotificationId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReminderStore {
  reminders: Reminder[];

  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  getReminder: (id: string) => Reminder | undefined;
  getActiveReminders: () => Reminder[];
  getDueReminders: (withinDays: number) => Reminder[];

  reset: () => void;
}

export const useReminderStore = create<ReminderStore>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: (reminder) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          reminders: [
            ...state.reminders,
            { ...reminder, id, createdAt: now, updatedAt: now },
          ],
        }));
        return id;
      },

      updateReminder: (id, updates) =>
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id
              ? { ...r, ...updates, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      deleteReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        })),

      getReminder: (id) => get().reminders.find((r) => r.id === id),

      getActiveReminders: () =>
        get().reminders.filter((r) => r.status === 'ACTIVE'),

      getDueReminders: (withinDays) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + withinDays);
        return get().reminders.filter(
          (r) =>
            r.status === 'ACTIVE' &&
            new Date(r.nextFireDate) <= cutoff
        );
      },

      reset: () => set({ reminders: [] }),
    }),
    {
      name: 'pesa-reminders',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
