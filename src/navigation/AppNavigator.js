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
import DashboardScreen from '../screens/customer/DashboardScreen';
import NewRepairScreen from '../screens/customer/NewRepairScreen';
import CustomerProfileScreen from '../screens/customer/ProfileScreen';
import ShopDetailsScreen from '../screens/customer/ShopDetailsScreen';

// Shop Owner Screens
import ShopDashboardScreen from '../screens/shop/ShopDashboardScreen';
import RepairTicketsScreen from '../screens/shop/RepairTicketsScreen';
import RepairCreateScreen from '../screens/shop/RepairCreateScreen';
import CustomerListScreen from '../screens/shop/CustomerListScreen';
import CustomerDetailsScreen from '../screens/shop/CustomerDetailsScreen';
import AnalyticsScreen from '../screens/shop/AnalyticsScreen';
import ShopProfileScreen from '../screens/shop/ProfileScreen';
import EditShopProfileScreen from '../screens/shop/EditShopProfileScreen';
import WorkingHoursScreen from '../screens/shop/WorkingHoursScreen';
import ServicesScreen from '../screens/shop/ServicesScreen';

// Inventory Screens
import InventoryScreen from '../screens/shop/InventoryScreen';
import InventoryAddScreen from '../screens/shop/InventoryAddScreen';
import InventoryAdjustScreen from '../screens/shop/InventoryAdjustScreen';
import InventoryAuditLogScreen from '../screens/shop/InventoryAuditLogScreen';
import InventoryEditScreen from '../screens/shop/InventoryEditScreen';
import InventorySaleScreen from '../screens/shop/InventorySaleScreen';

// Shared Screens
import RepairDetailsScreen from '../screens/shared/RepairDetailsScreen';
import FirebaseDebug from '../components/FirebaseDebug';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, userType } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? (userType === 'customer' ? 'CustomerHome' : 'ShopDashboard') : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f5f5f5',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
              name="ShopDetails" 
              component={ShopDetailsScreen}
              options={{ title: 'Shop Details' }}
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
            <Stack.Screen 
              name="CustomerDashboard" 
              component={DashboardScreen}
              options={{ title: 'Customer Dashboard' }}
            />
            <Stack.Screen 
              name="NewRepair" 
              component={NewRepairScreen}
              options={{ title: 'New Repair Request' }}
            />
            <Stack.Screen 
              name="CustomerProfile" 
              component={CustomerProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen 
              name="RepairDetails" 
              component={RepairDetailsScreen}
              options={{ title: 'Repair Details' }}
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
              name="RepairCreate" 
              component={RepairCreateScreen}
              options={{ title: 'Create Repair' }}
            />
            <Stack.Screen 
              name="CustomerList" 
              component={CustomerListScreen}
              options={{ title: 'Customers' }}
            />
            <Stack.Screen 
              name="CustomerDetails" 
              component={CustomerDetailsScreen}
              options={{ title: 'Customer Details' }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{ title: 'Analytics' }}
            />
            <Stack.Screen 
              name="ShopProfile" 
              component={ShopProfileScreen}
              options={{ title: 'Shop Profile' }}
            />
            <Stack.Screen 
              name="EditShopProfile" 
              component={EditShopProfileScreen}
              options={{ title: 'Edit Shop Profile' }}
            />
            <Stack.Screen 
              name="WorkingHours" 
              component={WorkingHoursScreen}
              options={{ title: 'Working Hours' }}
            />
            <Stack.Screen 
              name="Services" 
              component={ServicesScreen}
              options={{ title: 'Manage Services' }}
            />
            <Stack.Screen 
              name="RepairDetails" 
              component={RepairDetailsScreen}
              options={{ title: 'Repair Details' }}
            />
            <Stack.Screen 
              name="Inventory" 
              component={InventoryScreen}
              options={{ title: 'Inventory Management' }}
            />
            <Stack.Screen 
              name="InventoryAdd" 
              component={InventoryAddScreen}
              options={{ title: 'Add Inventory Item' }}
            />
            <Stack.Screen 
              name="InventoryAdjust" 
              component={InventoryAdjustScreen}
              options={{ title: 'Adjust Inventory' }}
            />
            <Stack.Screen 
              name="InventoryAuditLog" 
              component={InventoryAuditLogScreen}
              options={{ title: 'Inventory History' }}
            />
            <Stack.Screen 
              name="InventoryEdit" 
              component={InventoryEditScreen}
              options={{ title: 'Edit Inventory Item' }}
            />
            <Stack.Screen 
              name="InventorySale" 
              component={InventorySaleScreen}
              options={{ title: 'Sell Inventory Item' }}
            />
            <Stack.Screen 
              name="FirebaseDebug" 
              component={FirebaseDebug}
              options={{ title: 'Firebase Debug' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 