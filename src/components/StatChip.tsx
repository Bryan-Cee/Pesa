import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';

interface StatChipProps {
  label: string;
  value: string;
  color?: string;
}

export function StatChip({ label, value, color }: StatChipProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  return (
    <View style={s.chip}>
      <Text style={[s.value, { color: color ?? colors.t1 }]} numberOfLines={1}>{value}</Text>
      <Text style={s.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: c.subtle,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingTop: 9,
    paddingBottom: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: c.t1,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
