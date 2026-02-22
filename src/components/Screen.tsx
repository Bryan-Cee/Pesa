import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useTheme';

interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, style }: ScreenProps) {
  const colors = useColors();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {children}
    </View>
  );
}
