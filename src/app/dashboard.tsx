import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Path, Circle, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useIssueStore } from '../store/useIssueStore';
import { useAuthStore } from '../store/useAuthStore';
import { Theme, IssueCategory } from '../styles/theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const { issues, insights, leaderboard } = useIssueStore();
  const { profile } = useAuthStore();

  // 1. Calculate General Aggregations
  const totalReported = issues.length;
  const totalVerified = issues.filter(i => i.status === 'verified' || i.status === 'assigned' || i.status === 'in_progress').length;
  const totalResolved = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const resolutionRate = totalReported > 0 ? Math.round((totalResolved / totalReported) * 100) : 0;

  // 2. Group Issues by Category for Bar Chart
  const categoriesList = ['pothole', 'water_leakage', 'streetlight', 'waste_management', 'road_damage', 'drainage'];
  const categoryCounts = categoriesList.map(cat => {
    const count = issues.filter(i => i.category === cat).length;
    return {
      category: cat,
      label: Theme.colors.categories[cat as IssueCategory]?.label || cat,
      color: Theme.colors.categories[cat as IssueCategory]?.color || '#8E8E93',
      count
    };
  });
  const maxCategoryCount = Math.max(...categoryCounts.map(c => c.count), 1);

  // 3. Mock Monthly Trend Data for Line Chart
  const trendData = [20, 35, 45, 30, 55, 78]; // Resolved counts over 6 months
  const maxTrendVal = Math.max(...trendData, 1);
  const trendMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  // Helper to generate SVG Path points for line chart
  const getLinePath = (data: number[], width: number, height: number) => {
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    return data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - (val / maxTrendVal) * chartHeight;
      return { x, y };
    });
  };

  const getLinePathString = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  };

  const getAreaPathString = (points: { x: number; y: number }[], width: number, height: number) => {
    const padding = 20;
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const linePath = getLinePathString(points);
    return `${linePath} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;
  };

  // Dimensions for SVG Line Chart (responsive wrapper)
  const screenWidth = Math.min(Dimensions.get('window').width - 48, MaxContentWidth);
  const chartHeight = 140;
  const linePoints = getLinePath(trendData, screenWidth, chartHeight);
  const linePathStr = getLinePathString(linePoints);
  const areaPathStr = getAreaPathString(linePoints, screenWidth, chartHeight);

  // Icon mapping for insights
  const getInsightIcon = (type: string) => {
    if (type === 'weekly_summary') return '📈';
    if (type === 'hotspot') return '🔥';
    return '⚡';
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Dashboard Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>IMPACT & INSIGHTS</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              City-wide resolution tracking, neighborhood stats, and predictive hotspots.
            </ThemedText>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={styles.metricLabel}>REPORTED</ThemedText>
              <ThemedText type="title" style={{ color: Theme.colors.primary }}>{totalReported}</ThemedText>
              <ThemedText type="small" style={styles.metricSub}>Issues reported</ThemedText>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={styles.metricLabel}>VERIFIED</ThemedText>
              <ThemedText type="title" style={{ color: Theme.colors.secondary }}>{totalVerified}</ThemedText>
              <ThemedText type="small" style={styles.metricSub}>Active validation</ThemedText>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={styles.metricLabel}>RESOLUTION</ThemedText>
              <ThemedText type="title" style={{ color: Theme.colors.accent }}>{resolutionRate}%</ThemedText>
              <ThemedText type="small" style={styles.metricSub}>Overall rate</ThemedText>
            </View>
          </View>

          {/* AI Weekly Insights List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>🤖 GEMINI PREDICTIVE INSIGHTS</ThemedText>
              <View style={styles.aiBadge}>
                <ThemedText type="smallBold" style={{ fontSize: 9, color: '#fff' }}>AUTO RUN WEEKLY</ThemedText>
              </View>
            </View>

            <View style={styles.insightsList}>
              {insights.map((ins) => (
                <View key={ins.id} style={[styles.insightCard, { backgroundColor: colors.backgroundElement, borderLeftColor: ins.insight_type === 'hotspot' ? Theme.colors.severity.critical : Theme.colors.primary }]}>
                  <View style={styles.insightHeader}>
                    <ThemedText type="smallBold" style={styles.insightIcon}>{getInsightIcon(ins.insight_type)}</ThemedText>
                    <ThemedText type="smallBold" style={styles.insightType}>
                      {ins.insight_type.replace('_', ' ').toUpperCase()}
                    </ThemedText>
                    <ThemedText type="small" style={styles.insightArea}>
                      • {ins.related_area || 'City-Wide'}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={styles.insightText}>
                    {ins.insight_text}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Issues by Category Chart (Responsive SVG Bar Chart) */}
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.chartTitle}>ISSUES BY CATEGORY</ThemedText>
            <View style={styles.barChartContainer}>
              {categoryCounts.map((c, i) => {
                const barWidth = 14;
                const barHeight = (c.count / maxCategoryCount) * 100; // Percentage height
                
                return (
                  <View key={c.category} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: `${barHeight}%`, 
                            backgroundColor: c.color,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4 
                          }
                        ]} 
                      />
                    </View>
                    <ThemedText type="small" style={styles.barCount}>{c.count}</ThemedText>
                    <ThemedText type="small" numberOfLines={1} style={styles.barLabel}>{c.label.split(' ')[0]}</ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Resolution Rate Trend (Line Chart) */}
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.chartTitle}>RESOLVED ISSUES OVER TIME (MONTHLY)</ThemedText>
            <View style={styles.lineChartContainer}>
              <Svg width={screenWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={Theme.colors.primary} stopOpacity={0.3} />
                    <Stop offset="100%" stopColor={Theme.colors.primary} stopOpacity={0.0} />
                  </LinearGradient>
                </Defs>

                {/* Fill Area */}
                {areaPathStr && (
                  <Path d={areaPathStr} fill="url(#grad)" />
                )}

                {/* Line Path */}
                {linePathStr && (
                  <Path d={linePathStr} fill="none" stroke={Theme.colors.primary} strokeWidth={2.5} />
                )}

                {/* Plot Circles */}
                {linePoints.map((pt, idx) => (
                  <Circle key={idx} cx={pt.x} cy={pt.y} r={4} fill={Theme.colors.primary} stroke={colors.background} strokeWidth={1.5} />
                ))}

                {/* Axis Labels */}
                {linePoints.map((pt, idx) => (
                  <SvgText
                    key={`text-${idx}`}
                    x={pt.x}
                    y={chartHeight - 4}
                    fontSize="9"
                    fill={colors.textSecondary}
                    textAnchor="middle"
                  >
                    {trendMonths[idx]}
                  </SvgText>
                ))}
              </Svg>
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
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    ...Theme.shadows.small,
  },
  metricLabel: {
    fontSize: 9,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  metricSub: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: Spacing.one / 2,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
  insightsList: {
    gap: Spacing.two,
  },
  insightCard: {
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    fontSize: 12,
    marginRight: Spacing.one,
  },
  insightType: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  insightArea: {
    fontSize: 10,
    color: '#8E8E93',
    marginLeft: Spacing.one,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 16,
  },
  chartCard: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: Spacing.three,
  },
  chartTitle: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 80,
    width: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
  },
  barCount: {
    fontSize: 10,
    marginTop: Spacing.one / 2,
  },
  barLabel: {
    fontSize: 8,
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center',
  },
  lineChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
