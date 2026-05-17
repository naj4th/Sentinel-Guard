import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSensors, useAlerts, useStats, useSensorHistory } from '../../src/hooks/useData';
import { LiveDot, LoadingState } from '../../src/components/UI';
import Sparkline from '../../src/components/Sparkline';
import { colors, spacing, radius } from '../../src/theme';
import { onAuthChange } from '../../src/services';

const LABEL = {
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 1.1,
  textTransform: 'uppercase',
  color: colors.text3,
  fontFamily: colors.mono,
};

function SectionLabel({ children, right }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
      paddingHorizontal: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 2, height: 10, backgroundColor: colors.accent, borderRadius: 1 }} />
        <Text style={LABEL}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

function MetricTile({ label, value, sub, variant }) {
  const variantColors = {
    ok:      { val: colors.green,  bg: colors.greenBg,  bd: colors.greenB  },
    danger:  { val: colors.red,    bg: colors.redBg,    bd: colors.redB    },
    warn:    { val: colors.amber,  bg: colors.amberBg,  bd: colors.amberB  },
    info:    { val: colors.blue,   bg: colors.blueBg,   bd: colors.blueB   },
    neutral: { val: colors.text2,  bg: colors.bg3,      bd: colors.border  },
  };
  const v = variantColors[variant] || variantColors.neutral;

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.bg3,
      borderWidth: 1,
      borderColor: colors.border2,
      borderRadius: radius.md,
      padding: spacing.sm + 4,
      gap: 2,
    }}>
      <Text style={LABEL}>{label}</Text>
      <Text style={{
        fontSize: 22,
        fontWeight: '700',
        color: v.val,
        fontFamily: colors.mono,
        letterSpacing: -0.5,
        marginTop: 2,
      }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: colors.text3, marginTop: 1 }}>{sub}</Text>
      <View style={{
        height: 2,
        backgroundColor: v.val,
        borderRadius: 1,
        marginTop: 6,
        opacity: 0.5,
      }} />
    </View>
  );
}

function SensorReadingRow({ title, value, unit, status, color, history, online }) {
  const isWarn = status === 'warn' && online;
  const displayColor = isWarn ? colors.amber : color;
  const showValue = online && value !== null && value !== undefined;

  return (
    <View style={{
      backgroundColor: colors.bg3,
      borderWidth: 1,
      borderColor: isWarn ? colors.amberB : colors.border,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm + 2,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={LABEL}>{title}</Text>
          {online && <LiveDot />}
        </View>
        {isWarn && (
          <View style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            backgroundColor: colors.amberBg,
            borderWidth: 1,
            borderColor: colors.amberB,
            borderRadius: radius.sm,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber, letterSpacing: 0.5 }}>WARN</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: 0 }}>
        <View style={{ paddingVertical: spacing.sm }}>
          <Text style={{
            fontSize: 32,
            fontWeight: '700',
            color: showValue ? displayColor : colors.text3,
            fontFamily: colors.mono,
            letterSpacing: -1,
          }}>
            {showValue ? value : '?'}
            {showValue && <Text style={{ fontSize: 14, color: colors.text3, fontWeight: '400' }}>{unit}</Text>}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          {online && history?.length > 0
            ? <Sparkline data={history} color={displayColor} height={52} />
            : <View style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10, color: colors.textDim }}>{online ? 'no data' : 'offline'}</Text>
              </View>
          }
        </View>
      </View>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <Text style={{ ...LABEL, fontSize: 8 }}>─ older</Text>
        <Text style={{ ...LABEL, fontSize: 8 }}>now ─</Text>
      </View>
    </View>
  );
}

function AlertRow({ alert, isLast }) {
  const isCrit = alert.severity === 'critical';
  const isWarn = alert.severity === 'warning';
  const dotColor = isCrit ? colors.red : isWarn ? colors.amber : colors.text3;

  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/alerts')}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: spacing.md,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        backgroundColor: isCrit ? 'rgba(248,113,113,0.03)' : 'transparent',
      }}
    >
      <View style={{
        width: 2,
        height: '100%',
        minHeight: 36,
        backgroundColor: dotColor,
        borderRadius: 1,
        opacity: 0.7,
        flexShrink: 0,
        marginTop: 1,
      }} />

      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 12,
          fontWeight: '500',
          color: colors.text,
          lineHeight: 17,
          marginBottom: 3,
        }} numberOfLines={2}>
          {alert.event}
        </Text>
        <Text style={{
          fontSize: 10,
          color: colors.text3,
          fontFamily: colors.mono,
        }}>
          {alert.node} · {alert.time}
        </Text>
      </View>

      <View style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: isCrit ? colors.redB : isWarn ? colors.amberB : colors.border,
        backgroundColor: isCrit ? colors.redBg : isWarn ? colors.amberBg : colors.bg4,
      }}>
        <Text style={{
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.5,
          color: isCrit ? colors.red : isWarn ? colors.amber : colors.text3,
        }}>
          {isCrit ? 'CRIT' : isWarn ? 'WARN' : 'INFO'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// screen
export default function HomeScreen() {
  const { data: sensors, loading: sensLoading } = useSensors();
  const { data: alerts,  loading: alertLoading } = useAlerts();
  const { data: stats,   loading: statsLoading } = useStats();
  const { data: history } = useSensorHistory('node_01', 20);
  const [refreshing, setRefreshing] = useState(false);
  const [userInitials, setUserInitials] = useState('');

  useEffect(() => {
    const unsub = onAuthChange(u => {
      if (u) setUserInitials(u.email?.slice(0, 2).toUpperCase() ?? '');
    });
    return unsub;
  }, []);

  const unread       = (alerts || []).filter(a => !a.read).length;
  const recentAlerts = (alerts || []).slice(0, 3);
  const node1        = sensors?.[0];
  const tempHistory  = (history || []).map(h => h.node01_temp).filter(v => v !== null);
  const humHistory   = (history || []).map(h => h.node01_humidity).filter(v => v !== null);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* top bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
      }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.text3, fontFamily: colors.mono }}>
            SENTINEL GUARD
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.3, marginTop: 2 }}>
            Dashboard
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: stats?.systemOnline ? colors.greenB : colors.border,
            backgroundColor: stats?.systemOnline ? colors.greenBg : colors.bg3,
          }}>
            <View style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: stats?.systemOnline ? colors.green : colors.text3,
            }} />
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: stats?.systemOnline ? colors.green : colors.text3 }}>
              {stats?.systemOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>

          {unread > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/alerts')}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.redB,
                backgroundColor: colors.redBg,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.red, letterSpacing: 0.5 }}>
                {unread} NEW
              </Text>
            </TouchableOpacity>
          )}

          {userInitials ? (
            <View style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              backgroundColor: colors.accentDim,
              borderWidth: 1,
              borderColor: colors.accentB,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent, fontFamily: colors.mono }}>
                {userInitials}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* stat grid */}
      {!statsLoading && (
        <>
          <SectionLabel>System overview</SectionLabel>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <MetricTile
              label="Status"
              value={stats?.systemOnline ? 'Online' : 'Offline'}
              sub={stats?.systemOnline ? 'sensor active' : 'no sensor data'}
              variant={stats?.systemOnline ? 'ok' : 'warn'}
            />
            <MetricTile
              label="Active alerts"
              value={stats?.activeAlerts ?? 0}
              sub={`${stats?.criticalAlerts ?? 0} critical`}
              variant={(stats?.activeAlerts ?? 0) > 0 ? 'danger' : 'ok'}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <MetricTile
              label="HMAC failures"
              value={stats?.hmacFailures ?? 0}
              sub="integrity checks"
              variant={(stats?.hmacFailures ?? 0) > 0 ? 'warn' : 'ok'}
            />
          </View>
        </>
      )}

      {/* node 01 live readings */}
      <SectionLabel right={node1?.online ? <LiveDot /> : null}>
        Node 01 - live readings
      </SectionLabel>

      {sensLoading ? (
        <LoadingState message="Loading sensor data..." />
      ) : (
        <>
          <SensorReadingRow
            title="Temperature"
            value={node1?.temp}
            unit="°C"
            status={node1?.tempStatus}
            color={colors.red}
            history={tempHistory}
            online={node1?.online}
          />
          <SensorReadingRow
            title="Humidity"
            value={node1?.humidity}
            unit="%"
            status={node1?.humStatus}
            color={colors.blue}
            history={humHistory}
            online={node1?.online}
          />
        </>
      )}

      {/* recent alerts */}
      <View style={{ marginTop: spacing.sm, marginBottom: 6 }}>
        <SectionLabel right={
          <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>
              VIEW ALL →
            </Text>
          </TouchableOpacity>
        }>
          Recent security events
        </SectionLabel>
      </View>

      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: radius.md,
        overflow: 'hidden',
        marginBottom: spacing.xl,
      }}>
        {alertLoading ? (
          <LoadingState message="Loading alerts..." />
        ) : recentAlerts.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textDim, letterSpacing: 1 }}>
              NO SECURITY EVENTS
            </Text>
          </View>
        ) : (
          recentAlerts.map((a, i) => (
            <AlertRow key={a.id} alert={a} isLast={i === recentAlerts.length - 1} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
