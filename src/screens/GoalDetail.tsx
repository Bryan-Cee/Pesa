import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useGoalStore } from '../stores/goalStore';
import { Card } from '../components/Card';
import { TabIcon } from '../components/TabIcon';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes, formatDate } from '../utils/formatters';
import {
  calculateMonthlyRequired,
  calculateGoalStatus,
  getGoalStatusColor,
  getGoalStatusLabel,
} from '../utils/goalCalculator';
import { differenceInMonths } from 'date-fns';

export function GoalDetail() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();

  const allGoals = useGoalStore((s) => s.goals);
  const allContributions = useGoalStore((s) => s.contributions);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const addContribution = useGoalStore((s) => s.addContribution);

  const colors = useColors();
  const s = mkStyles(colors);

  const goal = useMemo(
    () => allGoals.find((g) => g.id === goalId) ?? null,
    [allGoals, goalId]
  );

  const contributions = useMemo(
    () =>
      allContributions
        .filter((c) => c.goalId === goalId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allContributions, goalId]
  );

  const [showContrib, setShowContrib] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState('');
  const [editName, setEditName] = useState('');

  if (!goal) {
    return (
      <View style={s.screen}>
        <Text style={s.empty}>Goal not found</Text>
      </View>
    );
  }

  const progress =
    goal.targetAmount > 0 ? goal.currentBalance / goal.targetAmount : 0;
  const remaining = goal.targetAmount - goal.currentBalance;
  const monthly = calculateMonthlyRequired(
    goal.targetAmount,
    goal.currentBalance,
    goal.targetDate
  );
  const status = calculateGoalStatus(
    goal.targetAmount,
    goal.currentBalance,
    goal.targetDate,
    goal.recurrence
  );
  const statusColor = getGoalStatusColor(status);
  const statusLabel = getGoalStatusLabel(status);
  const monthsAway = goal.targetDate
    ? differenceInMonths(new Date(goal.targetDate), new Date())
    : null;

  function handleAddContribution() {
    const amount = parseInt(contribAmount, 10) || 0;
    if (amount <= 0) return;
    addContribution({
      goalId: goal!.id,
      date: new Date().toISOString(),
      amount,
      note: contribNote || undefined,
    });
    setShowContrib(false);
    setContribAmount('');
    setContribNote('');
  }

  function handleDelete() {
    Alert.alert(
      'Delete Goal',
      'Permanently delete this goal and all its data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGoal(goal!.id);
            router.back();
          },
        },
      ]
    );
  }

  function startEdit() {
    setEditName(goal!.name);
    setEditTarget(String(goal!.targetAmount));
    setEditing(true);
  }

  function saveEdit() {
    const target = parseInt(editTarget, 10) || goal!.targetAmount;
    const mr = calculateMonthlyRequired(target, goal!.currentBalance, goal!.targetDate);
    updateGoal(goal!.id, {
      name: editName || goal!.name,
      targetAmount: target,
      monthlyRequired: mr,
    });
    setEditing(false);
  }

  // Status banner
  let bannerBg = colors.greenDim;
  let bannerTextColor = colors.green;
  let bannerText = 'On track \u2014 your contributions are meeting the target';
  if (status === 'BEHIND') {
    bannerBg = colors.amberDim;
    bannerTextColor = colors.amber;
    bannerText = `Behind \u2014 you need ${formatKes(monthly)} more per month to hit your goal`;
  } else if (status === 'AT_RISK') {
    bannerBg = colors.redDim;
    bannerTextColor = colors.red;
    bannerText = `At risk \u2014 only ${monthsAway ?? 0} months to target and you're ${Math.round(progress * 100)}% funded`;
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress Section */}
        <Card style={s.progressCard}>
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.emoji}>{goal.emoji}</Text>
              <View>
                <Text style={s.goalName}>{goal.name}</Text>
                {goal.targetDate && (
                  <Text style={s.targetDate}>
                    {monthsAway !== null ? `${monthsAway} months away` : ''}
                  </Text>
                )}
              </View>
            </View>
            <Pressable onPress={startEdit}>
              <TabIcon name="edit-2" color={colors.coral} size={18} />
            </Pressable>
          </View>

          <View style={s.ringRow}>
            <View style={[s.ring, { borderColor: statusColor }]}>
              <Text style={[s.ringText, { color: statusColor }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={s.ringStats}>
              <Text style={s.statLabel}>Target</Text>
              <Text style={s.statValue}>
                {formatKes(goal.targetAmount)}
              </Text>
              <Text style={s.statLabel}>Saved</Text>
              <Text style={s.statValue}>
                {formatKes(goal.currentBalance)}
              </Text>
              <Text style={s.statLabel}>Remaining</Text>
              <Text style={s.statValue}>{formatKes(remaining)}</Text>
              <Text style={s.statLabel}>Monthly Required</Text>
              <Text style={s.statValue}>{formatKes(monthly)}</Text>
            </View>
          </View>

          <ProgressBar progress={progress} height={10} />
        </Card>

        {/* Status Banner */}
        <View style={[s.banner, { backgroundColor: bannerBg }]}>
          <Text style={[s.bannerText, { color: bannerTextColor }]}>
            {bannerText}
          </Text>
        </View>

        {/* Edit */}
        {editing && (
          <Card style={s.editCard}>
            <Text style={s.editTitle}>Edit Goal</Text>
            <TextInput
              style={s.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Goal name"
              placeholderTextColor={colors.t3}
            />
            <View style={s.editRow}>
              <Text style={s.editKes}>KES</Text>
              <TextInput
                style={s.editInput}
                value={editTarget}
                onChangeText={setEditTarget}
                keyboardType="number-pad"
                placeholderTextColor={colors.t3}
              />
            </View>
            <View style={s.editActions}>
              <Pressable onPress={() => setEditing(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={saveEdit}>
                <Text style={s.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Contribution History */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Contributions ({contributions.length})
          </Text>
          {contributions.map((c) => (
            <View key={c.id} style={s.contribRow}>
              <Text style={s.contribDate}>
                {formatDate(c.date, 'dd MMM yyyy')}
              </Text>
              <View style={s.contribCenter}>
                <Text style={s.contribAmount}>
                  {formatKes(c.amount)}
                </Text>
                {c.note && (
                  <Text style={s.contribNote}>{c.note}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Add Contribution */}
        {showContrib ? (
          <Card style={s.contribCard}>
            <Text style={s.contribTitle}>Add Contribution</Text>
            <View style={s.contribField}>
              <Text style={s.contribFieldLabel}>Amount</Text>
              <TextInput
                style={s.contribInput}
                value={contribAmount}
                onChangeText={setContribAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.t3}
              />
            </View>
            <View style={s.contribField}>
              <Text style={s.contribFieldLabel}>Note (optional)</Text>
              <TextInput
                style={s.contribInput}
                value={contribNote}
                onChangeText={setContribNote}
                placeholder="Add a note..."
                placeholderTextColor={colors.t3}
              />
            </View>
            <View style={s.contribActions}>
              <Pressable onPress={() => setShowContrib(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={s.saveBtn}
                onPress={handleAddContribution}
              >
                <Text style={s.saveBtnText}>Add</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <Pressable
            style={s.addContribBtn}
            onPress={() => setShowContrib(true)}
          >
            <Text style={s.addContribText}>+ Add Contribution</Text>
          </Pressable>
        )}

        {/* Delete */}
        <Pressable style={s.deleteBtn} onPress={handleDelete}>
          <Text style={s.deleteBtnText}>Delete Goal</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  empty: { padding: spacing.xl, textAlign: 'center', color: c.t2 },
  progressCard: {
    margin: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 36, marginRight: 12 },
  goalName: { fontSize: 20, fontWeight: '700', color: c.t1 },
  targetDate: { fontSize: 13, color: c.t2, marginTop: 2 },
  editIcon: { fontSize: 20, color: c.coral },
  ringRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  ringText: { fontSize: 22, fontWeight: '700' },
  ringStats: { flex: 1 },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: c.t1,
    marginBottom: 6,
  },
  banner: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  bannerText: { fontSize: 14, fontWeight: '600' },
  editCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.lg,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.t1,
    marginBottom: 12,
  },
  editInput: {
    fontSize: 16,
    color: c.t1,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 6,
    marginBottom: 12,
  },
  editRow: { flexDirection: 'row', alignItems: 'center' },
  editKes: { fontSize: 15, color: c.t2, marginRight: 6 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelText: { fontSize: 15, color: c.t2, fontWeight: '600', padding: 8 },
  saveBtn: {
    backgroundColor: c.coral,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  saveBtnText: { color: c.buttonText, fontWeight: '700', fontSize: 15 },
  section: { marginTop: spacing.sm },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.t1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  contribRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  contribDate: { fontSize: 12, color: c.t3, width: 90 },
  contribCenter: { flex: 1 },
  contribAmount: { fontSize: 15, fontWeight: '700', color: c.t1 },
  contribNote: { fontSize: 12, color: c.t3, marginTop: 2 },
  contribCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.lg,
  },
  contribTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.t1,
    marginBottom: 12,
  },
  contribField: { marginBottom: 12 },
  contribFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t2,
    marginBottom: 4,
  },
  contribInput: {
    fontSize: 16,
    color: c.t1,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
  },
  contribActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  addContribBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.button,
    backgroundColor: c.coral,
    alignItems: 'center',
  },
  addContribText: { color: c.buttonText, fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.button,
    borderCurve: 'continuous',
    backgroundColor: c.redDim,
    borderWidth: 1,
    borderColor: c.red + '30',
    alignItems: 'center',
  },
  deleteBtnText: { color: c.red, fontSize: 15, fontWeight: '700' },
});
