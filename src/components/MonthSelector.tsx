import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface MonthSelectorProps {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onNewMonth?: () => void;
  isLocked?: boolean;
}

export function MonthSelector({
  label,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onNewMonth,
  isLocked,
}: MonthSelectorProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  return (
    <View style={s.container}>
      <Pressable
        onPress={onPrevious}
        disabled={!hasPrevious}
        style={s.arrow}
      >
        <Text style={[s.arrowText, !hasPrevious && s.disabled]}>
          {'\u25C0'}
        </Text>
      </Pressable>
      <View style={s.center}>
        <Text style={s.label}>{label}</Text>
        {isLocked && (
          <View style={s.lockedBadge}>
            <Text style={s.lockedText}>Locked</Text>
          </View>
        )}
      </View>
      {hasNext ? (
        <Pressable onPress={onNext} style={s.arrow}>
          <Text style={s.arrowText}>{'\u25B6'}</Text>
        </Pressable>
      ) : onNewMonth ? (
        <Pressable onPress={onNewMonth} style={s.newMonth}>
          <Text style={s.newMonthText}>New +</Text>
        </Pressable>
      ) : (
        <View style={s.arrow}>
          <Text style={[s.arrowText, s.disabled]}>{'\u25B6'}</Text>
        </View>
      )}
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  arrow: {
    width: 30,
    height: 30,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 12,
    color: c.t2,
  },
  disabled: {
    opacity: 0.3,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.3,
  },
  lockedBadge: {
    backgroundColor: c.redDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.red,
  },
  newMonth: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newMonthText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.coral,
  },
});
