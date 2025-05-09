import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, Chip, Divider, useTheme, TextInput, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function NewRepairScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    deviceType: '',
    deviceModel: '',
    issueDescription: '',
    selectedServices: [],
    estimatedCost: '',
    estimatedTime: '',
    location: '',
    preferredDate: '',
    notes: ''
  });

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

  const validateForm = () => {
    if (!formData.deviceType.trim()) {
      Alert.alert('Error', 'Please select a device type');
      return false;
    }
    if (!formData.deviceModel.trim()) {
      Alert.alert('Error', 'Please enter your device model');
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
        customerId: user.id,
        customerName: user.name || user.email.split('@')[0],
        deviceType: formData.deviceType,
        deviceModel: formData.deviceModel,
        issueDescription: formData.issueDescription,
        services: formData.selectedServices,
        estimatedCost: formData.estimatedCost,
        estimatedTime: formData.estimatedTime,
        location: formData.location,
        preferredDate: formData.preferredDate,
        notes: formData.notes,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: [],
        timeline: [{
          status: 'pending',
          timestamp: serverTimestamp(),
          description: 'Repair request submitted'
        }]
      });

      setShowConfirmation(true);
    } catch (error) {
      console.error('Error submitting repair request:', error);
      Alert.alert('Error', 'Failed to submit repair request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Device Information</Text>
            <View style={styles.deviceTypesContainer}>
              {commonDeviceTypes.map((type, index) => (
                <Chip
                  key={index}
                  selected={formData.deviceType === type}
                  onPress={() => setFormData({ ...formData, deviceType: type })}
                  style={styles.deviceTypeChip}
                  mode="outlined"
                >
                  {type}
                </Chip>
              ))}
            </View>
            <TextInput
              label="Device Model"
              value={formData.deviceModel}
              onChangeText={(text) => setFormData({ ...formData, deviceModel: text })}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., iPhone 13, Samsung Galaxy S21"
            />
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Issue Description</Text>
            <TextInput
              label="Describe the issue"
              value={formData.issueDescription}
              onChangeText={(text) => setFormData({ ...formData, issueDescription: text })}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="Please provide details about the problem you're experiencing"
            />
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={styles.cardContent}>
            <Text variant="titleMedium">Required Services</Text>
            <View style={styles.servicesContainer}>
              {commonServices.map((service, index) => (
                <Chip
                  key={index}
                  selected={formData.selectedServices.includes(service)}
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
            <Text variant="titleMedium">Additional Details</Text>
            <TextInput
              label="Estimated Cost (optional)"
              value={formData.estimatedCost}
              onChangeText={(text) => setFormData({ ...formData, estimatedCost: text })}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              placeholder="Enter estimated cost"
            />
            <TextInput
              label="Estimated Time (optional)"
              value={formData.estimatedTime}
              onChangeText={(text) => setFormData({ ...formData, estimatedTime: text })}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., 2-3 business days"
            />
            <TextInput
              label="Location (optional)"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              style={styles.input}
              mode="outlined"
              placeholder="Enter your location"
            />
            <TextInput
              label="Preferred Date (optional)"
              value={formData.preferredDate}
              onChangeText={(text) => setFormData({ ...formData, preferredDate: text })}
              style={styles.input}
              mode="outlined"
              placeholder="Enter preferred date for repair"
            />
            <TextInput
              label="Additional Notes (optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Any additional information you'd like to provide"
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
              Your repair request has been submitted successfully. We'll review your request and get back to you soon.
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

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        icon="check"
      >
        Submit Repair Request
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  deviceTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 16,
  },
  deviceTypeChip: {
    margin: 4,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  serviceChip: {
    margin: 4,
  },
  submitButton: {
    margin: 16,
    marginTop: 0,
    paddingVertical: 8,
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
}); 