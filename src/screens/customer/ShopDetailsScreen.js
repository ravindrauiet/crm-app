import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Linking, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, Button, Chip, Divider, Portal, Modal, List, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RatingReview from '../../components/RatingReview';

const ShopDetailsScreen = ({ route, navigation }) => {
  const { shopId } = route.params;
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [visibleModal, setVisibleModal] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    fetchShopDetails();
    fetchReviews();
  }, [shopId]);

  const fetchShopDetails = async () => {
    try {
      // Try to get from AsyncStorage
      const usersJson = await AsyncStorage.getItem('users');
      const users = JSON.parse(usersJson || '[]');
      const shopOwner = users.find(u => u.id === shopId);
      
      if (shopOwner && shopOwner.shopDetails) {
        setShop(shopOwner.shopDetails);
      } else {
        // Fallback to a default shop for demo purposes
        setShop({
          name: 'Mobile Fix Shop',
          description: 'Professional mobile device repair services with quick turnaround times.',
          address: '123 Repair St, Tech City',
          phone: '+1 (123) 456-7890',
          email: 'contact@mobilefixshop.com',
          hours: {
            monday: '9:00 AM - 6:00 PM',
            tuesday: '9:00 AM - 6:00 PM',
            wednesday: '9:00 AM - 6:00 PM',
            thursday: '9:00 AM - 6:00 PM',
            friday: '9:00 AM - 7:00 PM',
            saturday: '10:00 AM - 4:00 PM',
            sunday: 'Closed',
          },
          services: [
            'Screen Replacement',
            'Battery Replacement',
            'Water Damage Repair',
            'Charging Port Repair',
            'Software Issues',
            'Camera Repair',
          ],
          specializations: [
            'iPhone',
            'Samsung',
            'Google Pixel',
            'OnePlus',
          ],
          logo: 'https://via.placeholder.com/150',
        });
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const reviewsJson = await AsyncStorage.getItem('shop_reviews');
      const allReviews = JSON.parse(reviewsJson || '[]');
      
      // Filter reviews for this shop
      const shopReviews = allReviews.filter(review => review.shopId === shopId);
      
      setReviews(shopReviews);
      
      // Check if the current user has already reviewed this shop
      if (user) {
        const userReview = shopReviews.find(review => review.customerId === user.id);
        setHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleCall = () => {
    if (!shop?.phone) return;
    
    Linking.openURL(`tel:${shop.phone}`);
  };

  const handleEmail = () => {
    if (!shop?.email) return;
    
    Linking.openURL(`mailto:${shop.email}`);
  };

  const handleGetDirections = () => {
    if (!shop?.address) return;
    
    const encodedAddress = encodeURIComponent(shop.address);
    Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const newReview = {
        ...reviewData,
        id: Date.now().toString(),
        customerId: user.id,
        customerName: user.name || user.email.split('@')[0],
        shopId,
      };
      
      // Get existing reviews
      const reviewsJson = await AsyncStorage.getItem('shop_reviews');
      const allReviews = JSON.parse(reviewsJson || '[]');
      
      // Add new review
      allReviews.push(newReview);
      await AsyncStorage.setItem('shop_reviews', JSON.stringify(allReviews));
      
      // Update the local state
      setReviews([...reviews, newReview]);
      setHasReviewed(true);
      setVisibleModal(null);
      
      Alert.alert('Success', 'Your review has been submitted. Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit your review. Please try again.');
    }
  };

  const handleBookRepair = () => {
    navigation.navigate('Booking', { shopId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>Shop details not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
          Go Back
        </Button>
      </View>
    );
  }

  const renderRatingsModal = () => (
    <Portal>
      <Modal 
        visible={visibleModal === 'ratings'} 
        onDismiss={() => setVisibleModal(null)}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>Rate {shop.name}</Text>
          <RatingReview 
            mode="input" 
            shopName={shop.name}
            shopId={shopId}
            onSubmit={handleReviewSubmit}
          />
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderHoursModal = () => (
    <Portal>
      <Modal 
        visible={visibleModal === 'hours'} 
        onDismiss={() => setVisibleModal(null)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Business Hours</Text>
        <List.Section>
          <List.Item 
            title="Monday" 
            description={shop.hours?.monday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
          <List.Item 
            title="Tuesday" 
            description={shop.hours?.tuesday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
          <List.Item 
            title="Wednesday" 
            description={shop.hours?.wednesday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
          <List.Item 
            title="Thursday" 
            description={shop.hours?.thursday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
          <List.Item 
            title="Friday" 
            description={shop.hours?.friday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
          <List.Item 
            title="Saturday" 
            description={shop.hours?.saturday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
          <List.Item 
            title="Sunday" 
            description={shop.hours?.sunday || 'Not specified'} 
            left={() => <List.Icon icon="clock-outline" />} 
          />
        </List.Section>
        <Button onPress={() => setVisibleModal(null)}>Close</Button>
      </Modal>
    </Portal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {shop.logo ? (
              <Image source={{ uri: shop.logo }} style={styles.logo} />
            ) : (
              <View style={styles.placeholderLogo}>
                <MaterialCommunityIcons name="store" size={50} color={theme.colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.shopInfo}>
            <Text variant="headlineMedium" style={styles.shopName}>{shop.name}</Text>
            <Button 
              mode="contained" 
              icon="tools" 
              onPress={handleBookRepair}
              style={styles.bookButton}
            >
              Book Repair
            </Button>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">About</Text>
            <Text style={styles.description}>{shop.description}</Text>

            <View style={styles.contactButtons}>
              <Button 
                mode="outlined" 
                icon="phone" 
                onPress={handleCall}
                style={styles.contactButton}
              >
                Call
              </Button>
              <Button 
                mode="outlined" 
                icon="email" 
                onPress={handleEmail}
                style={styles.contactButton}
              >
                Email
              </Button>
              <Button 
                mode="outlined" 
                icon="map-marker" 
                onPress={handleGetDirections}
                style={styles.contactButton}
              >
                Directions
              </Button>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#757575" />
              <Text style={styles.infoText}>{shop.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={20} color="#757575" />
              <Text style={styles.infoText}>{shop.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={20} color="#757575" />
              <Text style={styles.infoText}>{shop.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock" size={20} color="#757575" />
              <View style={styles.hoursContainer}>
                <Text style={styles.infoText}>
                  {shop.hours?.monday} (Mon-Fri)
                </Text>
                <Button 
                  compact 
                  mode="text" 
                  onPress={() => setVisibleModal('hours')}
                >
                  See All
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Services</Text>
            <View style={styles.tagsContainer}>
              {shop.services?.map((service, index) => (
                <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                  {service}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Specializations</Text>
            <View style={styles.tagsContainer}>
              {shop.specializations?.map((specialization, index) => (
                <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                  {specialization}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.ratingHeader}>
              <Text variant="titleMedium">Ratings & Reviews</Text>
              {!hasReviewed && (
                <Button 
                  mode="text" 
                  onPress={() => setVisibleModal('ratings')}
                >
                  Write a Review
                </Button>
              )}
            </View>
            <RatingReview 
              mode="display" 
              ratings={reviews}
              emptyMessage="This shop doesn't have any reviews yet. Be the first one to leave a review!"
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {renderRatingsModal()}
      {renderHoursModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 18,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    marginBottom: 8,
  },
  bookButton: {
    marginTop: 8,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  hoursContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    margin: 4,
  },
  tagText: {
    fontSize: 14,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 5,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default ShopDetailsScreen; 