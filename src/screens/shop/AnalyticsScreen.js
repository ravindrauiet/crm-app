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

export default function AnalyticsScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
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
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const startDate = timeRange === 'week' 
        ? startOfDay(subDays(new Date(), 7))
        : startOfDay(subMonths(new Date(), 1));

      // Fetch repairs for the selected time range
      const repairsQuery = query(
        collection(db, 'repairs'),
        where('shopId', '==', user.id),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'asc')
      );

      const repairsSnapshot = await getDocs(repairsQuery);
      const repairs = repairsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process analytics data
      const processedData = processAnalyticsData(repairs, startDate);
      setAnalytics(processedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processAnalyticsData = (repairs, startDate) => {
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

    // Process each repair
    repairs.forEach(repair => {
      // Revenue data
      const dayIndex = days - 1 - Math.floor((new Date() - repair.createdAt.toDate()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < days) {
        revenueData[dayIndex] += repair.price || 0;
      }
      totalRevenue += repair.price || 0;

      // Status distribution
      statusCount[repair.status] = (statusCount[repair.status] || 0) + 1;

      // Device type distribution
      deviceCount[repair.deviceType] = (deviceCount[repair.deviceType] || 0) + 1;

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
        total: new Set(repairs.map(r => r.customerId)).size,
        new: repairs.filter(r => r.isNewCustomer).length,
        returning: repairs.filter(r => !r.isNewCustomer).length
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
          ${analytics.revenue.total.toFixed(2)}
        </Text>
      </View>
      <LineChart
        data={{
          labels: analytics.revenue.labels,
          datasets: [{
            data: analytics.revenue.data
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
          }
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
          <Text variant="titleLarge">{analytics.repairs.total}</Text>
          <Text variant="bodySmall">Total Repairs</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-multiple" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">{analytics.customers.total}</Text>
          <Text variant="bodySmall">Total Customers</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">{analytics.ratings.average.toFixed(1)}</Text>
          <Text variant="bodySmall">Avg Rating</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="currency-usd" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge">${analytics.revenue.total.toFixed(0)}</Text>
          <Text variant="bodySmall">Total Revenue</Text>
        </View>
      </View>
    </Surface>
  );

  const renderDeviceDistribution = () => {
    const deviceData = Object.entries(analytics.repairs.byDevice).map(([device, count]) => ({
      name: device,
      count,
      color: getRandomColor(),
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));

    return (
      <Surface style={styles.chartCard}>
        <Text variant="titleMedium" style={styles.cardTitle}>Device Distribution</Text>
        <PieChart
          data={deviceData}
          width={width - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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
    const serviceData = Object.entries(analytics.repairs.byService).map(([service, count]) => ({
      name: service,
      count,
      color: getRandomColor(),
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));

    return (
      <Surface style={styles.chartCard}>
        <Text variant="titleMedium" style={styles.cardTitle}>Service Distribution</Text>
        <PieChart
          data={serviceData}
          width={width - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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