import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore } from '../stores/transactionStore';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { TransactionItem } from '../components/TransactionItem';
import { formatKes, formatDateRelative } from '../utils/formatters';
import { CATEGORY_GROUP_META } from '../utils/constants';
import { useReminderStore } from '../stores/reminderStore';
import { TabIcon } from '../components/TabIcon';

export function CategoryDetail() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();

  const allCategories = useBudgetStore((s) => s.categories);
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const allTransactions = useTransactionStore((s) => s.transactions);
  const allReminders = useReminderStore((s) => s.reminders);

  const colors = useColors();
  const s = mkStyles(colors);

  const category = useMemo(
    () => allCategories.find((c) => c.id === categoryId) ?? null,
    [allCategories, categoryId]
  );

  const getCategory = useMemo(() => {
    return (id: string) => allCategories.find((c) => c.id === id);
  }, [allCategories]);

  const transactions = useMemo(
    () =>
      allTransactions
        .filter((t) => t.categoryId === categoryId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allTransactions, categoryId]
  );

  const actual = useMemo(
    () =>
      allTransactions
        .filter(
          (t) =>
            t.categoryId === categoryId &&
            (t.type === 'ACTUAL' || t.type === 'FUTURE_PAID')
        )
        .reduce((s, t) => s + t.amount, 0),
    [allTransactions, categoryId]
  );

  const committed = useMemo(
    () =>
      allTransactions
        .filter(
          (t) => t.categoryId === categoryId && t.type === 'FUTURE_PENDING'
        )
        .reduce((s, t) => s + t.amount, 0),
    [allTransactions, categoryId]
  );

  const linkedReminder = useMemo(
    () => category?.reminderId ? allReminders.find((r) => r.id === category.reminderId) ?? null : null,
    [allReminders, category]
  );

  const [editing, setEditing] = useState(false);
  const [editProjected, setEditProjected] = useState('');
  const [editDescription, setEditDescription] = useState('');

  if (!category) {
    return (
      <View style={s.screen}>
        <Text style={s.empty}>Category not found</Text>
      </View>
    );
  }

  const variance = category.projected - actual;
  const progress = category.projected > 0 ? actual / category.projected : 0;
  const meta = CATEGORY_GROUP_META[category.group];

  function startEdit() {
    setEditProjected(String(category!.projected));
    setEditDescription(category!.description);
    setEditing(true);
  }

  function saveEdit() {
    updateCategory(category!.id, {
      projected: parseInt(editProjected, 10) || 0,
      description: editDescription,
    });
    setEditing(false);
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={s.headerCard} glowBorder>
          <View style={s.titleRow}>
            <View style={s.titleLeft}>
              <Text style={s.categoryName}>{category.name}</Text>
              <View style={[s.groupBadge, { backgroundColor: meta.dimColor }]}>
                <Text style={[s.groupBadgeText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </View>
            <Pressable onPress={startEdit} style={s.editBtn}>
              <TabIcon name="edit-2" color={colors.coral} size={18} />
            </Pressable>
          </View>
          {category.description ? (
            <Text style={s.description}>{category.description}</Text>
          ) : null}

          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>PROJECTED</Text>
              <Text style={s.statValue}>{formatKes(category.projected)}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>ACTUAL</Text>
              <Text style={s.statValueBold}>{formatKes(actual)}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>VARIANCE</Text>
              <Text
                style={[
                  s.statValueBold,
                  { color: variance >= 0 ? colors.green : colors.red },
                ]}
              >
                {variance >= 0 ? '\u2193' : '\u2191'} {formatKes(Math.abs(variance))}
              </Text>
            </View>
            {committed > 0 && (
              <View style={s.statBox}>
                <Text style={s.statLabel}>COMMITTED</Text>
                <Text style={[s.statValueBold, { color: colors.amber }]}>
                  {formatKes(committed)}
                </Text>
              </View>
            )}
          </View>

          <ProgressBar progress={progress} />
        </Card>

        {/* Edit Inline */}
        {editing && (
          <Card style={s.editCard} glowBorder>
            <Text style={s.editTitle}>Edit Category</Text>
            <View style={s.editField}>
              <Text style={s.editLabel}>PROJECTED AMOUNT</Text>
              <View style={s.editInputRow}>
                <Text style={s.editKes}>KES</Text>
                <TextInput
                  style={s.editInput}
                  value={editProjected}
                  onChangeText={setEditProjected}
                  keyboardType="number-pad"
                  selectionColor={colors.coral}
                />
              </View>
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>DESCRIPTION</Text>
              <TextInput
                style={s.editTextInput}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholderTextColor={colors.t3}
                selectionColor={colors.coral}
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

        {/* Transactions */}
        <View style={s.txSection}>
          <View style={s.txHeader}>
            <Text style={s.txTitle}>
              TRANSACTIONS ({transactions.length})
            </Text>
          </View>
          {transactions.map((tx) => {
            const cat = getCategory(tx.categoryId);
            return (
              <TransactionItem
                key={tx.id}
                description={tx.description}
                categoryName={cat?.name ?? ''}
                categoryGroup={cat?.group ?? 'CUSTOM'}
                amount={tx.amount}
                type={tx.type}
                note={tx.note}
              />
            );
          })}
          <Pressable
            style={s.addTxButton}
            onPress={() => router.push('/transaction-logger')}
          >
            <Text style={s.addTxText}>+ Add Transaction</Text>
          </Pressable>
        </View>

        {/* Reminder Section */}
        {linkedReminder && (
          <View style={s.reminderSection}>
            <Text style={s.reminderTitle}>LINKED REMINDER</Text>
            <View style={s.reminderCard}>
              <View style={[s.reminderDot, { backgroundColor: colors.purple }]} />
              <View style={s.reminderInfo}>
                <Text style={s.reminderName}>{linkedReminder.name}</Text>
                <Text style={s.reminderSub}>
                  Next: {formatDateRelative(linkedReminder.nextFireDate)}
                  {linkedReminder.recurrencePattern
                    ? ` \u00B7 ${linkedReminder.recurrencePattern.replace(/_/g, ' ').toLowerCase()}`
                    : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  empty: { padding: spacing.xl, textAlign: 'center', color: c.t3 },
  headerCard: { margin: spacing.md },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleLeft: { flex: 1 },
  categoryName: {
    fontSize: 24,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.9,
    marginBottom: 8,
  },
  groupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editBtn: {
    width: 38,
    height: 38,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 16, color: c.coral },
  description: {
    fontSize: 13,
    color: c.t2,
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.xs,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: c.t2,
  },
  statValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
  },
  editCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  editTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  editField: { marginBottom: 16 },
  editLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  editInputRow: { flexDirection: 'row', alignItems: 'center' },
  editKes: { fontSize: 15, color: c.t3, marginRight: 6 },
  editInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
    borderBottomWidth: 1,
    borderBottomColor: c.borderFocus,
    paddingVertical: 4,
  },
  editTextInput: {
    fontSize: 15,
    color: c.t1,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelText: { fontSize: 15, color: c.t3, fontWeight: '600', padding: 8 },
  saveBtn: {
    backgroundColor: c.coral,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  txSection: { marginTop: spacing.sm },
  txHeader: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  txTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addTxButton: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  addTxText: { fontSize: 14, fontWeight: '600', color: c.coral },

  /* Reminder section */
  reminderSection: { marginTop: spacing.md, paddingHorizontal: spacing.md },
  reminderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.sm,
    padding: 14,
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  reminderInfo: { flex: 1 },
  reminderName: { fontSize: 15, fontWeight: '600', color: c.t1 },
  reminderSub: { fontSize: 12, color: c.t3, marginTop: 3 },
});
