import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  borderLeftColor?: string;
  glowBorder?: boolean;
}

export function Card({ children, style, onPress, borderLeftColor, glowBorder }: CardProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  const content = (
    <View
      style={[
        s.card,
        glowBorder ? s.glowBorder : undefined,
        borderLeftColor ? { borderLeftWidth: 3, borderLeftColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.bgCard,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
  },
  glowBorder: {
    borderColor: c.borderMed,
  },
});
