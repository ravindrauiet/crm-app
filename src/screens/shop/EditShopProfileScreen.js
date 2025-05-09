import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Headline, ActivityIndicator, Chip } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { setUser } from '../../store/slices/authSlice';

const EditShopProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const shopDetails = user?.shopDetails || {};
  
  const [shopName, setShopName] = useState(shopDetails.name || '');
  const [address, setAddress] = useState(shopDetails.address || '');
  const [phone, setPhone] = useState(shopDetails.phone || '');
  const [servicesString, setServicesString] = useState(
    shopDetails.services ? shopDetails.services.join(', ') : ''
  );
  const [coordinates, setCoordinates] = useState({
    latitude: shopDetails.latitude || null,
    longitude: shopDetails.longitude || null,
  });
  const [locationStatus, setLocationStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we have location already
    if (coordinates.latitude && coordinates.longitude) {
      setLocationStatus('Location coordinates already set.');
    } else {
      setLocationStatus('No location coordinates set. Please update your location.');
    }
  }, []);

  const getLocation = async () => {
    try {
      setFetchingLocation(true);
      setError(null);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Location permission denied. Shop will not appear on the map.');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationStatus('Location coordinates acquired successfully.');
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Failed to get location. Please try again.');
      setLocationStatus('Error getting location.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!shopName || !address || !phone || !servicesString) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Parse services from comma-separated string
      const services = servicesString.split(',').map(service => service.trim());
      
      // Update shop document in Firestore
      const shopDocRef = doc(db, 'shops', user.uid);
      
      const updatedShopData = {
        name: shopName,
        address: address,
        phone: phone,
        services: services,
        updatedAt: new Date().toISOString(),
      };
      
      // Only include coordinates if they are valid
      if (coordinates.latitude && coordinates.longitude) {
        updatedShopData.latitude = coordinates.latitude;
        updatedShopData.longitude = coordinates.longitude;
      }
      
      await updateDoc(shopDocRef, updatedShopData);
      
      // Update local user state with new shop details
      const updatedUser = {
        ...user,
        shopDetails: {
          ...shopDetails,
          ...updatedShopData
        }
      };
      
      dispatch(setUser(updatedUser));
      
      // Navigate back to profile
      navigation.goBack();
    } catch (error) {
      console.error('Error updating shop profile:', error);
      setError('Failed to update shop profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Headline style={styles.title}>Edit Shop Profile</Headline>
        
        {error && <Text style={styles.error}>{error}</Text>}
        
        <TextInput
          label="Shop Name *"
          value={shopName}
          onChangeText={setShopName}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Address *"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Phone Number *"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />
        
        <TextInput
          label="Services (comma-separated) *"
          value={servicesString}
          onChangeText={setServicesString}
          mode="outlined"
          placeholder="e.g., Phone Repair, Screen Replacement"
          style={styles.input}
        />
        
        {servicesString && (
          <View style={styles.servicesPreview}>
            <Text style={styles.previewLabel}>Services Preview:</Text>
            <View style={styles.chipContainer}>
              {servicesString.split(',').map((service, index) => (
                service.trim() && (
                  <Chip key={index} style={styles.chip}>{service.trim()}</Chip>
                )
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Shop Location:</Text>
          {fetchingLocation ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <Text style={coordinates.latitude ? styles.locationSuccess : styles.locationStatus}>
                {coordinates.latitude && coordinates.longitude
                  ? `Location set: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` 
                  : locationStatus}
              </Text>
              <Button 
                mode="outlined" 
                onPress={getLocation} 
                style={styles.locationButton}
                icon="map-marker"
              >
                Update Location
              </Button>
            </>
          )}
        </View>
        
        <View style={styles.buttons}>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()} 
            disabled={isLoading}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  locationLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationStatus: {
    marginBottom: 8,
  },
  locationSuccess: {
    color: 'green',
    marginBottom: 8,
  },
  locationButton: {
    marginTop: 8,
  },
  buttons: {
    marginTop: 16,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#888',
  },
  servicesPreview: {
    marginBottom: 16,
  },
  previewLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
});

export default EditShopProfileScreen; 