import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useAlerts } from '../../src/hooks/useData';
import { Card, Badge, LoadingState, EmptyState, Button } from '../../src/components/UI';
import { colors, spacing, radius } from '../../src/theme';

function MLBadge({ result }) {
  const map = { attack: 'critical', anomaly: 'warning', normal: 'ok', false_pos: 'info' };
  const labels = { attack: 'Attack', anomaly: 'Anomaly', normal: 'Normal', false_pos: 'False +' };
  return <Badge type={map[result] || 'neutral'} label={labels[result] || result} />;
}

function AlertCard({ alert }) {
  const dotColor = alert.severity === 'critical' ? colors.red : alert.severity === 'warning' ? colors.amber : colors.text3;
  const bg       = alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: spacing.md, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {!alert.read && (
        <View style={{ position: 'absolute', top: spacing.md, right: spacing.md, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue }} />
      )}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginTop: 5, flexShrink: 0 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, lineHeight: 18 }}>{alert.event}</Text>
        <Text style={{ fontSize: 11, color: colors.text3, fontFamily: colors.mono }}>{alert.node} · {alert.time}</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge
            type={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'neutral'}
            label={alert.severity === 'critical' ? 'Critical' : alert.severity === 'warning' ? 'Warning' : 'Info'}
          />
          <MLBadge result={alert.mlResult} />
        </View>
      </View>
    </View>
  );
}

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'unread',   label: 'Unread' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning',  label: 'Warnings' },
];

export default function AlertsScreen() {
  const { data: alerts, loading } = useAlerts();
  const [filter, setFilter]       = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const unread = (alerts || []).filter(a => !a.read).length;

  const filtered = (alerts || []).filter(a => {
    if (filter === 'unread')   return !a.read;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning')  return a.severity === 'warning';
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 700));
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingTop: 8 }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>Alert feed</Text>
          <Text style={{ fontSize: 12, color: colors.text3, fontFamily: colors.mono, marginTop: 2 }}>
            Attack events · HMAC failures · ML
          </Text>
        </View>
        {unread > 0 && (
          <View style={{ backgroundColor: colors.redBg, borderWidth: 1, borderColor: colors.redB, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>{unread} unread</Text>
          </View>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.md, borderWidth: 1,
                borderColor: filter === f.key ? colors.accentB : colors.border,
                backgroundColor: filter === f.key ? colors.accentBg : colors.bg2 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.key ? colors.accent : colors.text2 }}>
                {f.label}{f.key === 'unread' && unread > 0 ? ` (${unread})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Alert list */}
      <Card>
        {loading ? (
          <LoadingState message="Loading events…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No alerts" subtitle="Nothing matches this filter" />
        ) : (
          filtered.map((a, i) => (
            <View key={a.id} style={{ borderBottomWidth: i < filtered.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <AlertCard alert={a} />
            </View>
          ))
        )}
      </Card>

      {/* Summary stats */}
      {!loading && (alerts || []).length > 0 && (
        <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Total', val: alerts.length, color: colors.text },
            { label: 'Critical', val: alerts.filter(a => a.severity === 'critical').length, color: colors.red },
            { label: 'Warnings', val: alerts.filter(a => a.severity === 'warning').length,  color: colors.amber },
            { label: 'Normal',   val: alerts.filter(a => a.severity === 'info').length,     color: colors.green },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: s.color, fontFamily: colors.mono }}>{s.val}</Text>
              <Text style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
