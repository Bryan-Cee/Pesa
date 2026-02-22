import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { spacing } from '../theme/spacing';
import { CATEGORY_GROUP_META, CategoryGroupType } from '../utils/constants';
import { formatKes } from '../utils/formatters';

interface SectionHeaderProps {
  group: CategoryGroupType;
  actual: number;
  projected: number;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Parse a CSS color string to [r, g, b].
 * Handles hex (#RRGGBB) and the dim rgba strings from constants.
 */
function parseColorRgb(color: string): [number, number, number] {
  // Try hex
  const hexMatch = color.match(/^#([A-Fa-f0-9]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }
  // Try rgba
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
  }
  return [255, 255, 255];
}

export function SectionHeader({
  group,
  actual,
  projected,
  isExpanded,
  onToggle,
}: SectionHeaderProps) {
  const meta = CATEGORY_GROUP_META[group];

  const { bgColor, borderColor } = useMemo(() => {
    const [r, g, b] = parseColorRgb(meta.color);
    return {
      bgColor: `rgba(${r},${g},${b},0.07)`,
      borderColor: `rgba(${r},${g},${b},0.14)`,
    };
  }, [meta.color]);

  return (
    <Pressable
      style={[
        styles.header,
        {
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        },
      ]}
      onPress={onToggle}
    >
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
        <Text style={[styles.label, { color: meta.color }]}>
          {meta.label}
        </Text>
      </View>
      <Text style={[styles.amounts, { color: meta.color }]}>
        {formatKes(actual)} / {formatKes(projected)}
      </Text>
      <Text style={[styles.chevron, { color: meta.color }]}>
        {isExpanded ? '\u25B2' : '\u25BC'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amounts: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  chevron: {
    fontSize: 10,
  },
});
