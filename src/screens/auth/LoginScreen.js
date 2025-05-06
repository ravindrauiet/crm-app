import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Title, SegmentedButtons } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/slices/authSlice';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(state => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserTypeLocal] = useState('customer');

  const handleLogin = async () => {
    try {
      const result = await dispatch(login({ email, password })).unwrap();
      
      // Check if user type matches
      if (result.userType !== userType) {
        throw new Error('Invalid user type selected');
      }
      
      // Navigation will be handled by AppNavigator based on auth state
    } catch (error) {
      // Error is already handled by the auth slice
      console.error('Login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Welcome Back</Title>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
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
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
}); 