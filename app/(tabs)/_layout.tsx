import { Tabs, useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { useColors, useIsDark } from '../../src/hooks/useTheme';
import { TabIcon } from '../../src/components/TabIcon';

export default function TabLayout() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useIsDark();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.t3,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(9,9,14,0.96)' : 'rgba(255,255,255,0.97)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 82,
          paddingBottom: 18,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" color={focused ? colors.coral : colors.t3} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="grid" color={focused ? colors.coral : colors.t3} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: () => (
            <View style={{ alignItems: 'center', marginTop: -18 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  backgroundColor: colors.coral,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.coral,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.38,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '300', marginTop: -2 }}>
                  +
                </Text>
              </View>
              <Text style={{ color: colors.t3, fontSize: 10, fontWeight: '600', marginTop: 4 }}>
                Log
              </Text>
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/transaction-logger');
          },
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="activity" color={focused ? colors.coral : colors.t3} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bar-chart-2" color={focused ? colors.coral : colors.t3} />
          ),
        }}
      />
    </Tabs>
  );
}
