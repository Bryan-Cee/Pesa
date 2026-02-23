import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useColors, useIsDark } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useGoalStore, GoalType, GoalRecurrence } from '../stores/goalStore';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes } from '../utils/formatters';
import {
  calculateMonthlyRequired,
  calculateGoalStatus,
  getGoalStatusColor,
  getGoalStatusLabel,
} from '../utils/goalCalculator';
import { TabIcon } from '../components/TabIcon';
import { differenceInMonths } from 'date-fns';

export function SavingsGoals() {
  const router = useRouter();
  const goals = useGoalStore((s) => s.goals);
  const addGoal = useGoalStore((s) => s.addGoal);

  const colors = useColors();
  const isDark = useIsDark();
  const s = mkStyles(colors);

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.isArchived),
    [goals]
  );

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('\uD83C\uDFAF');
  const [newType, setNewType] = useState<GoalType>('CUSTOM');
  const [newTarget, setNewTarget] = useState('');
  const [newTargetDate, setNewTargetDate] = useState<Date | null>(null);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [newRecurrence, setNewRecurrence] = useState<GoalRecurrence>('ONE_OFF');

  const totalMonthly = activeGoals.reduce((sum, g) => {
    const mr = calculateMonthlyRequired(
      g.targetAmount,
      g.currentBalance,
      g.targetDate
    );
    return sum + mr;
  }, 0);

  function handleCreateGoal() {
    const target = parseInt(newTarget, 10) || 0;
    const targetDateStr = newTargetDate ? newTargetDate.toISOString().split('T')[0] : undefined;
    const mr = calculateMonthlyRequired(target, 0, targetDateStr);
    addGoal({
      name: newName || 'New Goal',
      emoji: newEmoji,
      type: newType,
      targetAmount: target,
      currentBalance: 0,
      targetDate: targetDateStr,
      recurrence: newRecurrence,
      monthlyRequired: mr,
      isArchived: false,
    });
    setShowCreate(false);
    setNewName('');
    setNewTarget('');
    setNewTargetDate(null);
  }

  const goalTypes: { label: string; value: GoalType }[] = [
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Insurance', value: 'INSURANCE' },
    { label: 'Emergency', value: 'EMERGENCY_FUND' },
    { label: 'Sinking Fund', value: 'SINKING_FUND' },
    { label: 'Custom', value: 'CUSTOM' },
  ];

  /** Map recurrence to badge color pair */
  function getRecurrenceBadge(recurrence: GoalRecurrence): {
    bg: string;
    fg: string;
  } {
    switch (recurrence) {
      case 'ANNUAL':
        return { bg: colors.coralDim, fg: colors.coral };
      case 'ONGOING':
        return { bg: colors.amberDim, fg: colors.amber };
      case 'ONE_OFF':
      default:
        return { bg: colors.greenDim, fg: colors.green };
    }
  }

  function getRecurrenceLabel(recurrence: GoalRecurrence): string {
    switch (recurrence) {
      case 'ANNUAL':
        return 'ANNUAL';
      case 'ONGOING':
        return 'ONGOING';
      case 'ONE_OFF':
        return 'ONE-OFF';
      case 'CUSTOM_MONTHS':
        return 'CUSTOM';
      default:
        return recurrence;
    }
  }

  function getMonthsLeft(targetDate?: string): string | null {
    if (!targetDate) return null;
    const months = differenceInMonths(new Date(targetDate), new Date());
    if (months <= 0) return null;
    return `${months} months left`;
  }

  function getTimeLabel(goal: {
    targetDate?: string;
    recurrence: GoalRecurrence;
  }): string {
    if (goal.recurrence === 'ONGOING') return 'Ongoing';
    if (!goal.targetDate) return '';
    const months = differenceInMonths(
      new Date(goal.targetDate),
      new Date()
    );
    if (months <= 0) return 'Due now';
    return `${months} months left`;
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary bar */}
        <View style={s.summaryBar}>
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>MONTHLY COMMITTED</Text>
            <Text style={s.summaryValue}>
              {totalMonthly.toLocaleString('en-US')}
            </Text>
          </View>
          <View style={[s.summaryCol, s.summaryColRight]}>
            <Text style={s.summaryLabel}>ACTIVE GOALS</Text>
            <Text style={s.summaryValue}>{activeGoals.length}</Text>
          </View>
        </View>

        {/* Goal Cards */}
        {activeGoals.map((goal) => {
          const progress =
            goal.targetAmount > 0
              ? goal.currentBalance / goal.targetAmount
              : 0;
          const status = calculateGoalStatus(
            goal.targetAmount,
            goal.currentBalance,
            goal.targetDate,
            goal.recurrence
          );
          const statusColor = getGoalStatusColor(status);
          const statusLabel = getGoalStatusLabel(status);
          const monthly = calculateMonthlyRequired(
            goal.targetAmount,
            goal.currentBalance,
            goal.targetDate
          );
          const recurrenceBadge = getRecurrenceBadge(goal.recurrence);
          const timeLabel = getTimeLabel(goal);

          return (
            <Pressable
              key={goal.id}
              style={s.goalCard}
              onPress={() =>
                router.push({
                  pathname: '/goal-detail',
                  params: { goalId: goal.id },
                })
              }
            >
              {/* Top row: emoji | info | monthly */}
              <View style={s.goalTopRow}>
                {/* Emoji */}
                <View style={s.emojiContainer}>
                  <Text style={s.goalEmoji}>{goal.emoji}</Text>
                </View>

                {/* Center info */}
                <View style={s.goalInfo}>
                  <View style={s.goalNameRow}>
                    <Text style={s.goalName}>{goal.name}</Text>
                  </View>
                  <View style={s.badgeRow}>
                    <View
                      style={[
                        s.recurrenceBadge,
                        { backgroundColor: recurrenceBadge.bg },
                      ]}
                    >
                      <Text
                        style={[
                          s.recurrenceBadgeText,
                          { color: recurrenceBadge.fg },
                        ]}
                      >
                        {getRecurrenceLabel(goal.recurrence)}
                      </Text>
                    </View>
                    {status === 'BEHIND' && (
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: colors.amberDim },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusBadgeText,
                            { color: colors.amber },
                          ]}
                        >
                          BEHIND
                        </Text>
                      </View>
                    )}
                    {status === 'AT_RISK' && (
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: colors.redDim },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusBadgeText,
                            { color: colors.red },
                          ]}
                        >
                          AT RISK
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right: monthly needed */}
                <View style={s.monthlyCol}>
                  <Text style={s.monthlyLabel}>Monthly needed</Text>
                  <Text style={s.monthlyAmount}>
                    {monthly > 0
                      ? monthly.toLocaleString('en-US')
                      : '\u2014'}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={s.progressBarWrap}>
                <ProgressBar progress={progress} height={4} />
              </View>

              {/* Bottom row: amounts + time */}
              <View style={s.goalBottomRow}>
                <Text style={s.goalAmounts}>
                  {goal.currentBalance.toLocaleString('en-US')}{' '}
                  <Text style={s.goalAmountsOf}>of</Text>{' '}
                  {goal.targetAmount.toLocaleString('en-US')}
                </Text>
                <Text style={s.goalTimeLeft}>{timeLabel}</Text>
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
            <Text style={s.addTextBtnText}>+ Add a new goal</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          {/* Blur backdrop — tap to dismiss */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreate(false)}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Pressable>

          <View style={s.modalContent}>
            {/* Drag handle */}
            <View style={s.handleRow}>
              <View style={s.handle} />
            </View>

            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Savings Goal</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setShowCreate(false)}>
                <TabIcon name="x" color={colors.t2} size={20} />
              </Pressable>
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Name</Text>
              <TextInput
                style={s.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Goal name"
                placeholderTextColor={colors.t3}
              />
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Emoji</Text>
              <TextInput
                style={s.modalInput}
                value={newEmoji}
                onChangeText={setNewEmoji}
                placeholder="\uD83C\uDFAF"
                placeholderTextColor={colors.t3}
              />
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Recurrence</Text>
              <View style={s.typePills}>
                {(
                  [
                    { label: 'One-off', value: 'ONE_OFF' as GoalRecurrence },
                    { label: 'Annual', value: 'ANNUAL' as GoalRecurrence },
                    { label: 'Ongoing', value: 'ONGOING' as GoalRecurrence },
                  ] as const
                ).map((r) => (
                  <Pressable
                    key={r.value}
                    style={[
                      s.typePill,
                      newRecurrence === r.value && s.typePillActive,
                    ]}
                    onPress={() => setNewRecurrence(r.value)}
                  >
                    <Text
                      style={[
                        s.typePillText,
                        newRecurrence === r.value && s.typePillTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Type</Text>
              <View style={s.typePills}>
                {goalTypes.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[
                      s.typePill,
                      newType === t.value && s.typePillActive,
                    ]}
                    onPress={() => setNewType(t.value)}
                  >
                    <Text
                      style={[
                        s.typePillText,
                        newType === t.value && s.typePillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Target Amount (KES)</Text>
              <TextInput
                style={s.modalInput}
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="number-pad"
                placeholder="100000"
                placeholderTextColor={colors.t3}
              />
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Target Date (optional)</Text>
              <Pressable
                style={s.datePickerBtn}
                onPress={() => setShowTargetDatePicker(true)}
              >
                <Text style={newTargetDate ? s.datePickerValue : s.datePickerPlaceholder}>
                  {newTargetDate
                    ? newTargetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Select date'}
                </Text>
              </Pressable>
              {showTargetDatePicker && (
                <DateTimePicker
                  value={newTargetDate ?? new Date()}
                  mode="date"
                  display="inline"
                  minimumDate={new Date()}
                  themeVariant={isDark ? 'dark' : 'light'}
                  accentColor={colors.coral}
                  onChange={(_, date) => {
                    setShowTargetDatePicker(false);
                    if (date) setNewTargetDate(date);
                  }}
                />
              )}
            </View>

            <View style={s.modalActions}>
              <Pressable onPress={() => setShowCreate(false)}>
                <Text style={s.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={s.createBtn} onPress={handleCreateGoal}>
                <Text style={s.createBtnText}>Create Goal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
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
    fontSize: 9,
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

  /* Goal cards */
  goalCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalInfo: {
    flex: 1,
    marginRight: 8,
  },
  goalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: c.t1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  recurrenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  recurrenceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  monthlyCol: {
    alignItems: 'flex-end',
  },
  monthlyLabel: {
    fontSize: 9,
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
  goalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalAmounts: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t3,
  },
  goalAmountsOf: {
    fontWeight: '400',
    color: c.t3,
  },
  goalTimeLeft: {
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
    paddingBottom: spacing.lg,
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
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t2,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    fontSize: 16,
    color: c.t1,
    paddingVertical: 6,
  },
  typePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: c.bgCard,
  },
  typePillActive: { backgroundColor: c.coralDim },
  typePillText: { fontSize: 13, fontWeight: '600', color: c.t2 },
  typePillTextActive: { color: c.coral },
  datePickerBtn: {
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 10,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '500',
    color: c.t1,
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: c.t3,
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
