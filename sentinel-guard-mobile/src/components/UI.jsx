import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../theme';

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ type, label }) {
  const styles = {
    admin:    { bg: colors.accentBg, color: colors.accent,  border: colors.accentB },
    standard: { bg: colors.amberBg,  color: colors.amber,   border: colors.amberB },
    critical: { bg: colors.redBg,    color: colors.red,     border: colors.redB },
    warning:  { bg: colors.amberBg,  color: colors.amber,   border: colors.amberB },
    ok:       { bg: colors.greenBg,  color: colors.green,   border: colors.greenB },
    info:     { bg: colors.blueBg,   color: colors.blue,    border: colors.blueB },
    neutral:  { bg: colors.bg3,      color: colors.text2,   border: colors.border2 },
    attack:   { bg: colors.redBg,    color: colors.red,     border: colors.redB },
    anomaly:  { bg: colors.amberBg,  color: colors.amber,   border: colors.amberB },
    normal:   { bg: colors.greenBg,  color: colors.green,   border: colors.greenB },
    false_pos:{ bg: colors.blueBg,   color: colors.blue,    border: colors.blueB },
  };
  const s = styles[type] || styles.neutral;
  return (
    <View style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color: s.color, fontSize: 10, fontWeight: '700', fontFamily: colors.mono, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[{ backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

// ── Card header ───────────────────────────────────────────────────────────────
export function CardHeader({ title, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{title}</Text>
      {right}
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, variant }) {
  const borderColor = variant === 'ok' ? colors.greenB : variant === 'warn' ? colors.amberB : variant === 'danger' ? colors.redB : colors.border;
  const valColor    = variant === 'ok' ? colors.green  : variant === 'warn' ? colors.amber  : variant === 'danger' ? colors.red    : colors.text;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg2, borderWidth: 1, borderColor, borderRadius: radius.lg, padding: spacing.md }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: '700', color: valColor, fontFamily: colors.mono, letterSpacing: -0.5, marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.text3 }}>{sub}</Text>
    </View>
  );
}

// ── Live dot ──────────────────────────────────────────────────────────────────
export function LiveDot() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.green, fontFamily: colors.mono }}>Live</Text>
    </View>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading…' }) {
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ fontSize: 13, color: colors.text3 }}>{message}</Text>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ title, subtitle }) {
  return (
    <View style={{ padding: 48, alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 32 }}>🛡️</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>{subtitle}</Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ label, onPress, variant = 'default', small, disabled, loading }) {
  const bg      = variant === 'primary' ? colors.accent    : variant === 'danger' ? colors.redBg    : colors.bg3;
  const bdr     = variant === 'primary' ? colors.accentB   : variant === 'danger' ? colors.redB     : colors.border2;
  const txtClr  = variant === 'primary' ? '#fff'           : variant === 'danger' ? colors.red      : colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{ backgroundColor: bg, borderWidth: 1, borderColor: bdr, borderRadius: radius.md, paddingHorizontal: small ? 12 : 16, paddingVertical: small ? 6 : 9, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: disabled ? 0.5 : 1 }}
    >
      {loading && <ActivityIndicator size="small" color={txtClr} />}
      <Text style={{ fontSize: small ? 12 : 13, fontWeight: '600', color: txtClr }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: colors.mono }}>{title}</Text>
      {right}
    </View>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ initials, color = 'accent', size = 36 }) {
  const bg  = color === 'green' ? colors.greenBg : color === 'amber' ? colors.amberBg : colors.accentBg;
  const clr = color === 'green' ? colors.green   : color === 'amber' ? colors.amber   : colors.accent;
  const bdr = color === 'green' ? colors.greenB  : color === 'amber' ? colors.amberB  : colors.accentB;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.25, backgroundColor: bg, borderWidth: 1, borderColor: bdr, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.3, fontWeight: '700', color: clr }}>{initials}</Text>
    </View>
  );
}
