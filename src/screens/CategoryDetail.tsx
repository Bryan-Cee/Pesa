import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useColors, useIsDark } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore, Transaction } from '../stores/transactionStore';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes, formatDateRelative } from '../utils/formatters';
import { CATEGORY_GROUP_META } from '../utils/constants';
import { useReminderStore } from '../stores/reminderStore';
import { TabIcon } from '../components/TabIcon';

export function CategoryDetail() {
  const router = useRouter();
  const { categoryId, monthId } = useLocalSearchParams<{ categoryId: string; monthId?: string }>();

  const allCategories = useBudgetStore((s) => s.categories);
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const allTransactions = useTransactionStore((s) => s.transactions);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const markAsPaid = useTransactionStore((s) => s.markAsPaid);
  const allReminders = useReminderStore((s) => s.reminders);

  const colors = useColors();
  const isDark = useIsDark();
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
  const [editName, setEditName] = useState('');
  const [editProjected, setEditProjected] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Edit transaction modal state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxNote, setEditTxNote] = useState('');

  function openEditTx(tx: Transaction) {
    setEditTxAmount(String(tx.amount));
    setEditTxDescription(tx.description);
    setEditTxNote(tx.note ?? '');
    setEditingTx(tx);
    setExpandedTxId(null);
  }

  function saveEditTx() {
    if (!editingTx) return;
    const amt = parseInt(editTxAmount, 10);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    updateTransaction(editingTx.id, {
      amount: amt,
      description: editTxDescription || editingTx.description,
      note: editTxNote || undefined,
    });
    setEditingTx(null);
  }

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
    setEditName(category!.name);
    setEditProjected(String(category!.projected));
    setEditDescription(category!.description);
    setEditing(true);
  }

  function saveEdit() {
    updateCategory(category!.id, {
      name: editName.trim() || category!.name,
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
              <Text style={s.editLabel}>NAME</Text>
              <TextInput
                style={s.editTextInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Category name"
                placeholderTextColor={colors.t3}
                selectionColor={colors.coral}
              />
            </View>
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
            const groupColor = CATEGORY_GROUP_META[category.group]?.color ?? colors.t3;
            const isExpanded = expandedTxId === tx.id;
            const typeLabel =
              tx.type === 'FUTURE_PENDING' ? 'Upcoming' :
              tx.type === 'FUTURE_PAID' ? 'Committed (Paid)' : 'Actual';

            return (
              <View key={tx.id}>
                <Pressable
                  style={s.txRow}
                  onPress={() => setExpandedTxId(isExpanded ? null : tx.id)}
                >
                  <View style={[s.txDot, { backgroundColor: groupColor }]} />
                  <View style={s.txCenter}>
                    <Text style={s.txDescription} numberOfLines={1}>{tx.description}</Text>
                    <Text style={s.txCategory} numberOfLines={1}>
                      {category.name}{tx.note ? ` \u00B7 ${tx.note}` : ''}
                    </Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={s.txAmount}>{formatKes(tx.amount)}</Text>
                    {tx.type === 'FUTURE_PENDING' && (
                      <View style={[s.txBadge, { backgroundColor: colors.amberDim }]}>
                        <Text style={[s.txBadgeText, { color: colors.amber }]}>Upcoming</Text>
                      </View>
                    )}
                    {tx.type === 'FUTURE_PAID' && (
                      <View style={[s.txBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                        <Text style={[s.txBadgeText, { color: colors.t2 }]}>Paid</Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.txDetailPanel}>
                    <View style={s.txDetailRow}>
                      <Text style={s.txDetailLabel}>Date</Text>
                      <Text style={s.txDetailValue}>
                        {format(new Date(tx.date), 'EEE, d MMM yyyy')}
                      </Text>
                    </View>
                    <View style={s.txDetailRow}>
                      <Text style={s.txDetailLabel}>Amount</Text>
                      <Text selectable style={s.txDetailValue}>{formatKes(tx.amount)}</Text>
                    </View>
                    <View style={s.txDetailRow}>
                      <Text style={s.txDetailLabel}>Type</Text>
                      <Text style={s.txDetailValue}>{typeLabel}</Text>
                    </View>
                    {tx.note ? (
                      <View style={s.txDetailRow}>
                        <Text style={s.txDetailLabel}>Note</Text>
                        <Text style={[s.txDetailValue, { flex: 1, textAlign: 'right' }]} numberOfLines={3}>
                          {tx.note}
                        </Text>
                      </View>
                    ) : null}
                    {tx.rawSms ? (
                      <View style={s.txDetailRow}>
                        <Text style={s.txDetailLabel}>Source</Text>
                        <Text style={s.txDetailValue}>SMS</Text>
                      </View>
                    ) : null}
                    {tx.eventDate ? (
                      <View style={s.txDetailRow}>
                        <Text style={s.txDetailLabel}>Event Date</Text>
                        <Text style={s.txDetailValue}>
                          {format(new Date(tx.eventDate), 'EEE, d MMM yyyy')}
                        </Text>
                      </View>
                    ) : null}

                    {/* Actions */}
                    <View style={s.txActionRow}>
                      <Pressable
                        style={s.txActionBtn}
                        onPress={() => openEditTx(tx)}
                      >
                        <TabIcon name="edit-2" color={colors.coral} size={14} />
                        <Text style={[s.txActionText, { color: colors.coral }]}>Edit</Text>
                      </Pressable>
                      {tx.type === 'FUTURE_PENDING' && (
                        <Pressable
                          style={s.txActionBtn}
                          onPress={() => {
                            markAsPaid(tx.id);
                            setExpandedTxId(null);
                          }}
                        >
                          <TabIcon name="check" color={colors.green} size={14} />
                          <Text style={[s.txActionText, { color: colors.green }]}>Mark Paid</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={s.txActionBtn}
                        onPress={() =>
                          Alert.alert('Delete Transaction', 'Remove this transaction?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                deleteTransaction(tx.id);
                                setExpandedTxId(null);
                              },
                            },
                          ])
                        }
                      >
                        <TabIcon name="trash-2" color={colors.red} size={14} />
                        <Text style={[s.txActionText, { color: colors.red }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                )}
              </View>
            );
          })}
          <Pressable
            style={s.addTxButton}
            onPress={() => router.push({
              pathname: '/transaction-logger',
              params: {
                categoryId: category?.id,
                description: category?.name,
                monthId: monthId ?? category?.monthId,
              },
            })}
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

      {/* Edit Transaction Modal */}
      <Modal visible={editingTx !== null} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditingTx(null)}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Pressable>

          <View style={s.modalSheet}>
            <View style={s.modalHandleRow}>
              <View style={s.modalHandle} />
            </View>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Edit Transaction</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setEditingTx(null)}>
                <Text style={s.modalCloseBtnText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled">
              <View style={s.modalField}>
                <Text style={s.modalLabel}>AMOUNT</Text>
                <View style={s.modalAmountRow}>
                  <Text style={s.modalKes}>KES</Text>
                  <TextInput
                    style={s.modalAmountInput}
                    value={editTxAmount}
                    onChangeText={setEditTxAmount}
                    keyboardType="number-pad"
                    selectionColor={colors.coral}
                  />
                </View>
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>DESCRIPTION</Text>
                <TextInput
                  style={s.modalTextInput}
                  value={editTxDescription}
                  onChangeText={setEditTxDescription}
                  placeholder="Description"
                  placeholderTextColor={colors.t3}
                  selectionColor={colors.coral}
                />
              </View>

              <View style={s.modalField}>
                <Text style={s.modalLabel}>NOTE (OPTIONAL)</Text>
                <TextInput
                  style={s.modalTextInput}
                  value={editTxNote}
                  onChangeText={setEditTxNote}
                  placeholder="Add a memo..."
                  placeholderTextColor={colors.t3}
                  selectionColor={colors.coral}
                />
              </View>

              <Pressable style={s.modalSaveBtn} onPress={saveEditTx}>
                <Text style={s.modalSaveBtnText}>Save Changes</Text>
              </Pressable>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  txCenter: { flex: 1 },
  txDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: c.t1,
  },
  txCategory: {
    fontSize: 12,
    color: c.t3,
    marginTop: 2,
  },
  txRight: { alignItems: 'flex-end' },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: c.t1,
    fontVariant: ['tabular-nums'],
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 4,
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  txDetailPanel: {
    backgroundColor: c.bgRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 10,
  },
  txDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.t3,
  },
  txDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t1,
    fontVariant: ['tabular-nums'],
  },
  txActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  txActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.button,
    borderCurve: 'continuous',
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
  },
  txActionText: {
    fontSize: 12,
    fontWeight: '600',
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

  /* Edit Transaction Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: c.bgSheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.borderMed,
  },
  modalHandleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 100,
    backgroundColor: c.t3,
    opacity: 0.4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: 8,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
  },
  modalCloseBtn: {
    backgroundColor: c.coralDim,
    borderRadius: radii.button,
    borderCurve: 'continuous',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.coral,
  },
  modalContent: {
    paddingHorizontal: spacing.md + 4,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  modalAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
  },
  modalKes: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t3,
    marginRight: 8,
  },
  modalAmountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: c.t1,
    paddingVertical: 12,
    fontVariant: ['tabular-nums'],
  },
  modalTextInput: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
  },
  modalSaveBtn: {
    backgroundColor: c.coral,
    paddingVertical: 15,
    borderRadius: radii.button,
    borderCurve: 'continuous',
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(46, 204, 113, 0.3)',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
