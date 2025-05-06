import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Title, SegmentedButtons } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../../store/slices/authSlice';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(state => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('customer');
  
  // Additional fields for shop owners
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState('');

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      throw new Error("Passwords don't match!");
    }

    try {
      const shopDetails = userType === 'shop_owner' ? {
        name: shopName,
        address,
        phone,
        services: services.split(',').map(service => service.trim()),
      } : null;

      await dispatch(register({ 
        email, 
        password, 
        userType, 
        shopDetails 
      })).unwrap();
      
      // Navigation will be handled by AppNavigator based on auth state
    } catch (error) {
      // Error is already handled by the auth slice
      console.error('Registration error:', error);
    }
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <Title style={styles.title}>Create Account</Title>

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <SegmentedButtons
          value={userType}
          onValueChange={setUserType}
          buttons={[
            { value: 'customer', label: 'Customer' },
            { value: 'shop_owner', label: 'Shop Owner' }
          ]}
          style={styles.segment}
        />
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          autoCapitalize="none"
          style={styles.input}
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />

        {userType === 'shop_owner' && (
          <>
            <TextInput
              label="Shop Name"
              value={shopName}
              onChangeText={setShopName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TextInput
              label="Services (comma-separated)"
              value={services}
              onChangeText={setServices}
              mode="outlined"
              placeholder="e.g., Phone Repair, Screen Replacement"
              style={styles.input}
            />
          </>
        )}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isLoading}
          style={styles.button}
          disabled={!email || !password || !confirmPassword || 
            (userType === 'shop_owner' && (!shopName || !address || !phone || !services))}
        >
          Register
        </Button>

        <View style={styles.footer}>
          <Text>Already have an account? </Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
          >
            Login
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  segment: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
}); 