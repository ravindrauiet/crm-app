import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, useTheme, IconButton, Divider, TextInput, Chip, FAB, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function ServicesScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [currentService, setCurrentService] = useState({ name: '', price: '', description: '', id: null });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchShopServices();
  }, []);

  const fetchShopServices = async () => {
    try {
      setLoading(true);
      
      // Check if user exists
      if (!user) {
        Alert.alert('Error', 'User data not found');
        setLoading(false);
        return;
      }
      
      // First check if shop details are available directly in the user object
      if (user.shopDetails) {
        console.log('Using services from user.shopDetails');
        
        // Check if services exist and are in the expected format
        if (user.shopDetails.services) {
          if (Array.isArray(user.shopDetails.services)) {
            // Convert simple string array to object array if needed
            if (user.shopDetails.services.length > 0 && typeof user.shopDetails.services[0] === 'string') {
              const formattedServices = user.shopDetails.services.map((service, index) => ({
                id: `service-${index}`,
                name: service,
                price: '0',
                description: ''
              }));
              setServices(formattedServices);
            } else {
              // Services are already in object format
              setServices(user.shopDetails.services);
            }
          } else {
            console.warn('Services data is not an array, initializing empty array');
            setServices([]);
          }
        } else {
          console.log('No services found in user.shopDetails, initializing empty array');
          setServices([]);
        }
        
        setLoading(false);
        return;
      }
      
      // Fallback to Firestore if shopDetails not available
      const userId = user?.uid || user?.id;
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        setLoading(false);
        return;
      }
      
      const shopRef = doc(db, 'shops', userId);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        const shopData = shopDoc.data();
        // Check if services exist and are an array, otherwise initialize as empty array
        if (shopData && shopData.services) {
          // Make sure to check if it's an array
          if (Array.isArray(shopData.services)) {
            setServices(shopData.services);
          } else {
            console.warn('Services data is not an array, initializing empty array');
            setServices([]);
          }
        } else {
          console.log('No services found, initializing empty array');
          setServices([]);
        }
      } else {
        console.log('No shop document found for user:', userId);
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching shop services:', error);
      Alert.alert('Error', 'Failed to load services');
      // Initialize with empty array on error
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Get user ID with fallback
      const userId = user?.uid || user?.id;
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        setSaving(false);
        return;
      }
      
      // Check if we should update shopDetails in user data or standalone shop document
      if (user.shopDetails) {
        console.log('Updating services in user.shopDetails');
        // For updating services within user document
        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
          'shopDetails.services': services,
          'shopDetails.updatedAt': new Date()
        });
      } else {
        console.log('Updating standalone shop document');
        // For updating standalone shop document
        const shopRef = doc(db, 'shops', userId);
        await updateDoc(shopRef, { 
          services: services,
          updatedAt: new Date()
        });
      }
      
      Alert.alert('Success', 'Services updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating services:', error);
      Alert.alert('Error', 'Failed to update services');
    } finally {
      setSaving(false);
    }
  };

  const showAddDialog = () => {
    setCurrentService({ name: '', price: '', description: '', id: null });
    setEditMode(false);
    setDialogVisible(true);
  };

  const showEditDialog = (service) => {
    setCurrentService(service);
    setEditMode(true);
    setDialogVisible(true);
  };

  const handleAddService = () => {
    // Validate service
    if (!currentService.name.trim()) {
      Alert.alert('Error', 'Service name is required');
      return;
    }

    if (!currentService.price.trim()) {
      Alert.alert('Error', 'Service price is required');
      return;
    }

    if (editMode) {
      // Update existing service
      setServices(prev => 
        prev.map(s => s.id === currentService.id ? currentService : s)
      );
    } else {
      // Add new service with unique ID
      const newId = Date.now().toString();
      setServices(prev => [...prev, { ...currentService, id: newId }]);
    }
    
    setDialogVisible(false);
  };

  const deleteService = (serviceId) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => setServices(prev => prev.filter(s => s.id !== serviceId)),
          style: 'destructive'
        }
      ]
    );
  };

  const renderServiceItem = (service) => (
    <Surface key={service.id} style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View>
          <Text variant="titleMedium">{service.name}</Text>
          <Text variant="titleSmall" style={styles.servicePrice}>
            ${parseFloat(service.price).toFixed(2)}
          </Text>
        </View>
        <View style={styles.serviceActions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => showEditDialog(service)}
          />
          <IconButton
            icon="delete"
            size={20}
            iconColor="#F44336"
            onPress={() => deleteService(service.id)}
          />
        </View>
      </View>
      
      {service.description && (
        <>
          <Divider style={styles.divider} />
          <Text variant="bodyMedium">{service.description}</Text>
        </>
      )}
    </Surface>
  );

  const renderAddServiceDialog = () => (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
        <Dialog.Title>{editMode ? 'Edit Service' : 'Add New Service'}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Service Name"
            value={currentService.name}
            onChangeText={text => setCurrentService(prev => ({ ...prev, name: text }))}
            style={styles.dialogInput}
          />
          <TextInput
            label="Price ($)"
            value={currentService.price}
            onChangeText={text => setCurrentService(prev => ({ ...prev, price: text }))}
            keyboardType="decimal-pad"
            style={styles.dialogInput}
          />
          <TextInput
            label="Description (optional)"
            value={currentService.description}
            onChangeText={text => setCurrentService(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={3}
            style={styles.dialogInput}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleAddService}>{editMode ? 'Update' : 'Add'}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={28}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall">Manage Services</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.infoCard}>
          <Text variant="bodyMedium">
            Add, edit, or remove repair services that your shop offers. These will be visible to customers browsing your shop.
          </Text>
        </Surface>
        
        {services.length > 0 ? (
          services.map(service => renderServiceItem(service))
        ) : (
          <Surface style={styles.emptyCard}>
            <MaterialCommunityIcons name="tools" size={48} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>No services added yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Tap the + button to add your first service
            </Text>
          </Surface>
        )}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={saving}
            disabled={saving}
          >
            Save Services
          </Button>
        </View>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={showAddDialog}
      />
      
      {renderAddServiceDialog()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    paddingBottom: 80, // Extra space for FAB
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  serviceCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    color: '#2196F3',
    marginTop: 4,
  },
  serviceActions: {
    flexDirection: 'row',
  },
  divider: {
    marginVertical: 12,
  },
  emptyCard: {
    padding: 32,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  dialogInput: {
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
}); 