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
          <Text variant="bodyMedium" style={styles.day}>
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </Text>
          <View style={styles.timeField}>
            <TextInput
              value={hours.open}
              onChangeText={text => setShopData(prev => ({
                ...prev,
                workingHours: {
                  ...prev.workingHours,
                  [day]: { ...hours, open: text }
                }
              }))}
              style={styles.timeField}
              placeholder="Open"
            />
          </View>
          <Text style={styles.timeSeparator}>to</Text>
          <View style={styles.timeField}>
            <TextInput
              value={hours.close}
              onChangeText={text => setShopData(prev => ({
                ...prev,
                workingHours: {
                  ...prev.workingHours,
                  [day]: { ...hours, close: text }
                }
              }))}
              style={styles.timeField}
              placeholder="Close"
            />
          </View>
          {hours.close === '' && (
            <Text style={styles.dayOff}>Closed</Text>
          )}
        </View>
      ))}
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={28}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {renderLogoSection()}
        {renderBasicInfo()}
        {renderContactInfo()}
        {renderWorkingHours()}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={saving}
            disabled={saving}
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderLogo: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 18,
  },
  logoHint: {
    color: '#757575',
    marginTop: 8,
  },
  section: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#e9ecef',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  workingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  day: {
    width: 100,
    marginRight: 10,
    fontWeight: '500',
  },
  timeField: {
    flex: 1,
    marginHorizontal: 4,
  },
  dayOff: {
    color: '#F44336',
    textAlign: 'center',
  },
  timeSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
    borderColor: '#dddddd',
  },
  cancelButtonLabel: {
    color: '#757575',
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
}); 