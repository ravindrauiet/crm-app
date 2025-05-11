import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { updateInventoryItem, useInventory, useInventoryStatus } from '../../store/slices/inventorySlice';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function InventoryEditScreen({ route, navigation }) {
  const { itemId } = route.params;
  const dispatch = useDispatch();
  const inventory = useSelector(useInventory());
  const { status, error } = useSelector(useInventoryStatus());
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    partId: '',
    description: '',
    category: '',
    minStockLevel: '',
    unitCost: '',
    supplier: '',
    location: '',
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    // Find the item from inventory
    const inventoryItem = inventory.find(i => i.id === itemId);
    
    if (inventoryItem) {
      setItem(inventoryItem);
      setFormData({
        name: inventoryItem.name || '',
        partId: inventoryItem.partId || '',
        description: inventoryItem.description || '',
        category: inventoryItem.category || '',
        minStockLevel: inventoryItem.minStockLevel?.toString() || '',
        unitCost: inventoryItem.unitCost?.toString() || '',
        supplier: inventoryItem.supplier || '',
        location: inventoryItem.location || '',
      });
    } else {
      Alert.alert('Error', 'Item not found', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
    
    setLoading(false);
  }, [itemId, inventory]);
  
  const updateFormField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user edits it
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.minStockLevel.trim() && (isNaN(formData.minStockLevel) || parseInt(formData.minStockLevel) < 0)) {
      newErrors.minStockLevel = 'Min stock level must be a positive number';
    }
    
    if (formData.unitCost.trim() && (isNaN(formData.unitCost) || parseFloat(formData.unitCost) < 0)) {
      newErrors.unitCost = 'Unit cost must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
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
    
    const updatedData = {
      ...formData,
      minStockLevel: formData.minStockLevel ? parseInt(formData.minStockLevel) : 5,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
      updatedBy: userId,
    };
    
    dispatch(updateInventoryItem({ id: itemId, data: updatedData }))
      .unwrap()
      .then(() => {
        Alert.alert(
          'Success',
          'Inventory item updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      })
      .catch(err => {
        console.error('Error updating inventory item:', err);
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
          <Text style={styles.screenTitle}>Edit Inventory Item</Text>
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
              <Button
                mode="contained"
                icon="package-variant-plus"
                onPress={() => navigation.navigate('InventoryAdjust', { itemId: item.id })}
                style={styles.adjustButton}
              >
                Adjust
              </Button>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.formSection}>
              <MaterialCommunityIcons name="information-outline" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            
            <TextInput
              label="Item Name *"
              value={formData.name}
              onChangeText={(text) => updateFormField('name', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            {errors.name && <HelperText type="error">{errors.name}</HelperText>}
            
            <TextInput
              label="Part/SKU ID"
              value={formData.partId}
              onChangeText={(text) => updateFormField('partId', text)}
              mode="outlined"
              style={styles.input}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            
            <TextInput
              label="Category"
              value={formData.category}
              onChangeText={(text) => updateFormField('category', text)}
              mode="outlined"
              style={styles.input}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            
            <Divider style={styles.divider} />
            
            <View style={styles.formSection}>
              <MaterialCommunityIcons name="tag-text-outline" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Inventory Parameters</Text>
            </View>
            
            <TextInput
              label="Minimum Stock Level"
              value={formData.minStockLevel}
              onChangeText={(text) => updateFormField('minStockLevel', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={!!errors.minStockLevel}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            {errors.minStockLevel && <HelperText type="error">{errors.minStockLevel}</HelperText>}
            
            <TextInput
              label="Unit Cost ($)"
              value={formData.unitCost}
              onChangeText={(text) => updateFormField('unitCost', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={!!errors.unitCost}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            {errors.unitCost && <HelperText type="error">{errors.unitCost}</HelperText>}
            
            <Divider style={styles.divider} />
            
            <View style={styles.formSection}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Additional Details</Text>
            </View>
            
            <TextInput
              label="Supplier"
              value={formData.supplier}
              onChangeText={(text) => updateFormField('supplier', text)}
              mode="outlined"
              style={styles.input}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            
            <TextInput
              label="Storage Location"
              value={formData.location}
              onChangeText={(text) => updateFormField('location', text)}
              mode="outlined"
              style={styles.input}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            
            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) => updateFormField('description', text)}
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
                Save Changes
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
  adjustButton: {
    borderRadius: 8,
    backgroundColor: '#2196F3',
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 