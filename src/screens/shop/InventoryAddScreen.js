import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, Divider, IconButton, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { addInventoryItem, useInventoryStatus } from '../../store/slices/inventorySlice';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InventoryAddScreen({ navigation }) {
  const dispatch = useDispatch();
  const { status, error } = useSelector(useInventoryStatus());
  const user = useSelector(state => state.auth.user);
  
  const [formData, setFormData] = useState({
    name: '',
    partId: '',
    description: '',
    category: '',
    stockLevel: '',
    minStockLevel: '',
    unitCost: '',
    supplier: '',
    location: '',
  });
  
  const [errors, setErrors] = useState({});
  
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
    
    if (!formData.stockLevel.trim()) {
      newErrors.stockLevel = 'Stock level is required';
    } else if (isNaN(formData.stockLevel) || parseInt(formData.stockLevel) < 0) {
      newErrors.stockLevel = 'Stock level must be a positive number';
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
    
    // Log user object for debugging
    console.log('User object:', user);
    
    // Get user ID from either id or uid property
    const userId = user.id || user.uid;
    
    if (!userId) {
      console.error('User ID is missing. User object:', JSON.stringify(user));
      Alert.alert('Error', 'User ID is missing. Please log in again.');
      return;
    }
    
    const itemData = {
      ...formData,
      stockLevel: parseInt(formData.stockLevel),
      minStockLevel: formData.minStockLevel ? parseInt(formData.minStockLevel) : 5,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
      userId: userId,
      createdAt: new Date(),
    };
    
    console.log('Adding inventory item with data:', itemData);
    
    dispatch(addInventoryItem(itemData))
      .unwrap()
      .then(() => {
        Alert.alert(
          'Success',
          'Inventory item added successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      })
      .catch(err => {
        console.error('Error adding inventory item:', err);
        Alert.alert('Error', err.toString());
      });
  };
  
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
          <Text style={styles.screenTitle}>Add Inventory Item</Text>
          <Text style={styles.screenSubtitle}>Enter item details</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={styles.formCard}>
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
              <MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Inventory Details</Text>
            </View>
            
            <TextInput
              label="Current Stock Level *"
              value={formData.stockLevel}
              onChangeText={(text) => updateFormField('stockLevel', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={!!errors.stockLevel}
              outlineColor="#dddddd"
              activeOutlineColor="#2196F3"
            />
            {errors.stockLevel && <HelperText type="error">{errors.stockLevel}</HelperText>}
            
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
                Add Item
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
  }
}); 