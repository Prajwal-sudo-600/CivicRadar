import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Issue } from '../store/useIssueStore';
import { Theme } from '../styles/theme';

interface MapComponentProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  onRegionChange?: (lat: number, lon: number) => void;
}

export default function MapComponent({ issues, selectedIssue, onSelectIssue, onRegionChange }: MapComponentProps) {
  const mapRef = useRef<MapView>(null);

  const defaultRegion = {
    latitude: 37.774929,
    longitude: -122.419416,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    if (selectedIssue && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: selectedIssue.latitude,
        longitude: selectedIssue.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 600);
    }
  }, [selectedIssue]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={defaultRegion}
        onRegionChangeComplete={(region) => {
          if (onRegionChange) {
            onRegionChange(region.latitude, region.longitude);
          }
        }}
      >
        {issues.map((iss) => {
          const categoryColor = Theme.colors.categories[iss.category]?.color || '#6B7280';
          return (
            <Marker
              key={iss.id}
              coordinate={{ latitude: iss.latitude, longitude: iss.longitude }}
              title={iss.title}
              description={iss.description || ''}
              pinColor={categoryColor}
              onPress={() => onSelectIssue(iss)}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
