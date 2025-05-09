import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, Button, Chip, Divider, useTheme, IconButton, ProgressBar, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

export default function RepairStatusScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      const customerRepairs = allRepairs
        .filter(repair => repair.customerId === user.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRepairs(customerRepairs);
    } catch (error) {
      console.error('Error fetching repairs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const getFilteredRepairs = () => {
    switch (selectedFilter) {
      case 'active':
        return repairs.filter(repair => 
          repair.status !== 'completed' && repair.status !== 'cancelled'
        );
      case 'completed':
        return repairs.filter(repair => repair.status === 'completed');
      case 'cancelled':
        return repairs.filter(repair => repair.status === 'cancelled');
      default:
        return repairs;
    }
  };

  const renderFilterChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
    >
      <Chip
        selected={selectedFilter === 'all'}
        onPress={() => setSelectedFilter('all')}
        style={styles.filterChip}
        mode="outlined"
      >
        All Repairs
      </Chip>
      <Chip
        selected={selectedFilter === 'active'}
        onPress={() => setSelectedFilter('active')}
        style={styles.filterChip}
        mode="outlined"
      >
        Active
      </Chip>
      <Chip
        selected={selectedFilter === 'completed'}
        onPress={() => setSelectedFilter('completed')}
        style={styles.filterChip}
        mode="outlined"
      >
        Completed
      </Chip>
      <Chip
        selected={selectedFilter === 'cancelled'}
        onPress={() => setSelectedFilter('cancelled')}
        style={styles.filterChip}
        mode="outlined"
      >
        Cancelled
      </Chip>
    </ScrollView>
  );

  const renderRepairCard = (repair) => (
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
        <View style={styles.repairDetail}>
          <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
          <Text style={styles.repairDetailText}>
            Created: {format(new Date(repair.createdAt), 'MMM d, yyyy')}
          </Text>
        </View>
        {repair.estimatedCompletion && (
          <View style={styles.repairDetail}>
            <MaterialCommunityIcons name="calendar-check" size={16} color="#757575" />
            <Text style={styles.repairDetailText}>
              Est. completion: {format(new Date(repair.estimatedCompletion), 'MMM d, yyyy')}
            </Text>
          </View>
        )}
        {repair.price && (
          <View style={styles.repairDetail}>
            <MaterialCommunityIcons name="currency-usd" size={16} color="#757575" />
            <Text style={styles.repairDetailText}>
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
        </View>
      )}

      <View style={styles.cardActions}>
        <Button 
          mode="text"
          onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
        >
          View Details
        </Button>
        {repair.status !== 'completed' && repair.status !== 'cancelled' && (
          <Button 
            mode="text"
            onPress={() => navigation.navigate('Messages', { repairId: repair.id })}
          >
            Message Shop
          </Button>
        )}
      </View>
    </Surface>
  );

  const renderEmptyState = () => (
    <Surface style={styles.emptyCard}>
      <MaterialCommunityIcons name="tools" size={48} color={theme.colors.primary} />
      <Text style={styles.emptyTitle}>No Repairs Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all' 
          ? "You haven't requested any repairs yet"
          : `No ${selectedFilter} repairs found`}
      </Text>
      {selectedFilter === 'all' && (
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('NewRepair')}
          style={styles.emptyButton}
        >
          Request New Repair
        </Button>
      )}
    </Surface>
  );

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
        {renderFilterChips()}
        
        <View style={styles.content}>
          {getFilteredRepairs().length === 0 
            ? renderEmptyState()
            : getFilteredRepairs().map(renderRepairCard)
          }
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
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
  filterContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  content: {
    padding: 16,
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
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
}); 