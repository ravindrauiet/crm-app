import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Text, Card, Button, useTheme, Chip, IconButton, Surface, Divider, Badge, Portal, Dialog, FAB, DataTable } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isToday, isThisWeek, parseISO, subDays } from 'date-fns';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const ShopDashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMessages, setRecentMessages] = useState([]);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [stats, setStats] = useState({
    activeRepairs: 0,
    todayRepairs: 0,
    pendingRepairs: 0,
    weeklyRevenue: 0,
    mostCommonDevice: '',
    unreadMessages: 0,
    customerRetention: 0,
    revenueData: Array(7).fill(0),
    customerSatisfaction: 0,
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
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
            style={{ marginRight: -5 }}
          />
          {stats.unreadMessages > 0 && (
            <Badge 
              style={{ position: 'absolute', top: 5, right: 5 }}
              size={16}
            >
              {stats.unreadMessages}
            </Badge>
          )}
          <IconButton
            icon="store"
            size={24}
            onPress={() => navigation.navigate('ShopProfile')}
          />
        </View>
      ),
    });
  }, [navigation, stats.unreadMessages]);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      // Filter repairs for this shop only
      const shopRepairs = allRepairs.filter(repair => repair.shopId === user.id);
      
      // Sort repairs by creation date (newest first)
      shopRepairs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setRepairs(shopRepairs);
      calculateStats(shopRepairs);
      extractRecentMessages(shopRepairs);
    } catch (error) {
      console.error('Error fetching repairs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const extractRecentMessages = (shopRepairs) => {
    // Extract all messages from all repairs
    const allMessages = [];
    shopRepairs.forEach(repair => {
      if (repair.messages && repair.messages.length > 0) {
        repair.messages.forEach(msg => {
          allMessages.push({
            ...msg,
            repairId: repair.id,
            deviceInfo: `${repair.deviceType} ${repair.deviceModel}`,
            customer: repair.customerEmail,
          });
        });
      }
    });
    
    // Sort by timestamp (newest first) and take the 5 most recent
    allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setRecentMessages(allMessages.slice(0, 5));
  };

  const calculateStats = (shopRepairs) => {
    // Active repairs (not completed or cancelled)
    const activeRepairs = shopRepairs.filter(repair => 
      repair.status !== 'completed' && repair.status !== 'cancelled'
    );
    
    // Repairs created today
    const todayRepairs = shopRepairs.filter(repair => 
      isToday(new Date(repair.createdAt))
    );
    
    // Pending repairs (waiting for shop response)
    const pendingRepairs = shopRepairs.filter(repair => 
      repair.status === 'pending'
    );
    
    // Weekly revenue
    const weeklyRepairs = shopRepairs.filter(repair => 
      isThisWeek(new Date(repair.createdAt)) && repair.price
    );
    const weeklyRevenue = weeklyRepairs.reduce((sum, repair) => 
      sum + (Number(repair.price) || 0), 0
    );
    
    // Revenue data for the past 7 days
    const revenueData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dailyRepairs = shopRepairs.filter(repair => 
        repair.price && 
        format(parseISO(repair.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      const dailyRevenue = dailyRepairs.reduce((sum, repair) => 
        sum + (Number(repair.price) || 0), 0
      );
      revenueData.push(dailyRevenue);
    }
    
    // Customer retention rate (customers with multiple repairs / total customers)
    const customerMap = new Map();
    shopRepairs.forEach(repair => {
      const count = customerMap.get(repair.customerId) || 0;
      customerMap.set(repair.customerId, count + 1);
    });
    
    const totalCustomers = customerMap.size;
    const repeatCustomers = Array.from(customerMap.values()).filter(count => count > 1).length;
    const customerRetention = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    // Most common device type
    const deviceCounts = {};
    shopRepairs.forEach(repair => {
      deviceCounts[repair.deviceType] = (deviceCounts[repair.deviceType] || 0) + 1;
    });
    
    let mostCommonDevice = '';
    let maxCount = 0;
    Object.entries(deviceCounts).forEach(([device, count]) => {
      if (count > maxCount) {
        mostCommonDevice = device;
        maxCount = count;
      }
    });
    
    // Customer satisfaction (average rating)
    const ratedRepairs = shopRepairs.filter(repair => repair.rating);
    const avgRating = ratedRepairs.length > 0 ? 
      ratedRepairs.reduce((sum, repair) => sum + repair.rating, 0) / ratedRepairs.length : 0;
    
    // Count unread messages
    let unreadMessages = 0;
    shopRepairs.forEach(repair => {
      if (repair.messages) {
        unreadMessages += repair.messages.filter(msg => 
          msg.sender === 'customer' && !msg.read
        ).length;
      }
    });
    
    setStats({
      activeRepairs: activeRepairs.length,
      todayRepairs: todayRepairs.length,
      pendingRepairs: pendingRepairs.length,
      weeklyRevenue,
      mostCommonDevice,
      unreadMessages,
      customerRetention,
      revenueData,
      customerSatisfaction: avgRating,
    });
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

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    return formatDate(dateString);
  };

  const navigateToRepair = (repairId) => {
    navigation.navigate('RepairDetails', { repairId });
  };

  const viewMessage = (message) => {
    setSelectedMessage(message);
    setShowMessageDialog(true);
  };

  const renderActiveRepairs = () => {
    const activeRepairs = repairs.filter(repair => 
      repair.status !== 'completed' && repair.status !== 'cancelled'
    ).slice(0, 3);

    if (activeRepairs.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyCardContent}>
            <MaterialCommunityIcons name="tools" size={48} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.emptyText}>No active repairs</Text>
            <Text variant="bodyMedium" style={styles.emptySubText}>
              You'll see repair requests here when customers book a repair
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return activeRepairs.map((repair) => (
      <Card 
        key={repair.id} 
        style={styles.repairCard}
        onPress={() => navigateToRepair(repair.id)}
      >
        <Card.Content>
          <View style={styles.repairHeader}>
            <Text variant="titleMedium">{repair.deviceType} {repair.deviceModel}</Text>
            <Chip 
              mode="outlined" 
              style={[styles.statusChip, { borderColor: getStatusColor(repair.status) }]}
              textStyle={{ color: getStatusColor(repair.status) }}
            >
              {repair.status}
            </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.repairDetails}>
            <View style={styles.repairDetail}>
              <MaterialCommunityIcons name="email" size={16} color="#757575" />
              <Text variant="bodyMedium" style={styles.repairDetailText}>
                {repair.customerEmail}
              </Text>
            </View>
            <View style={styles.repairDetail}>
              <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
              <Text variant="bodyMedium" style={styles.repairDetailText}>
                Created: {formatDate(repair.createdAt)}
              </Text>
            </View>
            {repair.estimatedCompletion && (
              <View style={styles.repairDetail}>
                <MaterialCommunityIcons name="calendar-check" size={16} color="#757575" />
                <Text variant="bodyMedium" style={styles.repairDetailText}>
                  Due: {formatDate(repair.estimatedCompletion)}
                </Text>
              </View>
            )}
            <View style={styles.repairDetail}>
              <MaterialCommunityIcons name="information" size={16} color="#757575" />
              <Text variant="bodyMedium" style={styles.repairDetailText} numberOfLines={1}>
                {repair.issueDescription}
              </Text>
            </View>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button
            onPress={() => navigateToRepair(repair.id)}
            icon="eye"
          >
            Details
          </Button>
          <Button
            mode="contained"
            onPress={() => navigateToRepair(repair.id)}
            icon="pencil"
          >
            Update
          </Button>
        </Card.Actions>
      </Card>
    ));
  };

  const renderRecentMessages = () => {
    if (recentMessages.length === 0) {
      return (
        <View style={styles.emptyMessages}>
          <Text>No recent messages</Text>
        </View>
      );
    }

    return (
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>Customer</DataTable.Title>
          <DataTable.Title>Message</DataTable.Title>
          <DataTable.Title numeric>Time</DataTable.Title>
        </DataTable.Header>

        {recentMessages.map((message, index) => (
          <DataTable.Row 
            key={index} 
            onPress={() => viewMessage(message)}
            style={message.read ? {} : { backgroundColor: 'rgba(33, 150, 243, 0.1)' }}
          >
            <DataTable.Cell>{message.customer.split('@')[0]}</DataTable.Cell>
            <DataTable.Cell>{message.text.substring(0, 20)}...</DataTable.Cell>
            <DataTable.Cell numeric>{formatTimeAgo(message.timestamp)}</DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    );
  };

  const renderMessageDialog = () => (
    <Portal>
      <Dialog visible={showMessageDialog} onDismiss={() => setShowMessageDialog(false)}>
        <Dialog.Title>Message</Dialog.Title>
        <Dialog.Content>
          {selectedMessage && (
            <View>
              <View style={styles.dialogHeader}>
                <Text variant="bodyMedium" style={styles.dialogLabel}>From:</Text>
                <Text variant="bodyMedium">{selectedMessage.customer}</Text>
              </View>
              <View style={styles.dialogHeader}>
                <Text variant="bodyMedium" style={styles.dialogLabel}>Device:</Text>
                <Text variant="bodyMedium">{selectedMessage.deviceInfo}</Text>
              </View>
              <View style={styles.dialogHeader}>
                <Text variant="bodyMedium" style={styles.dialogLabel}>Time:</Text>
                <Text variant="bodyMedium">{formatDate(selectedMessage.timestamp)}</Text>
              </View>
              <Divider style={{ marginVertical: 10 }} />
              <Text variant="bodyMedium">{selectedMessage.text}</Text>
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowMessageDialog(false)}>Close</Button>
          <Button 
            mode="contained"
            onPress={() => {
              setShowMessageDialog(false);
              if (selectedMessage) {
                navigateToRepair(selectedMessage.repairId);
              }
            }}
          >
            Go to Repair
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading shop data...</Text>
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
            <Text variant="headlineMedium">Shop Dashboard</Text>
            <Text variant="bodyLarge">{user.shopDetails?.name || 'Your Repair Shop'}</Text>
          </View>
        </View>
        
        {/* Revenue Chart */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>Revenue (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: ['6d', '5d', '4d', '3d', '2d', '1d', 'Today'],
                datasets: [
                  {
                    data: stats.revenueData,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  },
                ],
              }}
              width={width - 40}
              height={180}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
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
        
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="currency-usd" size={24} color="#2196F3" />
              </View>
              <Text variant="headlineMedium" style={styles.statNumber}>${stats.weeklyRevenue.toFixed(0)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Weekly Revenue</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="account-multiple" size={24} color="#4CAF50" />
              </View>
              <Text variant="headlineMedium" style={styles.statNumber}>{stats.customerRetention.toFixed(0)}%</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Customer Retention</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
              </View>
              <Text variant="headlineMedium" style={styles.statNumber}>{stats.customerSatisfaction.toFixed(1)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Satisfaction</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="tools" size={24} color="#FF5722" />
              </View>
              <Text variant="headlineMedium" style={styles.statNumber}>{stats.activeRepairs}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Active Repairs</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.quickActions}>
          <Button 
            mode="contained" 
            icon="chart-bar"
            onPress={() => navigation.navigate('Analytics')}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          >
            Analytics
          </Button>
          <Button 
            mode="contained" 
            icon="clipboard-list"
            onPress={() => navigation.navigate('RepairTickets')}
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          >
            All Repairs
          </Button>
          <Button 
            mode="contained" 
            icon="account-group"
            onPress={() => navigation.navigate('CustomerList')}
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          >
            Customers
          </Button>
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="titleLarge">Active Repairs</Text>
          <Button 
            mode="text"
            onPress={() => navigation.navigate('RepairTickets')}
          >
            See All
          </Button>
        </View>

        <View style={styles.repairsContainer}>
          {renderActiveRepairs()}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="titleLarge">Recent Messages</Text>
          <Button 
            mode="text"
            onPress={() => navigation.navigate('RepairTickets', { filter: 'unread' })}
          >
            See All
          </Button>
        </View>

        <Card style={styles.recentMessagesCard}>
          <Card.Content>
            {renderRecentMessages()}
          </Card.Content>
        </Card>

        <Card style={styles.tipsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.tipsTitle}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FFC107" /> CRM Tips
            </Text>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Follow up with customers within 24h of repair completion</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Offer a discount for repeat customers to boost retention</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Send reminders to customers for device maintenance</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('NewRepair')}
        color="#fff"
      />
      
      {renderMessageDialog()}
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
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'column',
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 3,
  },
  chartTitle: {
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#757575',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  repairsContainer: {
    padding: 16,
  },
  repairCard: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
  },
  repairHeader: {
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
    marginBottom: 10,
  },
  repairDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  repairDetailText: {
    marginLeft: 8,
    color: '#555',
  },
  emptyCard: {
    marginBottom: 15,
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
    color: '#757575',
  },
  recentMessagesCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  emptyMessages: {
    padding: 20,
    alignItems: 'center',
  },
  dialogHeader: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  dialogLabel: {
    fontWeight: 'bold',
    width: 60,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
});

export default ShopDashboardScreen; 