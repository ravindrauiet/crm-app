import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, TextInput } from 'react-native';
import app, { auth, db } from '../config/firebase';
import { signInAnonymously, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

const FirebaseDebug = () => {
  const [status, setStatus] = useState('Checking Firebase configuration...');
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkFirebaseConfig();
  }, []);

  const checkFirebaseConfig = () => {
    try {
      // Check Firebase app
      if (!app) {
        setError('Firebase app is not initialized');
        return;
      }

      // Log Firebase config
      const config = app.options;
      setStatus(`Firebase initialized with project: ${config.projectId}`);
      
      // Log the auth and db instances
      console.log('Auth instance:', auth);
      console.log('Firestore instance:', db);
      
    } catch (error) {
      console.error('Firebase config check error:', error);
      setError(error.message);
    }
  };

  const testAnonymousAuth = async () => {
    try {
      setStatus('Testing anonymous auth...');
      setError(null);
      
      await signInAnonymously(auth);
      setIsAuthenticated(true);
      setStatus('Anonymous auth successful');
    } catch (error) {
      console.error('Anonymous auth error:', error);
      setError(`Auth error: ${error.code} - ${error.message}`);
      setIsAuthenticated(false);
    }
  };

  const testSignOut = async () => {
    try {
      setStatus('Signing out...');
      setError(null);
      
      await signOut(auth);
      setIsAuthenticated(false);
      setStatus('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      setError(`Sign out error: ${error.message}`);
    }
  };

  const fetchCollections = async () => {
    try {
      setStatus('Fetching Firestore collections...');
      setError(null);
      setCollections([]);
      
      // Get users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersCount = usersSnapshot.size;
      
      // Get shops collection
      const shopsSnapshot = await getDocs(collection(db, 'shops'));
      const shopsCount = shopsSnapshot.size;
      
      // Get repairs collection
      const repairsSnapshot = await getDocs(collection(db, 'repairs'));
      const repairsCount = repairsSnapshot.size;
      
      setCollections([
        { name: 'users', count: usersCount },
        { name: 'shops', count: shopsCount },
        { name: 'repairs', count: repairsCount }
      ]);
      
      setStatus('Firestore collections fetched successfully');
    } catch (error) {
      console.error('Firestore fetch error:', error);
      setError(`Firestore error: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Firebase Debug</Text>
      
      <View style={styles.card}>
        <Text style={styles.subtitle}>Status</Text>
        <Text style={styles.statusText}>{status}</Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        <Text style={styles.subtitle}>Firebase Config</Text>
        <View style={styles.configContainer}>
          <Text>API Key: {app?.options?.apiKey?.substring(0, 6)}...</Text>
          <Text>Project ID: {app?.options?.projectId}</Text>
          <Text>Storage Bucket: {app?.options?.storageBucket}</Text>
        </View>
        
        <Text style={styles.subtitle}>Authentication</Text>
        <View style={styles.buttonRow}>
          <Button 
            title="Test Anonymous Auth" 
            onPress={testAnonymousAuth} 
          />
          <Button 
            title="Sign Out" 
            onPress={testSignOut}
            disabled={!isAuthenticated}
          />
        </View>
        <Text>Auth Status: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}</Text>
        
        <Text style={styles.subtitle}>Firestore</Text>
        <Button 
          title="Fetch Collections" 
          onPress={fetchCollections} 
        />
        {collections.length > 0 && (
          <View style={styles.collectionList}>
            {collections.map((col, index) => (
              <Text key={index}>
                {col.name}: {col.count} documents
              </Text>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.card}>
        <Button 
          title="Reset Firebase Test" 
          onPress={() => {
            setStatus('Checking Firebase configuration...');
            setError(null);
            setCollections([]);
            setIsAuthenticated(false);
            checkFirebaseConfig();
          }} 
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusText: {
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
  configContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  collectionList: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
});

export default FirebaseDebug; 