import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '../../src/theme';

// unicode glyphs used as tab icons
const ICONS = {
  home:    { active: '▣', inactive: '▢' },
  sensors: { active: '◼◼', inactive: '◻◻' },
  alerts:  { active: '⬥', inactive: '⬦' },
  profile: { active: '◉', inactive: '◎' },
};

function TabIcon({ name, focused }) {
  const set = ICONS[name] || { active: '●', inactive: '○' };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 32, height: 28 }}>
      {/* Active indicator bar at top */}
      {focused && (
        <View style={{
          position: 'absolute',
          top: -10,
          width: 20,
          height: 1.5,
          backgroundColor: colors.accent,
        }} />
      )}
      <Text style={{
        fontSize: 18,
        lineHeight: 20,
        color: focused ? colors.accent : colors.text3,
        opacity: focused ? 1 : 0.55,
      }}>
        {focused ? set.active : set.inactive}
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
          borderTopColor: colors.border2,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },

        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.text3,

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.4,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'HOME',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: 'SENSORS',
          tabBarIcon: ({ focused }) => <TabIcon name="sensors" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'ALERTS',
          tabBarIcon: ({ focused }) => <TabIcon name="alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
