import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useAlerts } from '../../src/hooks/useData';
import { markAllAlertsRead } from '../../src/services';
import { LoadingState } from '../../src/components/UI';
import { colors, spacing, radius } from '../../src/theme';

// shared uppercase label style used in multiple places
const LABEL = {
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 1.1,
  textTransform: 'uppercase',
  color: colors.text3,
  fontFamily: colors.mono,
};

// maps raw eventType strings from Firestore to human-readable labels
function eventLabel(eventType) {
  const map = {
    mitm_attack:   'MiTM Attack',
    replay_attack: 'Replay Attack',
    arp_poisoning: 'ARP Poisoning',
    hmac_failure:  'HMAC Failure',
    normal:        'Normal Traffic',
  };
  return map[eventType] || eventType?.replace(/_/g, ' ') || 'Security Event';
}

// severity badge shown on each alert row
function SevTag({ severity }) {
  const map = {
    critical: { label: 'CRIT',  color: colors.red,   bg: colors.redBg,   bd: colors.redB   },
    warning:  { label: 'WARN',  color: colors.amber, bg: colors.amberBg, bd: colors.amberB },
  };
  const s = map[severity] || { label: 'INFO', color: colors.text3, bg: colors.bg4, bd: colors.border };
  return (
    <View style={{
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.xs,
      borderWidth: 1,
      borderColor: s.bd,
      backgroundColor: s.bg,
    }}>
      <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color: s.color }}>{s.label}</Text>
    </View>
  );
}

// single row in the alerts list
function AlertRow({ alert, isLast }) {
  const isCrit = alert.severity === 'critical';
  const isWarn = alert.severity === 'warning';
  const stripeColor = isCrit ? colors.red : isWarn ? colors.amber : colors.text3;

  return (
    <View style={{
      flexDirection: 'row',
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.border,
      backgroundColor: isCrit ? 'rgba(248,113,113,0.03)' : 'transparent',
    }}>
      {/* left color stripe shows severity at a glance */}
      <View style={{
        width: 3,
        backgroundColor: stripeColor,
        opacity: isCrit ? 0.8 : 0.4,
      }} />

      <View style={{ flex: 1, padding: spacing.md }}>
        {/* event type label + unread dot */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={{ ...LABEL, color: stripeColor, fontSize: 9 }}>
            {eventLabel(alert.eventType)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {!alert.read && (
              <View style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: colors.blue,
              }} />
            )}
          </View>
        </View>

        {/* main alert message */}
        <Text style={{
          fontSize: 13,
          fontWeight: '500',
          color: colors.text,
          lineHeight: 18,
          marginBottom: 6,
        }}>
          {alert.event}
        </Text>

        {/* node id, time, and optional sequence number */}
        <Text style={{
          fontSize: 10,
          color: colors.text3,
          fontFamily: colors.mono,
          marginBottom: 8,
        }}>
          {alert.node} · {alert.time}
          {alert.sequenceId != null ? ` · seq#${alert.sequenceId}` : ''}
        </Text>

        {/* tags row */}
        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
          <SevTag severity={alert.severity} />
        </View>
      </View>
    </View>
  );
}

// filter tabs shown above the list
const FILTERS = [
  { key: 'all',      label: 'ALL' },
  { key: 'unread',   label: 'UNREAD' },
  { key: 'critical', label: 'CRITICAL' },
  { key: 'warning',  label: 'WARNINGS' },
];

function FilterTab({ label, active, onPress, badge }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: active ? colors.accentB : colors.border,
        backgroundColor: active ? colors.accentDim : colors.bg3,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <Text style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: active ? colors.accent : colors.text3,
      }}>
        {label}
      </Text>
      {badge > 0 && (
        <View style={{
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: radius.xs,
          backgroundColor: active ? colors.accentB : colors.bg4,
        }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color: active ? colors.accent : colors.text3 }}>
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// main alerts screen
export default function AlertsScreen() {
  const { data: alerts, loading } = useAlerts();
  const [filter, setFilter]         = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking]       = useState(false);

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

  // marks every unread alert as acknowledged in Firestore
  const handleMarkAll = async () => {
    if (marking) return;
    setMarking(true);
    try {
      await markAllAlertsRead();
    } finally {
      setMarking(false);
    }
  };

  const critCount = (alerts || []).filter(a => a.severity === 'critical').length;
  const warnCount = (alerts || []).filter(a => a.severity === 'warning').length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* header with title and mark-all button */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
      }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.text3, fontFamily: colors.mono }}>
            SENTINEL GUARD
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.3, marginTop: 2 }}>
            Security events
          </Text>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono, marginTop: 3 }}>
            MiTM · Replay · ARP · HMAC
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
          {unread > 0 && (
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.blueB,
              backgroundColor: colors.blueBg,
            }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.blue, letterSpacing: 0.8 }}>
                {unread} NEW
              </Text>
            </View>
          )}
          {unread > 0 && (
            <TouchableOpacity
              onPress={handleMarkAll}
              disabled={marking}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.border2,
                backgroundColor: colors.bg3,
                opacity: marking ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text2, letterSpacing: 0.6 }}>
                {marking ? 'CLEARING...' : 'MARK READ'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* summary stats: total, critical, warnings, unread */}
      {!loading && (alerts || []).length > 0 && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {[
            { label: 'Total',    val: alerts.length,  color: colors.text2 },
            { label: 'Critical', val: critCount,       color: colors.red   },
            { label: 'Warnings', val: warnCount,       color: colors.amber },
            { label: 'Unread',   val: unread,          color: colors.blue  },
          ].map(s => (
            <View key={s.label} style={{
              flex: 1,
              backgroundColor: colors.bg3,
              borderWidth: 1,
              borderColor: colors.border2,
              borderRadius: radius.md,
              padding: spacing.sm,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 22,
                fontWeight: '700',
                color: s.color,
                fontFamily: colors.mono,
                letterSpacing: -0.5,
              }}>
                {s.val}
              </Text>
              <Text style={{ ...LABEL, marginTop: 3 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {FILTERS.map(f => (
            <FilterTab
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
              badge={f.key === 'unread' ? unread : f.key === 'critical' ? critCount : f.key === 'warning' ? warnCount : 0}
            />
          ))}
        </View>
      </ScrollView>

      {/* alert list */}
      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: radius.md,
        overflow: 'hidden',
      }}>
        {loading ? (
          <LoadingState message="Loading security events..." />
        ) : filtered.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ ...LABEL, fontSize: 10 }}>No events match filter</Text>
          </View>
        ) : (
          filtered.map((a, i) => (
            <AlertRow key={a.id} alert={a} isLast={i === filtered.length - 1} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
