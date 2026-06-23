/* eslint-disable react-hooks/immutability */
import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, RefreshControl, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useIssueStore } from '../store/useIssueStore';
import { useAuthStore } from '../store/useAuthStore';
import { Theme, IssueCategory } from '../styles/theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Create animated SVG components for line chart animation
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Animated Bar Component ───────────────────────────────────────────────────
function AnimatedBar({ targetHeight, color, index }: { targetHeight: number; color: string; index: number }) {
  'use no memo';
  const heightValue = useSharedValue(0);

  useEffect(() => {
    heightValue.value = withDelay(
      index * 70,
      withSpring(targetHeight, { damping: 12, stiffness: 100 })
    );
  }, [targetHeight, index, heightValue]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    height: `${heightValue.value}%`,
    backgroundColor: color,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    width: '100%',
  }));

  return <Animated.View style={animatedBarStyle} />;
}

// ─── Press-Feedback Wrapper ───────────────────────────────────────────────────
function PressableCard({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  'use no memo';
  const scale = useSharedValue(1);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={useCallback(() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])}
      onPressOut={useCallback(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])}
      onPress={onPress}
    >
      <Animated.View style={[style, animatedScale]}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Pulsing Badge Component ──────────────────────────────────────────────────
function PulsingBadge() {
  'use no memo';
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View style={[styles.aiBadge, pulseStyle]}>
      <ThemedText type="smallBold" style={{ fontSize: 9, color: '#fff' }}>
        AUTO RUN WEEKLY
      </ThemedText>
    </Animated.View>
  );
}

// ─── Main Dashboard Screen ───────────────────────────────────────────────────
export default function DashboardScreen() {
  'use no memo';
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  const { issues, insights, leaderboard, fetchIssues, fetchInsights } = useIssueStore();
  const { profile } = useAuthStore();

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchIssues(), fetchInsights()]);
    setRefreshing(false);
  }, [fetchIssues, fetchInsights]);

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

  // ─── Line Chart Animation ────────────────────────────────────────────────
  // Calculate approximate total path length for stroke-dashoffset animation
  const totalPathLength = linePoints.reduce((sum, pt, idx) => {
    if (idx === 0) return 0;
    const prev = linePoints[idx - 1];
    return sum + Math.sqrt(Math.pow(pt.x - prev.x, 2) + Math.pow(pt.y - prev.y, 2));
  }, 0);

  const strokeProgress = useSharedValue(totalPathLength);
  const areaOpacity = useSharedValue(0);

  useEffect(() => {
    // Delay line chart animation to start after bars
    strokeProgress.value = withDelay(
      500,
      withTiming(0, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
    areaOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [strokeProgress, areaOpacity]);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDasharray: `${totalPathLength}`,
    strokeDashoffset: strokeProgress.value,
  }));

  const animatedAreaStyle = useAnimatedStyle(() => ({
    opacity: areaOpacity.value,
  }));

  // Icon mapping for insights
  const getInsightIcon = (type: string) => {
    if (type === 'weekly_summary') return '📈';
    if (type === 'hotspot') return '🔥';
    return '⚡';
  };

  // Glass card background based on theme
  const glassCardBg = isDark
    ? { backgroundColor: 'rgba(33, 34, 37, 0.65)' }
    : { backgroundColor: 'rgba(240, 240, 243, 0.85)' };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Theme.colors.primary}
              colors={[Theme.colors.primary]}
            />
          }
        >
          
          {/* ─── Dashboard Header with Gradient Backdrop ─── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(0).easing(Easing.out(Easing.cubic))}
          >
            <View style={[styles.headerBackdrop, isDark ? styles.headerBackdropDark : styles.headerBackdropLight]}>
              <ThemedText type="subtitle" style={styles.headerTitle}>IMPACT & INSIGHTS</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                City-wide resolution tracking, neighborhood stats, and predictive hotspots.
              </ThemedText>
            </View>
          </Animated.View>

          {/* ─── Quick Metrics Grid (Glassmorphic Cards) ─── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(100).easing(Easing.out(Easing.cubic))}
            style={styles.metricsGrid}
          >
            {/* Reported */}
            <PressableCard style={[styles.metricCard, glassCardBg]}>
              <ThemedText type="small" style={styles.metricLabel}>REPORTED</ThemedText>
              <AnimatedCounter
                value={totalReported}
                color={Theme.colors.primary}
                style={styles.metricNumber}
                delay={200}
              />
              <ThemedText type="small" style={styles.metricSub}>Issues reported</ThemedText>
            </PressableCard>

            {/* Verified */}
            <PressableCard style={[styles.metricCard, glassCardBg]}>
              <ThemedText type="small" style={styles.metricLabel}>VERIFIED</ThemedText>
              <AnimatedCounter
                value={totalVerified}
                color={Theme.colors.secondary}
                style={styles.metricNumber}
                delay={350}
              />
              <ThemedText type="small" style={styles.metricSub}>Active validation</ThemedText>
            </PressableCard>

            {/* Resolution Rate */}
            <PressableCard style={[styles.metricCard, glassCardBg]}>
              <ThemedText type="small" style={styles.metricLabel}>RESOLUTION</ThemedText>
              <AnimatedCounter
                value={resolutionRate}
                suffix="%"
                color={Theme.colors.accent}
                style={styles.metricNumber}
                delay={500}
              />
              <ThemedText type="small" style={styles.metricSub}>Overall rate</ThemedText>
            </PressableCard>
          </Animated.View>

          {/* ─── AI Weekly Insights List ─── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(200).easing(Easing.out(Easing.cubic))}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>🤖 GEMINI PREDICTIVE INSIGHTS</ThemedText>
              <PulsingBadge />
            </View>

            <View style={styles.insightsList}>
              {insights.map((ins, index) => (
                <Animated.View
                  key={ins.id}
                  entering={FadeInUp.duration(400).delay(300 + index * 80).easing(Easing.out(Easing.cubic))}
                >
                  <PressableCard
                    style={[
                      styles.insightCard,
                      {
                        backgroundColor: colors.backgroundElement,
                        borderLeftColor: ins.insight_type === 'hotspot'
                          ? Theme.colors.severity.critical
                          : Theme.colors.primary,
                      },
                    ]}
                  >
                    <View style={styles.insightHeader}>
                      <ThemedText type="smallBold" style={styles.insightIcon}>
                        {getInsightIcon(ins.insight_type)}
                      </ThemedText>
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
                  </PressableCard>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* ─── Issues by Category (Animated Bar Chart) ─── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.cubic))}
          >
            <PressableCard style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.chartTitle}>ISSUES BY CATEGORY</ThemedText>
              <View style={styles.barChartContainer}>
                {categoryCounts.map((c, i) => {
                  const barHeight = (c.count / maxCategoryCount) * 100;
                  
                  return (
                    <View key={c.category} style={styles.barColumn}>
                      <View style={styles.barTrack}>
                        <AnimatedBar
                          targetHeight={barHeight}
                          color={c.color}
                          index={i}
                        />
                      </View>
                      <ThemedText type="small" style={styles.barCount}>{c.count}</ThemedText>
                      <ThemedText type="small" numberOfLines={1} style={styles.barLabel}>
                        {c.label.split(' ')[0]}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </PressableCard>
          </Animated.View>

          {/* ─── Resolution Trend (Animated Line Chart) ─── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400).easing(Easing.out(Easing.cubic))}
          >
            <PressableCard style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.chartTitle}>RESOLVED ISSUES OVER TIME (MONTHLY)</ThemedText>
              <View style={styles.lineChartContainer}>
                <Svg width={screenWidth} height={chartHeight}>
                  <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor={Theme.colors.primary} stopOpacity={0.3} />
                      <Stop offset="100%" stopColor={Theme.colors.primary} stopOpacity={0.0} />
                    </LinearGradient>
                  </Defs>

                  {/* Fill Area — fades in after line draws */}
                  {areaPathStr && (
                    <Animated.View style={animatedAreaStyle}>
                      <Svg width={screenWidth} height={chartHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Path d={areaPathStr} fill="url(#grad)" />
                      </Svg>
                    </Animated.View>
                  )}

                  {/* Animated Line Path */}
                  {linePathStr && (
                    <AnimatedPath
                      d={linePathStr}
                      fill="none"
                      stroke={Theme.colors.primary}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animatedProps={animatedLineProps}
                    />
                  )}

                  {/* Plot Circles — stagger in after line completes */}
                  {linePoints.map((pt, idx) => (
                    <Animated.View
                      key={idx}
                      entering={FadeIn.delay(1300 + idx * 100).duration(300)}
                      style={{ position: 'absolute', left: pt.x - 4, top: pt.y - 4 }}
                    >
                      <Svg width={8} height={8}>
                        <Circle cx={4} cy={4} r={4} fill={Theme.colors.primary} stroke={colors.background} strokeWidth={1.5} />
                      </Svg>
                    </Animated.View>
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
            </PressableCard>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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

  // ── Header ──
  headerBackdrop: {
    marginBottom: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  headerBackdropDark: {
    experimental_backgroundImage: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
  } as any,
  headerBackdropLight: {
    experimental_backgroundImage: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
  } as any,
  headerTitle: {
    fontWeight: '800',
  },

  // ── Metrics Grid ──
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Theme.shadows.premium,
  },
  metricNumber: {
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 52,
    textAlign: 'center',
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

  // ── Insights Section ──
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
    ...Theme.shadows.small,
  },
  insightsList: {
    gap: Spacing.two,
  },
  insightCard: {
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 4,
    gap: Spacing.one,
    ...Theme.shadows.small,
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

  // ── Chart Cards ──
  chartCard: {
    borderRadius: 18,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: Spacing.three,
    ...Theme.shadows.medium,
  },
  chartTitle: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
  },

  // ── Bar Chart ──
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

  // ── Line Chart ──
  lineChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
