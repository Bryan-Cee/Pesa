import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  return (
    <View style={s.container}>
      <View style={s.iconPlaceholder}>
        <Text style={s.iconText}>$</Text>
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Pressable style={s.button} onPress={onAction}>
          <Text style={s.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 32,
    color: c.t3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: c.t2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: c.coral,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.button,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
