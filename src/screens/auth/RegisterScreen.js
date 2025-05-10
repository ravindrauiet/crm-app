import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, IconButton, HelperText, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { register } from '../../store/slices/authSlice';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const userData = {
        name: formData.name,
        phone: formData.phone,
      };
      
      // Register user using the auth slice thunk
      const result = await dispatch(register({
        email: formData.email,
        password: formData.password,
        userType: userType,
        userData: userData
      })).unwrap();

      Alert.alert('Success', 'Account created successfully');
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to create account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Surface style={styles.formContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text variant="headlineMedium" style={styles.title}>
                Create Account
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Sign up to get started
              </Text>
            </View>

            <SegmentedButtons
              value={userType}
              onValueChange={setUserType}
              buttons={[
                { value: 'customer', label: 'Customer' },
                { value: 'shop_owner', label: 'Shop Owner' }
              ]}
              style={styles.segment}
            />

            <View style={styles.inputContainer}>
              <TextInput
                label="Full Name"
                value={formData.name}
                onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
                error={!!errors.name}
                style={styles.input}
              />
              <HelperText type="error" visible={!!errors.name}>
                {errors.name}
              </HelperText>

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={text => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={!!errors.email}
                style={styles.input}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>

              <TextInput
                label="Phone"
                value={formData.phone}
                onChangeText={text => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                error={!!errors.phone}
                style={styles.input}
              />
              <HelperText type="error" visible={!!errors.phone}>
                {errors.phone}
              </HelperText>

              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={text => setFormData(prev => ({ ...prev, password: text }))}
                secureTextEntry={!showPassword}
                error={!!errors.password}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              <TextInput
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={text => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry={!showPassword}
                error={!!errors.confirmPassword}
                style={styles.input}
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
            >
              Create Account
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
            >
              Already have an account? Sign In
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  segment: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  registerButton: {
    marginBottom: 16,
    borderRadius: 8,
  },
  loginButton: {
    marginTop: 8,
  },
}); 