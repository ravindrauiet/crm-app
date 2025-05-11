import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Divider, Chip, ActivityIndicator, IconButton, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAuditLogs, useAuditLogs, useInventory, useInventoryStatus } from '../../store/slices/inventorySlice';
import { format } from 'date-fns';

export default function InventoryAuditLogScreen({ route, navigation }) {
  const { itemId } = route.params;
  const dispatch = useDispatch();
  const auditLogs = useSelector(useAuditLogs());
  const inventory = useSelector(useInventory());
  const { status, error } = useSelector(useInventoryStatus());
  
  const [refreshing, setRefreshing] = useState(false);
  const [item, setItem] = useState(null);
  
  useEffect(() => {
    loadData();
    
    // Find the item from inventory
    const inventoryItem = inventory.find(i => i.id === itemId);
    if (inventoryItem) {
      setItem(inventoryItem);
      // Set the navigation title
      navigation.setOptions({
        title: `${inventoryItem.name} History`
      });
    }
  }, [itemId, inventory]);
  
  const loadData = () => {
    dispatch(fetchAuditLogs());
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchAuditLogs())
      .finally(() => setRefreshing(false));
  };
  
  // Filter logs for this specific item
  const itemLogs = auditLogs.filter(log => log.itemId === itemId);
  
  const getActionColor = (action) => {
    switch(action) {
      case 'add_item':
        return '#4CAF50';
      case 'stock_increase':
        return '#2196F3';
      case 'stock_decrease':
        return '#FF9800';
      case 'used_in_repair':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };
  
  const getActionLabel = (action) => {
    switch(action) {
      case 'add_item':
        return 'Added to Inventory';
      case 'stock_increase':
        return 'Stock Increased';
      case 'stock_decrease':
        return 'Stock Decreased';
      case 'used_in_repair':
        return 'Used in Repair';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    try {
      return format(new Date(date), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  const renderLogItem = (log) => (
    <Surface key={log.id} style={styles.logCard}>
      <View style={styles.logHeader}>
        <Chip 
          mode="outlined" 
          style={[styles.actionChip, { borderColor: getActionColor(log.action) }]}
          textStyle={{ color: getActionColor(log.action) }}
        >
          {getActionLabel(log.action)}
        </Chip>
        <Text style={styles.timestamp}>{formatDate(log.timestamp)}</Text>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.logDetails}>
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Quantity Change:</Text>
          <Text style={[
            styles.quantityValue,
            { color: log.quantityChange > 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
          </Text>
        </View>
        
        <View style={styles.stockRow}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Previous Stock:</Text>
            <Text style={styles.stockValue}>{log.previousQuantity}</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#757575" />
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>New Stock:</Text>
            <Text style={styles.stockValue}>{log.newQuantity}</Text>
          </View>
        </View>
        
        {log.reason && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason:</Text>
            <Text style={styles.detailValue}>{log.reason}</Text>
          </View>
        )}
        
        {log.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{log.notes}</Text>
          </View>
        )}
        
        {log.repairId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Repair ID:</Text>
            <Text 
              style={[styles.detailValue, styles.repairId]}
              onPress={() => navigation.navigate('RepairDetails', { repairId: log.repairId })}
            >
              {log.repairId.substring(0, 8)}...
            </Text>
          </View>
        )}
        
        <View style={styles.userSection}>
          <Text style={styles.userLabel}>Recorded by:</Text>
          <Text style={styles.userValue}>{log.user || 'Unknown'}</Text>
        </View>
      </View>
    </Surface>
  );
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="history" size={64} color="#9E9E9E" />
      <Text style={styles.emptyTitle}>No audit logs found</Text>
      <Text style={styles.emptySubtitle}>
        This item has no recorded activity yet
      </Text>
    </View>
  );
  
  if (status === 'loading' && !refreshing && !auditLogs.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading audit logs...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <IconButton
          icon="arrow-left"
          size={28}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View>
          <Text style={styles.screenTitle}>Inventory History</Text>
          <Text style={styles.screenSubtitle}>{item?.name || 'Loading...'}</Text>
        </View>
      </View>
      
      {item && (
        <Surface style={styles.itemSummary}>
          <View style={styles.summaryRow}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" />
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <View style={styles.itemDetails}>
            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Current Stock:</Text>
              <Text style={[
                styles.detailValue,
                { color: item.stockLevel <= (item.minStockLevel || 5) ? '#F44336' : '#4CAF50' }
              ]}>
                {item.stockLevel}
              </Text>
            </View>
            
            {item.partId && (
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Part ID:</Text>
                <Text style={styles.detailValue}>{item.partId}</Text>
              </View>
            )}
          </View>
        </Surface>
      )}
      
      <View style={styles.sectionHeader}>
        <Title style={styles.sectionTitle}>
          <MaterialCommunityIcons name="history" size={22} color="#2196F3" />
          {' '}Activity Log
        </Title>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
      >
        {itemLogs.length > 0 
          ? itemLogs.map(renderLogItem)
          : renderEmptyState()
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#757575',
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  itemSummary: {
    padding: 16,
    margin: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  detailGroup: {
    alignItems: 'center',
  },
  detailLabel: {
    color: '#757575',
    fontSize: 14,
  },
  detailValue: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  logCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  logHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  actionChip: {
    height: 28,
  },
  timestamp: {
    color: '#757575',
    fontSize: 13,
  },
  divider: {
    backgroundColor: '#e9ecef',
  },
  logDetails: {
    padding: 16,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  stockItem: {
    alignItems: 'center',
    flex: 1,
  },
  stockLabel: {
    color: '#757575',
    fontSize: 13,
    marginBottom: 4,
  },
  stockValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 4,
  },
  notesSection: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  notesLabel: {
    color: '#757575',
    marginBottom: 4,
  },
  notesText: {
    fontStyle: 'italic',
  },
  repairId: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  userLabel: {
    color: '#757575',
    fontSize: 12,
    marginRight: 4,
  },
  userValue: {
    fontWeight: '500',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#2196F3',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#757575',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 