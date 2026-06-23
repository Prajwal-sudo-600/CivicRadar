import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useIssueStore } from '../store/useIssueStore';
import { useAuthStore } from '../store/useAuthStore';
import { Theme } from '../styles/theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function LeaderboardScreen() {
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { leaderboard } = useIssueStore();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('alltime');

  // Point scoring table details
  const pointsRules = [
    { action: 'Report an Infrastructure Issue', points: '+10 pts' },
    { action: 'Verify an Issue ("I see this too")', points: '+5 pts' },
    { action: 'Issue gets marked Resolved', points: '+20 pts bonus' },
    { action: 'Help flag Spam / Duplicates', points: '+5 pts' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>CITIZEN LEADERBOARD</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Recognizing civic heroes. Earn points by improving your neighborhood.
            </ThemedText>
          </View>

          {/* Timeframe tab selector */}
          <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundElement }]}>
            <Pressable
              onPress={() => setActiveTab('weekly')}
              style={[
                styles.tabBtn,
                { backgroundColor: activeTab === 'weekly' ? colors.backgroundSelected : 'transparent' }
              ]}
            >
              <ThemedText type="smallBold" style={{ color: activeTab === 'weekly' ? colors.text : colors.textSecondary }}>
                WEEKLY CHALLENGE
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={() => setActiveTab('alltime')}
              style={[
                styles.tabBtn,
                { backgroundColor: activeTab === 'alltime' ? colors.backgroundSelected : 'transparent' }
              ]}
            >
              <ThemedText type="smallBold" style={{ color: activeTab === 'alltime' ? colors.text : colors.textSecondary }}>
                ALL-TIME HEROES
              </ThemedText>
            </Pressable>
          </View>

          {/* Standings List */}
          <View style={styles.standingsList}>
            {leaderboard.map((item, index) => {
              const isCurrentUser = profile && profile.id === item.id;
              
              // Top 3 medals
              const getRankIcon = (rank: number) => {
                if (rank === 0) return '🥇';
                if (rank === 1) return '🥈';
                if (rank === 2) return '🥉';
                return `#${rank + 1}`;
              };

              return (
                <View
                  key={item.id}
                  style={[
                    styles.leaderRow,
                    { 
                      backgroundColor: colors.backgroundElement,
                      borderColor: isCurrentUser ? Theme.colors.primary : 'rgba(255,255,255,0.04)',
                      borderWidth: isCurrentUser ? 1.5 : 1
                    }
                  ]}
                >
                  <View style={styles.rankCol}>
                    <ThemedText type="smallBold" style={styles.rankText}>
                      {getRankIcon(index)}
                    </ThemedText>
                  </View>

                  <Image source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} style={styles.avatar} />

                  <View style={styles.nameCol}>
                    <ThemedText type="smallBold">
                      {item.full_name}
                    </ThemedText>
                    {isCurrentUser && (
                      <ThemedText type="small" style={{ color: Theme.colors.primary, fontSize: 10 }}>
                        YOUR CURRENT POSITION
                      </ThemedText>
                    )}
                  </View>

                  <View style={styles.pointsCol}>
                    <ThemedText type="smallBold" style={{ color: Theme.colors.secondary }}>
                      {item.points} pts
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Gamification point details rules card */}
          <View style={[styles.rulesCard, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.rulesTitle}>🏆 HOW TO EARN CIVIC RECOGNITION</ThemedText>
            <View style={styles.rulesList}>
              {pointsRules.map((rule, idx) => (
                <View key={idx} style={styles.ruleRow}>
                  <ThemedText type="small" style={styles.ruleName}>
                    {rule.action}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: Theme.colors.primary }}>
                    {rule.points}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

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
  tabsContainer: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingsList: {
    gap: Spacing.two,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankCol: {
    width: 36,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    marginRight: Spacing.two,
  },
  nameCol: {
    flex: 1,
  },
  pointsCol: {
    paddingHorizontal: Spacing.two,
  },
  rulesCard: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  rulesTitle: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  rulesList: {
    gap: Spacing.one,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one / 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  ruleName: {
    color: '#B0B4BA',
  },
});
