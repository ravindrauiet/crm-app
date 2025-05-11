import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, useTheme, IconButton, Divider, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function DashboardScreen({ navigation }) {
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
  const [revenueData, setRevenueData] = useState({
    labels: [],
    datasets: [{ data: [] }]
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const repairsRef = collection(db, 'repairs');
      const q = query(
        repairsRef,
        where('shopId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const repairsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate statistics
        const stats = {
          totalRepairs: repairsList.length,
          pendingRepairs: repairsList.filter(r => r.status === 'pending').length,
          inProgressRepairs: repairsList.filter(r => r.status === 'in_progress').length,
          completedRepairs: repairsList.filter(r => r.status === 'completed').length,
          totalRevenue: repairsList.reduce((sum, r) => sum + (r.price || 0), 0),
          averageRating: repairsList.reduce((sum, r) => sum + (r.rating || 0), 0) / repairsList.length || 0,
          totalCustomers: new Set(repairsList.map(r => r.customerId)).size
        };
        setStats(stats);

        // Set recent repairs
        setRecentRepairs(repairsList.slice(0, 5));

        // Calculate revenue data for chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const revenueByDay = last7Days.map(date => {
          const dayRepairs = repairsList.filter(r => 
            r.createdAt?.toDate().toISOString().split('T')[0] === date
          );
          return dayRepairs.reduce((sum, r) => sum + (r.price || 0), 0);
        });

        setRevenueData({
          labels: last7Days.map(date => date.split('-')[2]),
          datasets: [{ data: revenueByDay }]
        });

        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'in_progress': return '#1976D2';
      case 'completed': return '#388E3C';
      case 'cancelled': return '#D32F2F';
      default: return '#757575';
    }
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="tools" size={24} color={theme.colors.primary} />
        <Text variant="titleLarge" style={styles.statValue}>
          {stats.totalRepairs}
        </Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          Total Repairs
        </Text>
      </Surface>

      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="cash" size={24} color={theme.colors.primary} />
        <Text variant="titleLarge" style={styles.statValue}>
          ${stats.totalRevenue.toFixed(2)}
        </Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          Revenue
        </Text>
      </Surface>

      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.primary} />
        <Text variant="titleLarge" style={styles.statValue}>
          {stats.totalCustomers}
        </Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          Customers
        </Text>
      </Surface>

      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
        <Text variant="titleLarge" style={styles.statValue}>
          {stats.averageRating.toFixed(1)}
        </Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          Rating
        </Text>
      </Surface>
    </View>
  );

  const renderRepairStatus = () => (
    <Surface style={styles.statusCard}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Repair Status</Text>
      <Divider style={styles.divider} />
      
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text variant="titleLarge" style={[styles.statusValue, { color: '#FFA000' }]}>
            {stats.pendingRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statusLabel}>
            Pending
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text variant="titleLarge" style={[styles.statusValue, { color: '#1976D2' }]}>
            {stats.inProgressRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statusLabel}>
            In Progress
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text variant="titleLarge" style={[styles.statusValue, { color: '#388E3C' }]}>
            {stats.completedRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statusLabel}>
            Completed
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderRevenueChart = () => (
    <Surface style={styles.chartCard}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Revenue (Last 7 Days)</Text>
      <Divider style={styles.divider} />
      
      <LineChart
        data={revenueData}
        width={Dimensions.get('window').width - 64}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
        bezier
        style={styles.chart}
      />
    </Surface>
  );

  const renderRecentRepairs = () => (
    <Surface style={styles.repairsCard}>
      <View style={styles.repairsHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Recent Repairs</Text>
        <Button
          mode="text"
          onPress={() => navigation.navigate('RepairTickets')}
        >
          View All
        </Button>
      </View>
      <Divider style={styles.divider} />
      
      {recentRepairs.map(repair => (
        <View key={repair.id} style={styles.repairItem}>
          <View style={styles.repairInfo}>
            <Text variant="bodyLarge">{repair.deviceType}</Text>
            <Text variant="bodySmall" style={styles.customerName}>
              {repair.customerName}
            </Text>
          </View>
          <Chip
            mode="flat"
            textStyle={{ color: '#fff' }}
            style={[styles.statusChip, { backgroundColor: getStatusColor(repair.status) }]}
          >
            {repair.status.replace('_', ' ')}
          </Chip>
        </View>
      ))}
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2196F3"]}
          />
        }
      >
        {renderStats()}
        {renderRepairStatus()}
        {renderRevenueChart()}
        {renderRecentRepairs()}
        
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            icon="wrench"
            onPress={() => navigation.navigate('RepairTickets')}
            style={styles.actionButton}
          >
            View All Repairs
          </Button>
          
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('CreateRepair')}
            style={[styles.actionButton, styles.createButton]}
          >
            Create New Repair
          </Button>
        </View>
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  statValue: {
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
  statusCard: {
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
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statusItem: {
    alignItems: 'center',
    padding: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  repairsCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  repairsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  repairInfo: {
    flex: 1,
  },
  customerName: {
    color: '#757575',
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  buttonSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
}); 