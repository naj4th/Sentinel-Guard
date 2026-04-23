import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '../../src/theme';

function TabIcon({ name, focused }) {
  const icons = {
    home:    focused ? '⬛' : '▪️',
    sensors: focused ? '📡' : '📡',
    alerts:  focused ? '🔴' : '🔴',
    profile: focused ? '👤' : '👤',
  };
  // Use SVG-style text icons for cleaner look
  const glyphs = { home: '⊞', sensors: '≋', alerts: '◈', profile: '◉' };
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 16, color: focused ? colors.accent : colors.text3 }}>
        {glyphs[name] || '●'}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home"    options={{ title: 'Home',    tabBarIcon: ({ focused }) => <TabIcon name="home"    focused={focused} /> }} />
      <Tabs.Screen name="sensors" options={{ title: 'Sensors', tabBarIcon: ({ focused }) => <TabIcon name="sensors" focused={focused} /> }} />
      <Tabs.Screen name="alerts"  options={{ title: 'Alerts',  tabBarIcon: ({ focused }) => <TabIcon name="alerts"  focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
    </Tabs>
  );
}
