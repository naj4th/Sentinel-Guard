import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { signIn } from '../src/services';
import { colors, radius, spacing } from '../src/theme';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e) {
      // Map Firebase error codes to readable messages
      const code = e?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('No internet connection. Please check your network.');
      } else {
        setError('Sign in failed. Please try again.');
        console.error('Login error:', e.code, e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}>

        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{
            width: 60, height: 60, borderRadius: 16,
            backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentB,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>Sentinel Guard</Text>
          <Text style={{ fontSize: 13, color: colors.text3, marginTop: 4 }}>Secure IoT Monitoring</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.lg }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Sign in</Text>
          <Text style={{ fontSize: 13, color: colors.text3, marginBottom: 24 }}>Access the IoT security dashboard</Text>

          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text2, marginBottom: 6 }}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={{
              backgroundColor: colors.bg3, borderWidth: 1,
              borderColor: colors.border2, borderRadius: radius.md,
              padding: 11, color: colors.text, fontSize: 14, marginBottom: 14,
            }}
            placeholderTextColor={colors.text3}
            placeholder="your@email.com"
          />

          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text2, marginBottom: 6 }}>Password</Text>
          <TextInput
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
            secureTextEntry
            editable={!loading}
            style={{
              backgroundColor: colors.bg3, borderWidth: 1,
              borderColor: colors.border2, borderRadius: radius.md,
              padding: 11, color: colors.text, fontSize: 14, marginBottom: 20,
            }}
            placeholderTextColor={colors.text3}
            placeholder="••••••••"
            onSubmitEditing={handleLogin}
          />

          {!!error && (
            <View style={{ backgroundColor: colors.redBg, borderWidth: 1, borderColor: colors.redB, borderRadius: radius.md, padding: 10, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.red, textAlign: 'center' }}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: colors.accent, borderRadius: radius.md,
              padding: 13, alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <ActivityIndicator color="#fff" size="small" />}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, color: colors.text3, textAlign: 'center', marginTop: 12, fontFamily: colors.mono }}>
            Use your Firebase Auth credentials
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
