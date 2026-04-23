import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSensors, useAlerts, useStats, useSensorHistory } from '../../src/hooks/useData';
import { StatCard, Card, CardHeader, LiveDot, Badge, LoadingState, SectionHeader } from '../../src/components/UI';
import Sparkline from '../../src/components/Sparkline';
import { colors, spacing, radius } from '../../src/theme';
import { getCurrentUser } from '../../src/services';

const user = getCurrentUser();

function AlertRow({ alert }) {
  const dotColor = alert.severity === 'critical' ? colors.red : alert.severity === 'warning' ? colors.amber : colors.text3;
  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/alerts')}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent' }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginTop: 5, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 2 }} numberOfLines={1}>
          {alert.event}
        </Text>
        <Text style={{ fontSize: 11, color: colors.text3, fontFamily: colors.mono }}>{alert.node} · {alert.time}</Text>
      </View>
      <Badge type={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'neutral'}
        label={alert.severity === 'critical' ? 'Critical' : alert.severity === 'warning' ? 'Warning' : 'Info'} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { data: sensors, loading: sensLoading } = useSensors();
  const { data: alerts,  loading: alertLoading } = useAlerts();
  const { data: stats,   loading: statsLoading } = useStats();
  const { data: history } = useSensorHistory('node_01', 20);
  const [refreshing, setRefreshing] = useState(false);

  const unread = (alerts || []).filter(a => !a.read).length;
  const recentAlerts = (alerts || []).slice(0, 3);
  const node1 = sensors?.[0];
  const node2 = sensors?.[1];

  const tempHistory     = history.map(h => h.node01_temp);
  const humHistory      = history.map(h => h.node01_humidity);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, paddingTop: 8 }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>Dashboard</Text>
          <Text style={{ fontSize: 12, color: colors.text3, fontFamily: colors.mono, marginTop: 2 }}>
            {stats?.systemOnline ? '● All systems online' : '○ System offline'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {unread > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}
              style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{unread}</Text>
            </TouchableOpacity>
          )}
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentB, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{user?.initials}</Text>
          </View>
        </View>
      </View>

      {/* Stat row */}
      {statsLoading ? <LoadingState message="Loading stats…" /> : (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <StatCard label="Status"   value={stats?.systemOnline ? 'Online' : 'Offline'} sub="All sensors active" variant="ok" />
            <StatCard label="Alerts"   value={String(stats?.activeAlerts)} sub={`${stats?.criticalAlerts} critical`} variant="danger" />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <StatCard label="Payloads" value={String(stats?.payloadsVerified?.toLocaleString())} sub="verified · 24h" />
            <StatCard label="HMAC fail" value={String(stats?.hmacFailures)} sub="last hour" variant="warn" />
          </View>
        </>
      )}

      {/* Node 01 — temperature chart */}
      <Card style={{ marginBottom: spacing.sm }}>
        <CardHeader title="Temperature — Node 01" right={<LiveDot />} />
        <View style={{ padding: spacing.md, paddingBottom: 0 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.red, fontFamily: colors.mono, letterSpacing: -0.5 }}>
            {sensLoading ? '…' : `${node1?.temp}°C`}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2, marginBottom: 10 }}>
            {node1?.tempStatus === 'ok' ? '✓ Within normal range' : '⚠ Above threshold'}
          </Text>
        </View>
        <Sparkline data={tempHistory} color={colors.red} height={60} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono }}>20 readings ago</Text>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono }}>Now</Text>
        </View>
      </Card>

      {/* Node 01 — humidity chart */}
      <Card style={{ marginBottom: spacing.sm }}>
        <CardHeader title="Humidity — Node 01" right={<LiveDot />} />
        <View style={{ padding: spacing.md, paddingBottom: 0 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.blue, fontFamily: colors.mono, letterSpacing: -0.5 }}>
            {sensLoading ? '…' : `${node1?.humidity}%`}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2, marginBottom: 10 }}>
            {node1?.humStatus === 'ok' ? '✓ Within normal range' : '⚠ Above threshold'}
          </Text>
        </View>
        <Sparkline data={humHistory} color={colors.blue} height={60} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono }}>20 readings ago</Text>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono }}>Now</Text>
        </View>
      </Card>

      {/* Node 02 quick status */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader
          title="Node 02 — status"
          right={<Badge type={node2?.tempStatus === 'warn' ? 'warning' : 'ok'} label={node2?.tempStatus === 'warn' ? 'Above threshold' : 'Normal'} />}
        />
        <View style={{ flexDirection: 'row', padding: spacing.md, gap: spacing.sm }}>
          {[
            { label: 'Temp',     val: `${node2?.temp}°C`,   color: node2?.tempStatus === 'warn' ? colors.amber : colors.text },
            { label: 'Humidity', val: `${node2?.humidity}%`, color: node2?.humStatus  === 'warn' ? colors.amber : colors.text },
            { label: 'Soil',     val: `${node2?.soil}%`,    color: node2?.soilStatus  === 'warn' ? colors.amber : colors.text },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{s.label}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: s.color, fontFamily: colors.mono }}>{sensLoading ? '…' : s.val}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Recent alerts */}
      <SectionHeader
        title="Recent alerts"
        right={
          <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
            <Text style={{ fontSize: 12, color: colors.accent }}>View all →</Text>
          </TouchableOpacity>
        }
      />
      <Card>
        {alertLoading ? <LoadingState message="Loading alerts…" /> :
         recentAlerts.length === 0 ? <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: colors.text3 }}>No recent alerts</Text></View> :
         recentAlerts.map((a, i) => (
           <View key={a.id} style={{ borderBottomWidth: i < recentAlerts.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
             <AlertRow alert={a} />
           </View>
         ))
        }
      </Card>
    </ScrollView>
  );
}
