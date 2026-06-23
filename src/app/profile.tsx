import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Switch, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '../store/useAuthStore';
import { useIssueStore } from '../store/useIssueStore';
import { Theme } from '../styles/theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { profile, badges, signOut, updateRole } = useAuthStore();
  const { issues } = useIssueStore();

  const handleLogout = async () => {
    await signOut();
    // Redirect or toast can happen. Store listener updates route automatically.
    Alert.alert('Logged Out', 'You have been signed out.');
  };

  // Switch between citizen and admin role for easy testing of administrator panel
  const handleToggleAdmin = (value: boolean) => {
    const nextRole = value ? 'admin' : 'citizen';
    updateRole(nextRole);
  };

  // Get user-specific reported issues count
  const myReportsCount = profile 
    ? issues.filter(i => i.reporter_id === profile.id).length
    : 0;

  // Badge library mapping
  const badgeDetails: Record<string, { icon: string; desc: string; color: string }> = {
    'First Milestone': { icon: '🎯', desc: 'Participated in a civic report or verification.', color: '#3B82F6' },
    'Community Watchdog': { icon: '🐕', desc: 'Submitted 10+ confirmations on neighborhood issues.', color: '#F59E0B' },
    'Problem Solver': { icon: '🛠️', desc: 'Had 5+ reported issues successfully resolved.', color: '#10B981' }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>CITIZEN PROFILE</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Your profile, achievements, points tracking, and roles configuration.
            </ThemedText>
          </View>

          {profile ? (
            <>
              {/* Profile Card Info */}
              <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement }]}>
                <Image 
                  source={{ uri: profile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' }} 
                  style={styles.avatar} 
                />
                <View style={styles.infoCol}>
                  <ThemedText type="title" style={styles.userName}>{profile.full_name}</ThemedText>
                  <View style={[styles.roleBadge, { backgroundColor: profile.role === 'admin' ? Theme.colors.status.assigned.bg : colors.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ fontSize: 10, color: profile.role === 'admin' ? Theme.colors.status.assigned.text : colors.textSecondary }}>
                      {profile.role.toUpperCase()} ROLE
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Statistics Grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="title" style={{ color: Theme.colors.secondary }}>{profile.points}</ThemedText>
                  <ThemedText type="smallBold" style={styles.statLabel}>POINTS</ThemedText>
                </View>

                <View style={[styles.statBox, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="title" style={{ color: Theme.colors.primary }}>{myReportsCount}</ThemedText>
                  <ThemedText type="smallBold" style={styles.statLabel}>REPORTS</ThemedText>
                </View>

                <View style={[styles.statBox, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="title" style={{ color: Theme.colors.accent }}>{badges.length}</ThemedText>
                  <ThemedText type="smallBold" style={styles.statLabel}>BADGES</ThemedText>
                </View>
              </View>

              {/* Badge achievements grid */}
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>🎖️ EARNED BADGES</ThemedText>
                {badges.length > 0 ? (
                  <View style={styles.badgesList}>
                    {badges.map((bName) => {
                      const bDetail = badgeDetails[bName] || { icon: '🏆', desc: 'Earned achievement.', color: '#6366F1' };
                      return (
                        <View key={bName} style={[styles.badgeCard, { backgroundColor: colors.backgroundElement, borderLeftColor: bDetail.color }]}>
                          <ThemedText type="subtitle" style={styles.badgeIcon}>{bDetail.icon}</ThemedText>
                          <View style={styles.badgeTextCol}>
                            <ThemedText type="smallBold">{bName}</ThemedText>
                            <ThemedText type="small" style={{ color: colors.textSecondary }}>{bDetail.desc}</ThemedText>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>No badges earned yet. Start confirming reports nearby to earn your first medal!</ThemedText>
                  </View>
                )}
              </View>

              {/* Role Toggle Switch for Testing */}
              <View style={[styles.roleSwitchCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.switchInfo}>
                  <ThemedText type="smallBold">Simulate Administrator View</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Allows updating issue status (assigned, in_progress, resolved) on detail screens.
                  </ThemedText>
                </View>
                <Switch
                  value={profile.role === 'admin'}
                  onValueChange={handleToggleAdmin}
                  trackColor={{ false: '#374151', true: Theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Logout button */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  { 
                    backgroundColor: colors.backgroundElement,
                    opacity: pressed ? 0.8 : 1.0,
                    borderColor: 'rgba(239, 68, 68, 0.4)'
                  }
                ]}
              >
                <ThemedText type="smallBold" style={{ color: '#EF4444' }}>
                  LOG OUT SESSION
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold">NOT LOGGED IN</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
                Sign in to customize reports, earn community badges, and view contributions.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/login')}
                style={[styles.loginBtn, { backgroundColor: Theme.colors.primary }]}
              >
                <ThemedText type="smallBold" style={{ color: '#fff' }}>SIGN IN / SIGN UP</ThemedText>
              </Pressable>
            </View>
          )}

        </ScrollView>
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
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  scrollContent: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    marginBottom: Spacing.two,
  },
  headerTitle: {
    fontWeight: '800',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: Spacing.three,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#374151',
  },
  infoCol: {
    justifyContent: 'center',
    gap: Spacing.one / 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.0,
    color: '#8E8E93',
    marginTop: Spacing.one / 2,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  badgesList: {
    gap: Spacing.two,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 4,
  },
  badgeIcon: {
    fontSize: 24,
    marginRight: Spacing.three,
  },
  badgeTextCol: {
    flex: 1,
  },
  roleSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    marginTop: Spacing.one,
  },
  switchInfo: {
    flex: 1,
    marginRight: Spacing.two,
    gap: Spacing.one / 2,
  },
  logoutBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  emptyCard: {
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  loginBtn: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
});
