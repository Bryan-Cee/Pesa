import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useDebtStore } from '../stores/debtStore';
import { useGoalStore } from '../stores/goalStore';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes } from '../utils/formatters';
import { CATEGORY_GROUP_META } from '../utils/constants';
import { TabIcon } from '../components/TabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Insights() {
  const colors = useColors();
  const s = mkStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const months = useBudgetStore((st) => st.months);
  const allCategories = useBudgetStore((st) => st.categories);
  const transactions = useTransactionStore((st) => st.transactions);
  const debts = useDebtStore((st) => st.debts);
  const goals = useGoalStore((st) => st.goals);

  const sortedMonths = useMemo(
    () => [...months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)),
    [months]
  );

  const currentMonth = useMemo(() => {
    const now = new Date();
    return months.find(
      (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
    ) ?? sortedMonths[sortedMonths.length - 1] ?? null;
  }, [months, sortedMonths]);

  const initialIndex = sortedMonths.findIndex((m) => m.id === currentMonth?.id);
  const [monthIndex, setMonthIndex] = useState(
    initialIndex >= 0 ? initialIndex : sortedMonths.length - 1
  );

  const selectedMonth = sortedMonths[monthIndex];
  const categories = useMemo(
    () => selectedMonth ? allCategories.filter((c) => c.monthId === selectedMonth.id) : [],
    [allCategories, selectedMonth]
  );

  const getActualForCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'ACTUAL' || tx.type === 'FUTURE_PAID') {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      }
    }
    return (catId: string) => map[catId] || 0;
  }, [transactions]);

  const getCategoriesForMonth = useMemo(() => {
    return (monthId: string) => allCategories.filter((c) => c.monthId === monthId);
  }, [allCategories]);

  // Budget vs Actual data
  const chartData = useMemo(() => {
    return categories
      .filter((c) => c.projected > 0 || getActualForCategory(c.id) > 0)
      .sort((a, b) => b.projected - a.projected)
      .slice(0, 6)
      .map((c) => ({
        name: c.name,
        group: c.group,
        projected: c.projected,
        actual: getActualForCategory(c.id),
      }));
  }, [categories, getActualForCategory]);

  const maxBarValue = useMemo(
    () => Math.max(...chartData.map((d) => Math.max(d.projected, d.actual)), 1),
    [chartData]
  );

  // Group breakdown
  const groupBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const cat of categories) {
      const actual = getActualForCategory(cat.id);
      if (actual > 0) {
        groups[cat.group] = (groups[cat.group] || 0) + actual;
      }
    }
    const total = Object.values(groups).reduce((sum, v) => sum + v, 0);
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([group, amount]) => ({
        group,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  }, [categories, getActualForCategory]);

  // Monthly trend
  const trendData = useMemo(() => {
    return sortedMonths.slice(-6).map((m) => {
      const cats = getCategoriesForMonth(m.id);
      const proj = cats.reduce((sum, c) => sum + c.projected, 0);
      const act = cats.reduce((sum, c) => sum + getActualForCategory(c.id), 0);
      return { label: m.label.split(' ')[0].substring(0, 3), projected: proj, actual: act };
    });
  }, [sortedMonths, getCategoriesForMonth, getActualForCategory]);

  const trendMax = useMemo(
    () => Math.max(...trendData.map((d) => Math.max(d.projected, d.actual)), 1),
    [trendData]
  );

  if (!selectedMonth) {
    return (
      <View style={s.screen}>
        <View style={[s.header, { paddingTop: insets.top }]}>
          <Text style={s.title}>Insights</Text>
        </View>
        <Text style={s.empty}>No data yet</Text>
      </View>
    );
  }

  const monthShort = selectedMonth.label.split(' ')[0].substring(0, 3);
  const yearStr = selectedMonth.label.split(' ')[1] || '';

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Text style={s.title}>Insights</Text>
        {/* Month selector pill */}
        <View style={s.monthPill}>
          <Pressable
            onPress={() => setMonthIndex((i) => Math.max(0, i - 1))}
            style={s.monthArrow}
          >
            <Text style={[s.monthArrowText, monthIndex === 0 && { opacity: 0.3 }]}>
              {'\u2039'}
            </Text>
          </Pressable>
          <Text style={s.monthPillText}>{monthShort} {yearStr}</Text>
          <Pressable
            onPress={() => setMonthIndex((i) => Math.min(sortedMonths.length - 1, i + 1))}
            style={s.monthArrow}
          >
            <Text
              style={[
                s.monthArrowText,
                monthIndex >= sortedMonths.length - 1 && { opacity: 0.3 },
              ]}
            >
              {'\u203A'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {/* Budget vs Actual */}
        <View style={s.chartSection}>
          <Text style={s.chartLabel}>BUDGET VS ACTUAL</Text>
          <View style={s.chartCard}>
            {chartData.length > 0 ? (
              <>
                {chartData.map((d) => {
                  const meta = CATEGORY_GROUP_META[d.group as keyof typeof CATEGORY_GROUP_META];
                  const barWidth = (d.actual / maxBarValue) * 100;
                  const projWidth = (d.projected / maxBarValue) * 100;
                  const variance = d.projected - d.actual;
                  const isOver = variance < 0;
                  return (
                    <View key={d.name} style={s.barRow}>
                      <Text style={s.barName} numberOfLines={1}>{d.name}</Text>
                      <View style={s.barTrack}>
                        {/* Projected ghost */}
                        <View style={[s.barGhost, { width: `${Math.min(projWidth, 100)}%` }]} />
                        {/* Actual fill */}
                        <View style={[s.barFillWrap, { width: `${Math.min(barWidth, 100)}%` }]}>
                          <LinearGradient
                            colors={isOver
                              ? [colors.red, colors.red + 'AA']
                              : [colors.green, colors.green + 'AA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.barFill}
                          />
                        </View>
                      </View>
                      <View style={s.barValueWrap}>
                        {isOver ? (
                          <Text style={[s.barVariance, { color: colors.red }]}>
                            {'\u2191'} {formatKes(Math.abs(variance), true)}
                          </Text>
                        ) : (
                          <Text style={s.barValue}>{formatKes(d.actual, true)}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                {/* Legend */}
                <View style={s.legend}>
                  <View style={s.legendItem}>
                    <View style={[s.legendDash, { backgroundColor: colors.t3 }]} />
                    <Text style={s.legendText}>Projected</Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={[s.legendDash, { backgroundColor: colors.coral }]} />
                    <Text style={s.legendText}>Actual</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <TabIcon name="bar-chart-2" color={colors.t3} size={24} />
                </View>
                <Text style={s.emptyText}>Log a few transactions to unlock this insight</Text>
                <Pressable style={s.emptyBtn} onPress={() => router.push('/transaction-logger')}>
                  <Text style={s.emptyBtnText}>Log Transaction</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* 6-Month Trend */}
        <View style={s.chartSection}>
          <Text style={s.chartLabel}>6-MONTH TREND</Text>
          <View style={s.chartCard}>
            {trendData.some((d) => d.actual > 0) ? (
              <View style={s.trendChart}>
                {/* Simple bar representation of trend */}
                <View style={s.trendBars}>
                  {trendData.map((d, i) => {
                    const h = (d.actual / trendMax) * 80;
                    return (
                      <View key={i} style={s.trendBarCol}>
                        <View style={s.trendBarWrap}>
                          <View
                            style={[
                              s.trendBar,
                              { height: Math.max(h, 2), backgroundColor: colors.coral },
                            ]}
                          />
                        </View>
                        <Text style={s.trendBarLabel}>{d.label}</Text>
                      </View>
                    );
                  })}
                </View>
                {/* Dashed projected line representation */}
                <View style={s.trendLine}>
                  {trendData.map((d, i) => {
                    const pos = (d.projected / trendMax) * 80;
                    return (
                      <View
                        key={i}
                        style={[
                          s.trendDot,
                          { bottom: pos },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <TabIcon name="trending-up" color={colors.t3} size={24} />
                </View>
                <Text style={s.emptyText}>Track spending over multiple months to see trends</Text>
                <Pressable style={s.emptyBtn} onPress={() => router.push('/transaction-logger')}>
                  <Text style={s.emptyBtnText}>Log Transaction</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Spending Breakdown */}
        <View style={s.chartSection}>
          <Text style={s.chartLabel}>SPENDING BREAKDOWN</Text>
          <View style={s.chartCard}>
            {groupBreakdown.length > 0 ? (
              <View style={s.breakdownRow}>
                {/* Simple donut representation */}
                <View style={s.donutWrap}>
                  <View style={s.donut}>
                    {groupBreakdown.slice(0, 4).map((g, i) => {
                      const meta = CATEGORY_GROUP_META[g.group as keyof typeof CATEGORY_GROUP_META];
                      const size = 16 + g.percent * 0.5;
                      return (
                        <View
                          key={g.group}
                          style={[
                            s.donutSegment,
                            {
                              backgroundColor: meta?.color,
                              width: size,
                              height: size,
                              borderRadius: size / 2,
                              position: 'absolute',
                              top: 28 + i * 18,
                              left: 28 + (i % 2) * 30,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
                {/* Legend */}
                <View style={s.breakdownLegend}>
                  {groupBreakdown.map((g) => {
                    const meta = CATEGORY_GROUP_META[g.group as keyof typeof CATEGORY_GROUP_META];
                    return (
                      <View key={g.group} style={s.breakdownItem}>
                        <View style={[s.breakdownDot, { backgroundColor: meta?.color }]} />
                        <Text style={s.breakdownName}>{meta?.label ?? g.group}</Text>
                        <Text style={s.breakdownAmount}>{formatKes(g.amount, true)}</Text>
                        <Text style={s.breakdownPct}>{g.percent}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <TabIcon name="pie-chart" color={colors.t3} size={24} />
                </View>
                <Text style={s.emptyText}>Log a few transactions to see where your money goes</Text>
                <Pressable style={s.emptyBtn} onPress={() => router.push('/transaction-logger')}>
                  <Text style={s.emptyBtnText}>Log Transaction</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.6,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.xs,
    borderCurve: 'continuous',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  monthArrow: { paddingHorizontal: 8 },
  monthArrowText: { fontSize: 18, color: c.t2, fontWeight: '300' },
  monthPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t1,
    letterSpacing: -0.2,
  },
  empty: { padding: spacing.xl, textAlign: 'center', color: c.t3 },

  /* Chart sections */
  chartSection: {
    marginBottom: 20,
    paddingHorizontal: spacing.md,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.t3,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    padding: 16,
  },

  /* Bar chart */
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barName: {
    width: 90,
    fontSize: 12,
    fontWeight: '500',
    color: c.t2,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: c.subtle,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    marginHorizontal: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  barGhost: {
    position: 'absolute',
    height: '100%',
    backgroundColor: c.subtleMed,
    borderRadius: radii.pill,
  },
  barFillWrap: {
    height: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barFill: {
    flex: 1,
    borderRadius: radii.pill,
  },
  barValueWrap: { width: 55, alignItems: 'flex-end' },
  barValue: { fontSize: 11, fontWeight: '600', color: c.t2, fontVariant: ['tabular-nums'] as const },
  barVariance: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] as const },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDash: { width: 16, height: 2, borderRadius: 1 },
  legendText: { fontSize: 10, color: c.t3, fontWeight: '500' },

  /* Trend chart */
  trendChart: {
    height: 120,
    position: 'relative',
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 8,
  },
  trendBarCol: { alignItems: 'center', flex: 1 },
  trendBarWrap: { height: 80, justifyContent: 'flex-end' },
  trendBar: { width: 18, borderRadius: 4 },
  trendBarLabel: { fontSize: 10, color: c.t3, marginTop: 6, fontWeight: '500' },
  trendLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 20,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: c.red,
    position: 'absolute',
  },

  /* Breakdown */
  breakdownRow: { flexDirection: 'row', alignItems: 'center' },
  donutWrap: { width: 120, height: 120, marginRight: 16 },
  donut: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: c.debtRed,
    position: 'relative',
    overflow: 'hidden',
  },
  donutSegment: {},
  breakdownLegend: { flex: 1 },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  breakdownName: { flex: 1, fontSize: 12, color: c.t2, fontWeight: '500' },
  breakdownAmount: { fontSize: 11, color: c.t3, fontWeight: '500', marginRight: 6, fontVariant: ['tabular-nums'] as const },
  breakdownPct: { fontSize: 13, fontWeight: '700', color: c.t1, fontVariant: ['tabular-nums'] as const },

  /* Empty state */
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderCurve: 'continuous',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.t3,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyBtn: {
    backgroundColor: c.coral,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.button,
    borderCurve: 'continuous',
  },
  emptyBtnText: {
    color: c.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
});
