import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, IconButton, TextInput, Divider, Chip, FAB, Menu, Dialog, ActivityIndicator, Searchbar, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchInventory, deleteInventoryItem, useInventory, useInventoryStatus } from '../../store/slices/inventorySlice';

export default function InventoryScreen({ navigation }) {
  const dispatch = useDispatch();
  const inventoryItems = useSelector(useInventory()) || [];
  const { status, error } = useSelector(useInventoryStatus()) || { status: 'idle', error: null };
  const user = useSelector(state => state.auth.user);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [menuVisible, setMenuVisible] = useState({});
  
  useEffect(() => {
    // Try to load inventory as soon as possible
    if (user) {
      console.log('User detected, attempting to load inventory');
      loadInventory();
    }
    
    // Set up a listener to reload data when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, refreshing inventory data');
      loadInventory();
    });
    
    // Clean up listener
    return unsubscribe;
  }, [navigation, user]);
  
  const loadInventory = () => {
    // Check if user exists and has any id-like property
    // This handles different auth providers that might use different id properties
    if (user && (user.id || user.uid || user._id)) {
      const userId = user.id || user.uid || user._id;
      console.log('Loading inventory for user:', userId);
      dispatch(fetchInventory())
        .then((result) => {
          console.log('Inventory loaded successfully:', result.payload?.length || 0, 'items');
        })
        .catch((error) => {
          console.error('Error loading inventory:', error);
        });
    } else {
      console.log('Cannot load inventory: Valid user ID not available', user);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchInventory())
      .finally(() => setRefreshing(false));
  };
  
  const handleDeleteConfirm = () => {
    if (deleteItemId) {
      dispatch(deleteInventoryItem(deleteItemId))
        .unwrap()
        .then(() => {
          Alert.alert('Success', 'Item deleted successfully');
          setDeleteItemId(null);
          setVisible(false);
        })
        .catch(err => {
          Alert.alert('Error', err);
        });
    }
  };
  
  const openMenu = (id) => {
    setMenuVisible(prev => ({ ...prev, [id]: true }));
  };
  
  const closeMenu = (id) => {
    setMenuVisible(prev => ({ ...prev, [id]: false }));
  };
  
  const confirmDelete = (id) => {
    setDeleteItemId(id);
    setVisible(true);
    closeMenu(id);
  };
  
  const filteredInventory = inventoryItems.filter(item => {
    const lowerQuery = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(lowerQuery) ||
      item.partId?.toLowerCase().includes(lowerQuery) ||
      item.category?.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery)
    );
  });
  
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    // Sort low stock items first
    const aLow = a.stockLevel <= (a.minStockLevel || 5);
    const bLow = b.stockLevel <= (b.minStockLevel || 5);
    
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    
    // Then sort by name
    return a.name.localeCompare(b.name);
  });
  
  const renderDeleteDialog = () => (
    <Dialog visible={visible} onDismiss={() => setVisible(false)}>
      <Dialog.Title>Delete Item</Dialog.Title>
      <Dialog.Content>
        <Text>Are you sure you want to delete this inventory item? This action cannot be undone.</Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={() => setVisible(false)}>Cancel</Button>
        <Button onPress={handleDeleteConfirm} 
          textColor="#F44336">
          Delete
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
  
  const renderInventoryItem = (item) => (
    <Surface key={item.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleSection}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemId}>ID: {item.partId || 'N/A'}</Text>
        </View>
        
        <Menu
          visible={menuVisible[item.id] || false}
          onDismiss={() => closeMenu(item.id)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => openMenu(item.id)}
            />
          }
        >
          <Menu.Item 
            onPress={() => {
              closeMenu(item.id);
              navigation.navigate('InventoryAdjust', { itemId: item.id });
            }} 
            title="Adjust Stock" 
            leadingIcon="package-variant-plus"
          />
          <Menu.Item 
            onPress={() => {
              closeMenu(item.id);
              navigation.navigate('InventoryEdit', { itemId: item.id });
            }} 
            title="Edit Item" 
            leadingIcon="pencil"
          />
          <Menu.Item 
            onPress={() => confirmDelete(item.id)} 
            title="Delete Item" 
            leadingIcon="delete"
          />
        </Menu>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.itemDetails}>
        <View style={styles.stockSection}>
          <Text style={styles.stockLabel}>Stock Level:</Text>
          <View style={styles.stockIndicator}>
            <Text style={[
              styles.stockValue,
              { color: item.stockLevel <= (item.minStockLevel || 5) ? '#F44336' : '#4CAF50' }
            ]}>
              {item.stockLevel || 0}
            </Text>
            {item.stockLevel <= (item.minStockLevel || 5) && (
              <Chip 
                mode="outlined" 
                style={styles.lowStockChip}
                textStyle={{ color: '#F44336' }}
              >
                Low Stock
              </Chip>
            )}
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{item.category || 'Uncategorized'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unit Cost:</Text>
          <Text style={styles.detailValue}>${item.unitCost?.toFixed(2) || '0.00'}</Text>
        </View>
        
        {item.supplier && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Supplier:</Text>
            <Text style={styles.detailValue}>{item.supplier}</Text>
          </View>
        )}
        
        {item.description && (
          <View style={styles.description}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.itemActions}>
        <Button
          mode="outlined"
          icon="history"
          onPress={() => navigation.navigate('InventoryAuditLog', { itemId: item.id })}
          style={styles.actionButton}
        >
          History
        </Button>
        <Button
          mode="contained"
          icon="package-variant-plus"
          onPress={() => navigation.navigate('InventoryAdjust', { itemId: item.id })}
          style={styles.actionButton}
        >
          Adjust Stock
        </Button>
        <Button
          mode="contained"
          icon="cart"
          onPress={() => handleSellItem(item)}
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          disabled={item.stockLevel <= 0}
        >
          Sell
        </Button>
      </View>
    </Surface>
  );
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="package-variant" size={64} color="#9E9E9E" />
      <Text style={styles.emptyTitle}>No inventory items found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try a different search term or clear your search'
          : 'Add your first inventory item to get started'}
      </Text>
      {!searchQuery && (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('InventoryAdd')}
          style={styles.emptyButton}
        >
          Add Inventory Item
        </Button>
      )}
    </View>
  );
  
  const handleSellItem = (item) => {
    if (item.stockLevel <= 0) {
      Alert.alert('Out of Stock', 'This item is out of stock. Please restock before selling.');
      return;
    }
    
    navigation.navigate('InventorySale', { item });
  };
  
  if (status === 'loading' && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading inventory...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Search inventory..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {sortedInventory.length > 0 
          ? sortedInventory.map(renderInventoryItem)
          : renderEmptyState()
        }
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('InventoryAdd')}
        color="#fff"
      />
      
      {renderDeleteDialog()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
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
  },
  searchbar: {
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 0,
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
  itemCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  itemHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleSection: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemId: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
  },
  itemDetails: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  stockSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  lowStockChip: {
    borderColor: '#F44336',
    height: 28,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#757575',
    fontSize: 14,
  },
  detailValue: {
    fontWeight: '500',
    color: '#333',
    fontSize: 14,
  },
  description: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  descriptionLabel: {
    color: '#757575',
    marginBottom: 4,
    fontSize: 14,
  },
  descriptionText: {
    fontStyle: 'italic',
    color: '#333',
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
  },
  actionButton: {
    marginLeft: 8,
    borderRadius: 8,
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
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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