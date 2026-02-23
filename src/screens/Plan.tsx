import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { DebtPlanner } from './DebtPlanner';
import { SavingsGoals } from './SavingsGoals';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PlanTab = 'debt' | 'goals';

export function Plan() {
  const [tab, setTab] = useState<PlanTab>('debt');

  const colors = useColors();
  const s = mkStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Text style={s.title}>Plan</Text>
      </View>
      <View style={s.tabRow}>
        <Pressable
          style={[s.tab, tab === 'debt' && s.tabActive]}
          onPress={() => setTab('debt')}
        >
          <Text
            style={[s.tabText, tab === 'debt' && s.tabTextActive]}
          >
            Debt
          </Text>
        </Pressable>
        <Pressable
          style={[s.tab, tab === 'goals' && s.tabActive]}
          onPress={() => setTab('goals')}
        >
          <Text
            style={[s.tabText, tab === 'goals' && s.tabTextActive]}
          >
            Goals
          </Text>
        </Pressable>
      </View>
      {tab === 'debt' ? <DebtPlanner /> : <SavingsGoals />}
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.8,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: c.coralDim,
    borderColor: 'rgba(46,204,113,0.35)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.t2,
  },
  tabTextActive: {
    color: c.coral,
  },
});
