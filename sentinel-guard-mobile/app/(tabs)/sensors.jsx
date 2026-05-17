import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useSensors, useSensorHistory } from '../../src/hooks/useData';
import { LiveDot, LoadingState } from '../../src/components/UI';
import Sparkline from '../../src/components/Sparkline';
import { colors, spacing, radius } from '../../src/theme';

const THRESHOLDS = { temp: 35, humidity: 75 };

const LABEL = {
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 1.1,
  textTransform: 'uppercase',
  color: colors.text3,
  fontFamily: colors.mono,
};

// section label
function SectionLabel({ children, right }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
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

// individual sensor value block
function SensorBlock({ label, value, unit, status, threshold, sparkData, color, online }) {
  const isWarn = status === 'warn' && online;
  const displayColor = isWarn ? colors.amber : color;
  const showValue = online && value !== null && value !== undefined;

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.bg3,
      borderWidth: 1,
      borderColor: isWarn ? colors.amberB : colors.border2,
      borderRadius: radius.md,
      overflow: 'hidden',
    }}>
      {/* Colored top bar */}
      <View style={{
        height: 2,
        backgroundColor: displayColor,
        opacity: isWarn ? 0.9 : 0.5,
      }} />

      <View style={{ padding: spacing.sm + 2 }}>
        <Text style={LABEL}>{label}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1, marginTop: 6 }}>
          <Text style={{
            fontSize: 28,
            fontWeight: '700',
            color: showValue ? displayColor : colors.text3,
            fontFamily: colors.mono,
            letterSpacing: -0.5,
          }}>
            {showValue ? value : '?'}
          </Text>
          {showValue && (
            <Text style={{ fontSize: 13, color: colors.text3, fontWeight: '400', marginBottom: 2 }}>
              {unit}
            </Text>
          )}
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 3,
          marginBottom: 8,
        }}>
          <Text style={{
            fontSize: 9,
            fontWeight: '700',
            color: !online ? colors.text3 : isWarn ? colors.amber : colors.green,
            letterSpacing: 0.5,
          }}>
            {!online ? 'OFFLINE' : isWarn ? `▲ ${threshold}${unit} THRESH` : '✓ NORMAL'}
          </Text>
        </View>

        {online && sparkData?.length > 0
          ? <Sparkline data={sparkData} color={displayColor} height={40} />
          : <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 9, color: colors.textDim }}>no data</Text>
            </View>
        }
      </View>
    </View>
  );
}

// selector pill
function SelectorPill({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: active ? colors.accentB : colors.border,
        backgroundColor: active ? colors.accentDim : colors.bg4,
      }}
    >
      <Text style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
        color: active ? colors.accent : colors.text3,
        fontFamily: colors.mono,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// screen
export default function SensorsScreen() {
  const { data: sensors, loading } = useSensors();
  const [hours, setHours]           = useState(24);
  const [refreshing, setRefreshing] = useState(false);
  const { data: history, loading: histLoading } = useSensorHistory('node_01', hours);

  const node1 = sensors?.[0];

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 700));
    setRefreshing(false);
  };

  const h = history || [];
  const n1TempData = h.map(x => x.node01_temp).filter(v => v !== null);
  const n1HumData  = h.map(x => x.node01_humidity).filter(v => v !== null);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* header */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.text3, fontFamily: colors.mono }}>
          SENTINEL GUARD
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.3, marginTop: 2 }}>
          Sensor data
        </Text>
        <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono, marginTop: 3 }}>
          ESP32 · DHT22 · MQTT · onSnapshot
        </Text>
      </View>

      {/* node 01 */}
      <SectionLabel right={node1?.online ? <LiveDot /> : null}>
        Node 01 - live readings
      </SectionLabel>

      {loading ? (
        <LoadingState message="Loading sensor data..." />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <SensorBlock
            label="Temperature"
            value={node1?.temp}
            unit="°C"
            status={node1?.tempStatus}
            threshold={THRESHOLDS.temp}
            sparkData={n1TempData}
            color={colors.red}
            online={node1?.online}
          />
          <SensorBlock
            label="Humidity"
            value={node1?.humidity}
            unit="%"
            status={node1?.humStatus}
            threshold={THRESHOLDS.humidity}
            sparkData={n1HumData}
            color={colors.blue}
            online={node1?.online}
          />
        </View>
      )}

      {/* historical chart */}
      <SectionLabel>Historical readings</SectionLabel>

      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: radius.md,
        overflow: 'hidden',
        marginBottom: spacing.lg,
      }}>
        {/* Time range controls */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: spacing.sm + 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexWrap: 'wrap',
        }}>
          <Text style={{ ...LABEL, flex: 1 }}>Node 01</Text>
          {[1, 6, 24].map(hv => (
            <SelectorPill key={hv} label={`${hv}H`} active={hours === hv} onPress={() => setHours(hv)} />
          ))}
        </View>

        {histLoading ? (
          <LoadingState message="Loading history..." />
        ) : (
          <View style={{ padding: spacing.md, gap: spacing.md }}>
            {[
              { label: 'Temperature', data: n1TempData, color: colors.red },
              { label: 'Humidity',    data: n1HumData,  color: colors.blue },
            ].map(s => (
              <View key={s.label}>
                <Text style={{ ...LABEL, marginBottom: 6 }}>{s.label}</Text>
                <View style={{
                  backgroundColor: colors.bg4,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                }}>
                  {s.data.length > 0
                    ? <Sparkline data={s.data} color={s.color} height={56} />
                    : <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, color: colors.textDim }}>no history data</Text>
                      </View>
                  }
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* node status table */}
      <SectionLabel>Node status</SectionLabel>

      <View style={{
        backgroundColor: colors.bg3,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: radius.md,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg4,
        }}>
          {['Node', 'Address', 'Status'].map(h => (
            <Text key={h} style={{ ...LABEL, flex: 1 }}>{h}</Text>
          ))}
        </View>

        {/* Only Node 01 row - IP pulled from sensor doc if available, else show from node data */}
        {node1 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
          }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{
                width: 6,
                height: 6,
                borderRadius: 1,
                backgroundColor: node1.online ? colors.green : colors.red,
              }} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: colors.mono }}>
                01
              </Text>
            </View>

            <Text style={{ flex: 1, fontSize: 11, color: colors.text3, fontFamily: colors.mono }}>
              {node1.ip ?? node1.ipAddress ?? '?'}
            </Text>

            <View style={{ flex: 1 }}>
              <View style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.xs,
                borderWidth: 1,
                borderColor: node1.online ? colors.greenB : colors.redB,
                backgroundColor: node1.online ? colors.greenBg : colors.redBg,
              }}>
                <Text style={{
                  fontSize: 9,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  color: node1.online ? colors.green : colors.red,
                }}>
                  {node1.online ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!loading && !node1 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textDim, letterSpacing: 1 }}>
              NO NODE DATA
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
