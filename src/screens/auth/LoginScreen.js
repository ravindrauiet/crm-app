import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Title, SegmentedButtons } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserTypeLocal] = useState('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get users from storage
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : [];

      // Find user with matching email and password
      const user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (user.userType !== userType) {
        throw new Error('Invalid user type selected');
      }

      // Store logged in user info
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));
      
      // Navigate to appropriate screen based on user type
      navigation.replace(userType === 'customer' ? 'CustomerHome' : 'ShopOwnerHome');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Welcome Back</Title>
      
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

      <SegmentedButtons
        value={userType}
        onValueChange={setUserTypeLocal}
        buttons={[
          { value: 'customer', label: 'Customer' },
          { value: 'shop_owner', label: 'Shop Owner' }
        ]}
        style={styles.segment}
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={isLoading}
        style={styles.button}
      >
        Login
      </Button>

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
        >
          Sign Up
        </Button>
      </View>
    </View>
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
}); 