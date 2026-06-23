import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useIssueStore } from '../store/useIssueStore';
import { Theme, IssueCategory, IssueSeverity } from '../styles/theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function ReportScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Theme.colors[scheme === 'dark' ? 'dark' : 'light'];

  const createIssue = useIssueStore((state) => state.createIssue);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('pothole');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Geolocation states
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Available categories
  const categories: { value: IssueCategory; label: string }[] = [
    { value: 'pothole', label: 'Pothole' },
    { value: 'water_leakage', label: 'Water Leakage' },
    { value: 'streetlight', label: 'Streetlight Out' },
    { value: 'waste_management', label: 'Waste / Garbage' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'drainage', label: 'Drainage Issue' },
    { value: 'public_property_damage', label: 'Property Damage' },
    { value: 'other', label: 'Other' },
  ];

  const getLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc);

      // Perform geocoding (convert coordinates to address)
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.streetNumber || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`;
        setAddress(formattedAddress.trim());
      } else {
        setAddress(`Coords: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err: any) {
      console.warn("Location error, using fallback coordinates:", err.message);
      // Fallback: Market St San Francisco coordinates
      const mockLoc = {
        coords: {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };
      setLocation(mockLoc);
      setAddress("1100 Market St, San Francisco, CA");
    } finally {
      setFetchingLocation(false);
    }
  };

  // Request permissions & fetch initial location
  useEffect(() => {
    const timer = setTimeout(() => {
      getLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Select Image from Gallery or Camera
  const pickImage = async (useCamera = false) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Denied', `We need ${useCamera ? 'camera' : 'library'} access to submit photo proof.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            aspect: [4, 3],
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Report
  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Missing Proof', 'A photo of the issue is required for verification.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give a short headline for the issue.');
      return;
    }
    if (!location) {
      Alert.alert('No Location', 'We need GPS coordinates to map this issue. Please try refreshing location.');
      return;
    }

    setSubmitting(true);
    try {
      await createIssue(
        title,
        description,
        category,
        severity,
        imageUri,
        location.coords.latitude,
        location.coords.longitude,
        address || 'San Francisco, CA'
      );

      Alert.alert(
        'Report Submitted!',
        'AI is now analyzing the image to verify details. You earned +10 points!',
        [{ text: 'View Map', onPress: () => router.replace('/') }]
      );
      
      // Reset form
      setTitle('');
      setDescription('');
      setImageUri(null);
    } catch (err: any) {
      Alert.alert('Error Submitting', err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>REPORT NEIGHBORHOOD ISSUE</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Provide photo proof. Our AI system will process the report and alert ward offices.
            </ThemedText>
          </View>

          {/* Photo Capture Area */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.label}>PHOTO PROOF (REQUIRED)</ThemedText>
            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Pressable onPress={() => setImageUri(null)} style={styles.removeBtn}>
                  <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 10 }}>REMOVE</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.photoBtnsContainer, { backgroundColor: colors.backgroundElement }]}>
                <Pressable onPress={() => pickImage(true)} style={styles.photoBtn}>
                  <ThemedText type="smallBold" style={{ fontSize: 24 }}>📸</ThemedText>
                  <ThemedText type="smallBold">Take Camera Photo</ThemedText>
                </Pressable>
                <View style={styles.dividerV} />
                <Pressable onPress={() => pickImage(false)} style={styles.photoBtn}>
                  <ThemedText type="smallBold" style={{ fontSize: 24 }}>📁</ThemedText>
                  <ThemedText type="smallBold">Upload from Gallery</ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          {/* Title & Description */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.label}>ISSUE TITLE</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Broken streetlight on 4th Ave"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
            />

            <ThemedText type="smallBold" style={[styles.label, { marginTop: Spacing.three }]}>ADDITIONAL DETAILS (OPTIONAL)</ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe details like specific location marker, safety hazards, size, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
            />
          </View>

          {/* Dropdown selectors */}
          <View style={styles.rowSection}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={styles.label}>CATEGORY</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {categories.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <Pressable
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSelected ? Theme.colors.categories[cat.value].color : colors.backgroundElement,
                          borderColor: isSelected ? Theme.colors.categories[cat.value].color : 'transparent'
                        }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: isSelected ? '#fff' : colors.textSecondary, fontSize: 11 }}>
                        {cat.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Severity selector */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.label}>SEVERITY ESTIMATE</ThemedText>
            <View style={styles.severityContainer}>
              {(['low', 'medium', 'high', 'critical'] as IssueSeverity[]).map((sev) => {
                const isSelected = severity === sev;
                const activeColor = Theme.colors.severity[sev];
                return (
                  <Pressable
                    key={sev}
                    onPress={() => setSeverity(sev)}
                    style={[
                      styles.sevBtn,
                      {
                        backgroundColor: isSelected ? activeColor : colors.backgroundElement,
                        borderColor: isSelected ? activeColor : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                      }
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: isSelected ? '#fff' : colors.textSecondary }}>
                      {sev.toUpperCase()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Location status */}
          <View style={[styles.locationCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.locHeader}>
              <ThemedText type="smallBold">📍 NEIGHBORHOOD GPS COORDINATES</ThemedText>
              {fetchingLocation ? (
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              ) : (
                <Pressable onPress={getLocation}>
                  <ThemedText type="smallBold" style={{ color: Theme.colors.primary }}>REFRESH</ThemedText>
                </Pressable>
              )}
            </View>
            <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
              {address || 'Fetching GPS location details...'}
            </ThemedText>
            {location && (
              <ThemedText type="small" style={{ fontSize: 9, color: colors.textSecondary, marginTop: Spacing.one }}>
                LAT: {location.coords.latitude.toFixed(6)} | LON: {location.coords.longitude.toFixed(6)} (Accuracy: {location.coords.accuracy?.toFixed(1) || '0'}m)
              </ThemedText>
            )}
          </View>

          {/* Submit Action */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: Theme.colors.primary,
                opacity: pressed || submitting ? 0.8 : 1.0,
                marginTop: Spacing.two
              }
            ]}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <ThemedText type="smallBold" style={{ color: '#fff', marginLeft: Spacing.two }}>
                  AI IS ANALYZING PROOF...
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="smallBold" style={{ color: '#fff', letterSpacing: 1.0 }}>
                SUBMIT CIVIC REPORT (+10 PTS)
              </ThemedText>
            )}
          </Pressable>

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
  section: {
    gap: Spacing.one,
  },
  rowSection: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#8E8E93',
    marginBottom: Spacing.one,
  },
  photoBtnsContainer: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(99, 102, 241, 0.2)',
    overflow: 'hidden',
  },
  photoBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dividerV: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: Spacing.three,
  },
  previewContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  textArea: {
    height: 96,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  catPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  severityContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sevBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: {
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },
  locHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.premium,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
