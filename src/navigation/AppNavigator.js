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
      <Stack.Navigator>
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : userType === 'customer' ? (
          // Customer Stack
          <>
            <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
            <Stack.Screen name="ShopList" component={ShopListScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="RepairStatus" component={RepairStatusScreen} />
          </>
        ) : (
          // Shop Owner Stack
          <>
            <Stack.Screen name="ShopDashboard" component={ShopDashboardScreen} />
            <Stack.Screen name="RepairTickets" component={RepairTicketsScreen} />
            <Stack.Screen name="CustomerList" component={CustomerListScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 