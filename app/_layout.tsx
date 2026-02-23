import { Stack, Redirect, useRouter } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useEffect, useRef } from 'react';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useColors, useIsDark } from '../src/hooks/useTheme';
import { useSettingsStore } from '../src/stores/settingsStore';

function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const hasCompletedOnboarding = useSettingsStore((s) => s.settings.hasCompletedOnboarding);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasShareIntent && shareIntent?.text && !hasNavigated.current) {
      if (!hasCompletedOnboarding) {
        resetShareIntent();
        return;
      }

      hasNavigated.current = true;

      // Delay to ensure navigation stack is mounted (cold-start safety)
      const timer = setTimeout(() => {
        router.push({
          pathname: '/transaction-logger',
          params: {
            tab: 'sms',
            sharedText: shareIntent.text,
          },
        });
        resetShareIntent();
        hasNavigated.current = false;
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [hasShareIntent, shareIntent, hasCompletedOnboarding]);

  return null;
}

export default function RootLayout() {
  const colors = useColors();
  const isDark = useIsDark();
  const hasCompletedOnboarding = useSettingsStore((s) => s.settings.hasCompletedOnboarding);

  const navTheme = useMemo(() => ({
    ...DefaultTheme,
    dark: isDark,
    colors: {
      primary: colors.coral,
      background: colors.bg,
      card: colors.bgCard,
      text: colors.t1,
      border: colors.border,
      notification: colors.coral,
    },
  }), [isDark, colors]);

  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ShareIntentHandler />
        {!hasCompletedOnboarding && <Redirect href="/onboarding" />}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
          <Stack.Screen
            name="transaction-logger"
            options={{
              presentation: 'transparentModal',
              headerShown: false,
              animation: 'slide_from_bottom',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="budget-setup"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Budget Setup',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="category-detail"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Category',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="transaction-list"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Transactions',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="debt-planner"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Debt Planner',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="goal-detail"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Goal',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="reminders"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Reminders',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'card',
              headerShown: true,
              headerTitle: 'Settings',
              headerTintColor: colors.t1,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
        </Stack>
      </ThemeProvider>
    </ShareIntentProvider>
  );
}
