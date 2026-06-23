import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useIssueStore, Issue, IssueStatusHistory } from '../../store/useIssueStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Theme, IssueStatus } from '../../styles/theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function IssueDetailsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { id } = useLocalSearchParams();
  const { issues, addVerification, updateIssueStatus, fetchIssueHistory } = useIssueStore();
  const { profile } = useAuthStore();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [history, setHistory] = useState<IssueStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Admin controls state
  const [adminStatus, setAdminStatus] = useState<IssueStatus>('reported');
  const [adminNote, setAdminNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load the current issue from the store using the ID
  useEffect(() => {
    const activeIssue = issues.find(i => i.id === id);
    if (activeIssue) {
      const timer = setTimeout(() => {
        setIssue(activeIssue);
        setAdminStatus(activeIssue.status);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [issues, id]);

  // Load status history timeline
  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const hist = await fetchIssueHistory(id as string);
        setHistory(hist);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (id) {
      loadHistory();
    }
  }, [id, issue?.status, fetchIssueHistory]);

  // Confirm/Verify report
  const handleVerify = async () => {
    if (!issue) return;
    try {
      await addVerification(issue.id, 'confirm');
      Alert.alert('Verification Logged', 'Thank you! You earned +5 points.');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Already verified.');
    }
  };

  // Flag as Spam/Inaccurate
  const handleFlag = async (action: 'flag_duplicate' | 'flag_spam') => {
    if (!issue) return;
    try {
      await addVerification(issue.id, action);
      Alert.alert('Report Flagged', 'Our moderation queue has been updated.');
    } catch (err: any) {
      Alert.alert('Flag Failed', err.message || 'Already flagged.');
    }
  };

  // Admin status update
  const handleUpdateStatus = async () => {
    if (!issue) return;
    setUpdatingStatus(true);
    try {
      await updateIssueStatus(issue.id, adminStatus, adminNote.trim() || undefined);
      setAdminNote('');
      Alert.alert('Status Updated', `Issue is now marked as ${Theme.colors.status[adminStatus].label}.`);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!issue) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <ThemedText type="small" style={{ marginTop: Spacing.two }}>Loading issue details...</ThemedText>
      </ThemedView>
    );
  }

  const categoryTheme = Theme.colors.categories[issue.category] || Theme.colors.categories.other;
  const statusTheme = Theme.colors.status[issue.status] || Theme.colors.status.reported;
  const isAdmin = profile && profile.role === 'admin';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Top Bar Navigation */}
          <View style={styles.topNav}>
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold">&larr; Back to Map</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>ISSUE #{issue.id.slice(0, 8).toUpperCase()}</ThemedText>
          </View>

          {/* Photo banner */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: issue.media_url || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800' }} style={styles.image} />
            
            <View style={styles.badgesOverlay}>
              <View style={[styles.overlayBadge, { backgroundColor: statusTheme.bg }]}>
                <ThemedText type="smallBold" style={{ color: statusTheme.text, fontSize: 10 }}>
                  {statusTheme.label.toUpperCase()}
                </ThemedText>
              </View>
              <View style={[styles.overlayBadge, { backgroundColor: Theme.colors.severity[issue.severity], marginLeft: Spacing.one }]}>
                <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 10 }}>
                  {issue.severity.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Issue Header Info */}
          <View style={styles.metaSection}>
            <ThemedText type="subtitle" style={styles.issueTitle}>{issue.title}</ThemedText>
            <ThemedText type="small" style={[styles.categoryText, { color: categoryTheme.color }]}>
              {categoryTheme.label.toUpperCase()} • 📍 {issue.address || 'Address captured'}
            </ThemedText>
            
            {/* AI Summary Banner */}
            {issue.ai_summary && (
              <View style={[styles.aiSummaryCard, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.aiLabel}>🤖 GEMINI AI SUMMARY</ThemedText>
                <ThemedText type="small" style={styles.aiText}>{issue.ai_summary}</ThemedText>
                {issue.ai_confidence_score !== null && (
                  <ThemedText type="small" style={styles.aiConfidence}>
                    Confidence Score: {Math.round(issue.ai_confidence_score * 100)}% 
                    {issue.is_duplicate_suspect && ' • ⚠️ DUPLICATE SUSPECT'}
                  </ThemedText>
                )}
              </View>
            )}

            <ThemedText type="small" style={[styles.descText, { color: colors.text }]}>
              {issue.description || 'No description details provided.'}
            </ThemedText>

            <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 10, marginTop: Spacing.one }}>
              Reported by {issue.reporter_name || 'Anonymous'} on {new Date(issue.created_at).toLocaleString()}
            </ThemedText>
          </View>

          {/* Citizen Verification Action Buttons */}
          <View style={[styles.verifyCard, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>COMMUNITY VALIDATION</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.two }}>
              Are you seeing this issue too? Confirm to prioritize it for public crews, or flag duplicates.
            </ThemedText>

            <View style={styles.verifyRow}>
              <Pressable
                onPress={handleVerify}
                style={[styles.actionBtn, { backgroundColor: Theme.colors.secondary }]}
              >
                <ThemedText type="smallBold" style={{ color: '#fff' }}>👍 Confirm ({issue.verification_count})</ThemedText>
              </Pressable>
              
              <Pressable
                onPress={() => handleFlag('flag_spam')}
                style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444' }]}
              >
                <ThemedText type="smallBold" style={{ color: '#EF4444' }}>⚠️ Flag Spam</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Audit History Timeline */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>RESOLUTION TIMELINE</ThemedText>
            {loadingHistory ? (
              <ActivityIndicator color={Theme.colors.primary} size="small" />
            ) : (
              <View style={styles.timeline}>
                {history.map((hist, idx) => {
                  const isLast = idx === history.length - 1;
                  return (
                    <View key={hist.id} style={styles.timelineItem}>
                      <View style={styles.timelineNodeContainer}>
                        <View style={[styles.timelineNode, { backgroundColor: Theme.colors.status[hist.status]?.bg || Theme.colors.primary }]} />
                        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.backgroundSelected }]} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <ThemedText type="smallBold" style={{ color: Theme.colors.status[hist.status]?.text }}>
                            {Theme.colors.status[hist.status]?.label.toUpperCase()}
                          </ThemedText>
                          <ThemedText type="small" style={styles.timelineTime}>
                            {new Date(hist.created_at).toLocaleDateString()}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" style={{ marginTop: 2 }}>{hist.note || 'No notes added.'}</ThemedText>
                        <ThemedText type="small" style={styles.timelineReporter}>
                          Updated by: {hist.changed_by_name || 'System / Admin'}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Admin status update controls Panel */}
          {isAdmin && (
            <View style={[styles.adminCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ color: Theme.colors.primary, letterSpacing: 1.0 }}>
                🛠️ ADMINISTRATOR RESOLUTION PANEL
              </ThemedText>
              
              <ThemedText type="small" style={[styles.label, { marginTop: Spacing.two }]}>ASSIGN STATUS</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminStatusScroll}>
                {(['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'] as IssueStatus[]).map((st) => {
                  const isSel = adminStatus === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setAdminStatus(st)}
                      style={[
                        styles.adminStatusBtn,
                        {
                          backgroundColor: isSel ? Theme.colors.status[st].bg : colors.backgroundSelected,
                          borderColor: isSel ? Theme.colors.status[st].text : 'transparent',
                          borderWidth: 1
                        }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ fontSize: 10, color: isSel ? Theme.colors.status[st].text : colors.textSecondary }}>
                        {Theme.colors.status[st].label.toUpperCase()}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ThemedText type="smallBold" style={[styles.label, { marginTop: Spacing.two }]}>RESOLUTION NOTE</ThemedText>
              <TextInput
                value={adminNote}
                onChangeText={setAdminNote}
                placeholder="e.g. Assigned to crew #4, pothole set to fill on Wed morning."
                placeholderTextColor={colors.textSecondary}
                style={[styles.adminInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.backgroundSelected }]}
              />

              <Pressable
                onPress={handleUpdateStatus}
                disabled={updatingStatus}
                style={({ pressed }) => [
                  styles.adminSubmitBtn,
                  {
                    backgroundColor: Theme.colors.primary,
                    opacity: pressed || updatingStatus ? 0.8 : 1.0
                  }
                ]}
              >
                {updatingStatus ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>UPDATE STATUS HISTORY (+20 PTS REPORTER BONUS)</ThemedText>
                )}
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
  },
  scrollContent: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    paddingBottom: 64,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  backBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  imageContainer: {
    position: 'relative',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgesOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
  },
  overlayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaSection: {
    gap: Spacing.one,
  },
  issueTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  aiSummaryCard: {
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  aiLabel: {
    fontSize: 9,
    color: '#8B5CF6',
    letterSpacing: 1.0,
  },
  aiText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  aiConfidence: {
    fontSize: 9,
    color: '#8E8E93',
  },
  verifyCard: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
    marginBottom: Spacing.one,
  },
  verifyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    paddingLeft: Spacing.two,
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  timelineNodeContainer: {
    width: 16,
    alignItems: 'center',
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 14,
    bottom: -16,
    width: 2,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.two,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTime: {
    fontSize: 10,
    color: '#8E8E93',
  },
  timelineReporter: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 4,
  },
  adminCard: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#8E8E93',
  },
  adminStatusScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  adminStatusBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  adminInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    fontSize: 12,
  },
  adminSubmitBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
});
