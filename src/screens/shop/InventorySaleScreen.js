import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Surface, useTheme, Divider, IconButton, Chip, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { doc, collection, addDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InventorySaleScreen({ route, navigation }) {
  const { item } = route.params;
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState(item.sellingPrice?.toString() || '0');
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [createCustomerRecord, setCreateCustomerRecord] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [amountPaid, setAmountPaid] = useState('0');
  
  // Calculated values
  const numQuantity = parseInt(quantity) || 0;
  const numPrice = parseFloat(price) || 0;
  const numDiscount = parseFloat(discount) || 0;
  const subtotal = numQuantity * numPrice;
  const totalDiscount = numDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  
  const balanceDue = paymentStatus === 'paid' ? 0 : 
                     paymentStatus === 'partial' ? (parseFloat(amountPaid) > 0 ? total - parseFloat(amountPaid) : total) : 
                     total;
  
  // Calculate the total
  useEffect(() => {
    if (item.sellingPrice) {
      setPrice(item.sellingPrice.toString());
    }
  }, [item]);
  
  const handleSale = async () => {
    // Validation
    if (numQuantity <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }
    
    if (numQuantity > item.stockLevel) {
      Alert.alert('Error', 'Not enough stock available');
      return;
    }
    
    if (total <= 0) {
      Alert.alert('Error', 'Total amount must be greater than 0');
      return;
    }
    
    if (!customerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    
    // If payment status is partial, validate amount paid
    if (paymentStatus === 'partial') {
      const paidAmount = parseFloat(amountPaid) || 0;
      if (paidAmount <= 0) {
        Alert.alert('Error', 'Amount paid must be greater than 0 for partial payment');
        return;
      }
      if (paidAmount >= total) {
        Alert.alert('Error', 'For partial payment, amount paid should be less than the total');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      // Get user ID with fallback
      const userId = user?.uid || user?.id;
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        setLoading(false);
        return;
      }
      
      let customerId = null;
      
      // 1. Create or get customer record
      if (createCustomerRecord) {
        // Check if the customer already exists by phone number
        if (customerPhone) {
          // This would typically involve a query to find existing customers
          // For simplicity, we're just creating a new customer record each time
        }
        
        // Create a new customer record
        const customerData = {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId,
          shopId: userId,
          totalPurchases: 1,
          lastPurchaseDate: serverTimestamp(),
          notes: notes ? [{ text: notes, timestamp: new Date() }] : [],
          type: 'purchase'
        };
        
        if (paymentStatus !== 'paid') {
          customerData.totalDue = balanceDue;
        }
        
        const customerRef = await addDoc(collection(db, 'customers'), customerData);
        customerId = customerRef.id;
      }
      
      // 2. Create transaction record
      const transaction = {
        itemId: item.id,
        itemName: item.name,
        quantity: numQuantity,
        unitPrice: numPrice,
        discount: numDiscount,
        subtotal: subtotal,
        total: total,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        amountPaid: paymentStatus === 'paid' ? total : (parseFloat(amountPaid) || 0),
        balanceDue: balanceDue,
        createdAt: serverTimestamp(),
        createdBy: userId,
        shopId: userId,
        notes: notes,
        customerId: customerId,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        type: 'sale'
      };
      
      const transactionRef = await addDoc(collection(db, 'transactions'), transaction);
      
      // 3. Update inventory stock level
      const inventoryRef = doc(db, 'inventory', item.id);
      await updateDoc(inventoryRef, {
        stockLevel: increment(-numQuantity),
        lastUpdated: serverTimestamp()
      });
      
      // 4. Add audit log entry
      await addDoc(collection(db, 'inventoryAudit'), {
        itemId: item.id,
        itemName: item.name,
        previousQuantity: item.stockLevel,
        newQuantity: item.stockLevel - numQuantity,
        change: -numQuantity,
        reason: `Sale to ${customerName}`,
        transactionId: transactionRef.id,
        timestamp: serverTimestamp(),
        createdBy: userId,
        shopId: userId
      });
      
      Alert.alert(
        'Success',
        'Sale completed successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert('Error', 'Failed to process sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
            />
            <Text variant="headlineSmall" style={styles.title}>Sell Item</Text>
          </View>
          
          <Surface style={styles.itemDetails}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Item Details</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.itemRow}>
              <Text variant="titleLarge">{item.name}</Text>
              {item.partId && <Text variant="bodySmall">ID: {item.partId}</Text>}
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text variant="bodySmall">Available Stock</Text>
                <Text 
                  variant="titleMedium" 
                  style={[
                    styles.stockText, 
                    {color: item.stockLevel <= (item.minStockLevel || 5) ? theme.colors.error : theme.colors.primary}
                  ]}
                >
                  {item.stockLevel}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text variant="bodySmall">Unit Price</Text>
                <Text variant="titleMedium" style={styles.priceText}>
                  ${item.sellingPrice?.toFixed(2) || '0.00'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text variant="bodySmall">Category</Text>
                <Text variant="bodyMedium">{item.category || 'Uncategorized'}</Text>
              </View>
            </View>
          </Surface>
          
          <Surface style={styles.formSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Sale Details</Text>
            <Divider style={styles.divider} />
            
            <TextInput
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={styles.input}
              error={numQuantity <= 0 || numQuantity > item.stockLevel}
            />
            {numQuantity > item.stockLevel && (
              <HelperText type="error">
                Not enough stock available (max: {item.stockLevel})
              </HelperText>
            )}
            
            <TextInput
              label="Unit Price ($)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
            />
            
            <TextInput
              label="Discount ($)"
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              style={styles.input}
            />
            
            <View style={styles.orderSummary}>
              <View style={styles.summaryRow}>
                <Text>Subtotal</Text>
                <Text>${subtotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text>Discount</Text>
                <Text>-${totalDiscount.toFixed(2)}</Text>
              </View>
              
              <Divider style={[styles.divider, {marginVertical: 8}]} />
              
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total</Text>
                <Text variant="titleMedium" style={styles.totalText}>${total.toFixed(2)}</Text>
              </View>
            </View>
          </Surface>
          
          <Surface style={styles.formSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Payment</Text>
            <Divider style={styles.divider} />
            
            <Text variant="bodyMedium" style={styles.inputLabel}>Payment Status</Text>
            <View style={styles.paymentStatusContainer}>
              <Chip
                selected={paymentStatus === 'paid'}
                onPress={() => setPaymentStatus('paid')}
                style={styles.chip}
                selectedColor={theme.colors.primary}
              >
                Paid
              </Chip>
              <Chip
                selected={paymentStatus === 'partial'}
                onPress={() => setPaymentStatus('partial')}
                style={styles.chip}
                selectedColor={theme.colors.primary}
              >
                Partial
              </Chip>
              <Chip
                selected={paymentStatus === 'unpaid'}
                onPress={() => setPaymentStatus('unpaid')}
                style={styles.chip}
                selectedColor={theme.colors.primary}
              >
                Unpaid
              </Chip>
            </View>
            
            {paymentStatus === 'partial' && (
              <TextInput
                label="Amount Paid ($)"
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="numeric"
                style={styles.input}
              />
            )}
            
            <Text variant="bodyMedium" style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethodContainer}>
              <Chip
                selected={paymentMethod === 'cash'}
                onPress={() => setPaymentMethod('cash')}
                style={styles.chip}
                selectedColor={theme.colors.primary}
              >
                Cash
              </Chip>
              <Chip
                selected={paymentMethod === 'card'}
                onPress={() => setPaymentMethod('card')}
                style={styles.chip}
                selectedColor={theme.colors.primary}
              >
                Card
              </Chip>
              <Chip
                selected={paymentMethod === 'transfer'}
                onPress={() => setPaymentMethod('transfer')}
                style={styles.chip}
                selectedColor={theme.colors.primary}
              >
                Transfer
              </Chip>
            </View>
          </Surface>
          
          <Surface style={styles.formSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Customer Information</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.checkboxRow}>
              <Chip
                selected={createCustomerRecord}
                onPress={() => setCreateCustomerRecord(!createCustomerRecord)}
                style={styles.checkbox}
              >
                Create customer record
              </Chip>
            </View>
            
            <TextInput
              label="Customer Name *"
              value={customerName}
              onChangeText={setCustomerName}
              style={styles.input}
              error={!customerName.trim()}
            />
            
            <TextInput
              label="Phone Number"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
            
            <TextInput
              label="Email"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              style={styles.input}
            />
            
            <TextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Surface>
          
          <View style={styles.actions}>
            <Button 
              mode="outlined" 
              onPress={() => navigation.goBack()}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSale}
              style={styles.button}
              loading={loading}
              disabled={loading || numQuantity <= 0 || numQuantity > item.stockLevel || total <= 0 || !customerName.trim()}
            >
              Complete Sale
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginLeft: 8,
  },
  itemDetails: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 16,
  },
  itemRow: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
  },
  stockText: {
    fontWeight: 'bold',
  },
  priceText: {
    fontWeight: 'bold',
  },
  formSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  orderSummary: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalText: {
    fontWeight: 'bold',
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  inputLabel: {
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});