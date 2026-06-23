import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '../../store/useAuthStore';
import { Theme } from '../../styles/theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { signUp, loading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Empty Fields', 'Please fill in all fields.');
      return;
    }

    try {
      await signUp(email.trim(), password.trim(), fullName.trim());
      router.replace('/profile');
      Alert.alert('Registration Successful', 'Welcome to Civic Hero! You earned +10 points.');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message || 'Error occurred.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          <View style={styles.logoSection}>
            <ThemedText type="title" style={styles.logoText}>Create Account</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Join your neighbors and start improving neighborhood infrastructure.
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <ThemedText type="smallBold" style={styles.label}>FULL NAME</ThemedText>
            <TextInput
              value={fullName}
              onChangeText={(t) => { setFullName(t); clearError(); }}
              placeholder="Jane Doe"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
            />

            <BaseLabel label="EMAIL ADDRESS" marginTop={Spacing.two} colors={colors} />
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              placeholder="jane.doe@example.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
            />

            <BaseLabel label="PASSWORD" marginTop={Spacing.two} colors={colors} />
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
              onPress={handleSignup}
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
                <ThemedText type="smallBold" style={{ color: '#fff' }}>SIGN UP</ThemedText>
              )}
            </Pressable>
          </View>

          {/* Links */}
          <View style={styles.footerLinks}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Already have an account?{' '}
            </ThemedText>
            <Link href="/login" asChild>
              <Pressable>
                <ThemedText type="smallBold" style={{ color: Theme.colors.primary }}>
                  Sign In &rarr;
                </ThemedText>
              </Pressable>
            </Link>
          </View>

        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

// Helper simple label
function BaseLabel({ label, marginTop = 0, colors }: { label: string; marginTop?: number; colors: any }) {
  return (
    <ThemedText type="smallBold" style={[styles.label, { marginTop }]}>
      {label}
    </ThemedText>
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
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
