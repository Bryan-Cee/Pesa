import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore } from '../stores/transactionStore';
import { MonthSelector } from '../components/MonthSelector';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes } from '../utils/formatters';
import { TabIcon } from '../components/TabIcon';
import {
  CATEGORY_GROUP_ORDER,
  CATEGORY_GROUP_META,
  CategoryGroupType,
} from '../utils/constants';

export function Budget() {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const params = useLocalSearchParams<{ monthId?: string }>();

  const months = useBudgetStore((s) => s.months);
  const allCategories = useBudgetStore((s) => s.categories);
  const transactions = useTransactionStore((s) => s.transactions);

  const sortedMonths = useMemo(
    () =>
      [...months].sort(
        (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
      ),
    [months]
  );

  const currentMonth = useMemo(() => {
    const now = new Date();
    return months.find(
      (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
    ) ?? sortedMonths[sortedMonths.length - 1] ?? null;
  }, [months, sortedMonths]);

  const initialIndex = params.monthId
    ? sortedMonths.findIndex((m) => m.id === params.monthId)
    : sortedMonths.findIndex((m) => m.id === currentMonth?.id);

  const [monthIndex, setMonthIndex] = useState(
    initialIndex >= 0 ? initialIndex : sortedMonths.length - 1
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedMonth = sortedMonths[monthIndex];
  if (!selectedMonth) {
    return (
      <View style={s.screen}>
        <Text style={s.empty}>No budget months found.</Text>
      </View>
    );
  }

  const categories = useMemo(
    () => allCategories.filter((c) => c.monthId === selectedMonth.id),
    [allCategories, selectedMonth.id]
  );
  const isLocked = !!selectedMonth.lockedAt;

  const getActualForCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'ACTUAL' || tx.type === 'FUTURE_PAID') {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      }
    }
    return (catId: string) => map[catId] || 0;
  }, [transactions]);

  const getCommittedForCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'FUTURE_PENDING') {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      }
    }
    return (catId: string) => map[catId] || 0;
  }, [transactions]);

  // Group categories
  const grouped = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const map: Record<CategoryGroupType, typeof categories> = {} as any;
    for (const group of CATEGORY_GROUP_ORDER) {
      let cats = categories
        .filter((c) => c.group === group)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (query) {
        cats = cats.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query)
        );
      }
      if (cats.length > 0) map[group] = cats;
    }
    return map;
  }, [categories, searchQuery]);

  const totalProjected = categories.reduce((s, c) => s + c.projected, 0);
  const totalActual = categories.reduce(
    (s, c) => s + getActualForCategory(c.id),
    0
  );
  const remaining = totalProjected - totalActual;
  const progress = totalProjected > 0 ? totalActual / totalProjected : 0;

  const isLastMonth = monthIndex === sortedMonths.length - 1;

  function getGroupBgColor(hexColor: string): string {
    const match = hexColor.match(/^#([A-Fa-f0-9]{6})$/);
    if (match) {
      const r = parseInt(match[1].substring(0, 2), 16);
      const g = parseInt(match[1].substring(2, 4), 16);
      const b = parseInt(match[1].substring(4, 6), 16);
      return `rgba(${r},${g},${b},0.07)`;
    }
    return 'rgba(255,255,255,0.03)';
  }

  function toggleGroup(group: string) {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function fmtNum(n: number): string {
    return n.toLocaleString('en-US');
  }

  return (
    <View style={s.screen}>
      {/* Eyebrow */}
      <View style={s.eyebrowRow}>
        <Text style={s.eyebrowText}>BUDGET {'\u00B7'} MONTH VIEW</Text>
      </View>

      {/* Header row */}
      <View style={s.headerRow}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => {
            if (searchActive) {
              setSearchActive(false);
              setSearchQuery('');
            } else {
              router.back();
            }
          }}
        >
          <TabIcon name={searchActive ? 'x' : 'arrow-left'} color={colors.t2} size={18} />
        </Pressable>
        {searchActive ? (
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search categories..."
            placeholderTextColor={colors.t3}
            autoFocus
            selectionColor={colors.coral}
          />
        ) : (
          <Text style={s.headerTitle}>Budget</Text>
        )}
        <Pressable
          style={s.headerIconBtn}
          onPress={() => {
            setSearchActive(!searchActive);
            if (searchActive) setSearchQuery('');
          }}
        >
          <TabIcon name={searchActive ? 'check' : 'search'} color={colors.t2} size={18} />
        </Pressable>
      </View>

      {/* Month selector */}
      <MonthSelector
        label={selectedMonth.label}
        hasPrevious={monthIndex > 0}
        hasNext={monthIndex < sortedMonths.length - 1}
        onPrevious={() => setMonthIndex((i) => Math.max(0, i - 1))}
        onNext={() =>
          setMonthIndex((i) => Math.min(sortedMonths.length - 1, i + 1))
        }
        onNewMonth={
          isLastMonth ? () => router.push('/budget-setup') : undefined
        }
        isLocked={isLocked}
      />
      <Text style={s.incomeSubtitle}>
        Income: {formatKes(selectedMonth.incomeAssumption)}
      </Text>

      {/* Summary Bar */}
      <View style={s.summaryBar}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>SPENT</Text>
          <Text style={s.summaryValuePrimary}>{fmtNum(totalActual)}</Text>
        </View>
        <View style={[s.summaryItem, s.summaryItemCenter]}>
          <Text style={s.summaryLabel}>BUDGET</Text>
          <Text style={s.summaryValueBudget}>{fmtNum(totalProjected)}</Text>
        </View>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>REMAINING</Text>
          <Text
            style={[
              s.summaryValueRemaining,
              { color: remaining >= 0 ? colors.green : colors.red },
            ]}
          >
            {fmtNum(Math.abs(remaining))}
          </Text>
        </View>
      </View>

      {/* Main progress bar */}
      <View style={s.progressBarWrap}>
        <ProgressBar progress={progress} height={4} />
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {CATEGORY_GROUP_ORDER.map((group) => {
          const cats = grouped[group];
          if (!cats) return null;

          const meta = CATEGORY_GROUP_META[group];
          const groupActual = cats.reduce(
            (s, c) => s + getActualForCategory(c.id),
            0
          );
          const groupProjected = cats.reduce((s, c) => s + c.projected, 0);
          const isExpanded = !collapsed[group];

          return (
            <View key={group} style={s.groupBlock}>
              {/* Section header */}
              <Pressable
                style={[s.sectionHeader, { backgroundColor: getGroupBgColor(meta.color) }]}
                onPress={() => toggleGroup(group)}
              >
                <View style={s.sectionLeft}>
                  <View
                    style={[
                      s.sectionDot,
                      { backgroundColor: meta.color },
                    ]}
                  />
                  <Text style={[s.sectionLabel, { color: meta.color }]}>
                    {meta.label.toUpperCase()}
                  </Text>
                </View>
                <Text style={[s.sectionAmounts, { color: meta.color }]}>
                  {fmtNum(groupActual)} / {fmtNum(groupProjected)}
                </Text>
                <Text style={[s.sectionChevron, { color: meta.color }]}>
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </Text>
              </Pressable>

              {/* Category rows */}
              {isExpanded &&
                cats.map((cat) => {
                  const actual = getActualForCategory(cat.id);
                  const committed = getCommittedForCategory(cat.id);
                  const variance = cat.projected - actual;
                  const isOver = actual > cat.projected && cat.projected > 0;
                  const hasData = actual > 0 || committed > 0;
                  const catProgress =
                    cat.projected > 0
                      ? Math.min(actual / cat.projected, 1)
                      : 0;

                  let badgeBg: string;
                  let badgeTextColor: string;
                  let badgeLabel: string;

                  if (!hasData) {
                    badgeBg = 'rgba(255,255,255,0.04)';
                    badgeTextColor = colors.t3;
                    badgeLabel = '\u2014';
                  } else if (variance >= 0) {
                    badgeBg = colors.greenDim;
                    badgeTextColor = colors.green;
                    badgeLabel = 'On track';
                  } else {
                    badgeBg = colors.redDim;
                    badgeTextColor = colors.red;
                    badgeLabel = `+${fmtNum(Math.abs(variance))}`;
                  }

                  return (
                    <Pressable
                      key={cat.id}
                      style={s.catRow}
                      onPress={() =>
                        router.push({
                          pathname: '/category-detail',
                          params: { categoryId: cat.id },
                        })
                      }
                      onLongPress={() => {
                        if (isLocked) {
                          Alert.alert('Locked', 'This month is closed.');
                        }
                      }}
                    >
                      {/* Left stripe */}
                      <View
                        style={[
                          s.catStripe,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <View style={s.catContent}>
                        {/* Top row: name + amounts + badge */}
                        <View style={s.catTopRow}>
                          <View style={s.catLeft}>
                            <Text style={s.catName} numberOfLines={1}>
                              {cat.name}
                            </Text>
                            {cat.description ? (
                              <Text
                                style={s.catDescription}
                                numberOfLines={1}
                              >
                                {cat.description}
                              </Text>
                            ) : null}
                          </View>
                          <View style={s.catRight}>
                            <Text
                              style={[
                                s.catActual,
                                isOver ? { color: colors.red } : undefined,
                              ]}
                            >
                              {fmtNum(actual)}
                            </Text>
                          </View>
                          <View
                            style={[
                              s.catBadge,
                              { backgroundColor: badgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                s.catBadgeText,
                                { color: badgeTextColor },
                              ]}
                            >
                              {badgeLabel}
                            </Text>
                          </View>
                        </View>
                        {/* Mini progress bar */}
                        <View style={s.miniProgressTrack}>
                          {catProgress > 0 && (
                            <View
                              style={[
                                s.miniProgressFillWrap,
                                { width: `${catProgress * 100}%` },
                              ]}
                            >
                              <LinearGradient
                                colors={[
                                  isOver ? colors.red : colors.coral,
                                  isOver ? '#E05454' : colors.coralLight,
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.miniProgressFill}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          );
        })}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Totals Footer */}
      <View style={s.footer}>
        <View style={s.footerCol}>
          <Text style={s.footerLabel}>PROJECTED</Text>
          <Text style={s.footerValue}>{formatKes(totalProjected)}</Text>
        </View>
        <View style={s.footerCol}>
          <Text style={s.footerLabel}>SPENT</Text>
          <Text style={s.footerValue}>{formatKes(totalActual)}</Text>
        </View>
        <View style={s.footerCol}>
          <Text style={s.footerLabel}>
            {remaining >= 0 ? 'SURPLUS' : 'DEFICIT'}
          </Text>
          <Text
            style={[
              s.footerValue,
              { color: remaining >= 0 ? colors.green : colors.red },
            ]}
          >
            {formatKes(Math.abs(remaining))}
          </Text>
        </View>
      </View>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  empty: {
    padding: spacing.xl,
    textAlign: 'center',
    color: c.t3,
    fontSize: 16,
  },

  /* Eyebrow */
  eyebrowRow: {
    paddingTop: 54,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
    alignItems: 'center',
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  /* Header row */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 18,
    color: c.t2,
    marginTop: -1,
  },
  headerSearchIcon: {
    fontSize: 16,
    color: c.t2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: c.t1,
    marginHorizontal: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderFocus,
    borderRadius: 10,
  },

  /* Income subtitle */
  incomeSubtitle: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: c.t3,
    marginBottom: spacing.sm,
    marginTop: -2,
  },

  /* Summary bar */
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: c.border,
    borderRightColor: c.border,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValuePrimary: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
    marginTop: 2,
  },
  summaryValueBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: c.t2,
    marginTop: 2,
  },
  summaryValueRemaining: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBarWrap: {
    paddingHorizontal: spacing.md,
    marginTop: 8,
    marginBottom: 6,
  },

  /* List */
  list: {
    flex: 1,
  },

  /* Group block */
  groupBlock: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  sectionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionAmounts: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  sectionChevron: {
    fontSize: 10,
  },

  /* Category rows */
  catRow: {
    backgroundColor: c.bgCard,
    borderTopWidth: 1,
    borderTopColor: c.border,
    position: 'relative',
  },
  catStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  catContent: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingLeft: spacing.md + 3,
    paddingRight: spacing.md,
  },
  catTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  catName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.t1,
  },
  catDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: c.t3,
    marginTop: 2,
  },
  catRight: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  catActual: {
    fontSize: 14,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    minWidth: 50,
    alignItems: 'center',
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Mini progress bar */
  miniProgressTrack: {
    height: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
    overflow: 'hidden',
  },
  miniProgressFillWrap: {
    height: 3,
    borderRadius: 100,
    overflow: 'hidden',
  },
  miniProgressFill: {
    flex: 1,
    borderRadius: 100,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(9,9,14,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: c.border,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerCol: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: c.t1,
    marginTop: 2,
  },
});
