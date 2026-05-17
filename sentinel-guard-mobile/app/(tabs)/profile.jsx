import { ScrollView, View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCurrentUser } from '../../src/hooks/useData';
import { signOut } from '../../src/services';
import { colors, spacing, radius } from '../../src/theme';

// shared uppercase label style
const LABEL = {
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 1.1,
  textTransform: 'uppercase',
  color: colors.text3,
  fontFamily: colors.mono,
};

// section heading with left accent bar
function SectionLabel({ children }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
      paddingHorizontal: 2,
    }}>
      <View style={{ width: 2, height: 10, backgroundColor: colors.accent, borderRadius: 1 }} />
      <Text style={LABEL}>{children}</Text>
    </View>
  );
}

// reusable row used for both toggles and tappable actions
function SettingRow({ label, sub, value, onValueChange, type = 'toggle', onPress, danger, last }) {
  return (
    <TouchableOpacity
      onPress={type === 'action' ? onPress : undefined}
      activeOpacity={type === 'action' ? 0.65 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 13,
          fontWeight: '500',
          color: danger ? colors.red : colors.text,
          marginBottom: sub ? 2 : 0,
        }}>
          {label}
        </Text>
        {sub && (
          <Text style={{ fontSize: 11, color: colors.text3 }}>{sub}</Text>
        )}
      </View>

      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.bg4, true: colors.accentB }}
          thumbColor={value ? colors.accent : colors.text3}
          ios_backgroundColor={colors.bg4}
        />
      )}
      {type === 'action' && (
        <Text style={{
          fontSize: 11,
          color: danger ? colors.red : colors.text3,
          fontFamily: colors.mono,
        }}>{'>'}</Text>
      )}
    </TouchableOpacity>
  );
}

// card wrapper with border and rounded corners
function TableCard({ children }) {
  return (
    <View style={{
      backgroundColor: colors.bg3,
      borderWidth: 1,
      borderColor: colors.border2,
      borderRadius: radius.md,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    }}>
      {children}
    </View>
  );
}

// profile screen
export default function ProfileScreen() {
  const { user, loading } = useCurrentUser();

  // local notification preferences (session only, not persisted)
  const [pushNotif,   setPushNotif]   = useState(true);
  const [critOnly,    setCritOnly]    = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
    ]);
  };

  const displayName     = user?.name ?? user?.email?.split('@')[0] ?? '?';
  const displayInitials = user?.initials ?? displayName.slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 48 }}
    >
      {/* page header */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.text3, fontFamily: colors.mono }}>
          SENTINEL GUARD
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.3, marginTop: 2 }}>
          Profile
        </Text>
      </View>

      {/* user identity card */}
      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: radius.md,
        overflow: 'hidden',
        marginBottom: spacing.lg,
      }}>
        <View style={{ height: 2, backgroundColor: colors.accent, opacity: 0.6 }} />

        <View style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            {/* avatar with initials */}
            <View style={{
              width: 52,
              height: 52,
              borderRadius: radius.sm,
              backgroundColor: colors.accentDim,
              borderWidth: 1,
              borderColor: colors.accentB,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.accent,
                fontFamily: colors.mono,
              }}>
                {loading ? '...' : displayInitials}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.2 }}>
                {loading ? 'Loading...' : displayName}
              </Text>
              <Text style={{ fontSize: 11, color: colors.text3, fontFamily: colors.mono, marginTop: 2 }}>
                {loading ? '' : (user?.email ?? '?')}
              </Text>
            </View>

            {/* role badge */}
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radius.xs,
              borderWidth: 1,
              borderColor: user?.role === 'admin' ? colors.accentB : colors.border2,
              backgroundColor: user?.role === 'admin' ? colors.accentDim : colors.bg4,
            }}>
              <Text style={{
                fontSize: 9,
                fontWeight: '700',
                letterSpacing: 0.8,
                color: user?.role === 'admin' ? colors.accent : colors.text3,
              }}>
                {loading ? '?' : (user?.role ?? 'USER').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* notification preferences */}
      <SectionLabel>Notifications</SectionLabel>
      <TableCard>
        <SettingRow
          label="Push notifications"
          sub="Alerts sent to this device"
          value={pushNotif}
          onValueChange={setPushNotif}
        />
        <SettingRow
          label="Critical alerts only"
          sub="Suppress warnings, show critical only"
          value={critOnly}
          onValueChange={setCritOnly}
          last
        />
      </TableCard>

      {/* app-level settings */}
      <SectionLabel>App settings</SectionLabel>
      <TableCard>
        <SettingRow
          label="Auto-refresh"
          sub="Sensor data updates in real time"
          value={autoRefresh}
          onValueChange={setAutoRefresh}
        />
        <SettingRow
          label="Sensor thresholds"
          sub="Temperature >= 35C, Humidity >= 75%"
          type="action"
          onPress={() => Alert.alert('Thresholds', 'Temperature: 35 C\nHumidity: 75%\n\nThreshold configuration will be available in a future update.')}
          last
        />
      </TableCard>

      {/* security protocol info (read-only) */}
      <SectionLabel>Security</SectionLabel>
      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: radius.md,
        overflow: 'hidden',
        marginBottom: spacing.lg,
      }}>
        {[
          { label: 'Transport',      val: 'MQTTs / TLS 1.3' },
          { label: 'Encryption',     val: 'AES-128'          },
          { label: 'Integrity',      val: 'HMAC-SHA256'      },
          { label: 'Auth',           val: 'Firebase Auth'    },
          { label: 'Access control', val: `RBAC · ${user?.role ?? '?'}` },
        ].map((row, i, arr) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: 11,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.text2 }}>{row.label}</Text>
            <Text style={{ fontSize: 11, fontFamily: colors.mono, color: colors.green, fontWeight: '600' }}>
              {row.val}
            </Text>
          </View>
        ))}
      </View>

      {/* app version */}
      <SectionLabel>About</SectionLabel>
      <TableCard>
        <SettingRow label="Version" sub="Sentinel Guard v1.0.0" type="action" onPress={() => {}} last />
      </TableCard>

      {/* sign out button */}
      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.redB,
        borderRadius: radius.md,
        overflow: 'hidden',
      }}>
        <SettingRow
          label="Sign out"
          sub="Return to login screen"
          type="action"
          onPress={confirmSignOut}
          danger
          last
        />
      </View>
    </ScrollView>
  );
}
