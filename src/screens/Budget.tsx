import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useIsDark } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore } from '../stores/transactionStore';
import { MonthSelector } from '../components/MonthSelector';
import { ProgressBar } from '../components/ProgressBar';
import { formatKes } from '../utils/formatters';
import { TabIcon } from '../components/TabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CATEGORY_GROUP_ORDER,
  CATEGORY_GROUP_META,
  CategoryGroupType,
} from '../utils/constants';

export function Budget() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useIsDark();
  const s = mkStyles(colors);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ monthId?: string }>();

  const months = useBudgetStore((s) => s.months);
  const allCategories = useBudgetStore((s) => s.categories);
  const addCategory = useBudgetStore((s) => s.addCategory);
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
  const [addingGroup, setAddingGroup] = useState<CategoryGroupType | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatProjected, setNewCatProjected] = useState('');

  const selectedMonth = sortedMonths[monthIndex];

  const categories = useMemo(
    () => selectedMonth ? allCategories.filter((c) => c.monthId === selectedMonth.id) : [],
    [allCategories, selectedMonth?.id]
  );
  const isLocked = !!selectedMonth?.lockedAt;

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

  if (!selectedMonth) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Text style={s.empty}>No budget months found.</Text>
      </View>
    );
  }

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
    return colors.subtle;
  }

  function toggleGroup(group: string) {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function fmtNum(n: number): string {
    return n.toLocaleString('en-US');
  }

  function closeAddModal() {
    setAddingGroup(null);
    setNewCatName('');
    setNewCatDescription('');
    setNewCatProjected('');
  }

  function saveNewCategory() {
    if (!addingGroup || !newCatName.trim()) {
      Alert.alert('Name Required', 'Please enter a category name.');
      return;
    }
    addCategory({
      monthId: selectedMonth.id,
      group: addingGroup,
      name: newCatName.trim(),
      description: newCatDescription.trim(),
      projected: parseInt(newCatProjected, 10) || 0,
      sortOrder: categories.filter((c) => c.group === addingGroup).length,
      isFixed: false,
    });
    closeAddModal();
  }

  return (
    <View style={s.screen}>
      {/* Header row */}
      <View style={[s.headerRow, { paddingTop: insets.top + 10 }]}>
        {searchActive ? (
          <>
            <Pressable
              style={s.headerIconBtn}
              onPress={() => {
                setSearchActive(false);
                setSearchQuery('');
              }}
            >
              <TabIcon name="x" color={colors.t2} size={18} />
            </Pressable>
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search categories..."
              placeholderTextColor={colors.t3}
              autoFocus
              selectionColor={colors.coral}
            />
          </>
        ) : (
          <>
            <Text style={s.headerTitle}>Budget</Text>
            <Pressable
              style={s.headerIconBtn}
              onPress={() => setSearchActive(true)}
            >
              <TabIcon name="search" color={colors.t2} size={18} />
            </Pressable>
          </>
        )}
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

      <ScrollView style={s.list} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
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
              {isExpanded && cats.map((cat) => {
                  const actual = getActualForCategory(cat.id);
                  const committed = getCommittedForCategory(cat.id);
                  const totalSpend = actual + committed;
                  const variance = cat.projected - totalSpend;
                  const isOver = totalSpend > cat.projected && cat.projected > 0;
                  const hasData = actual > 0 || committed > 0;
                  const catProgress =
                    cat.projected > 0
                      ? Math.min(totalSpend / cat.projected, 1)
                      : 0;

                  let badgeBg: string;
                  let badgeTextColor: string;
                  let badgeLabel: string;

                  if (!hasData) {
                    badgeBg = colors.subtle;
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
                          params: { categoryId: cat.id, monthId: selectedMonth.id },
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
                            {committed > 0 && (
                              <Text style={s.catCommitted}>
                                +{fmtNum(committed)} upcoming
                              </Text>
                            )}
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
              {/* Add category row */}
              {isExpanded && !isLocked && (
                <Pressable
                  style={s.addCatRow}
                  onPress={() => setAddingGroup(group)}
                >
                  <Text style={s.addCatText}>+ Add category</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Add Category Modal */}
      <Modal visible={addingGroup !== null} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAddModal}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Pressable>
          <View style={s.modalSheet}>
            <View style={s.modalHandleRow}>
              <View style={s.modalHandle} />
            </View>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>New Category</Text>
              <Pressable style={s.modalCloseBtn} onPress={closeAddModal}>
                <Text style={s.modalCloseBtnText}>Cancel</Text>
              </Pressable>
            </View>
            <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
              <View style={s.modalField}>
                <Text style={s.modalLabel}>NAME</Text>
                <TextInput
                  style={s.modalTextInput}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder="Category name"
                  placeholderTextColor={colors.t3}
                  selectionColor={colors.coral}
                  autoFocus
                />
              </View>
              <View style={s.modalField}>
                <Text style={s.modalLabel}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  style={s.modalTextInput}
                  value={newCatDescription}
                  onChangeText={setNewCatDescription}
                  placeholder="Short description"
                  placeholderTextColor={colors.t3}
                  selectionColor={colors.coral}
                />
              </View>
              <View style={s.modalField}>
                <Text style={s.modalLabel}>PROJECTED AMOUNT</Text>
                <View style={s.modalAmountRow}>
                  <Text style={s.modalKes}>KES</Text>
                  <TextInput
                    style={s.modalAmountInput}
                    value={newCatProjected}
                    onChangeText={setNewCatProjected}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.t3}
                    selectionColor={colors.coral}
                  />
                </View>
              </View>
              <Pressable style={s.modalSaveBtn} onPress={saveNewCategory}>
                <Text style={s.modalSaveBtnText}>Save</Text>
              </Pressable>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

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

  /* Header row */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
    fontVariant: ['tabular-nums'],
  },
  summaryValueBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: c.t2,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  summaryValueRemaining: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
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
    borderCurve: 'continuous',
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
    gap: 8,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
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
    fontVariant: ['tabular-nums'],
  },
  catCommitted: {
    fontSize: 10,
    fontWeight: '500',
    color: c.amber,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderCurve: 'continuous',
    minWidth: 50,
    alignItems: 'center',
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* Mini progress bar */
  miniProgressTrack: {
    height: 3,
    borderRadius: 100,
    backgroundColor: c.subtle,
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

  /* Add category row */
  addCatRow: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  addCatText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.coral,
  },

  /* Add Category Modal */
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
  },
  modalSaveBtnText: {
    color: c.buttonText,
    fontSize: 15,
    fontWeight: '700',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    backgroundColor: c.bgCard,
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
    fontVariant: ['tabular-nums'],
  },
});
