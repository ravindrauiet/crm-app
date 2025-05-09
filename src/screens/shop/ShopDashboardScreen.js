import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, Chip, Divider, useTheme, IconButton, FAB, Portal, Modal, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function ShopDashboardScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch shop stats
      const shopRef = doc(db, 'shops', user.id);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
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
      }

      // Subscribe to recent repairs
      const repairsQuery = query(
        collection(db, 'repairs'),
        where('shopId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const unsubscribe = onSnapshot(repairsQuery, (snapshot) => {
        const repairs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentRepairs(repairs);
      });

      return () => unsubscribe();
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
        {recentRepairs.map((repair) => (
          <View key={repair.id} style={styles.repairItem}>
            <View style={styles.repairHeader}>
              <Text variant="titleSmall">{repair.deviceType}</Text>
              <Chip
                mode="outlined"
                textStyle={{ color: getStatusColor(repair.status) }}
                style={[styles.statusChip, { borderColor: getStatusColor(repair.status) }]}
              >
                {repair.status.replace('_', ' ')}
              </Chip>
            </View>
            <Text variant="bodyMedium" style={styles.repairModel}>
              {repair.deviceModel}
            </Text>
            <Text variant="bodySmall" style={styles.repairCustomer}>
              Customer: {repair.customerName}
            </Text>
            <View style={styles.repairFooter}>
              <Text variant="bodySmall" style={styles.repairDate}>
                {new Date(repair.createdAt?.toDate()).toLocaleDateString()}
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
        ))}
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStatsCard()}
        {renderRevenueCard()}
        {renderRecentRepairs()}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        label="New Repair"
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
}); 