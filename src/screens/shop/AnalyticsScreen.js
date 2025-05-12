import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, Chip, Divider, useTheme, IconButton, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ route, navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const { shopId, shopStats } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('week');
  const [analytics, setAnalytics] = useState({
    revenue: {
      total: 0,
      data: [],
      labels: []
    },
    repairs: {
      total: 0,
      byStatus: {},
      byDevice: {},
      byService: {}
    },
    customers: {
      total: 0,
      new: 0,
      returning: 0
    },
    ratings: {
      average: 0,
      distribution: {}
    }
  });

  useEffect(() => {
    // Initialize with shop stats if available from route params
    if (shopStats) {
      setAnalytics(prevState => ({
        ...prevState,
        revenue: {
          ...prevState.revenue,
          total: shopStats.totalRevenue || 0
        },
        repairs: {
          ...prevState.repairs,
          total: shopStats.totalRepairs || 0
        },
        ratings: {
          ...prevState.ratings,
          average: shopStats.averageRating || 0
        }
      }));
    }
    
    fetchAnalytics();
  }, [timeRange, shopId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Use the shopId from route params, or fall back to user.id
      const effectiveShopId = shopId || user?.uid || user?.id;
      
      if (!effectiveShopId) {
        console.error('Shop ID not available');
        Alert.alert('Error', 'Shop ID not found. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching analytics for shop ID:', effectiveShopId);
      
      const startDate = timeRange === 'week' 
        ? startOfDay(subDays(new Date(), 7))
        : startOfDay(subMonths(new Date(), 1));

      // Fetch repairs for the selected time range
      const repairsQuery = query(
        collection(db, 'repairs'),
        where('shopId', '==', effectiveShopId),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'asc')
      );

      const repairsSnapshot = await getDocs(repairsQuery);
      const repairs = repairsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch transactions for revenue
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('shopId', '==', effectiveShopId),
        where('type', '==', 'sale')
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch customers
      const customersQuery = query(
        collection(db, 'customers'),
        where('shopId', '==', effectiveShopId)
      );
      
      const customersSnapshot = await getDocs(customersQuery);
      const customers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process analytics data
      const processedData = processAnalyticsData(repairs, transactions, customers, startDate);
      setAnalytics(processedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processAnalyticsData = (repairs, transactions, customers, startDate) => {
    const revenueData = [];
    const revenueLabels = [];
    const statusCount = {};
    const deviceCount = {};
    const serviceCount = {};
    const ratingDistribution = {};
    let totalRevenue = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    // Initialize data points
    const days = timeRange === 'week' ? 7 : 30;
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      revenueData.push(0);
      revenueLabels.push(format(date, 'MMM d'));
    }

    // Process transactions for revenue
    transactions.forEach(transaction => {
      if (transaction.createdAt && transaction.total) {
        const createdDate = transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const dayIndex = days - 1 - Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
        
        if (dayIndex >= 0 && dayIndex < days) {
          revenueData[dayIndex] += transaction.total || 0;
        }
        
        totalRevenue += transaction.total;
      }
    });

    // Process each repair
    repairs.forEach(repair => {
      // Status distribution
      const status = repair.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;

      // Device type distribution
      const deviceType = repair.deviceType || 'unknown';
      deviceCount[deviceType] = (deviceCount[deviceType] || 0) + 1;

      // Service type distribution
      if (repair.serviceType) {
        serviceCount[repair.serviceType] = (serviceCount[repair.serviceType] || 0) + 1;
      }

      // Rating distribution
      if (repair.rating) {
        totalRatings += repair.rating;
        ratingCount++;
        const rating = Math.floor(repair.rating);
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      }
    });

    return {
      revenue: {
        total: totalRevenue,
        data: revenueData,
        labels: revenueLabels
      },
      repairs: {
        total: repairs.length,
        byStatus: statusCount,
        byDevice: deviceCount,
        byService: serviceCount
      },
      customers: {
        total: customers.length,
        new: customers.filter(c => {
          if (!c.createdAt) return false;
          const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
          return (new Date() - createdDate) / (1000 * 60 * 60 * 24) <= 30;
        }).length,
        returning: 0 // This would require more complex logic with transaction history
      },
      ratings: {
        average: ratingCount > 0 ? totalRatings / ratingCount : 0,
        distribution: ratingDistribution
      }
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const renderRevenueChart = () => (
    <Surface style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text variant="titleMedium">Revenue Trend</Text>
        <Text variant="titleLarge" style={styles.revenueTotal}>
          ${Number(analytics.revenue.total || 0).toFixed(2)}
        </Text>
      </View>
      <LineChart
        data={{
          labels: analytics.revenue.labels,
          datasets: [{
            data: analytics.revenue.data.map(val => Number(val) || 0)
          }]
        }}
        width={width - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          style: {
            borderRadius: 16
          },
          formatYLabel: (value) => Number(value).toFixed(0)
        }}
        bezier
        style={styles.chart}
      />
    </Surface>
  );

  const renderRepairStats = () => (
    <Surface style={styles.statsCard}>
      <Text variant="titleMedium" style={styles.cardTitle}>Repair Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="tools" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">{Number(analytics.repairs.total || 0)}</Text>
          <Text variant="bodySmall">Total Repairs</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-multiple" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">{Number(analytics.customers.total || 0)}</Text>
          <Text variant="bodySmall">Total Customers</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">{Number(analytics.ratings.average || 0).toFixed(1)}</Text>
          <Text variant="bodySmall">Avg Rating</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="currency-usd" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">${Number(analytics.revenue.total || 0).toFixed(0)}</Text>
          <Text variant="bodySmall">Total Revenue</Text>
        </View>
      </View>
    </Surface>
  );

  const renderDeviceDistribution = () => {
    const deviceEntries = Object.entries(analytics.repairs.byDevice || {});
    const deviceData = deviceEntries.length > 0 
      ? deviceEntries.map(([device, count]) => ({
          name: device || 'Unknown',
          count: Number(count) || 0,
          color: getRandomColor(),
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        }))
      : [{ name: 'No Data', count: 1, color: '#CCCCCC', legendFontColor: '#7F7F7F', legendFontSize: 12 }];

    return (
      <Surface style={styles.chartCard}>
        <Text variant="titleMedium" style={styles.cardTitle}>Device Distribution</Text>
        <PieChart
          data={deviceData}
          width={width - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            formatNumber: (number) => Number(number).toFixed(0)
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </Surface>
    );
  };

  const renderServiceDistribution = () => {
    const serviceEntries = Object.entries(analytics.repairs.byService || {});
    const serviceData = serviceEntries.length > 0 
      ? serviceEntries.map(([service, count]) => ({
          name: service || 'Unknown',
          count: Number(count) || 0,
          color: getRandomColor(),
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        }))
      : [{ name: 'No Data', count: 1, color: '#CCCCCC', legendFontColor: '#7F7F7F', legendFontSize: 12 }];

    return (
      <Surface style={styles.chartCard}>
        <Text variant="titleMedium" style={styles.cardTitle}>Service Distribution</Text>
        <PieChart
          data={serviceData}
          width={width - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            formatNumber: (number) => Number(number).toFixed(0)
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </Surface>
    );
  };

  const getRandomColor = () => {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Analytics</Text>
        <SegmentedButtons
          value={timeRange}
          onValueChange={setTimeRange}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderRevenueChart()}
        {renderRepairStats()}
        {renderDeviceDistribution()}
        {renderServiceDistribution()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  revenueTotal: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 16,
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
}); 