import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, SegmentedButtons } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

export default function AnalyticsScreen() {
  const user = useSelector(state => state.auth.user);
  const [timeRange, setTimeRange] = useState('week');
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalRepairs: 0,
    avgRepairTime: 0,
    completionRate: 0,
    revenueByDay: {},
    repairsByType: {},
    customerRetention: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const startDate = getStartDate();
      
      // Get repairs from AsyncStorage
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      // Filter repairs for this shop and time range
      const repairs = allRepairs.filter(repair => 
        repair.shopId === user.id && 
        new Date(repair.createdAt) >= startDate
      );

      // Calculate analytics
      const revenueByDay = {};
      const repairsByType = {};
      const customers = new Set();
      let totalRevenue = 0;
      let completedRepairs = 0;
      let totalRepairTime = 0;

      repairs.forEach(repair => {
        // Revenue by day
        const day = moment(repair.createdAt).format('YYYY-MM-DD');
        revenueByDay[day] = (revenueByDay[day] || 0) + (repair.price || 0);
        
        // Repairs by type
        repairsByType[repair.deviceType] = (repairsByType[repair.deviceType] || 0) + 1;
        
        // Customer retention
        customers.add(repair.customerId);
        
        // Total revenue
        totalRevenue += repair.price || 0;
        
        // Completion metrics
        if (repair.status === 'completed') {
          completedRepairs++;
          if (repair.completedAt && repair.startedAt) {
            const repairTime = moment(repair.completedAt).diff(moment(repair.startedAt), 'hours');
            totalRepairTime += repairTime;
          }
        }
      });

      setAnalytics({
        totalRevenue,
        totalRepairs: repairs.length,
        avgRepairTime: completedRepairs ? (totalRepairTime / completedRepairs).toFixed(1) : 0,
        completionRate: repairs.length ? ((completedRepairs / repairs.length) * 100).toFixed(1) : 0,
        revenueByDay,
        repairsByType,
        customerRetention: repairs.length ? (customers.size / repairs.length * 100).toFixed(1) : 0,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getStartDate = () => {
    const now = moment();
    switch (timeRange) {
      case 'week':
        return now.subtract(7, 'days').toDate();
      case 'month':
        return now.subtract(30, 'days').toDate();
      case 'year':
        return now.subtract(365, 'days').toDate();
      default:
        return now.subtract(7, 'days').toDate();
    }
  };

  const renderRevenueCard = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Revenue</Title>
        <Title style={styles.bigNumber}>${analytics.totalRevenue.toFixed(2)}</Title>
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Paragraph>Total Repairs</Paragraph>
            <Title>{analytics.totalRepairs}</Title>
          </View>
          <View style={styles.metric}>
            <Paragraph>Avg. Repair Time</Paragraph>
            <Title>{analytics.avgRepairTime}h</Title>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderPerformanceCard = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Performance</Title>
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Paragraph>Completion Rate</Paragraph>
            <Title>{analytics.completionRate}%</Title>
          </View>
          <View style={styles.metric}>
            <Paragraph>Customer Retention</Paragraph>
            <Title>{analytics.customerRetention}%</Title>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderRepairTypesCard = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Repairs by Type</Title>
        {Object.entries(analytics.repairsByType).map(([type, count]) => (
          <View key={type} style={styles.repairTypeRow}>
            <Paragraph>{type}</Paragraph>
            <Title>{count}</Title>
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={timeRange}
        onValueChange={setTimeRange}
        buttons={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' }
        ]}
        style={styles.timeRange}
      />

      {renderRevenueCard()}
      {renderPerformanceCard()}
      {renderRepairTypesCard()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  timeRange: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  bigNumber: {
    fontSize: 36,
    marginVertical: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  metric: {
    alignItems: 'center',
  },
  repairTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
}); 