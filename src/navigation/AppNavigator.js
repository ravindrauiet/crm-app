import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Customer Screens
import CustomerHomeScreen from '../screens/customer/HomeScreen';
import ShopListScreen from '../screens/customer/ShopListScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import RepairStatusScreen from '../screens/customer/RepairStatusScreen';

// Shop Owner Screens
import ShopDashboardScreen from '../screens/shop/DashboardScreen';
import RepairTicketsScreen from '../screens/shop/RepairTicketsScreen';
import CustomerListScreen from '../screens/shop/CustomerListScreen';
import AnalyticsScreen from '../screens/shop/AnalyticsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, userType } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20
          },
          contentStyle: {
            backgroundColor: '#f5f5f5'
          }
        }}
      >
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : userType === 'customer' ? (
          // Customer Stack
          <>
            <Stack.Screen 
              name="CustomerHome" 
              component={CustomerHomeScreen}
              options={{ title: 'Home' }}
            />
            <Stack.Screen 
              name="ShopList" 
              component={ShopListScreen}
              options={{ title: 'Repair Shops' }}
            />
            <Stack.Screen 
              name="Booking" 
              component={BookingScreen}
              options={{ title: 'Book Repair' }}
            />
            <Stack.Screen 
              name="RepairStatus" 
              component={RepairStatusScreen}
              options={{ title: 'Repair Status' }}
            />
          </>
        ) : (
          // Shop Owner Stack
          <>
            <Stack.Screen 
              name="ShopDashboard" 
              component={ShopDashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Stack.Screen 
              name="RepairTickets" 
              component={RepairTicketsScreen}
              options={{ title: 'Repair Tickets' }}
            />
            <Stack.Screen 
              name="CustomerList" 
              component={CustomerListScreen}
              options={{ title: 'Customers' }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{ title: 'Analytics' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 