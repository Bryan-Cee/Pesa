import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useSettingsStore } from '../stores/settingsStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useDebtStore } from '../stores/debtStore';
import { useGoalStore } from '../stores/goalStore';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DEBT,
  DEFAULT_GOALS,
  CATEGORY_GROUP_META,
} from '../utils/constants';
import { getMonthLabel, formatKes } from '../utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ReviewCadence = 'DAILY' | 'EVERY_2_DAYS' | 'WEEKLY' | 'BI_WEEKLY' | 'CUSTOM';

export function Onboarding() {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('375000');
  const [cadence, setCadence] = useState<ReviewCadence>('WEEKLY');
  const [reviewDay, setReviewDay] = useState(1); // 1 = Monday
  const [editableCategories, setEditableCategories] = useState(
    DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  );

  const updateSettings = useSettingsStore((st) => st.updateSettings);
  const { addMonth, addCategories } = useBudgetStore();
  const addDebt = useDebtStore((st) => st.addDebt);
  const addGoal = useGoalStore((st) => st.addGoal);

  const cadenceOptions: { label: string; value: ReviewCadence }[] = [
    { label: 'Daily', value: 'DAILY' },
    { label: 'Every 2 Days', value: 'EVERY_2_DAYS' },
    { label: 'Weekly', value: 'WEEKLY' },
    { label: 'Bi-Weekly', value: 'BI_WEEKLY' },
    { label: "I'll set it later", value: 'CUSTOM' },
  ];

  function handleComplete() {
    const incomeAmount = parseInt(income, 10) || 375000;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    updateSettings({
      incomeAssumption: incomeAmount,
      reviewCadence: cadence,
      reviewDayOfWeek: reviewDay % 7, // convert to 0=Sun, 1=Mon, ..., 6=Sat
      hasCompletedOnboarding: true,
    });

    const monthId = addMonth({
      year,
      month,
      label: getMonthLabel(year, month),
      incomeAssumption: incomeAmount,
      isSetupComplete: true,
    });

    addCategories(
      editableCategories.map((c) => ({
        monthId,
        group: c.group,
        name: c.name,
        description: c.description,
        projected: c.projected,
        sortOrder: c.sortOrder,
        isFixed: c.isFixed,
      }))
    );

    addDebt({ ...DEFAULT_DEBT, startDate: now.toISOString() });

    for (const goal of DEFAULT_GOALS) {
      addGoal({
        name: goal.name,
        emoji: goal.emoji,
        type: goal.type,
        targetAmount: goal.targetAmount,
        currentBalance: goal.currentBalance,
        targetDate: goal.targetDate,
        recurrence: goal.recurrence,
        monthlyRequired: 0,
        isArchived: false,
      });
    }

    router.replace('/(tabs)');
  }

  function updateCategoryProjected(index: number, value: string) {
    const amount = parseInt(value, 10) || 0;
    setEditableCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], projected: amount };
      return updated;
    });
  }

  // Step 0: Welcome
  if (step === 0) {
    return (
      <View style={s.welcomeScreen}>
        <View style={s.welcomeContent}>
          <View style={s.logoCircle}>
            <Text style={s.logoEmoji}>{'\uD83D\uDCB0'}</Text>
          </View>
          <Text style={s.logo}>Pesa</Text>
          <Text style={s.tagline}>Your money. Under control.</Text>
        </View>
        <View style={s.welcomeBottom}>
          <Pressable style={s.primaryButton} onPress={() => setStep(1)}>
            <Text style={s.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Step 1: Income
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        style={s.screen}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[s.stepContent, { paddingTop: insets.top + 40 }]}>
          <Text style={s.stepNumber}>Step 1 of 4</Text>
          <Text style={s.stepTitle}>What's your monthly take-home?</Text>
          <Text style={s.stepHelper}>
            This helps us calculate your savings rate and budget health. You can change this anytime in Settings.
          </Text>
          <View style={s.incomeInputWrap}>
            <Text style={s.kesLabel}>KES</Text>
            <TextInput
              style={s.largeInput}
              value={income}
              onChangeText={setIncome}
              keyboardType="number-pad"
              placeholder="375000"
              placeholderTextColor={colors.t3}
              selectionColor={colors.coral}
            />
          </View>
          <Pressable style={s.primaryButton} onPress={() => setStep(2)}>
            <Text style={s.primaryButtonText}>Next</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: Cadence
  if (step === 2) {
    return (
      <View style={s.screen}>
        <View style={[s.stepContent, { paddingTop: insets.top + 40 }]}>
          <Text style={s.stepNumber}>Step 2 of 4</Text>
          <Text style={s.stepTitle}>When should we remind you to review?</Text>
          <View style={s.cadenceRow}>
            {cadenceOptions.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  s.pill,
                  cadence === opt.value && s.pillActive,
                ]}
                onPress={() => setCadence(opt.value)}
              >
                <Text
                  style={[
                    s.pillText,
                    cadence === opt.value && s.pillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {cadence === 'WEEKLY' && (
            <View style={s.dayRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const dayValue = i + 1; // 1=Mon, 2=Tue, ..., 7=Sun
                const isActive = reviewDay === dayValue;
                return (
                  <Pressable
                    key={day}
                    style={[s.dayChip, isActive && s.dayChipActive]}
                    onPress={() => setReviewDay(dayValue)}
                  >
                    <Text style={[s.dayChipText, isActive && s.dayChipTextActive]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Pressable style={s.primaryButton} onPress={() => setStep(3)}>
            <Text style={s.primaryButtonText}>Next</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Step 3: Budget Setup
  const totalProjected = editableCategories.reduce((sum, c) => sum + c.projected, 0);
  const incomeNum = parseInt(income, 10) || 375000;
  const surplus = incomeNum - totalProjected;

  return (
    <View style={s.screen}>
      <View style={[s.setupHeader, { paddingTop: insets.top + 20 }]}>
        <Text style={s.stepNumber}>Step 3 of 4</Text>
        <Text style={s.stepTitle}>Set up your first budget</Text>
        <Text style={s.stepHelper}>
          Pre-loaded categories based on a typical budget. Adjust before you start.
        </Text>
      </View>
      <ScrollView style={s.categoriesList} showsVerticalScrollIndicator={false}>
        {editableCategories.map((cat, i) => {
          const meta = CATEGORY_GROUP_META[cat.group];
          return (
            <View key={`${cat.group}-${cat.name}`} style={s.catRow}>
              <View style={[s.catDot, { backgroundColor: meta.color }]} />
              <View style={s.catLeft}>
                <Text style={s.catName}>{cat.name}</Text>
                <Text style={[s.catGroup, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
              <View style={s.catInputWrap}>
                <Text style={s.catKes}>KES</Text>
                <TextInput
                  style={s.catInput}
                  value={String(cat.projected)}
                  onChangeText={(v) => updateCategoryProjected(i, v)}
                  keyboardType="number-pad"
                  selectionColor={colors.coral}
                />
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={s.summaryBar}>
        <View>
          <Text style={s.summaryLabel}>Total</Text>
          <Text style={s.summaryValue}>{formatKes(totalProjected)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.summaryLabel}>
            {surplus >= 0 ? 'Surplus' : 'Deficit'}
          </Text>
          <Text
            style={[
              s.summaryValue,
              { color: surplus >= 0 ? colors.green : colors.red },
            ]}
          >
            {formatKes(Math.abs(surplus))}
          </Text>
        </View>
      </View>
      <Pressable
        style={[s.primaryButton, { marginHorizontal: spacing.md, marginBottom: spacing.lg }]}
        onPress={handleComplete}
      >
        <Text style={s.primaryButtonText}>Start Tracking</Text>
      </Pressable>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  welcomeScreen: {
    flex: 1,
    backgroundColor: c.bg,
    justifyContent: 'space-between',
    paddingBottom: 50,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: c.coralDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderCurve: 'continuous',
  },
  logoEmoji: {
    fontSize: 48,
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: c.t2,
  },
  welcomeBottom: {
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
  },
  setupHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.md,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: c.coral,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  stepHelper: {
    fontSize: 14,
    color: c.t2,
    lineHeight: 20,
    marginBottom: 32,
  },
  incomeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    marginBottom: 32,
    borderCurve: 'continuous',
  },
  kesLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: c.t2,
  },
  largeInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -2,
    paddingVertical: 16,
    fontVariant: ['tabular-nums'],
  },
  primaryButton: {
    backgroundColor: c.coral,
    paddingVertical: 16,
    borderRadius: radii.button,
    alignItems: 'center',
    boxShadow: c.coralShadow,
    borderCurve: 'continuous',
  },
  primaryButtonText: {
    color: c.buttonText,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cadenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderCurve: 'continuous',
  },
  pillActive: {
    backgroundColor: c.coralDim,
    borderColor: c.coralBorder,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.t2,
  },
  pillTextActive: {
    color: c.coral,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  dayChipActive: {
    backgroundColor: c.coralDim,
    borderColor: c.coralBorder,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t3,
  },
  dayChipTextActive: {
    color: c.coral,
  },
  categoriesList: {
    flex: 1,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  catDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  catLeft: {
    flex: 1,
  },
  catName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.t1,
  },
  catGroup: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  catInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catKes: {
    fontSize: 11,
    color: c.t3,
  },
  catInput: {
    fontSize: 15,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
    width: 80,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: c.bgCard,
    borderTopWidth: 1,
    borderTopColor: c.border,
    borderCurve: 'continuous',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
});
