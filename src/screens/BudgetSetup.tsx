import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useBudgetStore, Category } from '../stores/budgetStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatKes, getMonthLabel } from '../utils/formatters';
import { CATEGORY_GROUP_ORDER, CATEGORY_GROUP_META } from '../utils/constants';

export function BudgetSetup() {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const { months, getCategoriesForMonth, addMonth, addCategories } =
    useBudgetStore();
  const income = useSettingsStore((s) => s.settings.incomeAssumption);

  const [step, setStep] = useState(0);
  const [monthIncome, setMonthIncome] = useState(String(income));
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Determine next month
  const sortedMonths = useMemo(
    () =>
      [...months].sort(
        (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month)
      ),
    [months]
  );
  const latestMonth = sortedMonths[0];

  const now = new Date();
  let nextYear = now.getFullYear();
  let nextMonth = now.getMonth() + 1;
  if (latestMonth) {
    nextMonth = latestMonth.month + 1;
    nextYear = latestMonth.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
  }

  const previousCategories = latestMonth
    ? getCategoriesForMonth(latestMonth.id)
    : [];

  const [editableCategories, setEditableCategories] = useState(
    previousCategories.map((c) => ({
      group: c.group,
      name: c.name,
      description: c.description,
      projected: c.projected,
      sortOrder: c.sortOrder,
      isFixed: c.isFixed,
    }))
  );

  function updateProjected(index: number, value: string) {
    const amount = parseInt(value, 10) || 0;
    setEditableCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], projected: amount };
      return updated;
    });
  }

  function deleteCategory(index: number) {
    Alert.alert('Delete Category', 'Remove this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEditableCategories((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  }

  function handleConfirm() {
    const incomeVal = parseInt(monthIncome, 10) || income;
    const monthId = addMonth({
      year: nextYear,
      month: nextMonth,
      label: getMonthLabel(nextYear, nextMonth),
      incomeAssumption: incomeVal,
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

    router.back();
  }

  const totalProjected = editableCategories.reduce(
    (s, c) => s + c.projected,
    0
  );
  const incomeVal = parseInt(monthIncome, 10) || income;
  const surplus = incomeVal - totalProjected;
  const savingsCategories = editableCategories.filter(
    (c) => c.group === 'SAVINGS' || c.group === 'INVESTMENT'
  );
  const savingsTotal = savingsCategories.reduce((s, c) => s + c.projected, 0);
  const savingsRate =
    incomeVal > 0 ? Math.round((savingsTotal / incomeVal) * 100) : 0;

  if (step === 0) {
    return (
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <Text style={s.title}>
            Review {getMonthLabel(nextYear, nextMonth)} Budget
          </Text>
          <Text style={s.subtitle}>
            Categories and amounts copied from{' '}
            {latestMonth?.label ?? 'defaults'}. Adjust anything before you
            start.
          </Text>
        </View>

        <View style={s.incomeRow}>
          <Text style={s.incomeLabel}>MONTHLY INCOME</Text>
          <View style={s.incomeInputWrap}>
            <Text style={s.kesLabel}>KES</Text>
            <TextInput
              style={[
                s.incomeInput,
                focusedField === 'income' && s.inputFocused,
              ]}
              value={monthIncome}
              onChangeText={setMonthIncome}
              keyboardType="number-pad"
              onFocus={() => setFocusedField('income')}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor={colors.t3}
            />
          </View>
        </View>

        <ScrollView style={s.list}>
          {editableCategories.map((cat, i) => (
            <Pressable
              key={`${cat.group}-${cat.name}-${i}`}
              style={s.catRow}
              onLongPress={() => deleteCategory(i)}
            >
              <View style={s.catLeft}>
                <View style={s.catNameRow}>
                  <View
                    style={[
                      s.groupDot,
                      { backgroundColor: CATEGORY_GROUP_META[cat.group].color },
                    ]}
                  />
                  <Text style={s.catName}>{cat.name}</Text>
                </View>
                <Text
                  style={[
                    s.catGroup,
                    { color: CATEGORY_GROUP_META[cat.group].color },
                  ]}
                >
                  {CATEGORY_GROUP_META[cat.group].label}
                </Text>
              </View>
              <View style={s.catInputWrap}>
                <Text style={s.kesSmall}>KES</Text>
                <TextInput
                  style={[
                    s.catInput,
                    focusedField === `cat-${i}` && s.inputFocused,
                  ]}
                  value={String(cat.projected)}
                  onChangeText={(v) => updateProjected(i, v)}
                  keyboardType="number-pad"
                  onFocus={() => setFocusedField(`cat-${i}`)}
                  onBlur={() => setFocusedField(null)}
                  placeholderTextColor={colors.t3}
                />
              </View>
            </Pressable>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>

        <View style={s.bottomBar}>
          <Text style={s.totalText}>Total: {formatKes(totalProjected)}</Text>
          <Pressable style={s.nextButton} onPress={() => setStep(1)}>
            <Text style={s.nextButtonText}>Review</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 1: Confirmation
  return (
    <View style={s.screen}>
      <View style={s.confirmContent}>
        <Text style={s.title}>Confirm {getMonthLabel(nextYear, nextMonth)}</Text>

        <View style={s.confirmCard}>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Income</Text>
            <Text style={s.confirmValue}>{formatKes(incomeVal)}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Total Projected</Text>
            <Text style={s.confirmValue}>{formatKes(totalProjected)}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>
              {surplus >= 0 ? 'Projected Surplus' : 'Projected Deficit'}
            </Text>
            <Text
              style={[
                s.confirmValue,
                { color: surplus >= 0 ? colors.green : colors.red },
              ]}
            >
              {formatKes(Math.abs(surplus))}
            </Text>
          </View>
          <View style={[s.confirmRow, { borderBottomWidth: 0 }]}>
            <Text style={s.confirmLabel}>Savings Rate</Text>
            <Text style={s.confirmValue}>{savingsRate}%</Text>
          </View>
        </View>

        <Pressable style={s.confirmButton} onPress={handleConfirm}>
          <Text style={s.confirmButtonText}>
            Confirm & Start Tracking
          </Text>
        </Pressable>
        <Pressable style={s.backButton} onPress={() => setStep(0)}>
          <Text style={s.backButtonText}>Go Back & Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  header: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: c.t1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: c.t2,
    lineHeight: 20,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: 12,
    padding: 14,
    marginBottom: spacing.md,
    borderCurve: 'continuous',
  },
  incomeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  incomeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kesLabel: {
    fontSize: 13,
    color: c.t3,
    marginRight: 4,
  },
  incomeInput: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
    width: 120,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: c.borderMed,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  inputFocused: {
    borderBottomColor: c.borderFocus,
  },
  list: {
    flex: 1,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  catLeft: {
    flex: 1,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
  },
  catGroup: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 2,
  },
  catInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kesSmall: {
    fontSize: 12,
    color: c.t3,
    marginRight: 4,
  },
  catInput: {
    fontSize: 16,
    fontWeight: '700',
    color: c.t1,
    width: 90,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: c.borderMed,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: c.bgCard,
    borderTopWidth: 1,
    borderTopColor: c.border,
    borderCurve: 'continuous',
  },
  totalText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.t1,
    fontVariant: ['tabular-nums'],
  },
  nextButton: {
    backgroundColor: c.coral,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radii.button,
    boxShadow: c.coralShadow,
    borderCurve: 'continuous',
  },
  nextButtonText: {
    color: c.buttonText,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  confirmCard: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: 18,
    padding: spacing.md,
    marginVertical: spacing.lg,
    borderCurve: 'continuous',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t2,
  },
  confirmValue: {
    fontSize: 15,
    fontWeight: '700',
    color: c.t1,
    fontVariant: ['tabular-nums'],
  },
  confirmButton: {
    backgroundColor: c.coral,
    paddingVertical: 16,
    borderRadius: radii.button,
    alignItems: 'center',
    marginBottom: spacing.md,
    boxShadow: c.coralShadow,
    borderCurve: 'continuous',
  },
  confirmButtonText: {
    color: c.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: c.coral,
    fontSize: 15,
    fontWeight: '600',
  },
});
