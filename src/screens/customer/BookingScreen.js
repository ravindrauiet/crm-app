import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput, Button, Title, Paragraph, SegmentedButtons, Chip, Portal, Modal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addRepair } from '../../store/slices/repairSlice';

export default function BookingScreen({ route, navigation }) {
  const { shopId } = route.params;
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const [shop, setShop] = useState(null);
  const [deviceType, setDeviceType] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchShopDetails();
  }, [shopId]);

  const fetchShopDetails = async () => {
    try {
      // First, try to get shop from Redux store
      const shopsState = useSelector(state => state.shops);
      if (shopsState && shopsState.shops) {
        const shopFromStore = shopsState.shops.find(s => s.id === shopId);
        if (shopFromStore) {
          setShop(shopFromStore);
          return;
        }
      }
      
      // Fallback to AsyncStorage if shop is not in Redux
      const usersJson = await AsyncStorage.getItem('users');
      const users = JSON.parse(usersJson || '[]');
      const shopOwner = users.find(u => u.id === shopId);
      
      if (shopOwner && shopOwner.shopDetails) {
        setShop(shopOwner.shopDetails);
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
    }
  };

  const handleBooking = async () => {
    try {
      setIsLoading(true);

      const repair = {
        id: Date.now().toString(),
        customerId: user.id,
        customerEmail: user.email,
        shopId,
        shopName: shop.name,
        deviceType,
        deviceModel,
        issueDescription,
        services: selectedServices,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedCompletion: null,
        price: null,
      };

      // Get existing repairs or initialize empty array
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      
      // Add new repair
      repairs.push(repair);
      await AsyncStorage.setItem('repairs', JSON.stringify(repairs));
      
      // Dispatch to Redux - this uses repairSlice (singular)
      try {
        dispatch(addRepair(repair));
        console.log('Repair added to Redux store successfully');
      } catch (error) {
        console.error('Error dispatching repair to Redux:', error);
        // Continue anyway since we saved to AsyncStorage
      }
      
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error creating repair ticket:', error);
      alert('Failed to create repair ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfirmationModal = () => (
    <Portal>
      <Modal
        visible={showConfirmation}
        onDismiss={() => {
          setShowConfirmation(false);
          navigation.navigate('CustomerHome');
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Title style={styles.modalTitle}>Booking Confirmed!</Title>
        <Paragraph>Your repair request has been sent to {shop?.name}.</Paragraph>
        <Paragraph>They will review your request and contact you shortly.</Paragraph>
        <Button
          mode="contained"
          onPress={() => {
            setShowConfirmation(false);
            navigation.navigate('CustomerHome');
          }}
          style={styles.modalButton}
        >
          Go to Home
        </Button>
      </Modal>
    </Portal>
  );

  if (!shop) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Book a Repair</Title>
      <Paragraph style={styles.shopName}>{shop.name}</Paragraph>

      <TextInput
        label="Device Type"
        value={deviceType}
        onChangeText={setDeviceType}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Device Model"
        value={deviceModel}
        onChangeText={setDeviceModel}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Issue Description"
        value={issueDescription}
        onChangeText={setIssueDescription}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <Title style={styles.sectionTitle}>Available Services</Title>
      <View style={styles.servicesContainer}>
        {shop.services.map((service, index) => (
          <Chip
            key={index}
            selected={selectedServices.includes(service)}
            onPress={() => {
              if (selectedServices.includes(service)) {
                setSelectedServices(selectedServices.filter(s => s !== service));
              } else {
                setSelectedServices([...selectedServices, service]);
              }
            }}
            style={styles.serviceChip}
          >
            {service}
          </Chip>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={handleBooking}
        loading={isLoading}
        disabled={!deviceType || !deviceModel || !issueDescription || selectedServices.length === 0}
        style={styles.button}
      >
        Book Repair
      </Button>

      {renderConfirmationModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  serviceChip: {
    margin: 4,
  },
  button: {
    marginTop: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 24,
  },
}); 