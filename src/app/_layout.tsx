import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useAuthStore } from '../store/useAuthStore';
import { useIssueStore } from '../store/useIssueStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const initializeAuth = useAuthStore(state => state.initialize);
  const fetchIssues = useIssueStore(state => state.fetchIssues);
  const fetchInsights = useIssueStore(state => state.fetchInsights);
  const fetchLeaderboard = useIssueStore(state => state.fetchLeaderboard);
  const subscribeToIssues = useIssueStore(state => state.subscribeToIssues);

  useEffect(() => {
    // Initialize Auth Session
    initializeAuth();

    // Fetch initial database entities
    fetchIssues();
    fetchInsights();
    fetchLeaderboard();

    // Subscribe to realtime postgres update streams
    const unsubscribe = subscribeToIssues();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
