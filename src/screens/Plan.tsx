import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { DebtList } from './DebtList';
import { SavingsGoals } from './SavingsGoals';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PlanTab = 'debt' | 'goals';

export function Plan() {
  const [tab, setTab] = useState<PlanTab>('debt');
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const colors = useColors();
  const s = mkStyles(colors);
  const insets = useSafeAreaInsets();

  function goToTab(t: PlanTab) {
    setTab(t);
    scrollRef.current?.scrollTo({ x: t === 'debt' ? 0 : width, animated: true });
  }

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Text style={s.title}>Plan</Text>
      </View>
      <View style={s.tabRow}>
        <Pressable
          style={[s.tab, tab === 'debt' && s.tabActive]}
          onPress={() => goToTab('debt')}
        >
          <Text style={[s.tabText, tab === 'debt' && s.tabTextActive]}>
            Debt
          </Text>
        </Pressable>
        <Pressable
          style={[s.tab, tab === 'goals' && s.tabActive]}
          onPress={() => goToTab('goals')}
        >
          <Text style={[s.tabText, tab === 'goals' && s.tabTextActive]}>
            Goals
          </Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setTab(index === 0 ? 'debt' : 'goals');
        }}
        style={{ flex: 1 }}
      >
        <View style={{ width }}>
          <DebtList />
        </View>
        <View style={{ width }}>
          <SavingsGoals />
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: c.coral,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.t3,
  },
  tabTextActive: {
    color: c.coral,
    fontWeight: '700',
  },
});
