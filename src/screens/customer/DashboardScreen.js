import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Image } from 'react-native';
import { Text, Card, Button, useTheme, Chip, Avatar, Divider, IconButton, Surface, Badge, FAB, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { format, differenceInDays } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

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

  useEffect(() => {
    fetchRepairs();
  }, []);

  // Add a listener for when the screen comes into focus to refresh data
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
      
      // Filter repairs for this customer only
      const customerRepairs = allRepairs.filter(repair => repair.customerId === user.id);
      
      // Sort repairs by creation date (newest first)
      customerRepairs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setRepairs(customerRepairs);
      calculateStats(customerRepairs);
      findUpcomingRepair(customerRepairs);
      countUnreadMessages(customerRepairs);
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

  const renderRepairHistoryChart = () => {
    if (repairs.length === 0) return null;

    const chartData = [
      {
        name: 'Completed',
        population: repairHistory.completed,
        color: '#4CAF50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'In Progress',
        population: repairHistory.inProgress,
        color: '#2196F3',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Pending',
        population: repairHistory.pending,
        color: '#FF9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Cancelled',
        population: repairHistory.cancelled,
        color: '#F44336',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ].filter(item => item.population > 0);

    if (chartData.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>Your Repair History</Text>
          <PieChart
            data={chartData}
            width={width - 40}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading your repairs...</Text>
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

        {renderRepairHistoryChart()}

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

        <Card style={styles.tipsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.tipsTitle}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FFC107" /> Tips
            </Text>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Backup your data before bringing in your device</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Check for warranty before requesting a repair</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Regular maintenance extends device lifespan</Text>
            </View>
          </Card.Content>
        </Card>

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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  notificationIcon: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  upcomingCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 3,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  upcomingTitle: {
    marginLeft: 10,
  },
  upcomingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  upcomingInfo: {
    flex: 1,
  },
  dateContainer: {
    marginTop: 5,
  },
  estimatedDate: {
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 15,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    marginTop: 5,
    textAlign: 'center',
    color: '#757575',
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
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    elevation: 2,
  },
  statNumber: {
    marginVertical: 5,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#757575',
  },
  chartCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 3,
  },
  chartTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  repairsContainer: {
    padding: 15,
  },
  repairCard: {
    marginBottom: 15,
    elevation: 2,
    borderRadius: 12,
  },
  repairHeader: {
    marginBottom: 10,
  },
  repairTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 10,
  },
  repairDetails: {
    marginTop: 5,
  },
  repairDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  repairDetailText: {
    marginLeft: 8,
    color: '#757575',
  },
  emptyCard: {
    marginBottom: 15,
    elevation: 2,
    borderRadius: 12,
  },
  emptyCardContent: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 15,
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
    color: '#757575',
  },
  emptyButton: {
    marginTop: 10,
  },
  tipsCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFDE7',
  },
  tipsTitle: {
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  tipText: {
    marginLeft: 10,
    flex: 1,
  },
  actionsContainer: {
    padding: 20,
    marginBottom: 20,
  },
  button: {
    marginBottom: 10,
    borderRadius: 8,
    paddingVertical: 5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default DashboardScreen; 