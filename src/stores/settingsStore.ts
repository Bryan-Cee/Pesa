import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  incomeAssumption: number;
  reviewCadence: 'DAILY' | 'EVERY_2_DAYS' | 'WEEKLY' | 'BI_WEEKLY' | 'CUSTOM';
  reviewDayOfWeek: number;
  reviewTime: string;
  notificationsEnabled: boolean;
  overspendAlertsEnabled: boolean;
  overspendThresholdPercent: number;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  hasCompletedOnboarding: boolean;
  lastExportedAt?: string;
  debtPayoffMethod: 'AVALANCHE' | 'SNOWBALL';
  emergencyFundMultiplier: number;
  currency: string;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  incomeAssumption: 375000,
  reviewCadence: 'WEEKLY',
  reviewDayOfWeek: 0, // Sunday
  reviewTime: '19:00',
  notificationsEnabled: true,
  overspendAlertsEnabled: true,
  overspendThresholdPercent: 100,
  theme: 'SYSTEM',
  hasCompletedOnboarding: false,
  debtPayoffMethod: 'AVALANCHE',
  emergencyFundMultiplier: 3,
  currency: 'KES',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: 'pesa-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
