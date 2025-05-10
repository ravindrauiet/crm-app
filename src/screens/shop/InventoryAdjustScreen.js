import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, RadioButton, HelperText, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { adjustInventory, useInventory, useInventoryStatus } from '../../store/slices/inventorySlice';

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
    
    const adjustmentData = {
      id: itemId,
      quantity: adjustmentType === 'increase' ? parseInt(quantity) : -parseInt(quantity),
      reason,
      notes,
      userId: user.id
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={styles.formCard}>
            <Text variant="titleLarge" style={styles.title}>Adjust Inventory</Text>
            
            <View style={styles.itemInfo}>
              <Text variant="titleMedium">{item.name}</Text>
              <Text variant="bodyMedium">Current Stock: {item.stockLevel}</Text>
              {item.partId && <Text variant="bodySmall">ID: {item.partId}</Text>}
            </View>
            
            <Divider style={styles.divider} />
            
            <Text variant="titleMedium" style={styles.sectionTitle}>Adjustment Type</Text>
            <RadioButton.Group
              onValueChange={value => setAdjustmentType(value)}
              value={adjustmentType}
            >
              <View style={styles.radioOption}>
                <RadioButton value="increase" />
                <Text onPress={() => setAdjustmentType('increase')}>Stock Increase</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="decrease" />
                <Text onPress={() => setAdjustmentType('decrease')}>Stock Decrease</Text>
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
            />
            {errors.quantity && <HelperText type="error">{errors.quantity}</HelperText>}
            
            <TextInput
              label="Reason"
              value={reason}
              onChangeText={setReason}
              mode="outlined"
              style={styles.input}
              error={!!errors.reason}
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
            />
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.button}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
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
  keyboardAvoid: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    padding: 16,
  },
  formCard: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  itemInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    width: '48%',
  }
}); 