import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CATEGORY_GROUP_META, CategoryGroupType } from '../utils/constants';
import { formatKes } from '../utils/formatters';
import { TransactionType } from '../stores/transactionStore';

interface TransactionItemProps {
  description: string;
  categoryName: string;
  categoryGroup: CategoryGroupType;
  amount: number;
  type: TransactionType;
  note?: string;
  onPress?: () => void;
}

export function TransactionItem({
  description,
  categoryName,
  categoryGroup,
  amount,
  type,
  note,
  onPress,
}: TransactionItemProps) {
  const groupColor = CATEGORY_GROUP_META[categoryGroup]?.color ?? colors.t3;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: groupColor }]} />
      <View style={styles.center}>
        <Text style={styles.description} numberOfLines={1}>{description}</Text>
        <Text style={styles.category} numberOfLines={1}>
          {categoryName}{note ? ` \u00B7 ${note}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatKes(amount)}</Text>
        {type === 'FUTURE_PENDING' && (
          <View style={[styles.typeBadge, { backgroundColor: colors.amberDim }]}>
            <Text style={[styles.typeBadgeText, { color: colors.amber }]}>Upcoming</Text>
          </View>
        )}
        {type === 'FUTURE_PAID' && (
          <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={[styles.typeBadgeText, { color: colors.t2 }]}>Paid</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  center: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.t1,
  },
  category: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.t3,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.t1,
    fontVariant: ['tabular-nums'],
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
