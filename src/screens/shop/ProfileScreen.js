import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, useTheme, IconButton, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logout } from '../../store/slices/authSlice';

export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [shopData, setShopData] = useState(null);
  const [stats, setStats] = useState({
    totalRepairs: 0,
    completedRepairs: 0,
    totalRevenue: 0,
    averageRating: 0
  });

  useEffect(() => {
    if (user) {
      fetchShopProfile();
    }
  }, [user]);

  const fetchShopProfile = async () => {
    try {
      setLoading(true);
      
      // Check and log user data for debugging
      console.log('User data in shop profile:', user);
      
      // Handle potential missing user ID
      if (!user) {
        console.error('User is missing in shop profile');
        setLoading(false);
        return;
      }
      
      // Get user ID
      const userId = user.uid || user.id;
      
      if (!userId) {
        console.error('User ID is missing in shop profile');
        setLoading(false);
        return;
      }

      // Set default shop data
      const defaultShopData = {
        name: user.shopName || 'Your Shop',
        description: 'Add a description to your shop',
        phone: '',
        email: user.email || '',
        address: '',
        website: '',
        logo: null
      };
      
      // Fetch shop document from Firestore
      const shopRef = doc(db, 'shops', userId);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        const shopDocData = shopDoc.data();
        setShopData({
          name: shopDocData.name || defaultShopData.name,
          description: shopDocData.description || defaultShopData.description,
          phone: shopDocData.phone || defaultShopData.phone,
          email: shopDocData.email || defaultShopData.email,
          address: shopDocData.address || defaultShopData.address,
          website: shopDocData.website || defaultShopData.website,
          logo: shopDocData.logo || defaultShopData.logo
        });
      } else {
        console.log('No shop document found for user:', userId);
        setShopData(defaultShopData);
      }
      
      // Fetch transaction data for revenue
      let totalRevenue = 0;
      try {
        const transactionsRef = collection(db, 'transactions');
        const transactionsQuery = query(
          transactionsRef,
          where('shopId', '==', userId),
          where('type', '==', 'sale')
        );
        
        const transactionsSnapshot = await getDocs(transactionsQuery);
        transactionsSnapshot.forEach(doc => {
          const transaction = doc.data();
          if (transaction.total) {
            totalRevenue += transaction.total;
          }
        });
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }
      
      // Fetch repair statistics
      let totalRepairs = 0;
      let completedRepairs = 0;
      let totalRating = 0;
      let ratingCount = 0;
      
      try {
        const repairsRef = collection(db, 'repairs');
        const repairsQuery = query(
          repairsRef,
          where('shopId', '==', userId)
        );
        
        const repairsSnapshot = await getDocs(repairsQuery);
        totalRepairs = repairsSnapshot.size;
        
        repairsSnapshot.forEach(doc => {
          const repair = doc.data();
          
          if (repair.status === 'completed') {
            completedRepairs++;
          }
          
          if (repair.rating && repair.rating > 0) {
            totalRating += repair.rating;
            ratingCount++;
          }
        });
      } catch (err) {
        console.error('Error fetching repairs:', err);
      }
      
      // Calculate average rating
      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
      
      // Update stats state
      setStats({
        totalRepairs,
        completedRepairs,
        totalRevenue,
        averageRating
      });
    } catch (error) {
      console.error('Error fetching shop profile:', error);
      Alert.alert('Error', 'Failed to load shop profile');
      
      // Set default data even on error
      setShopData({
        name: 'Your Shop',
        description: 'Add a description to your shop',
        phone: '',
        email: user ? (user.email || '') : '',
        address: '',
        website: '',
        logo: null
      });
      
      setStats({
        totalRepairs: 0,
        completedRepairs: 0,
        totalRevenue: 0,
        averageRating: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // If user data is not available, show a loading screen
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  // Show loading indicator while fetching shop data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading shop profile...</Text>
      </View>
    );
  }

  const renderStats = () => (
    <Surface style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            {stats.totalRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Total Repairs
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            {stats.completedRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Completed
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            ${stats.totalRevenue.toFixed(2)}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Revenue
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            {stats.averageRating.toFixed(1)}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Rating
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderProfileSection = () => (
    <Surface style={styles.profileCard}>
      <View style={styles.profileHeader}>
        {shopData?.logo ? (
          <Image source={{ uri: shopData.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.placeholderLogo]}>
            <MaterialCommunityIcons name="store" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text variant="titleLarge">{shopData?.name}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {shopData?.description}
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Item
          title="Edit Profile"
          left={props => <List.Icon {...props} icon="account-edit" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditShopProfile')}
        />
        <List.Item
          title="Working Hours"
          left={props => <List.Icon {...props} icon="clock-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('WorkingHours')}
        />
        <List.Item
          title="Services"
          left={props => <List.Icon {...props} icon="tools" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Services')}
        />
      </List.Section>
    </Surface>
  );

  const renderContactSection = () => (
    <Surface style={styles.contactCard}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
      <Divider style={styles.divider} />
      
      <List.Section>
        <List.Item
          title={shopData?.phone || 'Not set'}
          description="Phone"
          left={props => <List.Icon {...props} icon="phone" />}
        />
        <List.Item
          title={shopData?.email || 'Not set'}
          description="Email"
          left={props => <List.Icon {...props} icon="email" />}
        />
        <List.Item
          title={shopData?.address || 'Not set'}
          description="Address"
          left={props => <List.Icon {...props} icon="map-marker" />}
        />
        {shopData?.website && (
          <List.Item
            title={shopData.website}
            description="Website"
            left={props => <List.Icon {...props} icon="web" />}
          />
        )}
      </List.Section>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {renderStats()}
        {renderProfileSection()}
        {renderContactSection()}
        
        <Surface style={styles.settingsCard}>
          <List.Section>
            <List.Item
              title="Settings"
              left={props => <List.Icon {...props} icon="cog" color="#555" />}
              right={props => <List.Icon {...props} icon="chevron-right" color="#2196F3" />}
              onPress={() => Alert.alert('Coming Soon', 'Settings page is under development')}
            />
            <List.Item
              title="Help & Support"
              left={props => <List.Icon {...props} icon="help-circle" color="#555" />}
              right={props => <List.Icon {...props} icon="chevron-right" color="#2196F3" />}
              onPress={() => Alert.alert('Support', 'Need help? Contact us at support@crmapp.com')}
            />
            <List.Item
              title="Sign Out"
              left={props => <List.Icon {...props} icon="logout" color="#F44336" />}
              onPress={handleSignOut}
              titleStyle={{ color: '#F44336' }}
            />
          </List.Section>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  profileCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  placeholderLogo: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  subtitle: {
    color: '#757575',
    marginTop: 4,
  },
  divider: {
    backgroundColor: '#e9ecef',
    height: 1,
    marginVertical: 8,
  },
  contactCard: {
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
  settingsCard: {
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
}); 