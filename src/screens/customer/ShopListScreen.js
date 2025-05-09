import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Searchbar, Card, Title, Paragraph, Chip, Button, ActivityIndicator, Text } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getShops } from '../../services/firebaseService';
import { setShops, setNearbyShops, setLoading, setError } from '../../store/slices/shopSlice';

export default function ShopListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { shops, isLoading, error } = useSelector(state => state.shops);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetchShops();
    getUserLocation();
  }, []);

  const fetchShops = async () => {
    try {
      dispatch(setLoading(true));
      const shopsData = await getShops();
      console.log('Fetched shops:', shopsData);
      setDebugInfo(`Found ${shopsData.length} shops`);
      dispatch(setShops(shopsData));
    } catch (error) {
      console.error('Error fetching shops:', error);
      setDebugInfo(`Error: ${error.message}`);
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
    // Verify required fields exist
    if (!shop || !shop.name || !shop.address || !Array.isArray(shop.services)) {
      console.warn('Shop with missing required fields:', shop);
      return false;
    }
    
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shop.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesServices = selectedServices.length === 0 ||
                           selectedServices.every(service => 
                             shop.services.some(s => s.toLowerCase().includes(service.toLowerCase()))
                           );
    return matchesSearch && matchesServices;
  });

  // Safely extract services from shops that have them
  const allServices = [...new Set(
    shops
      .filter(shop => shop && Array.isArray(shop.services))
      .flatMap(shop => shop.services)
  )];

  const renderShopList = () => {
    if (filteredShops.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text>No repair shops found</Text>
          <Text>Try adjusting your search or filters</Text>
        </View>
      );
    }

    return (
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
                {Array.isArray(shop.services) ? (
                  shop.services.map((service, index) => (
                    <Chip key={index} style={styles.serviceChip}>{service}</Chip>
                  ))
                ) : (
                  <Text>No services listed</Text>
                )}
              </View>
              <View style={styles.ratingContainer}>
                <Text>Rating: {shop.rating?.toFixed(1) || '0.0'} ⭐</Text>
                <Text>({shop.totalRatings || 0} reviews)</Text>
              </View>
              {__DEV__ && (
                <Text style={styles.debugText}>Shop ID: {shop.id}</Text>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    );
  };

  const renderMap = () => {
    // Filter shops with valid coordinates
    const shopsWithCoordinates = filteredShops.filter(
      shop => shop && 
      typeof shop.latitude === 'number' && 
      typeof shop.longitude === 'number'
    );
    
    return (
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
            {shopsWithCoordinates.map(shop => (
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
        {shopsWithCoordinates.length === 0 && (
          <View style={styles.emptyMapContainer}>
            <Text>No shops with valid coordinates found</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Button mode="contained" onPress={fetchShops} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {debugInfo && __DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo}</Text>
          <Text>Shop count: {shops.length}</Text>
          <Text>Filtered count: {filteredShops.length}</Text>
        </View>
      )}
      
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
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
  },
  debugContainer: {
    padding: 8,
    backgroundColor: '#ffeeee',
    borderRadius: 4,
    margin: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#990000',
  },
  emptyMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 