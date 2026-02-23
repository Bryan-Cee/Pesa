import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CATEGORY_GROUP_META, CategoryGroupType } from '../utils/constants';
import { formatKes } from '../utils/formatters';

interface CategoryRowProps {
  name: string;
  description: string;
  group: CategoryGroupType;
  projected: number;
  actual: number;
  committed: number;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function CategoryRow({
  name,
  description,
  group,
  projected,
  actual,
  committed,
  onPress,
  onLongPress,
}: CategoryRowProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  const variance = projected - actual;
  const meta = CATEGORY_GROUP_META[group];
  const isOver = actual > projected && projected > 0;
  const hasData = actual > 0 || committed > 0;

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
    badgeLabel = `\u2193 ${formatKes(variance)}`;
  } else {
    badgeBg = colors.redDim;
    badgeTextColor = colors.red;
    badgeLabel = `\u2191 ${formatKes(Math.abs(variance))}`;
  }

  return (
    <Pressable
      style={s.row}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Left accent stripe */}
      <View style={[s.stripe, { backgroundColor: meta.color }]} />

      <View style={s.content}>
        <View style={s.left}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          {description ? (
            <Text style={s.description} numberOfLines={1}>{description}</Text>
          ) : null}
        </View>
        <View style={s.right}>
          <Text style={[s.actual, isOver ? { color: colors.red } : undefined]}>
            {formatKes(actual)}
          </Text>
          <Text style={s.projected}>of {formatKes(projected)}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Text style={[s.badgeText, { color: badgeTextColor }]}>{badgeLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: spacing.md + 3,
    paddingRight: spacing.md,
  },
  left: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.t1,
  },
  description: {
    fontSize: 11,
    fontWeight: '400',
    color: c.t3,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  actual: {
    fontSize: 14,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  projected: {
    fontSize: 10.5,
    color: c.t3,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderCurve: 'continuous',
    minWidth: 50,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
