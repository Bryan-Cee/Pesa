import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [s.fab, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <Text style={s.icon}>+</Text>
    </Pressable>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  fab: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: c.coral,
    position: 'absolute',
    bottom: 24,
    right: 20,
    boxShadow: '0 6px 20px rgba(46, 204, 113, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -1,
  },
});
