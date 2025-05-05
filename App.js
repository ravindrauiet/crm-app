import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { checkAuth } from './src/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createTestUser = async () => {
  try {
    // Check if test user already exists
    const usersJson = await AsyncStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];
    
    if (users.length === 0) {
      // Create test users
      const testUsers = [
        {
          id: '1',
          email: 'customer@test.com',
          password: 'password123',
          userType: 'customer'
        },
        {
          id: '2',
          email: 'shop@test.com',
          password: 'password123',
          userType: 'shop_owner',
          shopDetails: {
            name: 'Test Repair Shop',
            address: '123 Test Street',
            phone: '123-456-7890',
            services: ['Phone Repair', 'Screen Replacement'],
            rating: 0,
            totalRatings: 0
          }
        }
      ];
      
      await AsyncStorage.setItem('users', JSON.stringify(testUsers));
      console.log('Test users created');
    }
  } catch (error) {
    console.error('Error creating test users:', error);
  }
};

export default function App() {
  useEffect(() => {
    createTestUser();
    store.dispatch(checkAuth());
  }, []);

  return (
    <StoreProvider store={store}>
      <PaperProvider>
        <AppNavigator />
      </PaperProvider>
    </StoreProvider>
  );
}
