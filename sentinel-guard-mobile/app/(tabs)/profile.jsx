import { ScrollView, View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { getCurrentUser, signOut } from '../../src/services';
import { Card, CardHeader, Avatar, Badge } from '../../src/components/UI';
import { colors, spacing, radius } from '../../src/theme';

const user = getCurrentUser();

function SettingRow({ label, sub, value, onValueChange, type = 'toggle', onPress, danger }) {
  return (
    <TouchableOpacity
      onPress={type === 'action' ? onPress : undefined}
      activeOpacity={type === 'action' ? 0.6 : 1}
      style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: danger ? colors.red : colors.text }}>{label}</Text>
        {sub && <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{sub}</Text>}
      </View>
      {type === 'toggle' && (
        <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.bg4, true: colors.accentBg }} thumbColor={value ? colors.accent : colors.text3} />
      )}
      {type === 'action' && (
        <Text style={{ fontSize: 13, color: danger ? colors.red : colors.text3 }}>→</Text>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [pushNotif, setPushNotif]   = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [critOnly, setCritOnly]     = useState(false);
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <View style={{ paddingTop: 8, marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>Profile</Text>
      </View>

      {/* User card */}
      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, alignItems: 'center', gap: 12 }}>
          <Avatar initials={user?.initials} color="accent" size={64} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{user?.name}</Text>
            <Text style={{ fontSize: 13, color: colors.text3, fontFamily: colors.mono }}>{user?.email}</Text>
            <Badge type={user?.role === 'admin' ? 'admin' : 'standard'} label={user?.role === 'admin' ? 'Admin' : 'Standard'} />
          </View>
        </View>
      </Card>

      {/* Notification settings */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: colors.mono }}>
        Notifications
      </Text>
      <Card style={{ marginBottom: spacing.md }}>
        <SettingRow label="Push notifications" sub="Alerts sent to this device" value={pushNotif} onValueChange={setPushNotif} />
        <SettingRow label="Email alerts" sub="Anomaly reports via email" value={emailAlerts} onValueChange={setEmailAlerts} />
        <SettingRow label="Critical alerts only" sub="Suppress warnings, show critical" value={critOnly} onValueChange={setCritOnly} />
      </Card>

      {/* App settings */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: colors.mono }}>
        App settings
      </Text>
      <Card style={{ marginBottom: spacing.md }}>
        <SettingRow label="Auto-refresh" sub="Refresh sensor data every 5s" value={autoRefresh} onValueChange={setAutoRefresh} />
        <SettingRow label="Sensor thresholds" sub="Configure alert thresholds" type="action" onPress={() => Alert.alert('Coming soon', 'Configure with Firebase')} />
        <SettingRow label="Node management" sub="Add / remove sensor nodes" type="action" onPress={() => Alert.alert('Coming soon', 'Configure with Firebase')} />
      </Card>

      {/* Security info */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: colors.mono }}>
        Security
      </Text>
      <Card style={{ marginBottom: spacing.md }}>
        {[
          { label: 'Transport', val: 'MQTTs / TLS 1.3' },
          { label: 'Encryption', val: 'AES-128' },
          { label: 'Integrity', val: 'HMAC-SHA256' },
          { label: 'Auth', val: 'Firebase Auth' },
          { label: 'Access control', val: `RBAC · ${user?.role}` },
        ].map((row, i, arr) => (
          <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 13, color: colors.text2 }}>{row.label}</Text>
            <Text style={{ fontSize: 13, fontFamily: colors.mono, color: colors.green }}>{row.val}</Text>
          </View>
        ))}
      </Card>

      {/* About */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: colors.mono }}>
        About
      </Text>
      <Card style={{ marginBottom: spacing.md }}>
        <SettingRow label="Version" sub="Sentinel Guard v1.0.0" type="action" onPress={() => {}} />
        <SettingRow label="Backend" sub="Mock data · Firebase pending" type="action" onPress={() => {}} />
      </Card>

      {/* Sign out */}
      <Card>
        <SettingRow label="Sign out" sub="You will be returned to the login screen" type="action" onPress={confirmSignOut} danger />
      </Card>
    </ScrollView>
  );
}
