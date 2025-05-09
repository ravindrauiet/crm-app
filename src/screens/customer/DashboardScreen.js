import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Image } from 'react-native';
import { Text, Card, Button, useTheme, Chip, Avatar, Divider, IconButton, Surface, Badge, FAB, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { format, differenceInDays } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import CustomerInsights from '../../components/CustomerInsights';
import CustomerCard from '../../components/CustomerCard';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const [repairs, setRepairs] = useState([]);
  const [upcomingRepair, setUpcomingRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [repairHistory, setRepairHistory] = useState({
    completed: 0,
    inProgress: 0,
    cancelled: 0,
    pending: 0
  });
  const [customerData, setCustomerData] = useState({
    totalSpent: 0,
    avgRepairCost: 0,
    repairCount: 0,
    lastRepairDate: null,
    deviceTypes: {},
    repairsByMonth: [],
    customerSince: null,
    preferredServices: [],
    lifetimeValue: 0,
    loyaltyScore: 0
  });

  useEffect(() => {
    fetchRepairs();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRepairs();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      const customerRepairs = allRepairs.filter(repair => repair.customerId === user.id);
      customerRepairs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setRepairs(customerRepairs);
      calculateStats(customerRepairs);
      findUpcomingRepair(customerRepairs);
      countUnreadMessages(customerRepairs);
      calculateCustomerData(customerRepairs);
    } catch (error) {
      console.error('Error fetching repairs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateCustomerData = (repairsList) => {
    if (!repairsList.length) return;

    const totalSpent = repairsList.reduce((sum, repair) => sum + (parseFloat(repair.price) || 0), 0);
    const avgRepairCost = totalSpent / repairsList.length;
    const deviceTypes = {};
    const repairsByMonth = [];
    const preferredServices = [];
    const serviceCount = {};

    repairsList.forEach(repair => {
      // Count device types
      if (repair.deviceType) {
        deviceTypes[repair.deviceType] = (deviceTypes[repair.deviceType] || 0) + 1;
      }

      // Count services
      if (repair.services) {
        repair.services.forEach(service => {
          serviceCount[service] = (serviceCount[service] || 0) + 1;
        });
      }

      // Group repairs by month
      const month = format(new Date(repair.createdAt), 'MMM yyyy');
      const existingMonth = repairsByMonth.find(m => m.month === month);
      if (existingMonth) {
        existingMonth.count++;
      } else {
        repairsByMonth.push({ month, count: 1 });
      }
    });

    // Convert service counts to preferred services array
    Object.entries(serviceCount).forEach(([name, count]) => {
      preferredServices.push({ name, count });
    });

    // Sort preferred services by count
    preferredServices.sort((a, b) => b.count - a.count);

    // Calculate loyalty score based on various factors
    const loyaltyScore = calculateLoyaltyScore(repairsList, totalSpent);

    setCustomerData({
      totalSpent,
      avgRepairCost,
      repairCount: repairsList.length,
      lastRepairDate: repairsList[0]?.createdAt,
      deviceTypes,
      repairsByMonth,
      customerSince: repairsList[repairsList.length - 1]?.createdAt,
      preferredServices: preferredServices.slice(0, 5),
      lifetimeValue: totalSpent,
      loyaltyScore
    });
  };

  const calculateLoyaltyScore = (repairs, totalSpent) => {
    let score = 0;
    
    // Base score from number of repairs
    score += Math.min(repairs.length * 10, 40);
    
    // Score from total spent
    score += Math.min(totalSpent / 100, 30);
    
    // Score from recency (last 3 months)
    const recentRepairs = repairs.filter(repair => {
      const repairDate = new Date(repair.createdAt);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return repairDate >= threeMonthsAgo;
    });
    score += Math.min(recentRepairs.length * 10, 30);
    
    return Math.min(score, 100);
  };

  const calculateStats = (repairsList) => {
    const completed = repairsList.filter(repair => repair.status === 'completed').length;
    const inProgress = repairsList.filter(repair => 
      repair.status === 'in progress' || repair.status === 'waiting for parts'
    ).length;
    const cancelled = repairsList.filter(repair => repair.status === 'cancelled').length;
    const pending = repairsList.filter(repair => 
      repair.status === 'pending' || repair.status === 'confirmed'
    ).length;

    setRepairHistory({
      completed,
      inProgress,
      cancelled,
      pending
    });
  };

  const findUpcomingRepair = (repairsList) => {
    // Find the next repair that's estimated to be completed
    const activeRepairs = repairsList.filter(repair => 
      repair.status !== 'completed' && repair.status !== 'cancelled' && repair.estimatedCompletion
    );
    
    if (activeRepairs.length === 0) {
      setUpcomingRepair(null);
      return;
    }
    
    // Sort by estimated completion date
    activeRepairs.sort((a, b) => new Date(a.estimatedCompletion) - new Date(b.estimatedCompletion));
    setUpcomingRepair(activeRepairs[0]);
  };

  const countUnreadMessages = (repairsList) => {
    let count = 0;
    repairsList.forEach(repair => {
      if (repair.messages) {
        count += repair.messages.filter(msg => 
          msg.sender === 'shop' && !msg.read
        ).length;
      }
    });
    setUnreadMessages(count);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRepairs();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'in progress':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'waiting for parts':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const calculateRepairProgress = (repair) => {
    if (!repair) return 0;
    
    switch (repair.status?.toLowerCase()) {
      case 'pending':
        return 0.1;
      case 'confirmed':
        return 0.2;
      case 'in progress':
        return 0.5;
      case 'waiting for parts':
        return 0.7;
      case 'completed':
        return 1;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const getNextStepText = (repair) => {
    if (!repair) return '';
    
    switch (repair.status?.toLowerCase()) {
      case 'pending':
        return 'Waiting for shop confirmation';
      case 'confirmed':
        return 'Repair will begin soon';
      case 'in progress':
        return 'Technician is working on your device';
      case 'waiting for parts':
        return 'Waiting for replacement parts to arrive';
      case 'completed':
        return 'Your repair is completed';
      case 'cancelled':
        return 'This repair was cancelled';
      default:
        return 'Status unknown';
    }
  };

  const getDaysRemaining = (dateString) => {
    if (!dateString) return '';
    
    const today = new Date();
    const targetDate = new Date(dateString);
    const daysRemaining = differenceInDays(targetDate, today);
    
    if (daysRemaining < 0) {
      return 'Overdue';
    } else if (daysRemaining === 0) {
      return 'Due today';
    } else {
      return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
    }
  };

  const renderRecentRepairs = () => {
    if (repairs.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyCardContent}>
            <MaterialCommunityIcons name="tools" size={48} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.emptyText}>No repair history yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubText}>
              Start by requesting a repair service
            </Text>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('ShopList')}
              style={styles.emptyButton}
            >
              Find Repair Shop
            </Button>
          </Card.Content>
        </Card>
      );
    }

    return repairs.slice(0, 3).map((repair, index) => (
      <Card 
        key={repair.id} 
        style={styles.repairCard}
        onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
      >
        <Card.Content>
          <View style={styles.repairHeader}>
            <View style={styles.repairTitleSection}>
              <Text variant="titleMedium">{repair.deviceType} {repair.deviceModel}</Text>
              <Chip 
                style={[styles.statusChip, { borderColor: getStatusColor(repair.status) }]}
                textStyle={{ color: getStatusColor(repair.status) }}
                mode="outlined"
              >
                {repair.status}
              </Chip>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.repairDetails}>
            <View style={styles.repairDetail}>
              <MaterialCommunityIcons name="store" size={16} color="#757575" />
              <Text variant="bodyMedium" style={styles.repairDetailText}>{repair.shopName}</Text>
            </View>
            <View style={styles.repairDetail}>
              <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
              <Text variant="bodyMedium" style={styles.repairDetailText}>{formatDate(repair.createdAt)}</Text>
            </View>
            {repair.estimatedCompletion && (
              <View style={styles.repairDetail}>
                <MaterialCommunityIcons name="calendar-check" size={16} color="#757575" />
                <Text variant="bodyMedium" style={styles.repairDetailText}>
                  Est. completion: {formatDate(repair.estimatedCompletion)}
                </Text>
              </View>
            )}
            {repair.price && (
              <View style={styles.repairDetail}>
                <MaterialCommunityIcons name="currency-usd" size={16} color="#757575" />
                <Text variant="bodyMedium" style={styles.repairDetailText}>
                  Price: ${repair.price}
                </Text>
              </View>
            )}
          </View>

          {repair.status !== 'completed' && repair.status !== 'cancelled' && (
            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={calculateRepairProgress(repair)} 
                color={getStatusColor(repair.status)}
                style={styles.progressBar}
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {getNextStepText(repair)}
              </Text>
            </View>
          )}
        </Card.Content>
        <Card.Actions>
          <Button 
            onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
          >
            View Details
          </Button>
        </Card.Actions>
      </Card>
    ));
  };

  const renderUpcomingRepair = () => {
    if (!upcomingRepair) return null;

    return (
      <Card style={styles.upcomingCard}>
        <Card.Content>
          <View style={styles.upcomingHeader}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.upcomingTitle}>Upcoming Repair</Text>
          </View>
          
          <View style={styles.upcomingContent}>
            <View style={styles.upcomingInfo}>
              <Text variant="titleSmall">{upcomingRepair.deviceType} {upcomingRepair.deviceModel}</Text>
              <Text variant="bodyMedium">at {upcomingRepair.shopName}</Text>
              {upcomingRepair.estimatedCompletion && (
                <View style={styles.dateContainer}>
                  <Text variant="bodyMedium" style={styles.estimatedDate}>
                    {formatDate(upcomingRepair.estimatedCompletion)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: getStatusColor(upcomingRepair.status) }}>
                    {getDaysRemaining(upcomingRepair.estimatedCompletion)}
                  </Text>
                </View>
              )}
            </View>
            
            <Chip 
              style={[styles.statusChip, { borderColor: getStatusColor(upcomingRepair.status) }]}
              textStyle={{ color: getStatusColor(upcomingRepair.status) }}
              mode="outlined"
            >
              {upcomingRepair.status}
            </Chip>
          </View>
          
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={calculateRepairProgress(upcomingRepair)} 
              color={getStatusColor(upcomingRepair.status)}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.progressText}>
              {getNextStepText(upcomingRepair)}
            </Text>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button 
            mode="contained"
            onPress={() => navigation.navigate('RepairDetails', { repairId: upcomingRepair.id })}
          >
            Track Repair
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  const renderCustomerInsights = () => {
    return (
      <CustomerInsights
        customerData={customerData}
        recentRepairs={repairs.slice(0, 3).map(repair => ({
          deviceType: repair.deviceType,
          deviceModel: repair.deviceModel,
          date: repair.createdAt,
          cost: repair.price,
          status: repair.status
        }))}
        onViewAllRepairs={() => navigation.navigate('RepairStatus')}
      />
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading your dashboard...</Text>
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
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Avatar.Text 
              size={60} 
              label={user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()} 
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <Text variant="headlineSmall">Welcome, {user.name || user.email.split('@')[0]}</Text>
              <Text variant="bodyLarge">Manage your repair services</Text>
            </View>
          </View>
          
          <View style={styles.notificationIcon}>
            <IconButton
              icon="bell"
              size={28}
              onPress={() => navigation.navigate('Notifications')}
            />
            {unreadMessages > 0 && (
              <Badge style={styles.badge}>{unreadMessages}</Badge>
            )}
          </View>
        </View>

        {renderCustomerInsights()}

        {renderUpcomingRepair()}

        <View style={styles.statsContainer}>
          <Surface style={styles.statCard}>
            <MaterialCommunityIcons name="tools" size={28} color="#2196F3" />
            <Text variant="titleLarge" style={styles.statNumber}>{repairHistory.inProgress + repairHistory.pending}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Active</Text>
          </Surface>
          
          <Surface style={styles.statCard}>
            <MaterialCommunityIcons name="check-circle" size={28} color="#4CAF50" />
            <Text variant="titleLarge" style={styles.statNumber}>{repairHistory.completed}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Completed</Text>
          </Surface>
          
          <Surface style={styles.statCard}>
            <MaterialCommunityIcons name="clock" size={28} color="#FF9800" />
            <Text variant="titleLarge" style={styles.statNumber}>{repairHistory.pending}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Pending</Text>
          </Surface>
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="titleLarge">Recent Repairs</Text>
          <Button 
            mode="text"
            onPress={() => navigation.navigate('RepairStatus')}
            disabled={repairs.length === 0}
          >
            See All
          </Button>
        </View>

        <View style={styles.repairsContainer}>
          {renderRecentRepairs()}
        </View>

        <View style={styles.actionsContainer}>
          <Button 
            mode="contained" 
            icon="wrench"
            onPress={() => navigation.navigate('ShopList')}
            style={styles.button}
          >
            Request New Repair
          </Button>
          <Button 
            mode="outlined" 
            icon="map-marker"
            onPress={() => navigation.navigate('ShopList')}
            style={styles.button}
          >
            Browse Repair Shops
          </Button>
        </View>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="message"
        onPress={() => navigation.navigate('RepairStatus')}
        color="#fff"
        visible={unreadMessages > 0}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 15,
    backgroundColor: '#2196F3',
  },
  headerText: {
    flex: 1,
  },
  notificationIcon: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF5252',
  },
  upcomingCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  upcomingTitle: {
    marginLeft: 10,
    fontWeight: '600',
  },
  upcomingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  upcomingInfo: {
    flex: 1,
  },
  dateContainer: {
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  estimatedDate: {
    fontWeight: '600',
    color: '#2196F3',
  },
  progressContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 6,
    elevation: 3,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    marginVertical: 8,
    fontWeight: 'bold',
    fontSize: 24,
    color: '#2196F3',
  },
  statLabel: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  repairsContainer: {
    padding: 16,
  },
  repairCard: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  repairHeader: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  repairTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#e9ecef',
  },
  repairDetails: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  repairDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repairDetailText: {
    marginLeft: 8,
    color: '#6c757d',
    fontSize: 14,
  },
  emptyCard: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyCardContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    color: '#6c757d',
    fontSize: 14,
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  actionsContainer: {
    padding: 20,
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 2,
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

export default DashboardScreen; 