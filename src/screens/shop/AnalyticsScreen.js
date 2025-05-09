import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, SegmentedButtons, Text, useTheme, Button, Menu, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width - 32;

  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalRepairs: 0,
    avgRepairTime: 0,
    completionRate: 0,
    revenueByDay: {},
    repairsByType: {},
    repairsByStatus: {},
    customerRetention: 0,
    repeatCustomers: 0,
    topServices: [],
    activeTechnicians: [],
    averageRating: 0,
    growthRate: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();
      const previousPeriodStartDate = getPreviousPeriodStartDate();
      
      // Get repairs from AsyncStorage
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      // Filter repairs for this shop and time range
      const repairs = allRepairs.filter(repair => 
        repair.shopId === user.id && 
        new Date(repair.createdAt) >= startDate
      );

      // Filter repairs for the previous period (for growth calculation)
      const previousPeriodRepairs = allRepairs.filter(repair => 
        repair.shopId === user.id && 
        new Date(repair.createdAt) >= previousPeriodStartDate &&
        new Date(repair.createdAt) < startDate
      );

      // Calculate analytics
      const revenueByDay = {};
      const repairsByType = {};
      const repairsByStatus = {};
      const serviceMap = new Map();
      const customerMap = new Map();
      const technicianMap = new Map();
      let totalRevenue = 0;
      let completedRepairs = 0;
      let totalRepairTime = 0;
      let totalRating = 0;
      let ratingCount = 0;

      // Initialize days for the time range
      const days = getDaysArray(startDate, new Date());
      days.forEach(day => {
        revenueByDay[day] = 0;
      });

      repairs.forEach(repair => {
        // Revenue by day
        const day = moment(repair.createdAt).format('YYYY-MM-DD');
        revenueByDay[day] = (revenueByDay[day] || 0) + (Number(repair.price) || 0);
        
        // Repairs by type
        repairsByType[repair.deviceType] = (repairsByType[repair.deviceType] || 0) + 1;
        
        // Repairs by status
        repairsByStatus[repair.status] = (repairsByStatus[repair.status] || 0) + 1;
        
        // Customer analytics
        if (customerMap.has(repair.customerId)) {
          customerMap.set(repair.customerId, customerMap.get(repair.customerId) + 1);
        } else {
          customerMap.set(repair.customerId, 1);
        }
        
        // Service popularity
        if (repair.services && Array.isArray(repair.services)) {
          repair.services.forEach(service => {
            if (serviceMap.has(service)) {
              serviceMap.set(service, serviceMap.get(service) + 1);
            } else {
              serviceMap.set(service, 1);
            }
          });
        }
        
        // Technician activity
        if (repair.technician) {
          if (technicianMap.has(repair.technician)) {
            technicianMap.set(repair.technician, technicianMap.get(repair.technician) + 1);
          } else {
            technicianMap.set(repair.technician, 1);
          }
        }
        
        // Total revenue
        totalRevenue += Number(repair.price) || 0;
        
        // Rating analytics
        if (repair.rating) {
          totalRating += repair.rating;
          ratingCount++;
        }
        
        // Completion metrics
        if (repair.status === 'completed') {
          completedRepairs++;
          if (repair.completedAt && repair.createdAt) {
            const repairTime = moment(repair.completedAt).diff(moment(repair.createdAt), 'hours');
            totalRepairTime += repairTime;
          }
        }
      });

      // Calculate repeat customers
      const repeatCustomers = Array.from(customerMap.values()).filter(count => count > 1).length;
      
      // Sort services by popularity
      const topServices = Array.from(serviceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([service, count]) => ({ service, count }));
      
      // Sort technicians by activity
      const activeTechnicians = Array.from(technicianMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([technician, count]) => ({ technician, count }));
      
      // Calculate growth rate
      const growthRate = previousPeriodRepairs.length > 0 
        ? ((repairs.length - previousPeriodRepairs.length) / previousPeriodRepairs.length) * 100
        : 100; // If there were no repairs in the previous period, we set growth to 100%

      setAnalytics({
        totalRevenue,
        totalRepairs: repairs.length,
        avgRepairTime: completedRepairs ? (totalRepairTime / completedRepairs).toFixed(1) : 0,
        completionRate: repairs.length ? ((completedRepairs / repairs.length) * 100).toFixed(1) : 0,
        revenueByDay,
        repairsByType,
        repairsByStatus,
        customerRetention: customerMap.size > 0 ? ((repeatCustomers / customerMap.size) * 100).toFixed(1) : 0,
        repeatCustomers,
        topServices,
        activeTechnicians,
        averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0,
        growthRate: growthRate.toFixed(1),
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const now = moment();
    switch (timeRange) {
      case 'week':
        return now.clone().subtract(7, 'days').startOf('day').toDate();
      case 'month':
        return now.clone().subtract(30, 'days').startOf('day').toDate();
      case 'year':
        return now.clone().subtract(365, 'days').startOf('day').toDate();
      default:
        return now.clone().subtract(7, 'days').startOf('day').toDate();
    }
  };

  const getPreviousPeriodStartDate = () => {
    const now = moment();
    switch (timeRange) {
      case 'week':
        return now.clone().subtract(14, 'days').startOf('day').toDate();
      case 'month':
        return now.clone().subtract(60, 'days').startOf('day').toDate();
      case 'year':
        return now.clone().subtract(730, 'days').startOf('day').toDate();
      default:
        return now.clone().subtract(14, 'days').startOf('day').toDate();
    }
  };

  const getDaysArray = (start, end) => {
    const arr = [];
    const dt = new Date(start);
    const endDate = new Date(end);
    
    while (dt <= endDate) {
      arr.push(moment(dt).format('YYYY-MM-DD'));
      dt.setDate(dt.getDate() + 1);
    }
    
    return arr;
  };

  const getLabelFormat = () => {
    switch (timeRange) {
      case 'week':
        return 'ddd';
      case 'month':
        return 'DD';
      case 'year':
        return 'MMM';
      default:
        return 'ddd';
    }
  };

  const getRevenueChartData = () => {
    const days = Object.keys(analytics.revenueByDay).sort();
    const revenues = days.map(day => analytics.revenueByDay[day]);
    
    const labels = days.map(day => moment(day).format(getLabelFormat()));
    
    return {
      labels,
      datasets: [
        {
          data: revenues.length > 0 ? revenues : [0],
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        },
      ],
    };
  };

  const getDeviceTypeChartData = () => {
    const types = Object.keys(analytics.repairsByType);
    const counts = types.map(type => analytics.repairsByType[type]);
    
    const chartData = types.map((type, index) => {
      const randomColor = getRandomColor(index);
      return {
        name: type,
        count: counts[index],
        color: randomColor,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      };
    });
    
    return chartData.length > 0 ? chartData : [{ name: 'No Data', count: 1, color: '#CCCCCC', legendFontColor: '#7F7F7F', legendFontSize: 12 }];
  };

  const getStatusChartData = () => {
    const statusOrder = ['pending', 'in progress', 'waiting for parts', 'completed', 'cancelled'];
    const statusLabels = {
      'pending': 'Pending',
      'in progress': 'In Progress',
      'waiting for parts': 'Waiting',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    
    const statuses = Object.keys(analytics.repairsByStatus).sort((a, b) => {
      return statusOrder.indexOf(a.toLowerCase()) - statusOrder.indexOf(b.toLowerCase());
    });
    
    const counts = statuses.map(status => analytics.repairsByStatus[status]);
    
    return {
      labels: statuses.map(status => statusLabels[status.toLowerCase()] || status),
      datasets: [
        {
          data: counts.length > 0 ? counts : [0],
        },
      ],
    };
  };

  const getRandomColor = (index) => {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#C9CBCF', '#8D6E63', '#26A69A', '#7986CB',
    ];
    
    return colors[index % colors.length];
  };

  const handleExport = (format) => {
    // In a real app, you would implement actual export functionality here
    console.log(`Exporting analytics in ${format} format`);
    setExportMenuVisible(false);
    // This would typically call a function to generate and save/share the report
  };

  const renderTopCard = () => (
    <Card style={styles.topCard}>
      <Card.Content style={styles.topCardContent}>
        <View style={styles.revenueSection}>
          <Text style={styles.revenuePeriod}>{timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'}</Text>
          <Text style={styles.revenueAmount}>${analytics.totalRevenue.toFixed(2)}</Text>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <View style={styles.growthContainer}>
            <MaterialCommunityIcons 
              name={Number(analytics.growthRate) >= 0 ? "arrow-up-bold" : "arrow-down-bold"} 
              size={16} 
              color={Number(analytics.growthRate) >= 0 ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[
              styles.growthRate, 
              {color: Number(analytics.growthRate) >= 0 ? "#4CAF50" : "#F44336"}
            ]}>
              {Math.abs(Number(analytics.growthRate))}% from previous {timeRange}
            </Text>
          </View>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.totalRepairs}</Text>
            <Text style={styles.statLabel}>Repairs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.avgRepairTime}h</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.averageRating || "N/A"}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderRevenueChart = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>Revenue Trend</Title>
        <LineChart
          data={getRevenueChartData()}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#2196F3',
            },
          }}
          bezier
          style={styles.chart}
        />
      </Card.Content>
    </Card>
  );

  const renderRepairTypeChart = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>Repairs by Device Type</Title>
        <PieChart
          data={getDeviceTypeChartData()}
          width={screenWidth}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </Card.Content>
    </Card>
  );

  const renderStatusChart = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>Repairs by Status</Title>
        <BarChart
          data={getStatusChartData()}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            barPercentage: 0.7,
          }}
          style={styles.chart}
        />
      </Card.Content>
    </Card>
  );

  const renderCustomerInsights = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>Customer Insights</Title>
        <View style={styles.insightsGrid}>
          <View style={styles.insightItem}>
            <Text style={styles.insightValue}>{analytics.repeatCustomers}</Text>
            <Text style={styles.insightLabel}>Repeat Customers</Text>
          </View>
          <View style={styles.insightItem}>
            <Text style={styles.insightValue}>{analytics.customerRetention}%</Text>
            <Text style={styles.insightLabel}>Retention Rate</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderTopServices = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>Top Services</Title>
        {analytics.topServices.length > 0 ? (
          analytics.topServices.map((service, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listItemRank}>{index + 1}</Text>
              <Text style={styles.listItemName}>{service.service}</Text>
              <Text style={styles.listItemValue}>{service.count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyList}>No services data available</Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderExportMenu = () => (
    <Menu
      visible={exportMenuVisible}
      onDismiss={() => setExportMenuVisible(false)}
      anchor={
        <Button 
          mode="outlined" 
          icon="export" 
          onPress={() => setExportMenuVisible(true)}
          style={styles.exportButton}
        >
          Export
        </Button>
      }
    >
      <Menu.Item onPress={() => handleExport('pdf')} title="Export as PDF" />
      <Menu.Item onPress={() => handleExport('csv')} title="Export as CSV" />
      <Menu.Item onPress={() => handleExport('excel')} title="Export as Excel" />
    </Menu>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
        {renderExportMenu()}
      </View>

      {renderTopCard()}
      {renderRevenueChart()}
      {renderRepairTypeChart()}
      {renderStatusChart()}
      {renderCustomerInsights()}
      {renderTopServices()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeRange: {
    flex: 1,
  },
  exportButton: {
    marginLeft: 10,
  },
  topCard: {
    marginBottom: 16,
    elevation: 4,
  },
  topCardContent: {
    padding: 16,
  },
  revenueSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revenuePeriod: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 5,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 5,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  growthRate: {
    fontSize: 12,
    marginLeft: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    width: '25%',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  insightItem: {
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  insightLabel: {
    fontSize: 14,
    color: '#757575',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listItemRank: {
    width: 24,
    fontWeight: 'bold',
    fontSize: 16,
  },
  listItemName: {
    flex: 1,
    fontSize: 14,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyList: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#757575',
  },
}); 