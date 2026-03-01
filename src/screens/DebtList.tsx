import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useIsDark } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useDebtStore, Debt } from '../stores/debtStore';
import { useBudgetStore } from '../stores/budgetStore';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes, getMonthLabel } from '../utils/formatters';
import { calculateDebtProjection } from '../utils/debtCalculator';
import { TabIcon } from '../components/TabIcon';

export function DebtList() {
  const router = useRouter();
  const debts = useDebtStore((s) => s.debts);
  const addDebt = useDebtStore((s) => s.addDebt);
  const updateDebt = useDebtStore((s) => s.updateDebt);

  const months = useBudgetStore((s) => s.months);
  const addMonth = useBudgetStore((s) => s.addMonth);
  const addCategory = useBudgetStore((s) => s.addCategory);
  const categories = useBudgetStore((s) => s.categories);

  const colors = useColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const s = mkStyles(colors);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCurrentBalance, setNewCurrentBalance] = useState('');
  const [newOriginalBalance, setNewOriginalBalance] = useState('');
  const [newApr, setNewApr] = useState('');
  const [newMinPayment, setNewMinPayment] = useState('');
  const [newMonthlyPayment, setNewMonthlyPayment] = useState('');
  const [addToBudget, setAddToBudget] = useState(false);
  const [debtDate, setDebtDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  /** Find or auto-create the budget month matching a given date */
  function resolveMonth(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const existing = months.find((m) => m.year === year && m.month === month);
    if (existing) return existing.id;
    return addMonth({
      year,
      month,
      label: getMonthLabel(year, month),
      incomeAssumption: 0,
      isSetupComplete: false,
    });
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalMonthlyPayments = debts.reduce(
    (sum, d) => sum + d.monthlyPayment,
    0
  );

  function resetForm() {
    setNewName('');
    setNewCurrentBalance('');
    setNewOriginalBalance('');
    setNewApr('');
    setNewMinPayment('');
    setNewMonthlyPayment('');
    setAddToBudget(false);
    setDebtDate(new Date());
  }

  function handleCreateDebt() {
    const currentBalance = parseInt(newCurrentBalance, 10) || 0;
    const originalBalance = parseInt(newOriginalBalance, 10) || currentBalance;
    const apr = (parseInt(newApr, 10) || 0) / 100;
    const minimumPayment = parseInt(newMinPayment, 10) || 0;
    const monthlyPayment = parseInt(newMonthlyPayment, 10) || minimumPayment;

    const debtId = addDebt({
      name: newName || 'New Debt',
      currentBalance,
      originalBalance,
      apr,
      minimumPayment,
      monthlyPayment,
      isPrimary: debts.length === 0,
      startDate: debtDate.toISOString().split('T')[0],
    });

    if (addToBudget) {
      const monthId = resolveMonth(debtDate);
      const categoryId = addCategory({
        monthId,
        group: 'DEBT_REPAYMENT',
        name: newName || 'New Debt',
        description: 'Auto-created from debt tracker',
        projected: monthlyPayment,
        sortOrder: categories.filter(
          (c) => c.monthId === monthId && c.group === 'DEBT_REPAYMENT'
        ).length,
        isFixed: true,
      });
      updateDebt(debtId, { linkedCategoryId: categoryId });
    }

    setShowCreate(false);
    resetForm();
  }

  function getStatusBadge(debt: Debt): {
    label: string;
    bg: string;
    fg: string;
  } | null {
    if (debt.currentBalance <= 0) {
      return { label: 'PAID OFF', bg: colors.greenDim, fg: colors.green };
    }
    if (debt.monthlyPayment <= debt.minimumPayment) {
      return {
        label: 'MINIMUM ONLY',
        bg: colors.amberDim,
        fg: colors.amber,
      };
    }
    return null;
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary bar */}
        <View style={s.summaryBar}>
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>TOTAL DEBT</Text>
            <Text style={s.summaryValue}>
              {totalDebt.toLocaleString('en-US')}
            </Text>
          </View>
          <View style={[s.summaryCol, s.summaryColRight]}>
            <Text style={s.summaryLabel}>MONTHLY PAYMENTS</Text>
            <Text style={s.summaryValue}>
              {totalMonthlyPayments.toLocaleString('en-US')}
            </Text>
          </View>
        </View>

        {/* Debt Cards */}
        {debts.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>No debts tracked yet.</Text>
            <Text style={s.emptySubtext}>
              Tap below to add your first debt.
            </Text>
          </View>
        )}

        {debts.map((debt) => {
          const progress =
            debt.originalBalance > 0
              ? (debt.originalBalance - debt.currentBalance) /
                debt.originalBalance
              : 0;
          const projection = calculateDebtProjection(
            debt.currentBalance,
            debt.apr,
            debt.monthlyPayment,
            debt.originalBalance
          );
          const statusBadge = getStatusBadge(debt);

          return (
            <Pressable
              key={debt.id}
              style={s.debtCard}
              onPress={() =>
                router.push({
                  pathname: '/debt-planner',
                  params: { debtId: debt.id },
                })
              }
            >
              {/* Top row: dot | info | monthly */}
              <View style={s.debtTopRow}>
                {/* Red dot indicator */}
                <View style={s.dotContainer}>
                  <View style={s.dot} />
                </View>

                {/* Center info */}
                <View style={s.debtInfo}>
                  <View style={s.debtNameRow}>
                    <Text style={s.debtName}>{debt.name}</Text>
                  </View>
                  <View style={s.badgeRow}>
                    <View
                      style={[
                        s.aprBadge,
                        { backgroundColor: colors.coralDim },
                      ]}
                    >
                      <Text
                        style={[s.aprBadgeText, { color: colors.coral }]}
                      >
                        {Math.round(debt.apr * 100)}% APR
                      </Text>
                    </View>
                    {statusBadge && (
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: statusBadge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusBadgeText,
                            { color: statusBadge.fg },
                          ]}
                        >
                          {statusBadge.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right: monthly payment */}
                <View style={s.monthlyCol}>
                  <Text style={s.monthlyLabel}>Monthly payment</Text>
                  <Text style={s.monthlyAmount}>
                    {debt.monthlyPayment.toLocaleString('en-US')}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={s.progressBarWrap}>
                <ProgressBar
                  progress={progress}
                  height={4}
                  color={colors.debtRed}
                />
              </View>

              {/* Bottom row: amounts + payoff date */}
              <View style={s.debtBottomRow}>
                <Text style={s.debtAmounts}>
                  {debt.currentBalance.toLocaleString('en-US')}{' '}
                  <Text style={s.debtAmountsOf}>of</Text>{' '}
                  {debt.originalBalance.toLocaleString('en-US')}
                </Text>
                <Text style={s.debtPayoff}>
                  {projection.payoffDate === 'Never'
                    ? 'Never'
                    : `Free by ${projection.payoffDate}`}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {/* Add button */}
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <Pressable
            style={s.addTextBtn}
            onPress={() => setShowCreate(true)}
          >
            <Text style={s.addTextBtnText}>+ Add a new debt</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Debt Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowCreate(false)}
          >
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </Pressable>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.modalContent, { paddingBottom: spacing.lg + insets.bottom }]}>
            {/* Drag handle */}
            <View style={s.handleRow}>
              <View style={s.handle} />
            </View>

            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Debt</Text>
              <Pressable
                style={s.modalCloseBtn}
                onPress={() => setShowCreate(false)}
              >
                <TabIcon name="x" color={colors.t2} size={20} />
              </Pressable>
            </View>

            <KeyboardAwareScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>
              <View style={s.modalField}>
                <Text style={s.modalLabel}>Name</Text>
                <TextInput
                  style={s.modalInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Credit Card"
                  placeholderTextColor={colors.t3}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>Current Balance (KES)</Text>
                <TextInput
                  style={s.modalInput}
                  value={newCurrentBalance}
                  onChangeText={setNewCurrentBalance}
                  keyboardType="number-pad"
                  placeholder="500000"
                  placeholderTextColor={colors.t3}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>Starting Balance (KES)</Text>
                <Text style={s.modalHelper}>The balance when you started tracking this debt</Text>
                <TextInput
                  style={s.modalInput}
                  value={newOriginalBalance}
                  onChangeText={setNewOriginalBalance}
                  keyboardType="number-pad"
                  placeholder="1000000"
                  placeholderTextColor={colors.t3}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>APR (%)</Text>
                <TextInput
                  style={s.modalInput}
                  value={newApr}
                  onChangeText={setNewApr}
                  keyboardType="number-pad"
                  placeholder="24"
                  placeholderTextColor={colors.t3}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>Minimum Payment (KES)</Text>
                <TextInput
                  style={s.modalInput}
                  value={newMinPayment}
                  onChangeText={setNewMinPayment}
                  keyboardType="number-pad"
                  placeholder="10000"
                  placeholderTextColor={colors.t3}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>Monthly Payment (KES)</Text>
                <TextInput
                  style={s.modalInput}
                  value={newMonthlyPayment}
                  onChangeText={setNewMonthlyPayment}
                  keyboardType="number-pad"
                  placeholder="25000"
                  placeholderTextColor={colors.t3}
                />
              </View>

              <View style={s.toggleRow}>
                <View style={s.toggleInfo}>
                  <Text style={s.toggleLabel}>Add to budget?</Text>
                  <Text style={s.toggleDesc}>
                    Creates a DEBT REPAYMENT category for{' '}
                    {debtDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Switch
                  value={addToBudget}
                  onValueChange={setAddToBudget}
                  trackColor={{
                    false: colors.border,
                    true: colors.coralDim,
                  }}
                  thumbColor={addToBudget ? colors.coral : colors.t3}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>Start Date</Text>
                <Pressable
                  style={s.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={s.datePickerValue}>
                    {debtDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={debtDate}
                    mode="date"
                    display="inline"
                    themeVariant={isDark ? 'dark' : 'light'}
                    accentColor={colors.coral}
                    onChange={(_, date) => {
                      setShowDatePicker(false);
                      if (date) setDebtDate(date);
                    }}
                  />
                )}
              </View>

              <View style={s.modalActions}>
                <Pressable onPress={() => setShowCreate(false)}>
                  <Text style={s.modalCancel}>Cancel</Text>
                </Pressable>
                <Pressable style={s.createBtn} onPress={handleCreateDebt}>
                  <Text style={s.createBtnText}>Create Debt</Text>
                </Pressable>
              </View>
            </KeyboardAwareScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const mkStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },

    /* Summary bar */
    summaryBar: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginBottom: spacing.sm,
    },
    summaryCol: {
      flex: 1,
    },
    summaryColRight: {
      alignItems: 'flex-end',
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.t3,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.t1,
    },

    /* Empty state */
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: spacing.lg,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.t2,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 14,
      color: c.t3,
    },

    /* Debt cards */
    debtCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    debtTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dotContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.debtRedDim,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.debtRed,
    },
    debtInfo: {
      flex: 1,
      marginRight: 8,
    },
    debtNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    debtName: {
      fontSize: 15,
      fontWeight: '600',
      color: c.t1,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
    },
    aprBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    aprBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    monthlyCol: {
      alignItems: 'flex-end',
    },
    monthlyLabel: {
      fontSize: 11,
      color: c.t3,
      marginBottom: 2,
    },
    monthlyAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: c.t1,
    },

    /* Progress */
    progressBarWrap: {
      marginTop: 12,
      marginBottom: 8,
    },

    /* Bottom amounts row */
    debtBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    debtAmounts: {
      fontSize: 12,
      fontWeight: '600',
      color: c.t3,
    },
    debtAmountsOf: {
      fontWeight: '400',
      color: c.t3,
    },
    debtPayoff: {
      fontSize: 12,
      color: c.t3,
    },

    /* Add button */
    addTextBtn: {
      alignItems: 'center',
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.sm,
      borderCurve: 'continuous',
      backgroundColor: 'transparent',
    },
    addTextBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.t2,
    },

    /* Modal */
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: c.bgSheet,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.borderMed,
      paddingHorizontal: spacing.lg,
      maxHeight: '88%',
    },
    handleRow: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 2,
    },
    handle: {
      width: 36,
      height: 5,
      borderRadius: 100,
      backgroundColor: c.t3,
      opacity: 0.4,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: spacing.sm,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.t1,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalField: { marginBottom: 16 },
    modalHelper: {
      fontSize: 11,
      color: c.t3,
      marginBottom: 6,
      lineHeight: 15,
    },
    modalLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.borderMed,
      borderRadius: radii.sm,
      borderCurve: 'continuous',
      fontSize: 15,
      color: c.t1,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },

    /* Date picker */
    datePickerBtn: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.borderMed,
      borderRadius: radii.sm,
      borderCurve: 'continuous',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    datePickerValue: {
      fontSize: 15,
      fontWeight: '500',
      color: c.t1,
    },

    /* Toggle row */
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      marginBottom: 8,
    },
    toggleInfo: {
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.t1,
    },
    toggleDesc: {
      fontSize: 12,
      color: c.t3,
      marginTop: 2,
    },

    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 16,
      marginTop: 20,
    },
    modalCancel: {
      fontSize: 15,
      color: c.t2,
      fontWeight: '600',
      padding: 8,
    },
    createBtn: {
      backgroundColor: c.coral,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: radii.button,
    },
    createBtnText: { color: c.buttonText, fontWeight: '700', fontSize: 15 },
  });
