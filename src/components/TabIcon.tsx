import React from 'react';
import { Feather } from '@expo/vector-icons';

export type IconName =
  | 'home' | 'grid' | 'activity' | 'bar-chart-2'
  | 'bell' | 'user' | 'settings' | 'search'
  | 'edit-2' | 'arrow-left' | 'x' | 'check'
  | 'calendar' | 'message-square' | 'shield'
  | 'download' | 'sun' | 'trash-2' | 'chevron-right'
  | 'plus' | 'clock' | 'alert-triangle' | 'trending-down';

interface TabIconProps {
  name: IconName;
  color: string;
  size?: number;
}

export function TabIcon({ name, color, size = 24 }: TabIconProps) {
  return <Feather name={name as any} size={size} color={color} />;
}
