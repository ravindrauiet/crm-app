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
    totalCustomers: 0,
    inventoryItems: 0,
    lowStockItems: 0
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

      // Fetch inventory stats
      try {
        const inventoryRef = collection(db, 'inventory');
        const inventoryQuery = query(inventoryRef, where('userId', '==', userId));
        const inventorySnapshot = await getDocs(inventoryQuery);
        
        let lowStockCount = 0;
        inventorySnapshot.docs.forEach(doc => {
          const item = doc.data();
          if (item.stockLevel <= (item.minStockLevel || 5)) {
            lowStockCount++;
          }
        });
        
        setStats(prevStats => ({
          ...prevStats,
          inventoryItems: inventorySnapshot.size,
          lowStockItems: lowStockCount
        }));
      } catch (inventoryError) {
        console.error('Error fetching inventory stats:', inventoryError);
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
    const shopName = user?.shopName || 'Your Shop';
    return (
      <Surface style={styles.welcomeCard}>
        <View style={styles.welcomeContent}>
          <Avatar.Text 
            size={60} 
            label={shopName.substring(0, 2).toUpperCase()} 
            style={styles.avatar}
          />
          <View style={styles.welcomeText}>
            <Title style={styles.welcomeTitle}>Welcome back!</Title>
            <Text style={styles.welcomeShopName}>{shopName}</Text>
          </View>
        </View>
        
        <View style={styles.quickActions}>
          <Button 
            mode="contained" 
            icon="wrench" 
            onPress={() => navigation.navigate('RepairTickets')}
            style={styles.actionButton}
          >
            Repairs
          </Button>
          
          <Button 
            mode="contained" 
            icon="account-group" 
            onPress={() => navigation.navigate('CustomerList')}
            style={styles.actionButton}
          >
            Customers
          </Button>
          
          <Button 
            mode="contained" 
            icon="package-variant" 
            onPress={() => navigation.navigate('Inventory')}
            style={styles.actionButton}
          >
            Inventory
          </Button>
        </View>
      </Surface>
    );
  };

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="wrench" size={28} color={theme.colors.primary} />
        <Text style={styles.statNumber}>{stats.totalRepairs}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </Surface>
      
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="progress-clock" size={28} color="#FF9800" />
        <Text style={styles.statNumber}>{stats.inProgressRepairs}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </Surface>
      
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="check-circle" size={28} color="#4CAF50" />
        <Text style={styles.statNumber}>{stats.completedRepairs}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </Surface>
    </View>
  );

  const renderRevenueCard = () => (
    <Surface style={styles.insightsCard}>
      <View style={styles.insightsHeader}>
        <Title style={styles.insightsTitle}>Shop Performance</Title>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('Analytics')}
        >
          View Details
        </Button>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.insightsContent}>
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>${stats.totalRevenue.toFixed(2)}</Text>
            <Text style={styles.insightLabel}>Total Revenue</Text>
          </View>
        </View>
        
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.insightLabel}>Average Rating</Text>
          </View>
        </View>
        
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>{stats.totalCustomers}</Text>
            <Text style={styles.insightLabel}>Customers</Text>
          </View>
        </View>
      </View>
    </Surface>
  );

  const renderInventoryCard = () => (
    <Surface style={styles.insightsCard}>
      <View style={styles.insightsHeader}>
        <Title style={styles.insightsTitle}>Inventory Status</Title>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('Inventory')}
        >
          Manage
        </Button>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.insightsContent}>
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>{stats.inventoryItems}</Text>
            <Text style={styles.insightLabel}>Total Items</Text>
          </View>
        </View>
        
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={stats.lowStockItems > 0 ? "#F44336" : "#757575"} />
          <View style={styles.insightText}>
            <Text style={[styles.insightValue, stats.lowStockItems > 0 ? styles.alertText : {}]}>
              {stats.lowStockItems}
            </Text>
            <Text style={styles.insightLabel}>Low Stock</Text>
          </View>
        </View>
      </View>
      
      <Button 
        mode="contained" 
        icon="package-variant-plus" 
        onPress={() => navigation.navigate('InventoryAdd')}
        style={styles.cardButton}
      >
        Add Inventory Item
      </Button>
    </Surface>
  );

  const renderRecentRepairs = () => (
    <Surface style={styles.repairListCard}>
      <View style={styles.insightsHeader}>
        <Title style={styles.insightsTitle}>Recent Repairs</Title>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('RepairTickets')}
        >
          View All
        </Button>
      </View>
      
      <Divider style={styles.divider} />
      
      {recentRepairs.length > 0 ? (
        recentRepairs.map((repair) => (
          <Surface key={repair.id} style={styles.repairCard}>
            <View style={styles.repairHeader}>
              <View style={styles.repairTitleSection}>
                <Text style={styles.repairTitle}>{repair.deviceType || 'Unknown Device'}</Text>
                <Chip
                  mode="outlined"
                  textStyle={{ color: getStatusColor(repair.status) }}
                  style={[styles.statusChip, { borderColor: getStatusColor(repair.status) }]}
                >
                  {(repair.status || 'pending').replace('_', ' ')}
                </Chip>
              </View>
            </View>
            
            <Text style={styles.repairModel}>
              {repair.deviceModel || 'No model specified'}
            </Text>
            
            <Text style={styles.repairCustomer}>
              Customer: {repair.customerName || 'Unknown Customer'}
            </Text>
            
            <View style={styles.repairFooter}>
              <Text style={styles.repairDate}>
                {formatRepairDate(repair.createdAt)}
              </Text>
              <Button
                mode="contained"
                onPress={() => handleRepairPress(repair)}
                style={styles.viewButton}
              >
                View
              </Button>
            </View>
          </Surface>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="tools" size={48} color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>No Repairs Yet</Text>
          <Text style={styles.emptySubtitle}>Create a new repair to get started</Text>
          <Button 
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('RepairTickets', { screen: 'CreateRepair' })}
            style={styles.emptyButton}
          >
            New Repair
          </Button>
        </View>
      )}
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
        {renderInventoryCard()}
        {renderRecentRepairs()}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('RepairTickets', { screen: 'CreateRepair' })}
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
  welcomeShopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 6,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  insightsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#e9ecef',
  },
  insightsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  insightItem: {
    alignItems: 'center',
    padding: 8,
  },
  insightText: {
    alignItems: 'center',
    marginTop: 8,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  insightLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  alertText: {
    color: '#F44336',
  },
  cardButton: {
    marginTop: 16,
  },
  repairListCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  repairCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    backgroundColor: '#ffffff',
  },
  repairHeader: {
    marginBottom: 8,
  },
  repairTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusChip: {
    height: 28,
  },
  repairModel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  repairCustomer: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  repairFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  repairDate: {
    color: '#666',
    fontSize: 12,
  },
  viewButton: {
    marginLeft: 8,
    height: 36,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#2196F3',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    color: '#6c757d',
  },
  emptyButton: {
    marginTop: 16,
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