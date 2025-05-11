import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Linking } from 'react-native';
import { Text, Surface, Button, useTheme, IconButton, Divider, Chip, List, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function CustomerDetailsScreen({ route, navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const { customerId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  
  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    } else {
      Alert.alert('Error', 'Customer ID not provided');
      navigation.goBack();
    }
  }, [customerId]);
  
  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Get user ID with fallback
      const userId = user?.uid || user?.id;
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        setLoading(false);
        return;
      }
      
      // 1. Fetch customer profile
      const customerRef = doc(db, 'customers', customerId);
      const customerDoc = await getDoc(customerRef);
      
      if (customerDoc.exists()) {
        setCustomer({ id: customerDoc.id, ...customerDoc.data() });
      } else {
        // If no direct customer document, reconstruct from repair/transaction
        const customerData = {
          id: customerId,
          name: '',
          email: '',
          phone: '',
          notes: [],
          totalDue: 0
        };
        setCustomer(customerData);
      }
      
      // 2. Fetch customer repairs
      const repairsRef = collection(db, 'repairs');
      const repairsQuery = query(
        repairsRef,
        where('customerId', '==', customerId),
        where('shopId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const repairsSnapshot = await getDocs(repairsQuery);
      const repairsList = repairsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRepairs(repairsList);
      
      // Update customer info if needed from repair data
      if (repairsList.length > 0 && (!customer || !customer.name)) {
        const latestRepair = repairsList[0];
        setCustomer(prev => ({
          ...prev,
          name: prev.name || latestRepair.customerName || '',
          email: prev.email || latestRepair.customerEmail || '',
          phone: prev.phone || latestRepair.customerPhone || ''
        }));
      }
      
      // 3. Fetch customer transactions
      try {
        const transactionsRef = collection(db, 'transactions');
        
        // First filter by just customerId (no need for index)
        const transactionsQuery = query(
          transactionsRef,
          where('customerId', '==', customerId)
        );
        
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        // Then filter the results in code
        const transactionsList = transactionsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(transaction => transaction.shopId === userId)
          .sort((a, b) => {
            // Sort by createdAt manually (newest first)
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
        
        setPurchases(transactionsList);
        
        // Update customer info if needed from transaction data
        if (transactionsList.length > 0 && (!customer || !customer.name)) {
          const latestTransaction = transactionsList[0];
          setCustomer(prev => ({
            ...prev,
            name: prev.name || latestTransaction.customerName || '',
            email: prev.email || latestTransaction.customerEmail || '',
            phone: prev.phone || latestTransaction.customerPhone || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        // Continue with available data
      }
      
      // 4. Fetch payment history
      try {
        const paymentsRef = collection(db, 'payments');
        
        // First filter by just customerId (no need for index)
        const paymentsQuery = query(
          paymentsRef,
          where('customerId', '==', customerId)
        );
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        // Then filter and sort in code
        const paymentsList = paymentsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            // Sort by timestamp manually (newest first)
            const dateA = a.timestamp?.toDate?.() || new Date(0);
            const dateB = b.timestamp?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
        
        setPayments(paymentsList);
      } catch (error) {
        console.error('Error fetching payments:', error);
        // Continue with available data
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      Alert.alert('Error', 'Failed to load customer data');
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomerData();
    setRefreshing(false);
  };
  
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
  
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'paid': return '#4CAF50';
      case 'unpaid': return '#F44336';
      case 'partial': return '#FF9800';
      default: return '#757575';
    }
  };
  
  const renderContactInfo = () => (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
      </View>
      <Divider style={styles.divider} />
      
      <View style={styles.contactInfo}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account" size={20} color="#666" />
          <Text variant="bodyMedium">{customer?.name || 'No name available'}</Text>
        </View>
        
        {customer?.phone && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={20} color="#666" />
            <Text variant="bodyMedium">{customer.phone}</Text>
            <Button
              icon="phone"
              mode="outlined"
              compact
              style={styles.actionButton}
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}
            >
              Call
            </Button>
          </View>
        )}
        
        {customer?.email && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color="#666" />
            <Text variant="bodyMedium">{customer.email}</Text>
            <Button
              icon="email"
              mode="outlined"
              compact
              style={styles.actionButton}
              onPress={() => Linking.openURL(`mailto:${customer.email}`)}
            >
              Email
            </Button>
          </View>
        )}
        
        {customer?.address && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
            <Text variant="bodyMedium">{customer.address}</Text>
          </View>
        )}
      </View>
    </Surface>
  );
  
  const renderPaymentInfo = () => {
    const totalDue = customer?.totalDue || 0;
    return (
      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Payment Summary</Text>
        </View>
        <Divider style={styles.divider} />
        
        <View style={styles.paymentSummary}>
          <View style={styles.paymentRow}>
            <Text variant="bodyMedium">Total Due:</Text>
            <Text
              variant="bodyMedium"
              style={[styles.amount, totalDue > 0 ? styles.due : {}]}
            >
              {formatCurrency(totalDue)}
            </Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text variant="bodyMedium">Last Payment:</Text>
            <Text variant="bodyMedium">
              {payments.length > 0
                ? `${formatCurrency(payments[0].amount)} on ${formatDate(payments[0].timestamp)}`
                : 'No payment records'
              }
            </Text>
          </View>
          
          {totalDue > 0 && (
            <Button
              icon="cash-plus"
              mode="contained"
              style={styles.paymentButton}
              onPress={() => Alert.alert('Action', 'Record payment function not implemented here yet')}
            >
              Record Payment
            </Button>
          )}
        </View>
      </Surface>
    );
  };
  
  const renderRepairsSection = () => (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Repair History</Text>
        <Text variant="bodySmall">{repairs.length} repairs</Text>
      </View>
      <Divider style={styles.divider} />
      
      {repairs.length > 0 ? (
        repairs.map(repair => (
          <View key={repair.id} style={styles.historyItem}>
            <View style={styles.historyItemHeader}>
              <View>
                <Text variant="bodyLarge">{repair.deviceType} {repair.deviceModel}</Text>
                <Text variant="bodySmall" style={styles.dateText}>
                  {formatDate(repair.createdAt)}
                </Text>
              </View>
              <View style={styles.itemStatus}>
                <Chip
                  mode="flat"
                  textStyle={{ color: 'white' }}
                  style={[styles.statusChip, { backgroundColor: getStatusColor(repair.status) }]}
                >
                  {(repair.status || 'pending').replace('_', ' ')}
                </Chip>
                <Text variant="bodyMedium" style={styles.priceText}>
                  {formatCurrency(repair.estimatedCost || repair.totalCost)}
                </Text>
              </View>
            </View>
            
            <Text variant="bodySmall" numberOfLines={2} style={styles.descriptionText}>
              {repair.issueDescription || 'No description'}
            </Text>
            
            <View style={styles.itemActions}>
              <Button
                mode="outlined"
                compact
                onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
              >
                View Details
              </Button>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No repair history found</Text>
      )}
    </Surface>
  );
  
  const renderPurchasesSection = () => (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Purchase History</Text>
        <Text variant="bodySmall">{purchases.length} purchases</Text>
      </View>
      <Divider style={styles.divider} />
      
      {purchases.length > 0 ? (
        purchases.map(purchase => (
          <View key={purchase.id} style={styles.historyItem}>
            <View style={styles.historyItemHeader}>
              <View>
                <Text variant="bodyLarge">
                  Order #{purchase.orderNumber || purchase.id.substring(0, 5)}
                </Text>
                <Text variant="bodySmall" style={styles.dateText}>
                  {formatDate(purchase.createdAt || purchase.date)}
                </Text>
              </View>
              <View style={styles.itemStatus}>
                <Chip
                  mode="flat"
                  textStyle={{ color: 'white' }}
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(purchase.paymentStatus || 'unpaid') }
                  ]}
                >
                  {purchase.paymentStatus || 'unpaid'}
                </Chip>
                <Text variant="bodyMedium" style={styles.priceText}>
                  {formatCurrency(purchase.total)}
                </Text>
              </View>
            </View>
            
            <View style={styles.purchaseItemsList}>
              {purchase.items?.slice(0, 2).map((item, index) => (
                <Text key={index} variant="bodySmall" style={styles.itemText}>
                  • {item.quantity || 1}x {item.name} ({formatCurrency(item.price)})
                </Text>
              ))}
              {(purchase.items?.length || 0) > 2 && (
                <Text variant="bodySmall" style={styles.moreItems}>
                  ...and {purchase.items.length - 2} more items
                </Text>
              )}
            </View>
            
            <View style={styles.itemActions}>
              <Button
                mode="outlined"
                compact
                onPress={() => Alert.alert('Info', 'Transaction details not implemented yet')}
              >
                View Details
              </Button>
              {purchase.paymentStatus !== 'paid' && (
                <Button
                  mode="contained"
                  compact
                  onPress={() => Alert.alert('Action', 'Record payment function not implemented here yet')}
                >
                  Record Payment
                </Button>
              )}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No purchase history found</Text>
      )}
    </Surface>
  );
  
  const renderPaymentHistorySection = () => (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Payment History</Text>
        <Text variant="bodySmall">{payments.length} payments</Text>
      </View>
      <Divider style={styles.divider} />
      
      {payments.length > 0 ? (
        payments.map(payment => (
          <View key={payment.id} style={styles.paymentItem}>
            <View style={styles.paymentItemHeader}>
              <View>
                <Text variant="bodyLarge">
                  {formatCurrency(payment.amount)}
                </Text>
                <Text variant="bodySmall" style={styles.dateText}>
                  {formatDate(payment.timestamp)}
                </Text>
              </View>
              <Chip mode="outlined" style={styles.methodChip}>
                {payment.method || 'cash'}
              </Chip>
            </View>
            
            {payment.notes && (
              <Text variant="bodySmall" style={styles.paymentNote}>
                Note: {payment.notes}
              </Text>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No payment history found</Text>
      )}
    </Surface>
  );
  
  const renderNotesSection = () => {
    if (!customer?.notes || customer.notes.length === 0) return null;
    
    return (
      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
          <Text variant="bodySmall">{customer.notes.length} notes</Text>
        </View>
        <Divider style={styles.divider} />
        
        {customer.notes.map((note, index) => (
          <View key={index} style={styles.noteItem}>
            <Text variant="bodyMedium">{note.text}</Text>
            <View style={styles.noteFooter}>
              <Text variant="bodySmall" style={styles.dateText}>
                {formatDate(note.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </Surface>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading customer data...</Text>
      </View>
    );
  }
  
  if (!customer) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Customer not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={28}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall">Customer Details</Text>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderContactInfo()}
        {renderPaymentInfo()}
        {renderRepairsSection()}
        {renderPurchasesSection()}
        {renderPaymentHistorySection()}
        {renderNotesSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  divider: {
    backgroundColor: '#e0e0e0',
  },
  contactInfo: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButton: {
    marginLeft: 'auto',
    height: 36,
  },
  paymentSummary: {
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amount: {
    fontWeight: 'bold',
  },
  due: {
    color: '#F44336',
  },
  paymentButton: {
    marginTop: 8,
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemStatus: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 4,
  },
  dateText: {
    color: '#666',
    marginTop: 4,
  },
  priceText: {
    fontWeight: 'bold',
  },
  descriptionText: {
    color: '#666',
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  purchaseItemsList: {
    marginTop: 8,
    marginBottom: 8,
  },
  itemText: {
    color: '#666',
  },
  moreItems: {
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 4,
  },
  paymentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  methodChip: {
    height: 28,
  },
  paymentNote: {
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noteItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  emptyText: {
    padding: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
}); 