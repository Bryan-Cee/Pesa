import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore, Transaction } from '../stores/transactionStore';
import { TransactionItem } from '../components/TransactionItem';
import { EmptyState } from '../components/EmptyState';
import { formatKes } from '../utils/formatters';
import { format } from 'date-fns';

export function TransactionList() {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const params = useLocalSearchParams<{
    monthId?: string;
    categoryId?: string;
  }>();

  const months = useBudgetStore((s) => s.months);
  const allCategories = useBudgetStore((s) => s.categories);
  const allTransactions = useTransactionStore((s) => s.transactions);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const markAsPaid = useTransactionStore((s) => s.markAsPaid);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return months.find(
      (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
    ) ?? months[months.length - 1] ?? null;
  }, [months]);

  const getCategory = useMemo(() => {
    return (id: string) => allCategories.find((c) => c.id === id);
  }, [allCategories]);

  const [filter, setFilter] = useState<string>('All');

  const monthId = params.monthId ?? currentMonth?.id;

  const filteredTransactions = useMemo(() => {
    let txs = allTransactions.filter((t) => t.monthId === monthId);
    if (params.categoryId) {
      txs = txs.filter((t) => t.categoryId === params.categoryId);
    }
    if (filter === 'Actual') txs = txs.filter((t) => t.type === 'ACTUAL');
    if (filter === 'Upcoming')
      txs = txs.filter((t) => t.type === 'FUTURE_PENDING');
    if (filter === 'Future Paid')
      txs = txs.filter((t) => t.type === 'FUTURE_PAID');
    return txs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allTransactions, monthId, params.categoryId, filter]);

  const sections = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const tx of filteredTransactions) {
      const key = format(new Date(tx.date), 'EEEE, d MMMM');
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    }
    return Object.entries(map).map(([title, data]) => ({ title, data }));
  }, [filteredTransactions]);

  const filters = ['All', 'Actual', 'Upcoming', 'Future Paid'];

  function handleDelete(id: string) {
    Alert.alert('Delete', 'Delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTransaction(id),
      },
    ]);
  }

  function handleTap(tx: Transaction) {
    if (tx.type === 'FUTURE_PENDING') {
      Alert.alert(tx.description, formatKes(tx.amount), [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Paid', onPress: () => markAsPaid(tx.id) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction(tx.id),
        },
      ]);
    }
  }

  if (!monthId) {
    return (
      <View style={s.screen}>
        <EmptyState title="No month selected" />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Filter Bar */}
      <View style={s.filterBar}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterText,
                filter === f && s.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {sections.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          subtitle="Log your first transaction"
          actionLabel="Log Transaction"
          onAction={() => router.push({
            pathname: '/transaction-logger',
            params: {
              categoryId: params.categoryId,
            },
          })}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={s.dateHeader}>
              <Text style={s.dateHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const cat = getCategory(item.categoryId);
            return (
              <TransactionItem
                description={item.description}
                categoryName={cat?.name ?? ''}
                categoryGroup={cat?.group ?? 'CUSTOM'}
                amount={item.amount}
                type={item.type}
                note={item.note}
                onPress={() => handleTap(item)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: c.bg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterChipActive: {
    backgroundColor: c.coralDim,
    borderColor: 'rgba(46,204,113,0.35)',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t2,
  },
  filterTextActive: {
    color: c.coral,
  },
  dateHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: c.bg,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
