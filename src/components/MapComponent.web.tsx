import React, { useState } from 'react';
import { View, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Issue } from '../store/useIssueStore';
import { Theme } from '../styles/theme';

interface MapComponentProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  onRegionChange?: (lat: number, lon: number) => void;
}

// Bounding box for San Francisco region (can be dynamically adjusted)
const LAT_MIN = 37.70;
const LAT_MAX = 37.82;
const LON_MIN = -122.52;
const LON_MAX = -122.36;

export default function MapComponent({ issues, selectedIssue, onSelectIssue }: MapComponentProps) {
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [zoomLevel, setZoomLevel] = useState(12);

  // Convert GPS to % container coordinates
  const getCoordinates = (lat: number, lon: number) => {
    // Keep within bounds
    const latClamped = Math.max(LAT_MIN, Math.min(LAT_MAX, lat));
    const lonClamped = Math.max(LON_MIN, Math.min(LON_MAX, lon));

    const x = ((lonClamped - LON_MIN) / (LON_MAX - LON_MIN)) * 100;
    const y = (1 - (latClamped - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <ThemedView style={styles.container}>
      {/* HUD Info Header */}
      <View style={styles.hudHeader}>
        <View style={styles.hudInfo}>
          <ThemedText type="smallBold">TACTICAL MAP VIEW</ThemedText>
          <ThemedText type="small" style={styles.hudCoords}>
            LAT: {LAT_MIN.toFixed(2)} - {LAT_MAX.toFixed(2)} | LON: {LON_MIN.toFixed(2)} - {LON_MAX.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.hudControls}>
          <Pressable onPress={() => setZoomLevel(z => Math.min(18, z + 1))} style={styles.hudBtn}>
            <ThemedText type="smallBold" style={styles.hudBtnText}>+</ThemedText>
          </Pressable>
          <Pressable onPress={() => setZoomLevel(z => Math.max(8, z - 1))} style={styles.hudBtn}>
            <ThemedText type="smallBold" style={styles.hudBtnText}>-</ThemedText>
          </Pressable>
          <View style={styles.zoomBadge}>
            <ThemedText type="small" style={{ color: '#fff' }}>{zoomLevel}x</ThemedText>
          </View>
        </View>
      </View>

      {/* Map Board */}
      <View style={[styles.mapBoard, { backgroundColor: scheme === 'dark' ? '#0b0c10' : '#f5f7fa' }]}>
        
        {/* Futuristic Map Grid */}
        <View style={styles.gridContainer}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 10}%`, borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 10}%`, borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]} />
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.severity.critical }]} />
            <ThemedText type="small" style={styles.legendText}>Critical</ThemedText>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.severity.high }]} />
            <ThemedText type="small" style={styles.legendText}>High</ThemedText>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.severity.medium }]} />
            <ThemedText type="small" style={styles.legendText}>Medium</ThemedText>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.severity.low }]} />
            <ThemedText type="small" style={styles.legendText}>Low</ThemedText>
          </View>
        </View>

        {/* Map Pins */}
        {issues.map(iss => {
          const { x, y } = getCoordinates(iss.latitude, iss.longitude);
          const isSelected = selectedIssue?.id === iss.id;
          const severityColor = Theme.colors.severity[iss.severity] || '#6B7280';
          const categoryColor = Theme.colors.categories[iss.category]?.color || '#6B7280';

          return (
            <Pressable
              key={iss.id}
              onPress={() => onSelectIssue(iss)}
              style={[
                styles.pinWrapper,
                { left: x as any, top: y as any }
              ]}
            >
              {/* Outer Pulsing Ring for Selected Pin */}
              {isSelected && (
                <View style={[styles.pulseRing, { borderColor: severityColor }]} />
              )}

              {/* Pin Core */}
              <View 
                style={[
                  styles.pinCore, 
                  { 
                    backgroundColor: categoryColor,
                    borderColor: isSelected ? '#ffffff' : '#000000',
                    transform: isSelected ? 'scale(1.3)' : 'scale(1.0)',
                  }
                ]}
              >
                {/* Visual indicator of severity on the core pin */}
                <View style={[styles.pinInner, { backgroundColor: severityColor }]} />
              </View>

              {/* Mini tag for Selected Pin */}
              {isSelected && (
                <View style={[styles.pinLabel, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ fontSize: 9 }}>
                    {Theme.colors.categories[iss.category]?.label || 'Issue'}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  hudHeader: {
    height: 48,
    backgroundColor: '#111317',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  hudInfo: {
    flexDirection: 'column',
  },
  hudCoords: {
    fontSize: 9,
    color: '#8E8E93',
  },
  hudControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#2E3135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  zoomBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  mapBoard: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    borderStyle: 'dashed',
    borderLeftWidth: 1,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderTopWidth: 1,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(17, 19, 23, 0.85)',
    borderRadius: 8,
    padding: 8,
    gap: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#E0E1E6',
  },
  pinWrapper: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  pinCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  pinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    opacity: 0.6,
  },
  pinLabel: {
    position: 'absolute',
    top: 14,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
});
