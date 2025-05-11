import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Button, useTheme, IconButton, Divider, Switch, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function WorkingHoursScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState({
    monday: { open: '09:00', close: '18:00', isOpen: true },
    tuesday: { open: '09:00', close: '18:00', isOpen: true },
    wednesday: { open: '09:00', close: '18:00', isOpen: true },
    thursday: { open: '09:00', close: '18:00', isOpen: true },
    friday: { open: '09:00', close: '18:00', isOpen: true },
    saturday: { open: '10:00', close: '16:00', isOpen: true },
    sunday: { open: '10:00', close: '16:00', isOpen: false }
  });

  useEffect(() => {
    fetchShopWorkingHours();
  }, []);

  const fetchShopWorkingHours = async () => {
    try {
      setLoading(true);
      
      // Check if user exists
      if (!user) {
        Alert.alert('Error', 'User data not found');
        setLoading(false);
        return;
      }
      
      // First check if shop details are available directly in the user object
      if (user.shopDetails && user.shopDetails.workingHours) {
        console.log('Using working hours from user.shopDetails');
        const shopWorkingHours = user.shopDetails.workingHours;
        
        // Convert the working hours format with isOpen field
        const formattedHours = {};
        
        // Get days from default state
        const days = Object.keys(workingHours);
        
        // Process each day
        days.forEach(day => {
          // Check if the day exists in shop working hours
          const dayData = shopWorkingHours[day] || {};
          
          formattedHours[day] = {
            open: dayData.open || '09:00',
            close: dayData.close || '18:00',
            isOpen: dayData.open !== '' && dayData.close !== ''
          };
        });
        
        setWorkingHours(formattedHours);
        setLoading(false);
        return;
      }
      
      // Fallback to Firestore if shopDetails or workingHours not available
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
        if (shopData && shopData.workingHours) {
          // Convert the working hours format with isOpen field
          const formattedHours = {};
          
          // Get days from default state if not present in data
          const days = Object.keys(workingHours);
          
          // Process each day
          days.forEach(day => {
            const dayData = shopData.workingHours[day] || {};
            formattedHours[day] = {
              open: dayData.open || '09:00',
              close: dayData.close || '18:00',
              isOpen: dayData.open !== '' && dayData.close !== ''
            };
          });
          
          setWorkingHours(formattedHours);
        } else {
          console.log('No working hours found, using defaults');
          // Keep the default working hours
        }
      } else {
        console.log('No shop document found for user:', userId);
        // Keep default working hours
      }
    } catch (error) {
      console.error('Error fetching shop working hours:', error);
      Alert.alert('Error', 'Failed to load working hours');
      // Keep default working hours on error
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleDay = (day) => {
    setWorkingHours(prev => {
      const updated = {
        ...prev,
        [day]: {
          ...prev[day],
          isOpen: !prev[day].isOpen
        }
      };
      
      // If toggling to closed, store the previous times
      if (!updated[day].isOpen) {
        updated[day]._prevOpen = updated[day].open;
        updated[day]._prevClose = updated[day].close;
        updated[day].open = '';
        updated[day].close = '';
      } else {
        // If toggling to open, restore the previous times or set defaults
        updated[day].open = updated[day]._prevOpen || '09:00';
        updated[day].close = updated[day]._prevClose || '18:00';
      }
      
      return updated;
    });
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
      
      // Format data for Firestore (remove temporary fields)
      const formattedHours = {};
      Object.entries(workingHours).forEach(([day, hours]) => {
        formattedHours[day] = {
          open: hours.isOpen ? hours.open : '',
          close: hours.isOpen ? hours.close : ''
        };
      });
      
      // Check if we should update shopDetails in user data or standalone shop document
      if (user.shopDetails) {
        console.log('Updating working hours in user.shopDetails');
        // For updating workingHours within user document
        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
          'shopDetails.workingHours': formattedHours,
          'shopDetails.updatedAt': new Date()
        });
      } else {
        console.log('Updating standalone shop document');
        // For updating standalone shop document
        const shopRef = doc(db, 'shops', userId);
        await updateDoc(shopRef, { 
          workingHours: formattedHours,
          updatedAt: new Date()
        });
      }
      
      Alert.alert('Success', 'Working hours updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating working hours:', error);
      Alert.alert('Error', 'Failed to update working hours');
    } finally {
      setSaving(false);
    }
  };

  const renderDay = (day, label) => {
    const { open, close, isOpen } = workingHours[day];
    
    return (
      <Surface style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <Text variant="titleMedium">{label}</Text>
          <Switch
            value={isOpen}
            onValueChange={() => toggleDay(day)}
            color={theme.colors.primary}
          />
        </View>
        
        {isOpen ? (
          <View style={styles.hoursContainer}>
            <View style={styles.timeInput}>
              <Text variant="bodySmall" style={styles.timeLabel}>Open</Text>
              <TextInput
                value={open}
                onChangeText={(text) => updateDay(day, 'open', text)}
                mode="outlined"
                style={styles.timeField}
                disabled={!isOpen}
                placeholder="09:00"
                keyboardType="default"
              />
            </View>
            
            <Text style={styles.toLabel}>to</Text>
            
            <View style={styles.timeInput}>
              <Text variant="bodySmall" style={styles.timeLabel}>Close</Text>
              <TextInput
                value={close}
                onChangeText={(text) => updateDay(day, 'close', text)}
                mode="outlined"
                style={styles.timeField}
                disabled={!isOpen}
                placeholder="18:00"
                keyboardType="default"
              />
            </View>
          </View>
        ) : (
          <Text style={styles.closedText}>Closed</Text>
        )}
      </Surface>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={28}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall">Working Hours</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.infoCard}>
          <Text variant="bodyMedium">
            Set your shop's working hours. Toggle the switch for each day to mark as open or closed.
          </Text>
        </Surface>
        
        {renderDay('monday', 'Monday')}
        {renderDay('tuesday', 'Tuesday')}
        {renderDay('wednesday', 'Wednesday')}
        {renderDay('thursday', 'Thursday')}
        {renderDay('friday', 'Friday')}
        {renderDay('saturday', 'Saturday')}
        {renderDay('sunday', 'Sunday')}
        
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
            Save Changes
          </Button>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dayCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeInput: {
    flex: 2,
  },
  timeLabel: {
    marginBottom: 4,
    color: '#666',
  },
  timeField: {
    backgroundColor: '#fff',
    height: 48,
  },
  toLabel: {
    flex: 0.5,
    textAlign: 'center',
    color: '#666',
  },
  closedText: {
    marginTop: 8,
    color: '#F44336',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
}); 