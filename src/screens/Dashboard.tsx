import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useColors } from "../hooks/useTheme";
import { ThemeColors } from "../theme/colors";
import { spacing, radii } from "../theme/spacing";
import { useBudgetStore } from "../stores/budgetStore";
import { useTransactionStore } from "../stores/transactionStore";
import { useDebtStore } from "../stores/debtStore";
import { useGoalStore } from "../stores/goalStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useReminderStore } from "../stores/reminderStore";
import { ProgressBar } from "../components/ProgressBar";
import { StatChip } from "../components/StatChip";
import { FAB } from "../components/FAB";
import { EmptyState } from "../components/EmptyState";
import {
  formatKes,
  daysRemainingInMonth,
  formatDateRelative,
} from "../utils/formatters";
import { calculateDebtProjection } from "../utils/debtCalculator";
import { TabIcon } from "../components/TabIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Dashboard() {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const insets = useSafeAreaInsets();

  const months = useBudgetStore((s) => s.months);
  const allCategories = useBudgetStore((s) => s.categories);
  const transactions = useTransactionStore((s) => s.transactions);
  const debts = useDebtStore((s) => s.debts);
  const goals = useGoalStore((s) => s.goals);
  const income = useSettingsStore((s) => s.settings.incomeAssumption);
  const activeReminderCount = useReminderStore(
    (s) => s.reminders.filter((r) => r.status === 'ACTIVE').length
  );

  const currentMonth = useMemo(() => {
    const now = new Date();
    const current = months.find(
      (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1,
    );
    if (current) return current;
    const sorted = [...months].sort(
      (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
    );
    return sorted[0] ?? null;
  }, [months]);

  const pastMonths = useMemo(() => {
    const now = new Date();
    const currentKey = now.getFullYear() * 12 + now.getMonth() + 1;
    return months
      .filter((m) => m.year * 12 + m.month < currentKey)
      .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));
  }, [months]);

  const categories = useMemo(
    () =>
      currentMonth
        ? allCategories.filter((c) => c.monthId === currentMonth.id)
        : [],
    [allCategories, currentMonth],
  );

  const getActual = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === "ACTUAL" || tx.type === "FUTURE_PAID") {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      }
    }
    return (catId: string) => map[catId] || 0;
  }, [transactions]);

  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return transactions
      .filter(
        (t) =>
          t.type === "FUTURE_PENDING" &&
          new Date(t.date) >= now &&
          new Date(t.date) <= cutoff,
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);


  const activeDebts = useMemo(
    () => debts.filter((d) => d.currentBalance > 0),
    [debts],
  );

  const debtAggregates = useMemo(() => {
    if (activeDebts.length === 0) return null;
    const totalDebt = activeDebts.reduce((s, d) => s + d.currentBalance, 0);
    const totalMonthly = activeDebts.reduce((s, d) => s + d.monthlyPayment, 0);
    const projections = activeDebts.map((d) =>
      calculateDebtProjection(d.currentBalance, d.apr, d.monthlyPayment, d.originalBalance)
    );
    const payoffDates = projections
      .map((p) => p.payoffDate)
      .filter((d) => d !== 'Never');
    const earliestPayoff = payoffDates.length > 0 ? payoffDates[0] : 'Never';
    return { totalDebt, totalMonthly, earliestPayoff, projections };
  }, [activeDebts]);

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.isArchived),
    [goals],
  );

  if (!currentMonth) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <EmptyState
          title="Let's set up your first budget"
          subtitle="Create your first monthly budget to start tracking"
          actionLabel="Get Started"
          onAction={() => router.push("/budget-setup")}
        />
      </View>
    );
  }

  const totalProjected = categories.reduce((s, c) => s + c.projected, 0);
  const totalActual = categories.reduce((s, c) => s + getActual(c.id), 0);
  const progress = totalProjected > 0 ? totalActual / totalProjected : 0;
  const percentUsed = Math.round(progress * 100);
  const remaining = totalProjected - totalActual;
  const monthName = currentMonth.label.split(" ")[0].toUpperCase();
  const yearStr = currentMonth.label.split(" ")[1] || "";

  const savingsCategories = categories.filter(
    (c) => c.group === "SAVINGS" || c.group === "INVESTMENT",
  );
  const savingsActual = savingsCategories.reduce(
    (s, c) => s + getActual(c.id),
    0,
  );
  const savingsRate =
    income > 0 ? Math.round((savingsActual / income) * 100) : 0;

  let topOverspend = "";
  let maxOverspend = 0;
  for (const cat of categories) {
    const actual = getActual(cat.id);
    const over = actual - cat.projected;
    if (over > maxOverspend) {
      maxOverspend = over;
      topOverspend = cat.name;
    }
  }


  const totalActualFormatted = totalActual.toLocaleString("en-US");

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ── Header ── */}
        <View
          style={[s.header, { paddingTop: insets.top + 10 }]}
        >
          <View>
            <Text style={s.headerEyebrow}>GOOD MORNING</Text>
            <Text style={s.headerTitle}>
              {currentMonth.label.split(" ")[0]}{" "}
              <Text style={{ color: colors.coral }}>{yearStr}</Text>
            </Text>
          </View>
          <View style={s.headerIcons}>
            <Link href="/reminders" asChild>
              <Pressable style={s.iconBtn}>
                <TabIcon name="bell" color={colors.t2} size={22} />
                {activeReminderCount > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{activeReminderCount}</Text>
                  </View>
                )}
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable style={s.iconBtn}>
                <TabIcon name="settings" color={colors.t2} size={22} />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* ── Hero Card ── */}
        <Link href="/(tabs)/budget" asChild>
          <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}>
            <View style={s.heroCard}>
              {/* Warm glow top-right */}
              <View style={s.glowWarm} />
              {/* Cool glow bottom-left */}
              <View style={s.glowCool} />
              {/* Eyebrow */}
              <View style={s.heroEyebrowRow}>
                <Text style={s.heroEyebrow}>{monthName} BUDGET</Text>
                <View style={s.heroUsedPill}>
                  <Text style={s.heroUsedPillText}>{percentUsed}% used</Text>
                </View>
              </View>

              {/* Main amount */}
              <View style={s.heroAmountRow}>
                <View>
                  <Text style={s.heroAmountLabel}>Total Spent</Text>
                  <View style={s.heroAmountValueRow}>
                    <Text style={s.heroKes}>KES </Text>
                    <Text selectable style={s.heroAmount}>
                      {totalActualFormatted}
                    </Text>
                  </View>
                </View>
                <View style={s.heroRight}>
                  <Text style={s.heroRightLabel}>PROJECTED</Text>
                  <Text selectable style={s.heroBudgetAmount}>
                    {totalProjected.toLocaleString("en-US")}
                  </Text>
                </View>
              </View>

              {/* Progress */}
              <View style={s.heroProgressWrap}>
                <ProgressBar
                  progress={progress}
                  color={progress > 0.9 ? colors.red : progress > 0.75 ? colors.amber : undefined}
                />
              </View>
              <View style={s.heroMeta}>
                <Text style={s.heroMetaLeft}>
                  {percentUsed}% of budget used
                </Text>
                <Text selectable style={s.heroMetaRight}>
                  KES {Math.abs(remaining).toLocaleString("en-US")}{" "}
                  {remaining >= 0 ? "left" : "over"}
                </Text>
              </View>

              {/* Stats */}
              <View style={s.statsRow}>
                <StatChip
                  label="Savings Rate"
                  value={`${savingsRate}%`}
                  color={colors.green}
                />
                <StatChip
                  label="Days Left"
                  value={String(daysRemainingInMonth())}
                  color={colors.amber}
                />
                <StatChip
                  label="Top Spend"
                  value={topOverspend || "None"}
                  color={colors.coral}
                />
              </View>
            </View>
          </Pressable>
        </Link>

        {/* ── Upcoming Payments ── */}
        {upcomingPayments.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>UPCOMING {"\u00B7"} 7 DAYS</Text>
              <Link href="/reminders" asChild>
                <Pressable>
                  <Text style={s.sectionLink}>See all</Text>
                </Pressable>
              </Link>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalScroll}
            >
              {upcomingPayments.map((tx, i) => {
                const stripeColors = [
                  colors.purple,
                  colors.amber,
                  colors.coral,
                ];
                const stripe = stripeColors[i % stripeColors.length];
                return (
                  <Link
                    key={tx.id}
                    href={{ pathname: '/category-detail', params: { categoryId: tx.categoryId } }}
                    asChild
                  >
                    <Pressable style={s.upcomingCard}>
                      <View
                        style={[s.upcomingStripe, { backgroundColor: stripe }]}
                      />
                      <View
                        style={[
                          s.upcomingIcon,
                          { backgroundColor: stripe + "18" },
                        ]}
                      >
                        <Text style={[s.upcomingIconText, { color: stripe }]}>
                          {tx.description.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={s.upcomingName} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={s.upcomingAmt}>
                        {tx.amount.toLocaleString("en-US")}
                      </Text>
                      <View style={s.upcomingFooter}>
                        <Text style={s.upcomingDate}>
                          {formatDateRelative(tx.date)}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Debt Tracker ── */}
        {activeDebts.length > 0 && debtAggregates && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>DEBT TRACKER</Text>
              <Link href="/plan" asChild>
                <Pressable>
                  <Text style={s.sectionLink}>Details</Text>
                </Pressable>
              </Link>
            </View>

            {/* Aggregate stats */}
            <View style={s.debtStatsRow}>
              <View style={s.debtStatBox}>
                <Text style={s.debtStatLabel}>TOTAL DEBT</Text>
                <Text style={[s.debtStatValue, { color: colors.debtRed }]}>
                  {formatKes(debtAggregates.totalDebt)}
                </Text>
              </View>
              <View style={s.debtStatBox}>
                <Text style={s.debtStatLabel}>MONTHLY</Text>
                <Text style={s.debtStatValue}>
                  {formatKes(debtAggregates.totalMonthly)}
                </Text>
              </View>
              <View style={s.debtStatBox}>
                <Text style={s.debtStatLabel}>DEBT FREE</Text>
                <Text style={[s.debtStatValue, { color: colors.green, fontSize: 13 }]}>
                  {debtAggregates.earliestPayoff}
                </Text>
              </View>
            </View>

            {/* Horizontal debt cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.debtScroll}
            >
              {activeDebts.map((debt, i) => {
                const progress =
                  debt.originalBalance > 0
                    ? (debt.originalBalance - debt.currentBalance) / debt.originalBalance
                    : 0;
                const projection = debtAggregates.projections[i];
                return (
                  <Link
                    key={debt.id}
                    href={{
                      pathname: "/debt-planner",
                      params: { debtId: debt.id },
                    }}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
                    >
                      <View
                        style={[
                          s.debtMiniCard,
                          i === 0 && { marginLeft: spacing.md },
                          debt.isPrimary && s.debtMiniPrimary,
                        ]}
                      >
                        <View style={s.debtMiniStripe} />
                        <View style={s.debtMiniContent}>
                          <Text style={s.debtMiniName}>
                            {debt.name.toUpperCase()}
                          </Text>
                          <Text selectable style={s.debtMiniBalance}>
                            {formatKes(debt.currentBalance)}
                          </Text>
                          <View style={{ marginVertical: 8 }}>
                            <ProgressBar
                              progress={progress}
                              height={4}
                              color={colors.debtRed}
                            />
                          </View>
                          <View style={s.debtMiniBottom}>
                            <View style={s.debtMiniApr}>
                              <Text style={s.debtMiniAprText}>
                                {Math.round(debt.apr * 100)}% APR
                              </Text>
                            </View>
                            <Text style={s.debtMiniPayoff}>
                              {projection.payoffDate === "Never"
                                ? "Never"
                                : `Free ${projection.payoffDate}`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
              <View style={{ width: spacing.md }} />
            </ScrollView>
          </View>
        )}

        {/* ── Past Months ── */}
        {pastMonths.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>PAST MONTHS</Text>
              <Text style={s.sectionLink}>All</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalScroll}
            >
              {pastMonths.map((m) => {
                const cats = allCategories.filter((c) => c.monthId === m.id);
                const proj = cats.reduce((s, c) => s + c.projected, 0);
                const act = cats.reduce((s, c) => s + getActual(c.id), 0);
                const net = proj - act;
                const isSurplus = net >= 0;
                return (
                  <Link
                    key={m.id}
                    href={{
                      pathname: "/(tabs)/budget",
                      params: { monthId: m.id },
                    }}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
                    >
                      <View
                        style={[
                          s.pastCard,
                          {
                            borderColor: isSurplus
                              ? "rgba(52,211,153,0.18)"
                              : "rgba(249,112,72,0.18)",
                          },
                        ]}
                      >
                        <Text style={s.pastLabel}>{m.label}</Text>
                        {/* Mini sparkline placeholder */}
                        <View style={s.pastSparkline}>
                          <View
                            style={[
                              s.pastSparklineBar,
                              {
                                backgroundColor: isSurplus
                                  ? colors.green
                                  : colors.red,
                                opacity: 0.5,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            s.pastNet,
                            { color: isSurplus ? colors.green : colors.red },
                          ]}
                        >
                          {isSurplus ? "+" : "-"}
                          {Math.abs(net).toLocaleString("en-US")}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Goals Strip ── */}
        {activeGoals.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>SAVINGS GOALS</Text>
              <Text style={s.sectionLink}>All</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalScroll}
            >
              {activeGoals.map((goal) => {
                const prog =
                  goal.targetAmount > 0
                    ? goal.currentBalance / goal.targetAmount
                    : 0;
                return (
                  <Link
                    key={goal.id}
                    href={{
                      pathname: "/goal-detail",
                      params: { goalId: goal.id },
                    }}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
                    >
                      <View style={s.goalCard}>
                        <Text style={s.goalEmoji}>{goal.emoji}</Text>
                        <Text style={s.goalName} numberOfLines={1}>
                          {goal.name}
                        </Text>
                        <View style={{ marginVertical: 8 }}>
                          <ProgressBar progress={prog} />
                        </View>
                        <Text style={s.goalMeta}>
                          {goal.currentBalance.toLocaleString("en-US")} of{" "}
                          {goal.targetAmount.toLocaleString("en-US")}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

    </View>
  );
}

const mkStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    scrollContent: {},

    /* Header */
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 22,
      marginBottom: 20,
      paddingTop: 10,
    },
    headerEyebrow: {
      fontSize: 11,
      fontWeight: "500",
      color: c.t3,
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: c.t1,
      letterSpacing: -0.8,
    },
    headerIcons: {
      flexDirection: "row",
      gap: 8,
    },
    iconBtn: {
      width: 38,
      height: 38,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderCurve: "continuous",
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.coral,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.buttonText,
      fontVariant: ['tabular-nums'],
    },
    iconBtnText: {
      fontSize: 16,
    },

    /* Hero Card */
    heroCard: {
      marginHorizontal: spacing.md,
      marginBottom: 20,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.borderMed,
      borderRadius: radii.xl,
      padding: 22,
      overflow: "hidden",
      borderCurve: "continuous",
    },
    glowWarm: {
      position: "absolute",
      top: -80,
      right: -80,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: c.coralDim,
    },
    glowCool: {
      position: "absolute",
      bottom: -60,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: c.subtle,
    },
    heroEyebrowRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.9,
      color: c.t3,
    },
    heroUsedPill: {
      backgroundColor: c.coralDim,
      borderRadius: radii.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderCurve: "continuous",
    },
    heroUsedPillText: {
      fontSize: 10,
      fontWeight: "600",
      color: c.coral,
    },
    heroAmountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 20,
    },
    heroAmountLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: c.t3,
      marginBottom: 4,
    },
    heroAmountValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    heroKes: {
      fontSize: 18,
      fontWeight: "500",
      color: c.t2,
    },
    heroAmount: {
      fontSize: 44,
      fontWeight: "700",
      color: c.t1,
      letterSpacing: -2,
      fontVariant: ["tabular-nums"],
    },
    heroRight: {
      alignItems: "flex-end",
      justifyContent: "flex-end",
      paddingBottom: 6,
    },
    heroRightLabel: {
      fontSize: 9.5,
      fontWeight: "500",
      color: c.t3,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    heroBudgetAmount: {
      fontSize: 20,
      fontWeight: "600",
      color: c.t2,
      letterSpacing: -0.6,
      fontVariant: ["tabular-nums"],
    },
    heroProgressWrap: {
      marginBottom: 10,
    },
    heroMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    heroMetaLeft: {
      fontSize: 12,
      fontWeight: "600",
      color: c.coral,
      fontVariant: ["tabular-nums"],
    },
    heroMetaRight: {
      fontSize: 12,
      fontWeight: "400",
      color: c.t3,
      fontVariant: ["tabular-nums"],
    },
    statsRow: {
      flexDirection: "row",
      gap: 7,
    },

    /* Section shared */
    section: {
      marginBottom: 10,
    },
    sectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 22,
      marginBottom: 10,
      marginTop: 20,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: c.t3,
      letterSpacing: 0.8,
    },
    sectionLink: {
      fontSize: 12,
      fontWeight: "500",
      color: c.coral,
      opacity: 0.75,
    },
    horizontalScroll: {
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
      gap: 10,
    },

    /* Upcoming */
    upcomingCard: {
      width: 152,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: 13,
      overflow: "hidden",
      borderCurve: "continuous",
    },
    upcomingStripe: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 2.5,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
    },
    upcomingIcon: {
      width: 30,
      height: 30,
      borderRadius: radii.xs,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      borderCurve: "continuous",
    },
    upcomingIconText: {
      fontSize: 14,
      fontWeight: "700",
    },
    upcomingName: {
      fontSize: 12,
      fontWeight: "600",
      color: c.t1,
      marginBottom: 2,
    },
    upcomingAmt: {
      fontSize: 15,
      fontWeight: "700",
      color: c.t1,
      letterSpacing: -0.4,
      marginBottom: 8,
      fontVariant: ["tabular-nums"],
    },
    upcomingFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    upcomingDate: {
      fontSize: 9.5,
      color: c.t3,
    },
    upcomingBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    upcomingBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.4,
    },

    /* Debt — aggregate stats */
    debtStatsRow: {
      flexDirection: "row",
      gap: 8,
      marginHorizontal: spacing.md,
      marginBottom: 12,
    },
    debtStatBox: {
      flex: 1,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.sm,
      borderCurve: "continuous",
      padding: 12,
      alignItems: "center",
    },
    debtStatLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: c.t3,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    debtStatValue: {
      fontSize: 16,
      fontWeight: "700",
      color: c.t1,
      fontVariant: ["tabular-nums"],
    },

    /* Debt — mini cards */
    debtScroll: {
      marginBottom: 4,
    },
    debtMiniCard: {
      width: 200,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      borderCurve: "continuous",
      overflow: "hidden",
      marginLeft: 8,
    },
    debtMiniPrimary: {
      borderColor: "rgba(249,112,72,0.25)",
      borderWidth: 1.5,
    },
    debtMiniStripe: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: c.debtRed,
    },
    debtMiniContent: {
      padding: 14,
      paddingLeft: 14 + 3,
    },
    debtMiniName: {
      fontSize: 11,
      fontWeight: "600",
      color: c.t3,
      textTransform: "uppercase",
      letterSpacing: 0.7,
      marginBottom: 4,
    },
    debtMiniBalance: {
      fontSize: 20,
      fontWeight: "700",
      color: c.debtRed,
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"],
    },
    debtMiniBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    debtMiniApr: {
      backgroundColor: c.debtRedDim,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderCurve: "continuous",
    },
    debtMiniAprText: {
      fontSize: 10,
      fontWeight: "700",
      color: c.debtRed,
    },
    debtMiniPayoff: {
      fontSize: 10,
      fontWeight: "500",
      color: c.t3,
    },

    /* Past Months */
    pastCard: {
      width: 148,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: 14,
      borderCurve: "continuous",
    },
    pastLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.t2,
      letterSpacing: -0.2,
      marginBottom: 8,
    },
    pastSparkline: {
      height: 26,
      marginBottom: 8,
      justifyContent: "flex-end",
    },
    pastSparklineBar: {
      height: 12,
      borderRadius: 2,
      width: "60%",
    },
    pastNet: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: -0.4,
      fontVariant: ["tabular-nums"],
    },

    /* Goals */
    goalCard: {
      width: 148,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: 14,
      borderCurve: "continuous",
    },
    goalEmoji: {
      fontSize: 22,
      marginBottom: 8,
    },
    goalName: {
      fontSize: 12.5,
      fontWeight: "600",
      color: c.t1,
    },
    goalMeta: {
      fontSize: 12,
      fontWeight: "400",
      color: c.t3,
      fontVariant: ["tabular-nums"],
    },

  });
