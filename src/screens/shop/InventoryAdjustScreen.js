import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, RadioButton, HelperText, Divider, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { adjustInventory, useInventory, useInventoryStatus } from '../../store/slices/inventorySlice';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InventoryAdjustScreen({ route, navigation }) {
  const { itemId } = route.params;
  const dispatch = useDispatch();
  const inventory = useSelector(useInventory());
  const { status, error } = useSelector(useInventoryStatus());
  const user = useSelector(state => state.auth.user);
  
  const [item, setItem] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('increase');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Find the item from inventory
    const inventoryItem = inventory.find(i => i.id === itemId);
    
    if (inventoryItem) {
      setItem(inventoryItem);
    } else {
      Alert.alert('Error', 'Item not found', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
    
    setLoading(false);
  }, [itemId, inventory]);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(quantity) || parseInt(quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    
    if (adjustmentType === 'decrease' && item && parseInt(quantity) > item.stockLevel) {
      newErrors.quantity = `Quantity cannot exceed current stock (${item.stockLevel})`;
    }
    
    if (!reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // Check if user exists and has an ID
    if (!user) {
      console.error('User object is missing');
      Alert.alert('Error', 'User information is missing. Please log in again.');
      return;
    }
    
    // Get user ID from either id or uid property
    const userId = user.id || user.uid;
    
    if (!userId) {
      console.error('User ID is missing. User object:', JSON.stringify(user));
      Alert.alert('Error', 'User ID is missing. Please log in again.');
      return;
    }
    
    const adjustmentData = {
      id: itemId,
      quantity: adjustmentType === 'increase' ? parseInt(quantity) : -parseInt(quantity),
      reason,
      notes,
      userId: userId
    };
    
    dispatch(adjustInventory(adjustmentData))
      .unwrap()
      .then(() => {
        Alert.alert(
          'Success',
          `Inventory ${adjustmentType === 'increase' ? 'increased' : 'decreased'} successfully`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      })
      .catch(err => {
        console.error('Error adjusting inventory:', err);
        Alert.alert('Error', err.toString());
      });
  };
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading item details...</Text>
      </View>
    );
  }
  
  if (!item) {
    return (
      <View style={styles.centered}>
        <Text>Item not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
          Go Back
        </Button>
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
          <Text style={styles.screenTitle}>Adjust Inventory</Text>
          <Text style={styles.screenSubtitle}>{item.name}</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={styles.formCard}>
            <View style={styles.stockInfoCard}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" />
              <View style={styles.stockInfoContent}>
                <Text style={styles.stockLabel}>Current Stock Level</Text>
                <Text style={[
                  styles.stockValue,
                  { color: item.stockLevel <= (item.minStockLevel || 5) ? '#F44336' : '#4CAF50' }
                ]}>
                  {item.stockLevel}
                </Text>
              </View>
              {item.partId && (
                <Chip mode="outlined" style={styles.idChip}>ID: {item.partId}</Chip>
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.formSection}>
              <MaterialCommunityIcons name="swap-vertical" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Adjustment Type</Text>
            </View>
            
            <RadioButton.Group
              onValueChange={value => setAdjustmentType(value)}
              value={adjustmentType}
            >
              <View style={styles.radioContainer}>
                <View style={styles.radioOption}>
                  <RadioButton 
                    value="increase" 
                    color="#4CAF50"
                  />
                  <Text 
                    onPress={() => setAdjustmentType('increase')}
                    style={styles.radioText}
                  >
                    <MaterialCommunityIcons name="arrow-up-bold" size={16} color="#4CAF50" /> Stock Increase
                  </Text>
                </View>
                <View style={styles.radioOption}>
                  <RadioButton 
                    value="decrease" 
                    color="#F44336"
                  />
                  <Text 
                    onPress={() => setAdjustmentType('decrease')}
                    style={styles.radioText}
                  >
                    <MaterialCommunityIcons name="arrow-down-bold" size={16} color="#F44336" /> Stock Decrease
                  </Text>
                </View>
              </View>
            </RadioButton.Group>
            
            <TextInput
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={!!errors.quantity}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            {errors.quantity && <HelperText type="error">{errors.quantity}</HelperText>}
            
            <TextInput
              label="Reason"
              value={reason}
              onChangeText={setReason}
              mode="outlined"
              style={styles.input}
              error={!!errors.reason}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            {errors.reason && <HelperText type="error">{errors.reason}</HelperText>}
            
            <TextInput
              label="Additional Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
                labelStyle={styles.cancelButtonLabel}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                loading={status === 'loading'}
                disabled={status === 'loading'}
              >
                Submit
              </Button>
            </View>
          </Surface>
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
  keyboardAvoid: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  stockInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  stockInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  stockLabel: {
    fontSize: 14,
    color: '#757575',
  },
  stockValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  idChip: {
    height: 36,
    borderColor: '#2196F3',
  },
  formSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  radioContainer: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioText: {
    fontSize: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  divider: {
    marginVertical: 24,
    backgroundColor: '#e9ecef',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    width: '48%',
    borderRadius: 8,
    borderColor: '#dddddd',
  },
  cancelButtonLabel: {
    color: '#757575',
  },
  submitButton: {
    width: '48%',
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
}); 