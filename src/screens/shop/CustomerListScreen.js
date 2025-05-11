import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Searchbar, useTheme, IconButton, Menu, Divider, Portal, Modal, TextInput, Button, Chip, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function CustomerListScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'repair', 'purchase'

  useEffect(() => {
    fetchCustomers();
  }, [activeTab]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Check if user exists and has a valid ID
      if (!user || !(user.id || user.uid)) {
        console.log('User info missing or incomplete', user);
        setLoading(false);
        setCustomers([]);
        return;
      }
      
      const userId = user.id || user.uid;
      
      // Create a map to store combined customer data
      const customerMap = new Map();
      
      // 1. Fetch customers from repairs
      const repairsRef = collection(db, 'repairs');
      const repairsQuery = query(
        repairsRef,
        where('shopId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Get repair customers
      const repairsSnapshot = await getDocs(repairsQuery);
      repairsSnapshot.docs.forEach(doc => {
        const repair = {
          id: doc.id,
          ...doc.data()
        };
        
        const customerId = repair.customerId;
        if (!customerId) return;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            id: customerId,
            name: repair.customerName,
            phone: repair.customerPhone || '',
            email: repair.customerEmail || '',
            totalRepairs: 0,
            lastRepair: null,
            totalPurchases: 0,
            lastPurchase: null,
            notes: repair.customerNotes || [],
            totalDue: repair.balanceDue || 0,
            type: 'repair'
          });
        }
        
        const customer = customerMap.get(customerId);
        
        // Update repair info
        customer.totalRepairs++;
        if (!customer.lastRepair || repair.createdAt > customer.lastRepair.createdAt) {
          customer.lastRepair = repair;
        }
        
        // Add to total due if there's a balance
        if (repair.balanceDue && !repair.isPaid) {
          customer.totalDue += parseFloat(repair.balanceDue) || 0;
        }
      });
      
      // 2. Fetch customers from purchases/transactions
      const transactionsRef = collection(db, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('shopId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      try {
        const transactionsSnapshot = await getDocs(transactionsQuery);
        transactionsSnapshot.docs.forEach(doc => {
          const transaction = {
            id: doc.id,
            ...doc.data()
          };
          
          const customerId = transaction.customerId;
          if (!customerId) return;
          
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              id: customerId,
              name: transaction.customerName,
              phone: transaction.customerPhone || '',
              email: transaction.customerEmail || '',
              totalRepairs: 0,
              lastRepair: null,
              totalPurchases: 0,
              lastPurchase: null,
              notes: transaction.customerNotes || [],
              totalDue: 0,
              type: 'purchase'
            });
          }
          
          const customer = customerMap.get(customerId);
          
          // Update purchase info
          customer.totalPurchases++;
          if (!customer.lastPurchase || transaction.createdAt > customer.lastPurchase.createdAt) {
            customer.lastPurchase = transaction;
          }
          
          // Update type if they have both purchases and repairs
          if (customer.totalRepairs > 0) {
            customer.type = 'both';
          }
          
          // Add to total due if there's a balance
          if (transaction.balanceDue && transaction.paymentStatus !== 'paid') {
            customer.totalDue += parseFloat(transaction.balanceDue) || 0;
          }
        });
      } catch (error) {
        console.error('Error fetching transactions:', error);
        // Continue with repair customers even if transactions fail
      }
      
      // Convert map to array and set state
      let customersArray = Array.from(customerMap.values());
      
      // Filter by customer type if needed
      if (activeTab === 'repair') {
        customersArray = customersArray.filter(
          customer => customer.type === 'repair' || customer.type === 'both'
        );
      } else if (activeTab === 'purchase') {
        customersArray = customersArray.filter(
          customer => customer.type === 'purchase' || customer.type === 'both'
        );
      }
      
      setCustomers(customersArray);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to load customers');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const handleAddNote = async () => {
    if (!selectedCustomer || !note.trim()) return;

    try {
      setUpdating(true);
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      const newNote = {
        text: note.trim(),
        timestamp: Timestamp.now(),
        addedBy: user.id || user.uid
      };

      await updateDoc(customerRef, {
        notes: [...(selectedCustomer.notes || []), newNote],
        updatedAt: Timestamp.now()
      });

      setNote('');
      setNoteModalVisible(false);
      Alert.alert('Success', 'Note added successfully');
      
      // Update local state
      setCustomers(customers.map(c => 
        c.id === selectedCustomer.id 
          ? { ...c, notes: [...(c.notes || []), newNote] }
          : c
      ));
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedCustomer || !paymentAmount.trim()) return;
    
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    
    try {
      setUpdating(true);
      
      // Update customer's balance
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      
      // Record the payment transaction
      const paymentData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        amount: amount,
        method: paymentMethod,
        notes: paymentNote,
        timestamp: Timestamp.now(),
        createdBy: user.id || user.uid,
        shopId: user.id || user.uid,
        type: 'payment'
      };
      
      await addDoc(collection(db, 'payments'), paymentData);
      
      // Reduce the customer's total due balance
      const newBalance = Math.max(0, selectedCustomer.totalDue - amount);
      
      await updateDoc(customerRef, {
        totalDue: newBalance,
        lastPaymentDate: Timestamp.now(),
        lastPaymentAmount: amount,
        updatedAt: Timestamp.now()
      });
      
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentModalVisible(false);
      Alert.alert('Success', 'Payment recorded successfully');
      
      // Update local state
      setCustomers(customers.map(c => 
        c.id === selectedCustomer.id 
          ? { ...c, totalDue: newBalance }
          : c
      ));
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setUpdating(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  const renderCustomerCard = (customer) => (
    <Surface 
      key={customer.id} 
      style={[
        styles.customerCard,
        customer.totalDue > 0 && styles.customerCardWithBalance
      ]}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.nameContainer}>
            <Text variant="titleMedium">{customer.name}</Text>
            {customer.totalDue > 0 && (
              <Badge style={styles.balanceBadge}>
                ${customer.totalDue.toFixed(2)}
              </Badge>
            )}
          </View>
          <View style={styles.tagsContainer}>
            <Chip 
              mode="outlined" 
              style={[
                styles.typeChip,
                customer.type === 'repair' && styles.repairChip,
                customer.type === 'purchase' && styles.purchaseChip,
                customer.type === 'both' && styles.bothChip
              ]}
              textStyle={styles.chipText}
              compact
            >
              {customer.type === 'repair' ? 'Repair' : 
               customer.type === 'purchase' ? 'Purchase' : 'Both'}
            </Chip>
            <Text variant="bodySmall" style={styles.customerSubtitle}>
              {customer.totalRepairs > 0 && `${customer.totalRepairs} repairs`}
              {customer.totalRepairs > 0 && customer.totalPurchases > 0 && ' · '}
              {customer.totalPurchases > 0 && `${customer.totalPurchases} purchases`}
            </Text>
          </View>
        </View>
        <Menu
          visible={menuVisible && selectedCustomer?.id === customer.id}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => {
                setSelectedCustomer(customer);
                setMenuVisible(true);
              }}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setNoteModalVisible(true);
            }}
            title="Add Note"
            leadingIcon="note-plus"
          />
          {customer.totalDue > 0 && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setPaymentAmount(customer.totalDue.toString());
                setPaymentModalVisible(true);
              }}
              title="Record Payment"
              leadingIcon="cash-plus"
            />
          )}
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('CustomerDetails', { customerId: customer.id });
            }}
            title="View Details"
            leadingIcon="information"
          />
        </Menu>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.customerDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="phone" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {customer.phone || 'No phone added'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="email" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {customer.email || 'No email added'}
          </Text>
        </View>
        {(customer.lastRepair || customer.lastPurchase) && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock" size={20} color="#666" />
            <Text variant="bodyMedium" style={styles.detailText}>
              Last activity: {
                formatDate(
                  customer.lastRepair?.createdAt > customer.lastPurchase?.createdAt
                    ? customer.lastRepair?.createdAt
                    : customer.lastPurchase?.createdAt
                )
              }
            </Text>
          </View>
        )}
        {customer.totalDue > 0 && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="cash-alert" size={20} color="#F44336" />
            <Text variant="bodyMedium" style={styles.balanceText}>
              Balance Due: ${customer.totalDue.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {customer.notes && customer.notes.length > 0 && (
        <View style={styles.notesSection}>
          <Text variant="titleSmall" style={styles.notesTitle}>Latest Note</Text>
          <Text variant="bodySmall" style={styles.noteText}>
            {customer.notes[customer.notes.length - 1].text}
          </Text>
        </View>
      )}
    </Surface>
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      
      return new Date(timestamp).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const renderTypeFilters = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={activeTab === 'all'}
        onPress={() => setActiveTab('all')}
        style={styles.filterChip}
        selectedColor={theme.colors.primary}
      >
        All
      </Chip>
      <Chip
        selected={activeTab === 'repair'}
        onPress={() => setActiveTab('repair')}
        style={styles.filterChip}
        selectedColor={theme.colors.primary}
      >
        Repair Clients
      </Chip>
      <Chip
        selected={activeTab === 'purchase'}
        onPress={() => setActiveTab('purchase')}
        style={styles.filterChip}
        selectedColor={theme.colors.primary}
      >
        Purchasers
      </Chip>
    </View>
  );

  const renderPaymentModal = () => (
    <Modal
      visible={paymentModalVisible}
      onDismiss={() => setPaymentModalVisible(false)}
      contentContainerStyle={styles.modal}
    >
      <Text variant="titleLarge" style={styles.modalTitle}>Record Payment</Text>
      <TextInput
        label="Amount"
        value={paymentAmount}
        onChangeText={setPaymentAmount}
        style={styles.modalInput}
        keyboardType="numeric"
        mode="outlined"
      />
      <Text variant="bodySmall" style={styles.inputHelper}>
        Total balance due: ${selectedCustomer?.totalDue.toFixed(2) || '0.00'}
      </Text>
      
      <View style={styles.paymentMethodContainer}>
        <Text variant="bodyMedium" style={styles.methodLabel}>Payment Method:</Text>
        <View style={styles.methodChips}>
          <Chip
            selected={paymentMethod === 'cash'}
            onPress={() => setPaymentMethod('cash')}
            style={styles.methodChip}
          >
            Cash
          </Chip>
          <Chip
            selected={paymentMethod === 'card'}
            onPress={() => setPaymentMethod('card')}
            style={styles.methodChip}
          >
            Card
          </Chip>
          <Chip
            selected={paymentMethod === 'transfer'}
            onPress={() => setPaymentMethod('transfer')}
            style={styles.methodChip}
          >
            Transfer
          </Chip>
        </View>
      </View>
      
      <TextInput
        label="Note (optional)"
        value={paymentNote}
        onChangeText={setPaymentNote}
        style={styles.modalInput}
        multiline
        numberOfLines={2}
        mode="outlined"
      />
      
      <View style={styles.modalActions}>
        <Button
          mode="text"
          onPress={() => setPaymentModalVisible(false)}
          disabled={updating}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleAddPayment}
          loading={updating}
          disabled={updating || !paymentAmount.trim()}
        >
          Record
        </Button>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search customers..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {renderTypeFilters()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(renderCustomerCard)
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try a different search term' 
                : activeTab !== 'all' 
                  ? `No ${activeTab} customers found` 
                  : 'Customers will appear here once they make a purchase or repair'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={noteModalVisible}
          onDismiss={() => setNoteModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Note</Text>
          <TextInput
            label="Note"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            style={styles.noteInput}
          />
          <Button
            mode="contained"
            onPress={handleAddNote}
            loading={updating}
            disabled={updating || !note.trim()}
            style={styles.noteButton}
          >
            Add Note
          </Button>
        </Modal>
        
        {renderPaymentModal()}
      </Portal>
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
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f8f9fa',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  filterChip: {
    marginRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  customerCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  customerCardWithBalance: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  balanceBadge: {
    backgroundColor: '#F44336',
    color: '#fff',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  typeChip: {
    marginRight: 8,
    height: 24,
  },
  repairChip: {
    borderColor: '#2196F3',
  },
  purchaseChip: {
    borderColor: '#4CAF50',
  },
  bothChip: {
    borderColor: '#9C27B0',
  },
  chipText: {
    fontSize: 12,
  },
  customerSubtitle: {
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  customerDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#666',
  },
  balanceText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesTitle: {
    marginBottom: 4,
  },
  noteText: {
    color: '#666',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  noteInput: {
    marginBottom: 16,
  },
  noteButton: {
    borderRadius: 8,
  },
  modalInput: {
    marginBottom: 12,
  },
  inputHelper: {
    marginTop: -8,
    marginBottom: 12,
    color: '#666',
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  methodLabel: {
    marginBottom: 8,
  },
  methodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  methodChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
  },
}); 