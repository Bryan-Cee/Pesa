import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
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
  const colors = useColors();
  const s = mkStyles(colors);
  const groupColor = CATEGORY_GROUP_META[categoryGroup]?.color ?? colors.t3;

  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={[s.dot, { backgroundColor: groupColor }]} />
      <View style={s.center}>
        <Text style={s.description} numberOfLines={1}>{description}</Text>
        <Text style={s.category} numberOfLines={1}>
          {categoryName}{note ? ` \u00B7 ${note}` : ''}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.amount}>{formatKes(amount)}</Text>
        {type === 'FUTURE_PENDING' && (
          <View style={[s.typeBadge, { backgroundColor: colors.amberDim }]}>
            <Text style={[s.typeBadgeText, { color: colors.amber }]}>Upcoming</Text>
          </View>
        )}
        {type === 'FUTURE_PAID' && (
          <View style={[s.typeBadge, { backgroundColor: colors.subtleMed }]}>
            <Text style={[s.typeBadgeText, { color: colors.t2 }]}>Paid</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
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
    color: c.t1,
  },
  category: {
    fontSize: 12,
    fontWeight: '400',
    color: c.t3,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: c.t1,
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
