import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, Chip, Divider, Portal, Modal, TextInput, useTheme, IconButton, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function BookingScreen({ route, navigation }) {
  const { shopId } = route.params;
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deviceType, setDeviceType] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);

  useEffect(() => {
    fetchShopDetails();
  }, [shopId]);

  const fetchShopDetails = async () => {
    try {
      const shopRef = doc(db, 'shops', shopId);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        setShop({ id: shopDoc.id, ...shopDoc.data() });
      } else {
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const validateForm = () => {
    if (!deviceType.trim()) {
      Alert.alert('Error', 'Please enter your device type');
      return false;
    }
    if (!deviceModel.trim()) {
      Alert.alert('Error', 'Please enter your device model');
      return false;
    }
    if (!issueDescription.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return false;
    }
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Create repair request in Firestore
      const repairRef = await addDoc(collection(db, 'repairs'), {
        customerId: user.id,
        customerName: user.name || user.email.split('@')[0],
        shopId,
        shopName: shop.name,
        deviceType,
        deviceModel,
        issueDescription,
        services: selectedServices,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        estimatedCost,
        estimatedTime,
        messages: [],
        timeline: [{
          status: 'pending',
          timestamp: serverTimestamp(),
          description: 'Repair request submitted'
        }]
      });

      // Update shop's repair count
      const shopRef = doc(db, 'shops', shopId);
      await updateDoc(shopRef, {
        totalRepairs: (shop.totalRepairs || 0) + 1,
        pendingRepairs: (shop.pendingRepairs || 0) + 1
      });

      setShowConfirmation(true);
    } catch (error) {
      console.error('Error submitting repair request:', error);
      Alert.alert('Error', 'Failed to submit repair request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>Shop details not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Device Information</Text>
            <TextInput
              label="Device Type"
              value={deviceType}
              onChangeText={setDeviceType}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Device Model"
              value={deviceModel}
              onChangeText={setDeviceModel}
              style={styles.input}
              mode="outlined"
            />
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Issue Description</Text>
            <TextInput
              label="Describe the issue"
              value={issueDescription}
              onChangeText={setIssueDescription}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
            />
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Select Services</Text>
            <View style={styles.servicesContainer}>
              {shop.services?.map((service, index) => (
                <Chip
                  key={index}
                  selected={selectedServices.includes(service)}
                  onPress={() => handleServiceSelect(service)}
                  style={styles.serviceChip}
                  mode="outlined"
                >
                  {service}
                </Chip>
              ))}
            </View>
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Estimated Details</Text>
            <TextInput
              label="Estimated Cost (optional)"
              value={estimatedCost}
              onChangeText={setEstimatedCost}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              placeholder="Enter estimated cost"
            />
            <TextInput
              label="Estimated Time (optional)"
              value={estimatedTime}
              onChangeText={setEstimatedTime}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., 2-3 business days"
            />
          </View>
        </Surface>
      </ScrollView>

      <Portal>
        <Modal
          visible={showConfirmation}
          onDismiss={() => {
            setShowConfirmation(false);
            navigation.navigate('RepairStatus');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.modalTitle}>Repair Request Submitted!</Text>
            <Text style={styles.modalText}>
              Your repair request has been submitted successfully. The shop will review your request and get back to you soon.
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                setShowConfirmation(false);
                navigation.navigate('RepairStatus');
              }}
              style={styles.modalButton}
            >
              View Status
            </Button>
          </View>
        </Modal>
      </Portal>

      <FAB
        style={styles.fab}
        icon="check"
        label="Submit Request"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        color="#fff"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 18,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  input: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  serviceChip: {
    margin: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  modalButton: {
    width: '100%',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
    borderRadius: 28,
    elevation: 6,
  },
}); 