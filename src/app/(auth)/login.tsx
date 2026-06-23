import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '../../store/useAuthStore';
import { Theme } from '../../styles/theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { signIn, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Empty Fields', 'Please fill in both email and password.');
      return;
    }

    try {
      await signIn(email.trim(), password.trim());
      router.replace('/profile');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Check credentials.');
    }
  };

  const handleMockLogin = async (isAdmin = false) => {
    try {
      const mockEmail = isAdmin ? 'admin@civichero.org' : 'jane.doe@civichero.org';
      await signIn(mockEmail, 'password');
      
      if (isAdmin) {
        useAuthStore.getState().updateRole('admin');
      }
      
      router.replace('/');
      Alert.alert('Mock Signed In', `Authenticated as a simulated ${isAdmin ? 'Admin' : 'Citizen'}.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          <View style={styles.logoSection}>
            <ThemedText type="title" style={{ fontSize: 32 }}>🚨</ThemedText>
            <ThemedText type="title" style={styles.logoText}>Civic Hero</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Connect. Verify. Track. Resolve.
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <ThemedText type="smallBold" style={styles.label}>EMAIL ADDRESS</ThemedText>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              placeholder="citizen@civichero.org"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
            />

            <ThemedText type="smallBold" style={[styles.label, { marginTop: Spacing.two }]}>PASSWORD</ThemedText>
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
            />

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: Theme.colors.primary,
                  opacity: pressed || loading ? 0.8 : 1.0,
                  marginTop: Spacing.four
                }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText type="smallBold" style={{ color: '#fff' }}>SIGN IN</ThemedText>
              )}
            </Pressable>
          </View>

          {/* Fallback Mock logins for easy testing */}
          <View style={styles.mockLoginsSection}>
            <ThemedText type="smallBold" style={styles.mockLabel}>QUICK TESTING SHIELD</ThemedText>
            <View style={styles.mockRow}>
              <Pressable
                onPress={() => handleMockLogin(false)}
                style={[styles.mockBtn, { backgroundColor: colors.backgroundElement }]}
              >
                <ThemedText type="smallBold" style={{ fontSize: 11 }}>Citizen Mode</ThemedText>
              </Pressable>
              
              <Pressable
                onPress={() => handleMockLogin(true)}
                style={[styles.mockBtn, { backgroundColor: colors.backgroundElement, borderColor: 'rgba(16, 185, 129, 0.2)' }]}
              >
                <ThemedText type="smallBold" style={{ fontSize: 11, color: Theme.colors.secondary }}>Admin Mode</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Links */}
          <View style={styles.footerLinks}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {"Don't have an account? "}
            </ThemedText>
            <Link href="/signup" asChild>
              <Pressable>
                <ThemedText type="smallBold" style={{ color: Theme.colors.primary }}>
                  Sign Up &rarr;
                </ThemedText>
              </Pressable>
            </Link>
          </View>

        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    justifyContent: 'center',
  },
  content: {
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  logoSection: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  logoText: {
    fontWeight: '800',
    fontSize: 24,
  },
  form: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.medium,
  },
  mockLoginsSection: {
    marginTop: Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
  },
  mockLabel: {
    fontSize: 9,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  mockRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mockBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
