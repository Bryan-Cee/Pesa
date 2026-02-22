import React, { useState, useMemo, useCallback } from 'react';
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
import { useDebtStore } from '../stores/debtStore';
import { Card } from '../components/Card';
import { TabIcon } from '../components/TabIcon';
import { formatKes } from '../utils/formatters';
import {
  calculateDebtProjection,
  simulatePayment,
} from '../utils/debtCalculator';

export function DebtPlanner() {
  const router = useRouter();
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();

  const debts = useDebtStore((s) => s.debts);
  const allPayments = useDebtStore((s) => s.payments);
  const updateDebt = useDebtStore((s) => s.updateDebt);

  const colors = useColors();
  const s = mkStyles(colors);

  const debt = useMemo(
    () =>
      debtId
        ? debts.find((d) => d.id === debtId)
        : debts.find((d) => d.isPrimary) ?? debts[0] ?? null,
    [debts, debtId]
  );

  const [sliderValue, setSliderValue] = useState(debt?.monthlyPayment ?? 0);
  const [editing, setEditing] = useState(false);
  const [editBalance, setEditBalance] = useState('');
  const [editApr, setEditApr] = useState('');
  const [editPayment, setEditPayment] = useState('');

  if (!debt) {
    return (
      <View style={s.screen}>
        <Text style={s.empty}>No debts found.</Text>
      </View>
    );
  }

  const projection = calculateDebtProjection(
    debt.currentBalance,
    debt.apr,
    debt.monthlyPayment,
    debt.originalBalance
  );

  const simulation =
    sliderValue !== debt.monthlyPayment
      ? simulatePayment(
          debt.currentBalance,
          debt.apr,
          debt.monthlyPayment,
          sliderValue,
          debt.originalBalance
        )
      : null;

  const percentPaid =
    ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100;

  const payments = useMemo(
    () =>
      allPayments
        .filter((p) => p.debtId === debt.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allPayments, debt.id]
  );

  const ringColor =
    percentPaid >= 75
      ? colors.green
      : percentPaid >= 40
      ? colors.amber
      : colors.debtRed;

  // Slider steps
  const minPayment = debt.minimumPayment;
  const maxPayment = debt.minimumPayment * 5;
  const sliderSteps = [];
  for (
    let v = minPayment;
    v <= maxPayment;
    v += Math.max(1000, Math.floor(minPayment / 2))
  ) {
    sliderSteps.push(v);
  }

  function startEdit() {
    setEditBalance(String(debt!.currentBalance));
    setEditApr(String(Math.round(debt!.apr * 100)));
    setEditPayment(String(debt!.monthlyPayment));
    setEditing(true);
  }

  function saveEdit() {
    updateDebt(debt!.id, {
      currentBalance: parseInt(editBalance, 10) || debt!.currentBalance,
      apr: (parseInt(editApr, 10) || debt!.apr * 100) / 100,
      monthlyPayment: parseInt(editPayment, 10) || debt!.monthlyPayment,
    });
    setEditing(false);
  }

  function applySimulatedPayment() {
    updateDebt(debt!.id, { monthlyPayment: sliderValue });
    Alert.alert('Updated', `Monthly payment set to ${formatKes(sliderValue)}`);
  }

  // Slider ratio for visual track
  const sliderRatio = Math.max(
    0,
    Math.min(1, (sliderValue - minPayment) / (maxPayment - minPayment))
  );

  const paidSoFar = debt.originalBalance - debt.currentBalance;

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Debt Planner</Text>
          <Pressable onPress={startEdit} style={s.settingsBtn}>
            <TabIcon name="edit-2" color={colors.coral} size={18} />
          </Pressable>
        </View>

        {/* Main Summary Card */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            {/* Ring */}
            <View style={s.ringContainer}>
              <View style={[s.ring, { borderColor: ringColor }]}>
                <Text style={[s.ringPercent, { color: ringColor }]}>
                  {Math.round(percentPaid)}%
                </Text>
                <Text style={s.ringLabel}>paid</Text>
              </View>
            </View>
            {/* Right side info */}
            <View style={s.summaryInfo}>
              <Text style={s.debtEyebrow}>{debt.name.toUpperCase()}</Text>
              <Text style={s.balanceAmount}>
                {debt.currentBalance.toLocaleString('en-US')}
              </Text>
              <Text style={s.balanceSub}>
                KES {debt.monthlyPayment.toLocaleString('en-US')}/mo{' '}
                {'\u00B7'} {Math.round(debt.apr * 100)}% APR
              </Text>
              <View style={s.freeByTag}>
                <Text style={s.freeByText}>
                  Free by {projection.payoffDate}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid 2x2 */}
        <View style={s.statsGrid}>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>TOTAL INTEREST LEFT</Text>
              <Text style={[s.statValue, { color: colors.debtRed }]}>
                {projection.totalInterestRemaining.toLocaleString('en-US')}
              </Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>ORIGINAL BALANCE</Text>
              <Text style={s.statValue}>
                {debt.originalBalance.toLocaleString('en-US')}
              </Text>
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>MONTHS TO FREEDOM</Text>
              <Text style={s.statValue}>
                {projection.monthsToPayoff === Infinity
                  ? '\u221E'
                  : projection.monthsToPayoff}
              </Text>
              {projection.monthsToPayoff !== Infinity && (
                <View style={s.miniProgressTrack}>
                  <View
                    style={[
                      s.miniProgressFill,
                      {
                        width: `${Math.min(
                          100,
                          (percentPaid / 100) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>PAID SO FAR</Text>
              <Text style={[s.statValue, { color: colors.green }]}>
                {paidSoFar.toLocaleString('en-US')}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Card */}
        {editing && (
          <Card style={s.editCard}>
            <Text style={s.editTitle}>Edit Debt</Text>
            <View style={s.editField}>
              <Text style={s.editLabel}>Current Balance (KES)</Text>
              <TextInput
                style={s.editInput}
                value={editBalance}
                onChangeText={setEditBalance}
                keyboardType="number-pad"
                placeholderTextColor={colors.t3}
              />
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>APR (%)</Text>
              <TextInput
                style={s.editInput}
                value={editApr}
                onChangeText={setEditApr}
                keyboardType="number-pad"
                placeholderTextColor={colors.t3}
              />
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>Monthly Payment (KES)</Text>
              <TextInput
                style={s.editInput}
                value={editPayment}
                onChangeText={setEditPayment}
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

        {/* What If I Pay More? */}
        <View style={s.simulatorSection}>
          <Text style={s.sectionLabel}>WHAT IF I PAY MORE?</Text>

          <View style={s.simPaymentRow}>
            <View style={s.simPaymentLeft}>
              <Text style={s.simPaymentLabel}>Monthly payment</Text>
              <Text style={s.simPaymentAmount}>
                {sliderValue.toLocaleString('en-US')}
              </Text>
            </View>
            {simulation && (
              <View style={s.simResultRight}>
                <Text style={s.simArrow}>
                  {'\u2192'}{' '}
                  <Text style={s.simMonthsSaved}>
                    {simulation.monthsSaved} months
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {/* Slider track */}
          <View style={s.sliderContainer}>
            <View style={s.sliderTrack}>
              <View
                style={[
                  s.sliderFill,
                  { width: `${sliderRatio * 100}%` },
                ]}
              />
              <View
                style={[
                  s.sliderThumb,
                  { left: `${sliderRatio * 100}%` },
                ]}
              />
            </View>
            <View style={s.sliderLabels}>
              <Text style={s.sliderLabelText}>
                {formatKes(minPayment, true)}
              </Text>
              <Text style={s.sliderLabelText}>
                {formatKes(maxPayment, true)}
              </Text>
            </View>
          </View>

          {/* Quick amount chips */}
          <View style={s.chipRow}>
            {[minPayment, Math.floor((minPayment + maxPayment) / 2), maxPayment].map(
              (v) => (
                <Pressable
                  key={v}
                  style={[
                    s.chip,
                    sliderValue === v && s.chipActive,
                  ]}
                  onPress={() => setSliderValue(v)}
                >
                  <Text
                    style={[
                      s.chipText,
                      sliderValue === v && s.chipTextActive,
                    ]}
                  >
                    {formatKes(v, true)}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* Custom input */}
          <View style={s.simInputRow}>
            <Text style={s.simInputLabel}>Custom:</Text>
            <TextInput
              style={s.simInput}
              value={String(sliderValue)}
              onChangeText={(v) => setSliderValue(parseInt(v, 10) || 0)}
              keyboardType="number-pad"
              placeholderTextColor={colors.t3}
            />
          </View>

          {/* Apply button */}
          <Pressable
            style={[
              s.applyBtn,
              !simulation && s.applyBtnDisabled,
            ]}
            onPress={applySimulatedPayment}
            disabled={!simulation}
          >
            <Text style={s.applyBtnText}>Apply This Payment</Text>
          </Pressable>
        </View>

        {/* Payoff Timeline */}
        {projection.milestones.length > 0 && (
          <View style={s.timelineSection}>
            <Text style={s.sectionLabel}>PAYOFF TIMELINE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.timelineScroll}
            >
              {projection.milestones.map((m, i) => {
                const pillColor =
                  m.percent <= 25
                    ? colors.green
                    : m.percent <= 50
                    ? colors.amber
                    : colors.coral;
                const isNow =
                  m.percent <= Math.round(percentPaid);
                return (
                  <View
                    key={m.percent}
                    style={[
                      s.timelinePill,
                      { borderLeftColor: pillColor },
                    ]}
                  >
                    <Text
                      style={[s.timelinePillLabel, { color: pillColor }]}
                    >
                      {m.label}
                    </Text>
                    <Text style={s.timelinePillDate}>
                      {isNow ? 'Now' : m.date}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Payment History */}
        <View style={s.historySection}>
          <Text style={[s.sectionLabel, { paddingHorizontal: spacing.md }]}>
            PAYMENT HISTORY
          </Text>
          {payments.length === 0 ? (
            <Text style={s.noPayments}>No payments recorded yet.</Text>
          ) : (
            payments.map((p) => (
              <View key={p.id} style={s.paymentRow}>
                <Text style={s.paymentDate}>
                  {p.date.substring(0, 10)}
                </Text>
                <View style={s.paymentDetails}>
                  <Text style={s.paymentAmount}>
                    {formatKes(p.totalAmount)}
                  </Text>
                  <Text style={s.paymentBreakdown}>
                    Principal: {formatKes(p.principalPaid)} | Interest:{' '}
                    {formatKes(p.interestPaid)}
                  </Text>
                </View>
                <Text style={s.paymentBalance}>
                  {formatKes(p.balanceAfter)}
                </Text>
              </View>
            ))
          )}
          <Pressable
            style={s.logPaymentBtn}
            onPress={() => router.push('/transaction-logger')}
          >
            <Text style={s.logPaymentText}>Log Payment</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  empty: {
    padding: spacing.xl,
    textAlign: 'center',
    color: c.t2,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: c.t1,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 18,
    color: c.t2,
  },

  /* Main summary card */
  summaryCard: {
    marginHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(249,112,72,0.12)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringContainer: {
    marginRight: 16,
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 20,
    fontWeight: '700',
  },
  ringLabel: {
    fontSize: 11,
    color: c.t3,
    marginTop: -2,
  },
  summaryInfo: {
    flex: 1,
  },
  debtEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: c.t3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: c.debtRed,
    marginBottom: 4,
  },
  balanceSub: {
    fontSize: 12,
    color: c.t3,
    marginBottom: 8,
  },
  freeByTag: {
    alignSelf: 'flex-start',
    backgroundColor: c.greenDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  freeByText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.green,
  },

  /* Stats grid */
  statsGrid: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.sm,
    padding: 12,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: c.t3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
  },
  miniProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 100,
    marginTop: 8,
  },
  miniProgressFill: {
    height: 3,
    borderRadius: 100,
    backgroundColor: c.coral,
  },

  /* Edit card */
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
  editField: { marginBottom: 12 },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t2,
    marginBottom: 4,
  },
  editInput: {
    fontSize: 16,
    fontWeight: '700',
    color: c.t1,
    borderBottomWidth: 1,
    borderBottomColor: c.borderFocus,
    paddingVertical: 4,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelText: {
    fontSize: 15,
    color: c.t2,
    fontWeight: '600',
    padding: 8,
  },
  saveBtn: {
    backgroundColor: c.coral,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  saveBtnText: { color: c.t1, fontWeight: '700', fontSize: 15 },

  /* Simulator */
  simulatorSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.t3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  simPaymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  simPaymentLeft: {
    flex: 1,
  },
  simPaymentLabel: {
    fontSize: 12,
    color: c.t3,
    marginBottom: 4,
  },
  simPaymentAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: c.t1,
  },
  simResultRight: {
    alignItems: 'flex-end',
  },
  simArrow: {
    fontSize: 14,
    color: c.t3,
  },
  simMonthsSaved: {
    fontSize: 14,
    fontWeight: '700',
    color: c.green,
  },

  /* Slider */
  sliderContainer: {
    marginBottom: 12,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 100,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: 6,
    borderRadius: 100,
    backgroundColor: c.coral,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.coral,
    borderWidth: 3,
    borderColor: c.bgCard,
    top: -6,
    marginLeft: -9,
    shadowColor: c.coral,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 10,
    color: c.t3,
  },

  /* Chips */
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: c.coralDim,
    borderColor: 'rgba(46,204,113,0.35)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t2,
  },
  chipTextActive: {
    color: c.coral,
  },

  /* Custom input */
  simInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  simInputLabel: {
    fontSize: 13,
    color: c.t3,
    marginRight: 8,
  },
  simInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: c.t1,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
  },

  /* Apply */
  applyBtn: {
    backgroundColor: c.coral,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyBtnText: {
    color: c.t1,
    fontWeight: '700',
    fontSize: 15,
  },

  /* Timeline */
  timelineSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  timelineScroll: {
    gap: 10,
  },
  timelinePill: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  timelinePillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelinePillDate: {
    fontSize: 11,
    color: c.t3,
    marginTop: 2,
  },

  /* History */
  historySection: {
    marginTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  noPayments: {
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: c.t2,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  paymentDate: { fontSize: 12, color: c.t3, width: 80 },
  paymentDetails: { flex: 1 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: c.t1 },
  paymentBreakdown: { fontSize: 11, color: c.t3, marginTop: 2 },
  paymentBalance: { fontSize: 13, fontWeight: '600', color: c.t2 },
  logPaymentBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  logPaymentText: { fontSize: 15, fontWeight: '600', color: c.coral },
});
