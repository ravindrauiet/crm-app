import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Linking, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, Chip, Divider, Portal, Modal, List, useTheme, IconButton, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RatingReview from '../../components/RatingReview';
import { collection, doc, getDoc, onSnapshot, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ShopDetailsScreen = ({ route, navigation }) => {
  const { shopId } = route.params;
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [visibleModal, setVisibleModal] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    const unsubscribeShop = subscribeToShop();
    const unsubscribeReviews = subscribeToReviews();
    
    return () => {
      unsubscribeShop();
      unsubscribeReviews();
    };
  }, [shopId]);

  const subscribeToShop = () => {
    const shopRef = doc(db, 'shops', shopId);
    return onSnapshot(shopRef, (doc) => {
      if (doc.exists()) {
        setShop({ id: doc.id, ...doc.data() });
      } else {
        console.log('No shop found');
        setShop(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching shop:', error);
      setLoading(false);
    });
  };

  const subscribeToReviews = () => {
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const reviewsData = [];
      let totalRating = 0;
      
      snapshot.forEach((doc) => {
        const review = { id: doc.id, ...doc.data() };
        reviewsData.push(review);
        totalRating += review.rating;
        
        // Check if current user has reviewed
        if (review.customerId === user.id) {
          setHasReviewed(true);
        }
      });
      
      setReviews(reviewsData);
      setTotalReviews(reviewsData.length);
      setAverageRating(reviewsData.length > 0 ? totalRating / reviewsData.length : 0);
    }, (error) => {
      console.error('Error fetching reviews:', error);
    });
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
        customerId: user.id,
        customerName: user.name || user.email.split('@')[0],
        shopId,
        createdAt: new Date().toISOString(),
      };
      
      // Add review to Firestore
      await addDoc(collection(db, 'reviews'), newReview);
      
      // Update shop's average rating
      const shopRef = doc(db, 'shops', shopId);
      const shopDoc = await getDoc(shopRef);
      if (shopDoc.exists()) {
        const shopData = shopDoc.data();
        const newTotalReviews = (shopData.totalReviews || 0) + 1;
        const newAverageRating = ((shopData.averageRating || 0) * (newTotalReviews - 1) + reviewData.rating) / newTotalReviews;
        
        await updateDoc(shopRef, {
          totalReviews: newTotalReviews,
          averageRating: newAverageRating
        });
      }
      
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
          {Object.entries(shop.hours || {}).map(([day, hours]) => (
            <List.Item 
              key={day}
              title={day.charAt(0).toUpperCase() + day.slice(1)} 
              description={hours || 'Not specified'} 
              left={() => <List.Icon icon="clock-outline" />} 
            />
          ))}
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
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} ({totalReviews} reviews)
              </Text>
            </View>
          </View>
        </View>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
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
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Services</Text>
            <View style={styles.tagsContainer}>
              {shop.services?.map((service, index) => (
                <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                  {service}
                </Chip>
              ))}
            </View>
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Specializations</Text>
            <View style={styles.tagsContainer}>
              {shop.specializations?.map((specialization, index) => (
                <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                  {specialization}
                </Chip>
              ))}
            </View>
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
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
          </View>
        </Surface>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="tools"
        label="Book Repair"
        onPress={handleBookRepair}
        color="#fff"
      />

      {renderRatingsModal()}
      {renderHoursModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fff',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    color: '#666',
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  description: {
    marginTop: 8,
    marginBottom: 16,
    color: '#666',
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
    marginVertical: 16,
    backgroundColor: '#e9ecef',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
    color: '#666',
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
    backgroundColor: '#e9ecef',
  },
  tagText: {
    fontSize: 14,
    color: '#495057',
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
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
    borderRadius: 28,
    elevation: 6,
  },
});

export default ShopDetailsScreen; 