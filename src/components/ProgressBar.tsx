import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';

interface ProgressBarProps {
  progress: number; // 0 to 1+
  height?: number;
  color?: string;
}

export function ProgressBar({ progress, height, color }: ProgressBarProps) {
  const colors = useColors();
  const s = mkStyles(colors);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const widthPercent = clampedProgress * 100;

  return (
    <View style={s.track}>
      <View style={[s.fillWrapper, { width: `${widthPercent}%` }]}>
        <LinearGradient
          colors={color ? [color, color] : [colors.coral, colors.coralLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.fill}
        />
        {widthPercent > 0 && (
          <View style={s.dot} />
        )}
      </View>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  track: {
    height: 5,
    borderRadius: 100,
    backgroundColor: c.subtle,
    width: '100%',
    overflow: 'visible',
  },
  fillWrapper: {
    height: 5,
    borderRadius: 100,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
  },
  dot: {
    position: 'absolute',
    right: -4.5,
    top: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: c.coralLight,
    borderWidth: 1.5,
    borderColor: c.bg,
  },
});
