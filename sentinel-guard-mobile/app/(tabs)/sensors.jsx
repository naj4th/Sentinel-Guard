import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useSensors, useSensorHistory } from '../../src/hooks/useData';
import { Card, CardHeader, LiveDot, Badge, LoadingState, Button } from '../../src/components/UI';
import Sparkline from '../../src/components/Sparkline';
import { colors, spacing, radius } from '../../src/theme';

const THRESHOLDS = { temp: 35, humidity: 75, soil: 70 };

function SensorBlock({ label, value, unit, status, threshold, sparkData, color }) {
  const isWarn = status === 'warn';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg3, borderWidth: 1, borderColor: isWarn ? colors.amberB : colors.border, borderRadius: radius.lg, padding: spacing.md, overflow: 'hidden' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>{label}</Text>
      <Text style={{ fontSize: 30, fontWeight: '700', color: isWarn ? colors.amber : color, fontFamily: colors.mono, letterSpacing: -0.5 }}>
        {value}<Text style={{ fontSize: 14, color: colors.text2 }}>{unit}</Text>
      </Text>
      <Text style={{ fontSize: 10, color: isWarn ? colors.amber : colors.green, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
        {isWarn ? `⚠ Above ${threshold}${unit}` : `✓ Normal`}
      </Text>
      <Sparkline data={sparkData} color={isWarn ? colors.amber : color} height={44} />
    </View>
  );
}

export default function SensorsScreen() {
  const { data: sensors, loading } = useSensors();
  const [activeNode, setActiveNode] = useState('node_01');
  const [hours, setHours] = useState(24);
  const [refreshing, setRefreshing] = useState(false);
  const { data: history, loading: histLoading } = useSensorHistory(activeNode, hours);

  const node1 = sensors?.[0];
  const node2 = sensors?.[1];

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 700));
    setRefreshing(false);
  };

  const h = history || [];
  const n1TempData = h.map(x => x.node01_temp);
  const n1HumData  = h.map(x => x.node01_humidity);
  const n1SoilData = h.map(x => x.node01_soil);
  const n2TempData = h.map(x => x.node02_temp);
  const n2HumData  = h.map(x => x.node02_humidity);
  const n2SoilData = h.map(x => x.node02_soil);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={{ marginBottom: spacing.lg, paddingTop: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>Sensor data</Text>
        <Text style={{ fontSize: 12, color: colors.text3, fontFamily: colors.mono, marginTop: 2 }}>
          ESP32 · DHT22 · Soil moisture · onSnapshot
        </Text>
      </View>

      {/* Node 01 cards */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: colors.mono }}>
        Node 01 — Live readings
      </Text>

      {loading ? <LoadingState message="Loading sensor data…" /> : (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <SensorBlock label="Temperature" value={node1?.temp} unit="°C" status={node1?.tempStatus} threshold={THRESHOLDS.temp} sparkData={n1TempData} color={colors.red} />
            <SensorBlock label="Humidity"    value={node1?.humidity} unit="%" status={node1?.humStatus} threshold={THRESHOLDS.humidity} sparkData={n1HumData} color={colors.blue} />
          </View>
          <View style={{ marginBottom: spacing.md }}>
            <SensorBlock label="Soil moisture" value={node1?.soil} unit="%" status={node1?.soilStatus} threshold={THRESHOLDS.soil} sparkData={n1SoilData} color={colors.green} />
          </View>

          {/* Node 02 cards */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: colors.mono }}>
            Node 02 — Live readings
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <SensorBlock label="Temperature" value={node2?.temp} unit="°C" status={node2?.tempStatus} threshold={THRESHOLDS.temp} sparkData={n2TempData} color={colors.red} />
            <SensorBlock label="Humidity"    value={node2?.humidity} unit="%" status={node2?.humStatus} threshold={THRESHOLDS.humidity} sparkData={n2HumData} color={colors.blue} />
          </View>
          <View style={{ marginBottom: spacing.md }}>
            <SensorBlock label="Soil moisture" value={node2?.soil} unit="%" status={node2?.soilStatus} threshold={THRESHOLDS.soil} sparkData={n2SoilData} color={colors.green} />
          </View>
        </>
      )}

      {/* Historical chart */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader
          title="Historical readings"
          right={<LiveDot />}
        />

        {/* Node selector */}
        <View style={{ flexDirection: 'row', gap: 8, padding: spacing.md, paddingBottom: 0 }}>
          {['node_01','node_02'].map(n => (
            <TouchableOpacity key={n}
              onPress={() => setActiveNode(n)}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1,
                borderColor: activeNode === n ? colors.accentB : colors.border,
                backgroundColor: activeNode === n ? colors.accentBg : colors.bg3 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: activeNode === n ? colors.accent : colors.text2 }}>
                {n.replace('_','').toUpperCase().replace('NODE0','Node ')}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          {[1, 6, 24].map(h => (
            <TouchableOpacity key={h} onPress={() => setHours(h)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1,
                borderColor: hours === h ? colors.accentB : colors.border,
                backgroundColor: hours === h ? colors.accentBg : colors.bg3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: hours === h ? colors.accent : colors.text3 }}>{h}h</Text>
            </TouchableOpacity>
          ))}
        </View>

        {histLoading ? <LoadingState message="Loading history…" /> : (
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            {activeNode === 'node_01' ? (
              <>
                <View>
                  <Text style={{ fontSize: 10, color: colors.red, fontWeight: '600', marginBottom: 4 }}>Temperature</Text>
                  <Sparkline data={n1TempData} color={colors.red} height={50} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.blue, fontWeight: '600', marginBottom: 4 }}>Humidity</Text>
                  <Sparkline data={n1HumData} color={colors.blue} height={50} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.green, fontWeight: '600', marginBottom: 4 }}>Soil moisture</Text>
                  <Sparkline data={n1SoilData} color={colors.green} height={50} />
                </View>
              </>
            ) : (
              <>
                <View>
                  <Text style={{ fontSize: 10, color: colors.red, fontWeight: '600', marginBottom: 4 }}>Temperature</Text>
                  <Sparkline data={n2TempData} color={colors.red} height={50} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.blue, fontWeight: '600', marginBottom: 4 }}>Humidity</Text>
                  <Sparkline data={n2HumData} color={colors.blue} height={50} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.green, fontWeight: '600', marginBottom: 4 }}>Soil moisture</Text>
                  <Sparkline data={n2SoilData} color={colors.green} height={50} />
                </View>
              </>
            )}
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono }}>{hours}h ago</Text>
          <Text style={{ fontSize: 10, color: colors.text3, fontFamily: colors.mono }}>Now</Text>
        </View>
      </Card>

      {/* Node status table */}
      <Card>
        <CardHeader title="Node status" />
        {[node1, node2].map((n, i) => n && (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: colors.border, gap: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.online ? colors.green : colors.red }} />
            <Text style={{ fontWeight: '600', color: colors.text, flex: 1 }}>Node 0{i+1}</Text>
            <Text style={{ fontSize: 11, color: colors.text3, fontFamily: colors.mono, flex: 1 }}>192.168.1.{10+i}</Text>
            <Badge type={n.online ? 'ok' : 'critical'} label={n.online ? 'Online' : 'Offline'} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
