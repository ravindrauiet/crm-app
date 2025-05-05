import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Searchbar, Card, Title, Paragraph, Chip, Button, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setShops, setNearbyShops, setLoading, setError } from '../../store/slices/shopSlice';

export default function ShopListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { shops, isLoading, filters } = useSelector(state => state.shops);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetchShops();
    getUserLocation();
  }, []);

  const fetchShops = async () => {
    try {
      dispatch(setLoading(true));
      
      // Get all users from AsyncStorage
      const usersJson = await AsyncStorage.getItem('users');
      const users = JSON.parse(usersJson || '[]');
      
      // Filter shop owners and map their data
      const shopsData = users
        .filter(user => user.userType === 'shop_owner' && user.shopDetails)
        .map(user => ({
          id: user.id,
          ...user.shopDetails,
          // Add default location if not present
          latitude: user.shopDetails.latitude || 0,
          longitude: user.shopDetails.longitude || 0
        }));
      
      dispatch(setShops(shopsData));
    } catch (error) {
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
      
      // Update nearby shops based on location
      if (shops.length > 0) {
        const nearbyShops = findNearbyShops(location.coords, shops);
        dispatch(setNearbyShops(nearbyShops));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const findNearbyShops = (userLocation, allShops) => {
    return allShops
      .map(shop => ({
        ...shop,
        distance: calculateDistance(userLocation, {
          latitude: shop.latitude,
          longitude: shop.longitude
        })
      }))
      .sort((a, b) => a.distance - b.distance);
  };

  const calculateDistance = (point1, point2) => {
    // Simple distance calculation (can be enhanced with actual road distance)
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shop.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesServices = selectedServices.length === 0 ||
                           selectedServices.every(service => 
                             shop.services.some(s => s.toLowerCase().includes(service.toLowerCase()))
                           );
    return matchesSearch && matchesServices;
  });

  const allServices = [...new Set(shops.flatMap(shop => shop.services))];

  const renderShopList = () => (
    <ScrollView style={styles.listContainer}>
      {filteredShops.map(shop => (
        <Card
          key={shop.id}
          style={styles.shopCard}
          onPress={() => navigation.navigate('Booking', { shopId: shop.id })}
        >
          <Card.Content>
            <Title>{shop.name}</Title>
            <Paragraph>{shop.address}</Paragraph>
            <View style={styles.servicesContainer}>
              {shop.services.map((service, index) => (
                <Chip key={index} style={styles.serviceChip}>{service}</Chip>
              ))}
            </View>
            <Paragraph>Rating: {shop.rating.toFixed(1)} ⭐</Paragraph>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );

  const renderMap = () => (
    <View style={styles.mapContainer}>
      {userLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {filteredShops.map(shop => (
            <Marker
              key={shop.id}
              coordinate={{
                latitude: shop.latitude,
                longitude: shop.longitude
              }}
              title={shop.name}
              description={shop.address}
              onPress={() => navigation.navigate('Booking', { shopId: shop.id })}
            />
          ))}
        </MapView>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search shops..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <ScrollView horizontal style={styles.filtersContainer}>
        {allServices.map((service, index) => (
          <Chip
            key={index}
            selected={selectedServices.includes(service)}
            onPress={() => {
              if (selectedServices.includes(service)) {
                setSelectedServices(selectedServices.filter(s => s !== service));
              } else {
                setSelectedServices([...selectedServices, service]);
              }
            }}
            style={styles.filterChip}
          >
            {service}
          </Chip>
        ))}
      </ScrollView>

      <Button
        mode="outlined"
        onPress={() => setShowMap(!showMap)}
        style={styles.toggleButton}
      >
        {showMap ? 'Show List' : 'Show Map'}
      </Button>

      {showMap ? renderMap() : renderShopList()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    margin: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  toggleButton: {
    margin: 16,
  },
  listContainer: {
    flex: 1,
  },
  shopCard: {
    margin: 16,
    marginTop: 0,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  serviceChip: {
    margin: 4,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
}); 