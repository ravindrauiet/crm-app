import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import app, { auth, db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const FirebaseTest = () => {
  const [status, setStatus] = useState('Checking Firebase...');
  const [firestoreStatus, setFirestoreStatus] = useState('');
  const [usersCount, setUsersCount] = useState(null);
  const [shopsCount, setShopsCount] = useState(null);

  useEffect(() => {
    checkFirebase();
  }, []);

  const checkFirebase = async () => {
    try {
      if (app) {
        console.log('Firebase app initialized:', app);
        console.log('Firebase config:', app.options);
        setStatus('Firebase initialized successfully');
        
        // Test Firestore connection
        await testFirestore();
      } else {
        setStatus('Firebase app is undefined');
      }
    } catch (error) {
      console.error('Firebase test error:', error);
      setStatus(`Firebase Error: ${error.message}`);
    }
  };

  const testFirestore = async () => {
    try {
      setFirestoreStatus('Testing Firestore...');
      
      // Check users collection
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      setUsersCount(usersSnapshot.size);
      
      // Check shops collection
      const shopsRef = collection(db, 'shops');
      const shopsSnapshot = await getDocs(shopsRef);
      setShopsCount(shopsSnapshot.size);
      
      // Check shop owners
      const shopOwnersRef = query(collection(db, 'users'), where('userType', '==', 'shop_owner'));
      const shopOwnersSnapshot = await getDocs(shopOwnersRef);
      
      setFirestoreStatus('Firestore connected successfully');
      
      console.log('Firebase test results:', {
        usersCount: usersSnapshot.size,
        shopsCount: shopsSnapshot.size,
        shopOwnersCount: shopOwnersSnapshot.size
      });
    } catch (error) {
      console.error('Firestore test error:', error);
      setFirestoreStatus(`Firestore Error: ${error.message}`);
    }
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Firebase Test</Text>
        <Text style={styles.status}>{status}</Text>
        {firestoreStatus && <Text style={styles.status}>{firestoreStatus}</Text>}
        
        {usersCount !== null && (
          <Text style={styles.info}>Users in database: {usersCount}</Text>
        )}
        
        {shopsCount !== null && (
          <Text style={styles.info}>Shops in database: {shopsCount}</Text>
        )}
        
        <Button 
          title="Retry Tests" 
          onPress={checkFirebase} 
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
  }
});

export default FirebaseTest; 