import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, TextInput, Dialog, Portal, Avatar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

/**
 * RatingReview component for displaying and collecting ratings and reviews
 * Can be used in two modes:
 * 1. Display mode - to show existing ratings and reviews
 * 2. Input mode - to collect new ratings and reviews
 */
const RatingReview = ({ 
  mode = 'display', // 'display' or 'input'
  ratings = [], // array of rating objects for display mode
  initialRating = 0, // initial rating value for input mode
  onSubmit = null, // callback function for submit in input mode
  shopId = null, // ID of the shop being rated
  repairId = null, // ID of the repair being rated (optional)
  maxRating = 5, // maximum rating value
  starSize = 24, // size of star icons
  shopName = '', // name of the shop (optional)
  emptyMessage = 'No ratings yet', // message to display when no ratings are available
}) => {
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);

  const handleRatingChange = (value) => {
    setRating(value);
  };

  const handleReviewSubmit = () => {
    if (onSubmit) {
      onSubmit({
        rating,
        review,
        shopId,
        repairId,
        timestamp: new Date().toISOString(),
      });
    }
    // Reset after submission
    setRating(0);
    setReview('');
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const renderStars = (value, interactive = false) => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      const filled = i <= value;
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => interactive && handleRatingChange(i)}
          disabled={!interactive}
          style={styles.star}
        >
          <MaterialCommunityIcons
            name={filled ? 'star' : 'star-outline'}
            size={starSize}
            color={filled ? '#FFC107' : '#BBBBBB'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getAverageRating = () => {
    if (!ratings || ratings.length === 0) return 0;
    const totalRating = ratings.reduce((sum, item) => sum + item.rating, 0);
    return (totalRating / ratings.length).toFixed(1);
  };

  const renderReviewDialog = () => (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
        <Dialog.Title>Review</Dialog.Title>
        <Dialog.Content>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerInfo}>
              <Avatar.Icon size={40} icon="account" />
              <View style={styles.reviewerDetails}>
                <Text variant="titleMedium">{currentReview?.customerName || 'Customer'}</Text>
                <Text variant="bodySmall">{formatDate(currentReview?.timestamp)}</Text>
              </View>
            </View>
            <View style={styles.starsRow}>
              {renderStars(currentReview?.rating || 0)}
            </View>
          </View>
          <Text style={styles.reviewText}>{currentReview?.review}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (mode === 'display') {
    if (!ratings || ratings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    const avgRating = getAverageRating();

    return (
      <View style={styles.container}>
        <View style={styles.summaryContainer}>
          <View style={styles.ratingContainer}>
            <Text style={styles.averageRating}>{avgRating}</Text>
            <View style={styles.starsRow}>
              {renderStars(Math.round(avgRating))}
            </View>
            <Text style={styles.totalRatings}>{ratings.length} reviews</Text>
          </View>
          
          <View style={styles.distributionContainer}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratings.filter(item => item.rating === star).length;
              const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
              
              return (
                <View key={star} style={styles.distributionRow}>
                  <Text style={styles.distributionStar}>{star}</Text>
                  <View style={styles.distributionBarContainer}>
                    <View 
                      style={[
                        styles.distributionBar, 
                        { width: `${percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.distributionCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Divider style={styles.divider} />
        
        <Text style={styles.reviewsTitle}>Recent Reviews</Text>
        
        {ratings.slice(0, 3).map((item, index) => (
          <Surface key={index} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <Avatar.Icon size={40} icon="account" />
                <View style={styles.reviewerDetails}>
                  <Text variant="titleMedium">{item.customerName || 'Customer'}</Text>
                  <Text variant="bodySmall">{formatDate(item.timestamp)}</Text>
                </View>
              </View>
              <View style={styles.starsRow}>
                {renderStars(item.rating)}
              </View>
            </View>
            
            {item.review ? (
              <View>
                <Text 
                  style={styles.reviewText} 
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {item.review}
                </Text>
                {item.review.length > 120 && (
                  <Button 
                    compact 
                    onPress={() => {
                      setCurrentReview(item);
                      setDialogVisible(true);
                    }}
                  >
                    Read More
                  </Button>
                )}
              </View>
            ) : (
              <Text style={styles.noReviewText}>No written review</Text>
            )}
          </Surface>
        ))}
        
        {ratings.length > 3 && (
          <Button mode="text" style={styles.moreButton}>
            See All {ratings.length} Reviews
          </Button>
        )}
        
        {renderReviewDialog()}
      </View>
    );
  }

  // Input mode
  return (
    <View style={styles.container}>
      {shopName && (
        <Text style={styles.rateShopTitle}>Rate {shopName}</Text>
      )}
      
      <View style={styles.inputContainer}>
        <Text style={styles.ratingLabel}>Tap to rate:</Text>
        <View style={styles.starsRow}>
          {renderStars(rating, true)}
        </View>
        
        <TextInput
          label="Your review (optional)"
          value={review}
          onChangeText={setReview}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.reviewInput}
        />
        
        <Button 
          mode="contained" 
          onPress={handleReviewSubmit}
          disabled={rating === 0}
          style={styles.submitButton}
        >
          Submit Review
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  ratingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
    paddingRight: 10,
  },
  averageRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#212121',
  },
  totalRatings: {
    color: '#757575',
    marginTop: 5,
  },
  distributionContainer: {
    flex: 2,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  distributionStar: {
    width: 20,
    textAlign: 'center',
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  distributionBar: {
    height: 8,
    backgroundColor: '#FFC107',
    borderRadius: 4,
  },
  distributionCount: {
    width: 30,
    textAlign: 'right',
    color: '#757575',
  },
  divider: {
    marginTop: 10,
    marginBottom: 20,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewCard: {
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
  },
  reviewerDetails: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  reviewText: {
    lineHeight: 20,
  },
  noReviewText: {
    fontStyle: 'italic',
    color: '#757575',
  },
  moreButton: {
    alignSelf: 'center',
    marginTop: 10,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  star: {
    marginHorizontal: 2,
  },
  inputContainer: {
    alignItems: 'center',
  },
  rateShopTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingLabel: {
    marginBottom: 10,
    color: '#757575',
  },
  reviewInput: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButton: {
    width: '100%',
  },
});

export default RatingReview; 