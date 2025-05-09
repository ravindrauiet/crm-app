import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Searchbar, Card, Title, Paragraph, Chip, Button, ActivityIndicator, Text, Divider } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getShops } from '../../services/firebaseService';
import { setShops, setNearbyShops, setLoading, setError } from '../../store/slices/shopSlice';

export default function ShopListScreen({ navigation }) {
  const dispatch = useDispatch();
  
  // Check entire state
  const reduxState = useSelector(state => state);
  // Make sure we're using the correct reducer
  const shopState = useSelector(state => state.shops);
  const { shops, isLoading, error } = shopState || { shops: [], isLoading: false, error: null };
  
  // For debugging
  console.log('Redux State:', reduxState);
  console.log('Shop State:', shopState);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [rawShopData, setRawShopData] = useState(null);
  const [showFullDebug, setShowFullDebug] = useState(false);

  // Log whenever shops state changes
  useEffect(() => {
    console.log('Shop state changed:', shops);
    if (shops && shops.length > 0) {
      console.log('First shop in state:', JSON.stringify(shops[0]));
    }
  }, [shops]);

  useEffect(() => {
    fetchShops();
    getUserLocation();
  }, []);

  const fetchShops = async () => {
    try {
      dispatch(setLoading(true));
      const shopsData = await getShops();
      console.log('Fetched shops from API:', JSON.stringify(shopsData));
      setRawShopData(shopsData);
      
      setDebugInfo(`Found ${shopsData.length} shops from API. Check console for details.`);
      
      if (shopsData && shopsData.length > 0) {
        // Verify data has all required fields
        const validShops = shopsData.filter(shop => 
          shop && shop.name && shop.address && Array.isArray(shop.services)
        );
        
        console.log(`Valid shops: ${validShops.length} of ${shopsData.length}`);
        
        if (validShops.length < shopsData.length) {
          console.warn('Some shops are missing required fields:', 
            shopsData.filter(shop => !shop || !shop.name || !shop.address || !Array.isArray(shop.services))
          );
        }
        
        dispatch(setShops(shopsData));
        
        // Verify shops are in state
        setTimeout(() => {
          console.log('Verifying shops in state:', reduxState.shops);
        }, 500);
      } else {
        console.warn('No shops data returned from API');
      }
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
      console.warn('Shop with missing required fields:', JSON.stringify(shop));
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
    // Better debugging for empty shop list
    if (shops.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No shops found in the database</Text>
          <Text style={styles.emptySubtext}>Please try refreshing or check back later</Text>
          <Button 
            mode="contained" 
            onPress={fetchShops}
            style={styles.retryButton}
          >
            Refresh Shop List
          </Button>
        </View>
      );
    }
    
    if (filteredShops.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No repair shops match your criteria</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
          {selectedServices.length > 0 && (
            <Button 
              mode="outlined" 
              onPress={() => setSelectedServices([])}
              style={styles.clearButton}
            >
              Clear Filters
            </Button>
          )}
        </View>
      );
    }

    // Show the shops that match filters
    return (
      <ScrollView style={styles.listContainer}>
        {filteredShops.map(shop => (
          <Card
            key={shop.id}
            style={styles.shopCard}
            onPress={() => navigation.navigate('ShopDetails', { shopId: shop.id })}
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
            <Card.Actions>
              <Button onPress={() => navigation.navigate('ShopDetails', { shopId: shop.id })}>View Details</Button>
              <Button mode="contained" onPress={() => navigation.navigate('Booking', { shopId: shop.id })}>Book Repair</Button>
            </Card.Actions>
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
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo || 'No debug info'}</Text>
          <Text>Shop count in state: {shops?.length || 0}</Text>
          <Text>Filtered shop count: {filteredShops?.length || 0}</Text>
          {rawShopData && (
            <Text>Raw shop data count: {rawShopData.length}</Text>
          )}
          <View style={styles.debugButtonRow}>
            <Button 
              mode="contained" 
              onPress={fetchShops} 
              style={styles.debugButton}
              compact
            >
              Refresh Shops
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => setShowFullDebug(!showFullDebug)} 
              style={styles.debugButton}
              compact
            >
              {showFullDebug ? 'Hide Debug' : 'Show Debug'}
            </Button>
          </View>
          
          {showFullDebug && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.debugTitle}>Redux State</Text>
              {Object.keys(reduxState).map(key => (
                <View key={key} style={styles.stateItem}>
                  <Text style={styles.stateKey}>{key}: </Text>
                  <Text>
                    {Array.isArray(reduxState[key]) 
                      ? `Array(${reduxState[key].length})` 
                      : JSON.stringify(reduxState[key]).substring(0, 50)
                    }
                  </Text>
                </View>
              ))}
              
              <Text style={styles.debugTitle}>Raw Shop Data Sample</Text>
              {rawShopData && rawShopData.length > 0 && (
                <View style={styles.rawDataBox}>
                  <Text>First shop: {JSON.stringify(rawShopData[0]).substring(0, 100)}...</Text>
                </View>
              )}
              
              <Button 
                mode="contained" 
                onPress={() => {
                  // Force re-render with data
                  if (rawShopData && rawShopData.length > 0) {
                    console.log('Manually setting shops in state...');
                    dispatch(setShops([...rawShopData]));
                  }
                }} 
                style={[styles.debugButton, styles.forceButton]}
              >
                Force Update Redux
              </Button>
            </>
          )}
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
  debugButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  debugButton: {
    marginTop: 8,
    height: 32,
    flex: 1,
    marginHorizontal: 4,
  },
  divider: {
    marginVertical: 8,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  stateItem: {
    marginLeft: 8,
    marginBottom: 4,
  },
  stateKey: {
    fontWeight: 'bold',
  },
  rawDataBox: {
    backgroundColor: '#eeeeee',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  forceButton: {
    backgroundColor: '#cc0000',
  },
  emptyMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  clearButton: {
    marginTop: 8,
  },
}); 