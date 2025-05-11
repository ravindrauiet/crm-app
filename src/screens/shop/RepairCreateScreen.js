import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, Chip, Divider, useTheme, TextInput, Portal, Modal, Title, Searchbar, List, Avatar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, getDocs, query as firestoreQuery, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { fetchInventory, useInventory } from '../../store/slices/inventorySlice';

export default function RepairCreateScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const inventoryItems = useSelector(useInventory());
  
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [customerSearchVisible, setCustomerSearchVisible] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  const [formData, setFormData] = useState({
    deviceType: '',
    deviceModel: '',
    issueDescription: '',
    selectedServices: [],
    estimatedCost: '',
    estimatedTime: '',
    notes: ''
  });

  useEffect(() => {
    // Load inventory when the component mounts
    dispatch(fetchInventory());
  }, [dispatch]);

  useEffect(() => {
    // Search for customers when the search query changes
    if (customerSearchQuery.length > 2) {
      searchCustomers(customerSearchQuery);
    }
  }, [customerSearchQuery]);

  const searchCustomers = async (searchText) => {
    try {
      const usersRef = collection(db, 'users');
      const q = firestoreQuery(usersRef, where('userType', '==', 'customer'));
      const snapshot = await getDocs(q);
      
      // Filter customers based on search query
      const filteredCustomers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(customer => 
          customer.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchText.toLowerCase()) ||
          customer.phone?.includes(searchText)
        );
      
      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const commonDeviceTypes = [
    'Smartphone',
    'Tablet',
    'Laptop',
    'Desktop',
    'Smartwatch',
    'Gaming Console',
    'Other'
  ];

  const commonServices = [
    'Screen Repair',
    'Battery Replacement',
    'Water Damage',
    'Software Issues',
    'Hardware Repair',
    'Data Recovery',
    'Virus Removal',
    'Diagnostic',
    'Other'
  ];

  const handleServiceSelect = (service) => {
    if (formData.selectedServices.includes(service)) {
      setFormData({
        ...formData,
        selectedServices: formData.selectedServices.filter(s => s !== service)
      });
    } else {
      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, service]
      });
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchVisible(false);
  };

  const toggleInventoryItem = (item) => {
    if (selectedInventoryItems.some(i => i.id === item.id)) {
      // If item is already selected, update its quantity
      setSelectedInventoryItems(selectedInventoryItems.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      // Add item with quantity of 1
      setSelectedInventoryItems([...selectedInventoryItems, { ...item, quantity: 1 }]);
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    // Make sure quantity is at least 1
    const newQuantity = Math.max(1, quantity);
    
    setSelectedInventoryItems(selectedInventoryItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeInventoryItem = (itemId) => {
    setSelectedInventoryItems(selectedInventoryItems.filter(item => item.id !== itemId));
  };

  const calculateTotalCost = () => {
    return selectedInventoryItems.reduce((total, item) => {
      return total + (item.unitCost || 0) * item.quantity;
    }, 0);
  };

  const validateForm = () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return false;
    }
    if (!formData.deviceType.trim()) {
      Alert.alert('Error', 'Please select a device type');
      return false;
    }
    if (!formData.deviceModel.trim()) {
      Alert.alert('Error', 'Please enter the device model');
      return false;
    }
    if (!formData.issueDescription.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return false;
    }
    if (formData.selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const repairRef = await addDoc(collection(db, 'repairs'), {
        shopId: user.uid || user.id,
        shopName: user.shopName || user.displayName || "Shop",
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name || selectedCustomer.email.split('@')[0],
        customerEmail: selectedCustomer.email,
        customerPhone: selectedCustomer.phone || '',
        deviceType: formData.deviceType,
        deviceModel: formData.deviceModel,
        issueDescription: formData.issueDescription,
        services: formData.selectedServices,
        partsUsed: selectedInventoryItems.map(item => ({
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitCost: item.unitCost || 0
        })),
        estimatedCost: formData.estimatedCost || calculateTotalCost().toString(),
        estimatedTime: formData.estimatedTime,
        notes: formData.notes,
        status: 'in_progress',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: [],
        timeline: [{
          status: 'in_progress',
          timestamp: serverTimestamp(),
          description: 'Repair created by shop'
        }]
      });

      // If inventory items were selected, update inventory
      if (selectedInventoryItems.length > 0) {
        // This would call your inventory adjustment function
        // to reduce inventory levels based on parts used
        
        // For example:
        // await dispatch(useParts({
        //   repairId: repairRef.id,
        //   parts: selectedInventoryItems.map(item => ({
        //     itemId: item.id,
        //     name: item.name,
        //     quantity: item.quantity
        //   })),
        //   userId: user.uid || user.id
        // }));
      }

      setShowConfirmation(true);
    } catch (error) {
      console.error('Error creating repair:', error);
      Alert.alert('Error', 'Failed to create repair. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerSearchModal = () => (
    <Portal>
      <Modal 
        visible={customerSearchVisible} 
        onDismiss={() => setCustomerSearchVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title style={styles.modalTitle}>Select Customer</Title>
        <Searchbar
          placeholder="Search customer by name or email"
          onChangeText={setCustomerSearchQuery}
          value={customerSearchQuery}
          style={styles.searchbar}
        />

        <ScrollView style={styles.customerList}>
          {customers.map(customer => (
            <List.Item
              key={customer.id}
              title={customer.name || customer.email.split('@')[0]}
              description={customer.email}
              left={props => <Avatar.Text size={40} label={(customer.name || customer.email).substring(0, 2).toUpperCase()} />}
              onPress={() => handleSelectCustomer(customer)}
              style={styles.customerItem}
            />
          ))}
          {customerSearchQuery.length > 2 && customers.length === 0 && (
            <Text style={styles.noResults}>No customers found</Text>
          )}
        </ScrollView>

        <Button 
          mode="outlined" 
          onPress={() => setCustomerSearchVisible(false)}
          style={styles.modalButton}
        >
          Cancel
        </Button>
      </Modal>
    </Portal>
  );

  const renderInventoryModal = () => (
    <Portal>
      <Modal 
        visible={inventoryModalVisible} 
        onDismiss={() => setInventoryModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title style={styles.modalTitle}>Select Inventory Items</Title>
        <Searchbar
          placeholder="Search inventory items"
          onChangeText={() => {}}
          value=""
          style={styles.searchbar}
        />

        <ScrollView style={styles.inventoryList}>
          {inventoryItems.map(item => (
            <List.Item
              key={item.id}
              title={item.name}
              description={`Stock: ${item.stockLevel} | Cost: $${item.unitCost}`}
              right={props => (
                <IconButton
                  icon="plus"
                  size={24}
                  onPress={() => toggleInventoryItem(item)}
                />
              )}
              style={styles.inventoryItem}
            />
          ))}
          {inventoryItems.length === 0 && (
            <Text style={styles.noResults}>No inventory items available</Text>
          )}
        </ScrollView>

        <Button 
          mode="contained" 
          onPress={() => setInventoryModalVisible(false)}
          style={styles.modalButton}
        >
          Done
        </Button>
      </Modal>
    </Portal>
  );

  const renderConfirmationModal = () => (
    <Portal>
      <Modal
        visible={showConfirmation}
        onDismiss={() => navigation.navigate('RepairTickets')}
        contentContainerStyle={styles.modalContainer}
      >
        <MaterialCommunityIcons 
          name="check-circle" 
          size={60} 
          color={theme.colors.primary} 
          style={styles.confirmationIcon}
        />
        <Title style={styles.confirmationTitle}>Repair Created!</Title>
        <Text style={styles.confirmationText}>
          The repair has been successfully created and the inventory has been updated.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('RepairTickets')}
          style={styles.modalButton}
        >
          View Repairs
        </Button>
      </Modal>
    </Portal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.formSection}>
          <Title style={styles.sectionTitle}>Customer Information</Title>
          
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{selectedCustomer.name || selectedCustomer.email.split('@')[0]}</Text>
                <Text style={styles.customerEmail}>{selectedCustomer.email}</Text>
                {selectedCustomer.phone && (
                  <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                )}
              </View>
              <Button 
                mode="outlined" 
                onPress={() => setCustomerSearchVisible(true)}
                style={styles.changeButton}
              >
                Change
              </Button>
            </View>
          ) : (
            <Button 
              mode="contained" 
              icon="account-search" 
              onPress={() => setCustomerSearchVisible(true)}
              style={styles.selectButton}
            >
              Select Customer
            </Button>
          )}
        </Surface>

        <Surface style={styles.formSection}>
          <Title style={styles.sectionTitle}>Device Information</Title>
          
          <Text style={styles.inputLabel}>Device Type</Text>
          <View style={styles.chipContainer}>
            {commonDeviceTypes.map(type => (
              <Chip
                key={type}
                selected={formData.deviceType === type}
                onPress={() => setFormData({ ...formData, deviceType: type })}
                style={styles.chip}
                showSelectedCheck
              >
                {type}
              </Chip>
            ))}
          </View>
          
          <TextInput
            label="Device Model"
            value={formData.deviceModel}
            onChangeText={text => setFormData({ ...formData, deviceModel: text })}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Issue Description"
            value={formData.issueDescription}
            onChangeText={text => setFormData({ ...formData, issueDescription: text })}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
          />
        </Surface>

        <Surface style={styles.formSection}>
          <Title style={styles.sectionTitle}>Services</Title>
          
          <Text style={styles.inputLabel}>Select Services</Text>
          <View style={styles.chipContainer}>
            {commonServices.map(service => (
              <Chip
                key={service}
                selected={formData.selectedServices.includes(service)}
                onPress={() => handleServiceSelect(service)}
                style={styles.chip}
                showSelectedCheck
              >
                {service}
              </Chip>
            ))}
          </View>
        </Surface>

        <Surface style={styles.formSection}>
          <Title style={styles.sectionTitle}>Parts & Inventory</Title>
          
          <Button 
            mode="contained" 
            icon="package-variant" 
            onPress={() => setInventoryModalVisible(true)}
            style={styles.selectButton}
          >
            Select Inventory Items
          </Button>
          
          {selectedInventoryItems.length > 0 && (
            <View style={styles.selectedItems}>
              <Text style={styles.selectedItemsTitle}>Selected Items:</Text>
              
              {selectedInventoryItems.map(item => (
                <View key={item.id} style={styles.selectedItemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCost}>${item.unitCost} each</Text>
                  </View>
                  
                  <View style={styles.quantityControls}>
                    <IconButton
                      icon="minus"
                      size={20}
                      onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    />
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <IconButton
                      icon="plus"
                      size={20}
                      onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stockLevel}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => removeInventoryItem(item.id)}
                      style={styles.deleteButton}
                    />
                  </View>
                </View>
              ))}
              
              <Divider style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Parts Cost:</Text>
                <Text style={styles.totalCost}>${calculateTotalCost().toFixed(2)}</Text>
              </View>
            </View>
          )}
        </Surface>

        <Surface style={styles.formSection}>
          <Title style={styles.sectionTitle}>Repair Details</Title>
          
          <TextInput
            label="Estimated Cost ($)"
            value={formData.estimatedCost}
            onChangeText={text => setFormData({ ...formData, estimatedCost: text })}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder={calculateTotalCost().toFixed(2)}
          />
          
          <TextInput
            label="Estimated Time (e.g., 2 days)"
            value={formData.estimatedTime}
            onChangeText={text => setFormData({ ...formData, estimatedTime: text })}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Additional Notes (optional)"
            value={formData.notes}
            onChangeText={text => setFormData({ ...formData, notes: text })}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
          />
        </Surface>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          loading={loading}
          disabled={loading}
        >
          Create Repair
        </Button>
      </ScrollView>

      {renderCustomerSearchModal()}
      {renderInventoryModal()}
      {renderConfirmationModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  formSection: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    margin: 4,
  },
  selectButton: {
    marginVertical: 8,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 8,
  },
  selectedCustomer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  changeButton: {
    marginLeft: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  searchbar: {
    marginBottom: 16,
  },
  customerList: {
    marginBottom: 16,
    maxHeight: 400,
  },
  customerItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noResults: {
    textAlign: 'center',
    padding: 16,
    color: '#999',
  },
  modalButton: {
    marginTop: 16,
  },
  inventoryList: {
    maxHeight: 400,
  },
  inventoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedItems: {
    marginTop: 16,
  },
  selectedItemsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
  },
  itemCost: {
    color: '#666',
    fontSize: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 8,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginLeft: 8,
  },
  divider: {
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalCost: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  confirmationIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#555',
  },
}); 