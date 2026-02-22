import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { darkColors, lightColors, ThemeColors } from '../theme/colors';

export function useColors(): ThemeColors {
  const theme = useSettingsStore((s) => s.settings.theme);
  const systemScheme = useColorScheme();

  return useMemo(() => {
    if (theme === 'LIGHT') return lightColors;
    if (theme === 'DARK') return darkColors;
    // SYSTEM
    return systemScheme === 'light' ? lightColors : darkColors;
  }, [theme, systemScheme]);
}

export function useIsDark(): boolean {
  const theme = useSettingsStore((s) => s.settings.theme);
  const systemScheme = useColorScheme();

  return useMemo(() => {
    if (theme === 'LIGHT') return false;
    if (theme === 'DARK') return true;
    return systemScheme !== 'light';
  }, [theme, systemScheme]);
}
