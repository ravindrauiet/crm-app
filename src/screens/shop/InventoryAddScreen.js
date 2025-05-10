import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { addInventoryItem, useInventoryStatus } from '../../store/slices/inventorySlice';

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
    
    const itemData = {
      ...formData,
      stockLevel: parseInt(formData.stockLevel),
      minStockLevel: formData.minStockLevel ? parseInt(formData.minStockLevel) : 5,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
      userId: user.id,
    };
    
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
        Alert.alert('Error', err.toString());
      });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={styles.formCard}>
            <Text variant="titleLarge" style={styles.title}>Add Inventory Item</Text>
            
            <TextInput
              label="Item Name *"
              value={formData.name}
              onChangeText={(text) => updateFormField('name', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
            {errors.name && <HelperText type="error">{errors.name}</HelperText>}
            
            <TextInput
              label="Part/SKU ID"
              value={formData.partId}
              onChangeText={(text) => updateFormField('partId', text)}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Category"
              value={formData.category}
              onChangeText={(text) => updateFormField('category', text)}
              mode="outlined"
              style={styles.input}
            />
            
            <Divider style={styles.divider} />
            
            <TextInput
              label="Current Stock Level *"
              value={formData.stockLevel}
              onChangeText={(text) => updateFormField('stockLevel', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              error={!!errors.stockLevel}
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
            />
            {errors.unitCost && <HelperText type="error">{errors.unitCost}</HelperText>}
            
            <Divider style={styles.divider} />
            
            <TextInput
              label="Supplier"
              value={formData.supplier}
              onChangeText={(text) => updateFormField('supplier', text)}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Storage Location"
              value={formData.location}
              onChangeText={(text) => updateFormField('location', text)}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) => updateFormField('description', text)}
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
  keyboardAvoid: {
    flex: 1,
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
  input: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
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