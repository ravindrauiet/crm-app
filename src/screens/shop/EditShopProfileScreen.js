import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Surface, TextInput, Button, useTheme, IconButton, Divider, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function EditShopProfileScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopData, setShopData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    services: [],
    workingHours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '', close: '' }
    },
    logo: null
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      setLoading(true);
      const shopRef = doc(db, 'shops', user.id);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        setShopData(shopDoc.data());
      }
    } catch (error) {
      console.error('Error fetching shop profile:', error);
      Alert.alert('Error', 'Failed to load shop profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!shopData.name.trim()) {
      newErrors.name = 'Shop name is required';
    }
    
    if (!shopData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!shopData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(shopData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    if (!shopData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(shopData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const shopRef = doc(db, 'shops', user.id);
      
      // Upload logo if changed
      let logoUrl = shopData.logo;
      if (shopData.logo && shopData.logo.startsWith('data:')) {
        const storage = getStorage();
        const logoRef = ref(storage, `shops/${user.id}/logo`);
        const response = await fetch(shopData.logo);
        const blob = await response.blob();
        await uploadBytes(logoRef, blob);
        logoUrl = await getDownloadURL(logoRef);
      }

      await updateDoc(shopRef, {
        ...shopData,
        logo: logoUrl,
        updatedAt: new Date()
      });

      Alert.alert('Success', 'Shop profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating shop profile:', error);
      Alert.alert('Error', 'Failed to update shop profile');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setShopData(prev => ({
          ...prev,
          logo: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const renderLogoSection = () => (
    <Surface style={styles.logoSection}>
      <View style={styles.logoContainer}>
        {shopData.logo ? (
          <Image source={{ uri: shopData.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.placeholderLogo]}>
            <MaterialCommunityIcons name="store" size={40} color="#ccc" />
          </View>
        )}
        <IconButton
          icon="camera"
          size={24}
          style={styles.cameraButton}
          onPress={pickImage}
        />
      </View>
      <Text variant="bodySmall" style={styles.logoHint}>
        Tap to change shop logo
      </Text>
    </Surface>
  );

  const renderBasicInfo = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Basic Information</Text>
      <Divider style={styles.divider} />
      
      <TextInput
        label="Shop Name"
        value={shopData.name}
        onChangeText={text => setShopData(prev => ({ ...prev, name: text }))}
        style={styles.input}
        error={!!errors.name}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name}
      </HelperText>

      <TextInput
        label="Description"
        value={shopData.description}
        onChangeText={text => setShopData(prev => ({ ...prev, description: text }))}
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <TextInput
        label="Address"
        value={shopData.address}
        onChangeText={text => setShopData(prev => ({ ...prev, address: text }))}
        style={styles.input}
        error={!!errors.address}
      />
      <HelperText type="error" visible={!!errors.address}>
        {errors.address}
      </HelperText>
    </Surface>
  );

  const renderContactInfo = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
      <Divider style={styles.divider} />
      
      <TextInput
        label="Phone"
        value={shopData.phone}
        onChangeText={text => setShopData(prev => ({ ...prev, phone: text }))}
        keyboardType="phone-pad"
        style={styles.input}
        error={!!errors.phone}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <TextInput
        label="Email"
        value={shopData.email}
        onChangeText={text => setShopData(prev => ({ ...prev, email: text }))}
        keyboardType="email-address"
        style={styles.input}
        error={!!errors.email}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>

      <TextInput
        label="Website"
        value={shopData.website}
        onChangeText={text => setShopData(prev => ({ ...prev, website: text }))}
        keyboardType="url"
        style={styles.input}
      />
    </Surface>
  );

  const renderWorkingHours = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Working Hours</Text>
      <Divider style={styles.divider} />
      
      {Object.entries(shopData.workingHours).map(([day, hours]) => (
        <View key={day} style={styles.workingHoursRow}>
          <Text variant="bodyMedium" style={styles.dayLabel}>
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </Text>
          <View style={styles.timeInputs}>
            <TextInput
              value={hours.open}
              onChangeText={text => setShopData(prev => ({
                ...prev,
                workingHours: {
                  ...prev.workingHours,
                  [day]: { ...hours, open: text }
                }
              }))}
              style={styles.timeInput}
              placeholder="Open"
            />
            <Text style={styles.timeSeparator}>to</Text>
            <TextInput
              value={hours.close}
              onChangeText={text => setShopData(prev => ({
                ...prev,
                workingHours: {
                  ...prev.workingHours,
                  [day]: { ...hours, close: text }
                }
              }))}
              style={styles.timeInput}
              placeholder="Close"
            />
          </View>
        </View>
      ))}
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {renderLogoSection()}
        {renderBasicInfo()}
        {renderContactInfo()}
        {renderWorkingHours()}
      </ScrollView>

      <Surface style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  logoSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderLogo: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    elevation: 4,
  },
  logoHint: {
    color: '#666',
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  workingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    width: 100,
  },
  timeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  timeSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  footer: {
    padding: 16,
    elevation: 8,
  },
  saveButton: {
    borderRadius: 8,
  },
}); 