import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MapComponent from '@/components/MapComponent';
import { useIssueStore, Issue } from '../store/useIssueStore';
import { Theme, IssueCategory, IssueStatus } from '../styles/theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function MapScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { issues, filters, setFilter, loading } = useIssueStore();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Categories list
  const categoriesList: { value: IssueCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'pothole', label: 'Potholes' },
    { value: 'water_leakage', label: 'Water Leaks' },
    { value: 'streetlight', label: 'Streetlights' },
    { value: 'waste_management', label: 'Waste Mgmt' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'public_property_damage', label: 'Prop Damage' },
    { value: 'other', label: 'Other' },
  ];

  // Statuses list
  const statusesList: { value: IssueStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'reported', label: 'Reported' },
    { value: 'verified', label: 'Verified' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  // Filter issues based on active store filter states
  const filteredIssues = issues.filter((iss) => {
    const matchCategory = filters.category === 'all' || iss.category === filters.category;
    const matchStatus = filters.status === 'all' || iss.status === filters.status;
    return matchCategory && matchStatus;
  });

  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  const handleClearFilters = () => {
    setFilter('category', 'all');
    setFilter('status', 'all');
    setSelectedIssue(null);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.branding}>
              CIVIC ACTION HUB
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Report issues, verify status, and improve your neighborhood.
            </ThemedText>
          </View>
          {loading && <ActivityIndicator color={Theme.colors.primary} size="small" />}
        </View>

        {/* Bounded Scrollview for Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {categoriesList.map((cat) => {
              const isActive = filters.category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => setFilter('category', cat.value)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? Theme.colors.primary : colors.backgroundElement,
                      borderColor: isActive ? Theme.colors.primary : 'rgba(99, 102, 241, 0.1)',
                    },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: isActive ? '#ffffff' : colors.textSecondary }}
                  >
                    {cat.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginTop: Spacing.one }]}>
            {statusesList.map((stat) => {
              const isActive = filters.status === stat.value;
              return (
                <Pressable
                  key={stat.value}
                  onPress={() => setFilter('status', stat.value)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? Theme.colors.secondary : colors.backgroundElement,
                      borderColor: isActive ? Theme.colors.secondary : 'rgba(16, 185, 129, 0.1)',
                    },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: isActive ? '#ffffff' : colors.textSecondary }}
                  >
                    {stat.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapComponent
            issues={filteredIssues}
            selectedIssue={selectedIssue}
            onSelectIssue={handleSelectIssue}
          />
        </View>

        {/* Issue Details Sheet / Bottom Container */}
        <View style={styles.detailsContainer}>
          {selectedIssue ? (
            <Pressable 
              onPress={() => router.push(`/issue/${selectedIssue.id}`)}
              style={({ pressed }) => [
                styles.issueCard,
                { 
                  backgroundColor: colors.backgroundElement,
                  opacity: pressed ? 0.9 : 1.0,
                  borderColor: Theme.colors.categories[selectedIssue.category]?.color || 'transparent'
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleSection}>
                  <View style={[styles.badge, { backgroundColor: Theme.colors.status[selectedIssue.status]?.bg }]}>
                    <ThemedText type="smallBold" style={{ color: Theme.colors.status[selectedIssue.status]?.text, fontSize: 10 }}>
                      {Theme.colors.status[selectedIssue.status]?.label.toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: Theme.colors.severity[selectedIssue.severity], marginLeft: Spacing.one }]}>
                    <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 10 }}>
                      {selectedIssue.severity.toUpperCase()}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {new Date(selectedIssue.created_at).toLocaleDateString()}
                </ThemedText>
              </View>

              <View style={styles.cardContent}>
                {selectedIssue.media_url && (
                  <Image source={{ uri: selectedIssue.media_url }} style={styles.cardImage} />
                )}
                <View style={styles.cardText}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>
                    {selectedIssue.title}
                  </ThemedText>
                  <ThemedText type="small" numberOfLines={2} style={styles.cardDesc}>
                    {selectedIssue.ai_summary || selectedIssue.description}
                  </ThemedText>
                  <ThemedText type="small" style={styles.cardAddress}>
                    📍 {selectedIssue.address || 'Location captured'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  👍 {selectedIssue.verification_count} Confirmations
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: Theme.colors.primary }}>
                  View Timeline &rarr;
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ textAlign: 'center' }}>
                {filteredIssues.length > 0 ? "TAP A PIN TO VIEW DETAILS" : "NO ISSUES MATCH FILTERS"}
              </ThemedText>
              <ThemedText type="small" style={{ textAlign: 'center', color: colors.textSecondary, marginTop: Spacing.one }}>
                {filteredIssues.length > 0 
                  ? `Showing ${filteredIssues.length} active issues in your area.` 
                  : "Try clearing search filters or report a new problem in the 'Report' tab."}
              </ThemedText>
              {filteredIssues.length === 0 && (
                <Pressable onPress={handleClearFilters} style={styles.clearBtn}>
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>Clear Filters</ThemedText>
                </Pressable>
              )}
            </View>
          )}
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
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.two,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  branding: {
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  filterSection: {
    marginBottom: Spacing.one,
  },
  filterScroll: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsContainer: {
    minHeight: 140,
    justifyContent: 'center',
  },
  issueCard: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Theme.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardTitleSection: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  cardText: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    marginBottom: Spacing.one / 2,
  },
  cardDesc: {
    fontSize: 12,
    marginBottom: Spacing.one / 2,
  },
  cardAddress: {
    fontSize: 10,
    color: '#8E8E93',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.two,
  },
  emptyCard: {
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  clearBtn: {
    marginTop: Spacing.three,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
});
