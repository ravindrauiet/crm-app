import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Dimensions } from 'react-native';
import { Text, Surface, Button, Chip, Divider, useTheme, IconButton, FAB, Portal, Modal, ProgressBar, Avatar, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format } from 'date-fns';
import { checkAuth } from '../../store/slices/authSlice';

const { width } = Dimensions.get('window');

export default function ShopDashboardScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const userType = useSelector(state => state.auth.userType);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRepairs: 0,
    pendingRepairs: 0,
    inProgressRepairs: 0,
    completedRepairs: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalCustomers: 0
  });
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [showNewRepairModal, setShowNewRepairModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    // Try to refresh the auth state if user is missing
    if (!user || !user.uid) {
      console.log('User info missing or incomplete, trying to refresh auth state');
      dispatch(checkAuth());
    } else {
      console.log('User info available:', { id: user.uid, type: userType });
      fetchDashboardData();
    }
  }, [user, userType]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user && user.uid) {
        fetchDashboardData();
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
          />
          {unreadMessages > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadMessages}</Text>
            </View>
          )}
          <IconButton
            icon="account"
            size={24}
            onPress={() => navigation.navigate('ShopProfile')}
          />
        </View>
      ),
    });
  }, [navigation, unreadMessages]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.error('User object is missing');
        Alert.alert('Error', 'User information is missing. Please log in again.');
        setLoading(false);
        return;
      }

      // Log the user object structure to debug
      console.log('User object structure:', Object.keys(user));
      
      // Check for both uid and id as possible identifiers
      const userId = user.uid || user.id;
      
      if (!userId) {
        console.error('User ID is missing. User object:', JSON.stringify(user));
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching shop data for user ID:', userId);
      
      // Fetch shop stats
      const shopRef = doc(db, 'shops', userId);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        console.log('Shop document found');
        const shopData = shopDoc.data();
        setStats({
          totalRepairs: shopData.totalRepairs || 0,
          pendingRepairs: shopData.pendingRepairs || 0,
          inProgressRepairs: shopData.inProgressRepairs || 0,
          completedRepairs: shopData.completedRepairs || 0,
          totalRevenue: shopData.totalRevenue || 0,
          averageRating: shopData.averageRating || 0,
          totalCustomers: shopData.totalCustomers || 0
        });
      } else {
        console.log('No shop document found for user ID:', userId);
        // Initialize with default values if no shop data exists
        setStats({
          totalRepairs: 0,
          pendingRepairs: 0,
          inProgressRepairs: 0,
          completedRepairs: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalCustomers: 0
        });
      }

      // Try-catch for the repairs query to isolate errors
      try {
        console.log('Fetching repairs for shop ID:', userId);
        
        // First try with the full query including ordering
        try {
          const repairsQuery = query(
            collection(db, 'repairs'),
            where('shopId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(5)
          );

          const repairsSnapshot = await getDocs(repairsQuery);
          console.log(`Found ${repairsSnapshot.size} repairs`);
          
          const repairs = repairsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setRecentRepairs(repairs);
        } catch (indexError) {
          // If we get an index error, try again without ordering
          if (indexError.message && indexError.message.includes('index')) {
            console.log('Index error detected, falling back to unordered query');
            const fallbackQuery = query(
              collection(db, 'repairs'),
              where('shopId', '==', userId),
              limit(5)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            console.log(`Found ${fallbackSnapshot.size} repairs with fallback query`);
            
            const fallbackRepairs = fallbackSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Sort manually on the client side
            fallbackRepairs.sort((a, b) => {
              // Handle different date formats safely
              try {
                const getTimestamp = (repair) => {
                  if (!repair.createdAt) return 0;
                  
                  if (repair.createdAt.toDate && typeof repair.createdAt.toDate === 'function') {
                    return repair.createdAt.toDate().getTime();
                  }
                  
                  if (typeof repair.createdAt === 'string') {
                    return new Date(repair.createdAt).getTime();
                  }
                  
                  if (repair.createdAt instanceof Date) {
                    return repair.createdAt.getTime();
                  }
                  
                  return 0;
                };
                
                return getTimestamp(b) - getTimestamp(a); // descending order
              } catch (e) {
                return 0;
              }
            });
            
            setRecentRepairs(fallbackRepairs);
          } else {
            // Rethrow non-index related errors
            throw indexError;
          }
        }
        
        // Count unread messages with safe checking
        let messageCount = 0;
        recentRepairs.forEach(repair => {
          if (repair.messages && Array.isArray(repair.messages)) {
            messageCount += repair.messages.filter(msg => 
              msg && typeof msg === 'object' && 
              msg.sender === 'customer' && 
              !msg.read
            ).length;
          }
        });
        setUnreadMessages(messageCount);
      } catch (repairError) {
        console.error('Error fetching repairs:', repairError);
        // Don't fail the whole dashboard, just show empty repairs
        setRecentRepairs([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleRepairPress = (repair) => {
    setSelectedRepair(repair);
    navigation.navigate('RepairDetails', { repairId: repair.id });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA000';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const renderWelcomeSection = () => {
    const userName = user?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Shop Owner');
    const initials = userName.substring(0, 2).toUpperCase();
    
    return (
      <Surface style={styles.welcomeCard}>
        <View style={styles.welcomeContent}>
          <Avatar.Text 
            size={60} 
            label={initials} 
            style={styles.avatar}
          />
          <View style={styles.welcomeText}>
            <Title style={styles.welcomeTitle}>Welcome back, {userName}!</Title>
            <Text style={styles.welcomeSubtitle}>Manage your repair service business</Text>
          </View>
        </View>
      </Surface>
    );
  };

  const renderStatsCard = () => (
    <Surface style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="tools" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium">{stats.totalRepairs}</Text>
          <Text variant="bodySmall">Total Repairs</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium">{stats.pendingRepairs}</Text>
          <Text variant="bodySmall">Pending</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="progress-clock" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium">{stats.inProgressRepairs}</Text>
          <Text variant="bodySmall">In Progress</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium">{stats.completedRepairs}</Text>
          <Text variant="bodySmall">Completed</Text>
        </View>
      </View>
    </Surface>
  );

  const renderRevenueCard = () => (
    <Surface style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium">Revenue Overview</Text>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={() => navigation.navigate('Analytics')}
          />
        </View>
        <Divider style={styles.divider} />
        <View style={styles.revenueContent}>
          <View style={styles.revenueItem}>
            <Text variant="titleLarge" style={styles.revenueAmount}>
              ${stats.totalRevenue.toFixed(2)}
            </Text>
            <Text variant="bodySmall">Total Revenue</Text>
          </View>
          <View style={styles.revenueItem}>
            <Text variant="titleLarge" style={styles.revenueAmount}>
              {stats.averageRating.toFixed(1)}
            </Text>
            <Text variant="bodySmall">Average Rating</Text>
          </View>
          <View style={styles.revenueItem}>
            <Text variant="titleLarge" style={styles.revenueAmount}>
              {stats.totalCustomers}
            </Text>
            <Text variant="bodySmall">Total Customers</Text>
          </View>
        </View>
      </View>
    </Surface>
  );

  const renderRecentRepairs = () => (
    <Surface style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium">Recent Repairs</Text>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={() => navigation.navigate('RepairTickets')}
          />
        </View>
        <Divider style={styles.divider} />
        {recentRepairs.length > 0 ? (
          recentRepairs.map((repair) => (
            <View key={repair.id} style={styles.repairItem}>
              <View style={styles.repairHeader}>
                <Text variant="titleSmall">{repair.deviceType || 'Unknown Device'}</Text>
                <Chip
                  mode="outlined"
                  textStyle={{ color: getStatusColor(repair.status) }}
                  style={[styles.statusChip, { borderColor: getStatusColor(repair.status) }]}
                >
                  {(repair.status || 'pending').replace('_', ' ')}
                </Chip>
              </View>
              <Text variant="bodyMedium" style={styles.repairModel}>
                {repair.deviceModel || 'No model specified'}
              </Text>
              <Text variant="bodySmall" style={styles.repairCustomer}>
                Customer: {repair.customerName || 'Unknown Customer'}
              </Text>
              <View style={styles.repairFooter}>
                <Text variant="bodySmall" style={styles.repairDate}>
                  {formatRepairDate(repair.createdAt)}
                </Text>
                <Button
                  mode="text"
                  onPress={() => handleRepairPress(repair)}
                  style={styles.viewButton}
                >
                  View Details
                </Button>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="tools" size={48} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>No Repairs Yet</Text>
            <Text style={styles.emptySubtitle}>Create a new repair to get started</Text>
          </View>
        )}
      </View>
    </Surface>
  );

  const formatRepairDate = (createdAt) => {
    try {
      if (!createdAt) return 'No date';
      
      // Handle Firestore Timestamp objects
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        return new Date(createdAt.toDate()).toLocaleDateString();
      }
      
      // Handle string dates
      if (typeof createdAt === 'string') {
        return new Date(createdAt).toLocaleDateString();
      }
      
      // Handle Date objects
      if (createdAt instanceof Date) {
        return createdAt.toLocaleDateString();
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {renderWelcomeSection()}
        {renderStatsCard()}
        {renderRevenueCard()}
        {renderRecentRepairs()}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('NewRepair')}
        color="#fff"
      />
    </SafeAreaView>
  );
}

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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 5,
    right: 35,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  welcomeCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 15,
    backgroundColor: '#2196F3',
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    color: '#6c757d',
    marginTop: 4,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
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
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  revenueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueItem: {
    alignItems: 'center',
  },
  revenueAmount: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  repairItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repairModel: {
    color: '#666',
    marginBottom: 4,
  },
  repairCustomer: {
    color: '#666',
    marginBottom: 8,
  },
  repairFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairDate: {
    color: '#666',
  },
  viewButton: {
    marginLeft: 8,
  },
  statusChip: {
    height: 24,
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
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptySubtitle: {
    color: '#6c757d',
  },
}); 