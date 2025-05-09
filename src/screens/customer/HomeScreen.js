import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, Button, Text, useTheme, IconButton, Avatar, Surface, Chip, Divider, FAB, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
  const [repairHistory, setRepairHistory] = useState({
    completed: 0,
    inProgress: 0,
    cancelled: 0,
    pending: 0
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
            onPress={() => navigation.navigate('CustomerProfile')}
          />
        </View>
      ),
    });
  }, [navigation, unreadMessages]);

  const calculateCustomerData = (repairsList) => {
    if (!repairsList.length) return;

    const totalSpent = repairsList.reduce((sum, repair) => sum + (parseFloat(repair.price) || 0), 0);
    const avgRepairCost = totalSpent / repairsList.length;
    const deviceTypes = {};
    const repairsByMonth = [];
    const preferredServices = [];
    const serviceCount = {};

    repairsList.forEach(repair => {
      if (repair.deviceType) {
        deviceTypes[repair.deviceType] = (deviceTypes[repair.deviceType] || 0) + 1;
      }

      if (repair.services) {
        repair.services.forEach(service => {
          serviceCount[service] = (serviceCount[service] || 0) + 1;
        });
      }

      const month = format(new Date(repair.createdAt), 'MMM yyyy');
      const existingMonth = repairsByMonth.find(m => m.month === month);
      if (existingMonth) {
        existingMonth.count++;
      } else {
        repairsByMonth.push({ month, count: 1 });
      }
    });

    Object.entries(serviceCount).forEach(([name, count]) => {
      preferredServices.push({ name, count });
    });

    preferredServices.sort((a, b) => b.count - a.count);

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
    score += Math.min(repairs.length * 10, 40);
    score += Math.min(totalSpent / 100, 30);
    const recentRepairs = repairs.filter(repair => {
      const repairDate = new Date(repair.createdAt);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return repairDate >= threeMonthsAgo;
    });
    score += Math.min(recentRepairs.length * 10, 30);
    return Math.min(score, 100);
  };

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      const customerRepairs = allRepairs.filter(repair => repair.customerId === user.id);
      setRepairs(customerRepairs);
      countUnreadMessages(customerRepairs);
      calculateCustomerData(customerRepairs);
      calculateStats(customerRepairs);
    } catch (error) {
      console.error('Error fetching repairs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const countUnreadMessages = (repairsList) => {
    let count = 0;
    repairsList.forEach(repair => {
      if (repair.messages) {
        count += repair.messages.filter(msg => msg.sender === 'shop' && !msg.read).length;
      }
    });
    setUnreadMessages(count);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRepairs();
  };

  const activeRepairs = repairs.filter(repair => 
    repair.customerId === user.id && repair.status !== 'completed' && repair.status !== 'cancelled'
  );

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

  const calculateRepairProgress = (repair) => {
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

  const renderWelcomeSection = () => (
    <Surface style={styles.welcomeCard}>
      <View style={styles.welcomeContent}>
        <Avatar.Text 
          size={60} 
          label={user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()} 
          style={styles.avatar}
        />
        <View style={styles.welcomeText}>
          <Title style={styles.welcomeTitle}>Welcome back, {user.name || user.email.split('@')[0]}!</Title>
          <Text style={styles.welcomeSubtitle}>Manage your repair services</Text>
        </View>
      </View>
    </Surface>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Surface style={styles.actionCard}>
        <IconButton
          icon="tools"
          size={32}
          iconColor={theme.colors.primary}
          style={styles.actionIcon}
        />
        <Text style={styles.actionTitle}>New Repair</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('NewRepair')}
          style={styles.actionButton}
        >
          Request
        </Button>
      </Surface>

      <Surface style={styles.actionCard}>
        <IconButton
          icon="map-marker"
          size={32}
          iconColor={theme.colors.primary}
          style={styles.actionIcon}
        />
        <Text style={styles.actionTitle}>Find Shops</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('ShopList')}
          style={styles.actionButton}
        >
          Browse
        </Button>
      </Surface>
    </View>
  );

  const renderActiveRepairs = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Title style={styles.sectionTitle}>Active Repairs</Title>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('RepairStatus')}
          disabled={activeRepairs.length === 0}
        >
          View All
        </Button>
      </View>

      {activeRepairs.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <MaterialCommunityIcons name="tools" size={48} color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>No Active Repairs</Text>
          <Text style={styles.emptySubtitle}>Start by requesting a new repair service</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('NewRepair')}
            style={styles.emptyButton}
          >
            Request New Repair
          </Button>
        </Surface>
      ) : (
        activeRepairs.map(repair => (
          <Surface 
            key={repair.id} 
            style={styles.repairCard}
            onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
          >
            <View style={styles.repairHeader}>
              <View style={styles.repairTitleSection}>
                <Text style={styles.repairTitle}>{repair.deviceType} {repair.deviceModel}</Text>
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
                <Text style={styles.repairDetailText}>{repair.shopName}</Text>
              </View>
              {repair.estimatedCompletion && (
                <View style={styles.repairDetail}>
                  <MaterialCommunityIcons name="calendar-check" size={16} color="#757575" />
                  <Text style={styles.repairDetailText}>
                    Est. completion: {format(new Date(repair.estimatedCompletion), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={calculateRepairProgress(repair)} 
                color={getStatusColor(repair.status)}
                style={styles.progressBar}
              />
            </View>
          </Surface>
        ))
      )}
    </View>
  );

  const renderCustomerInsights = () => (
    <Surface style={styles.insightsCard}>
      <View style={styles.insightsHeader}>
        <Title style={styles.insightsTitle}>Your Insights</Title>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('CustomerInsights')}
        >
          View Details
        </Button>
      </View>
      
      <View style={styles.insightsContent}>
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>{customerData.loyaltyScore}%</Text>
            <Text style={styles.insightLabel}>Loyalty Score</Text>
          </View>
        </View>
        
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>${customerData.totalSpent.toFixed(2)}</Text>
            <Text style={styles.insightLabel}>Total Spent</Text>
          </View>
        </View>
        
        <View style={styles.insightItem}>
          <MaterialCommunityIcons name="tools" size={24} color="#2196F3" />
          <View style={styles.insightText}>
            <Text style={styles.insightValue}>{customerData.repairCount}</Text>
            <Text style={styles.insightLabel}>Total Repairs</Text>
          </View>
        </View>
      </View>

      {customerData.preferredServices.length > 0 && (
        <View style={styles.preferredServices}>
          <Text style={styles.preferredServicesTitle}>Most Used Services</Text>
          <View style={styles.servicesList}>
            {customerData.preferredServices.map((service, index) => (
              <Chip 
                key={index}
                style={styles.serviceChip}
                mode="outlined"
              >
                {service.name}
              </Chip>
            ))}
          </View>
        </View>
      )}
    </Surface>
  );

  const renderStatsSection = () => (
    <View style={styles.statsContainer}>
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="tools" size={28} color="#2196F3" />
        <Text style={styles.statNumber}>{repairHistory.inProgress + repairHistory.pending}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </Surface>
      
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="check-circle" size={28} color="#4CAF50" />
        <Text style={styles.statNumber}>{repairHistory.completed}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </Surface>
      
      <Surface style={styles.statCard}>
        <MaterialCommunityIcons name="clock" size={28} color="#FF9800" />
        <Text style={styles.statNumber}>{repairHistory.pending}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </Surface>
    </View>
  );

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
        {renderStatsSection()}
        {renderCustomerInsights()}
        {renderQuickActions()}
        {renderActiveRepairs()}
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionCard: {
    flex: 1,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  repairCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  repairHeader: {
    marginBottom: 12,
  },
  repairTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusChip: {
    height: 32,
    borderRadius: 16,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#e9ecef',
  },
  repairDetails: {
    marginBottom: 12,
  },
  repairDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repairDetailText: {
    marginLeft: 8,
    color: '#6c757d',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
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
  insightsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  insightsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
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
  preferredServices: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  preferredServicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2196F3',
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    marginRight: 8,
    marginBottom: 8,
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
}); 