import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Searchbar, useTheme, IconButton, Menu, Divider, Portal, Modal, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function CustomerListScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Check if user exists and has a valid ID
      if (!user || !user.id) {
        console.log('User info missing or incomplete', user);
        setLoading(false);
        setCustomers([]);
        return;
      }
      
      const repairsRef = collection(db, 'repairs');
      const q = query(
        repairsRef,
        where('shopId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const repairsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Group repairs by customer
        const customerMap = new Map();
        repairsList.forEach(repair => {
          const customerId = repair.customerId;
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              id: customerId,
              name: repair.customerName,
              phone: repair.customerPhone,
              email: repair.customerEmail,
              totalRepairs: 0,
              lastRepair: null,
              notes: []
            });
          }
          const customer = customerMap.get(customerId);
          customer.totalRepairs++;
          if (!customer.lastRepair || repair.createdAt > customer.lastRepair.createdAt) {
            customer.lastRepair = repair;
          }
        });

        setCustomers(Array.from(customerMap.values()));
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to load customers');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const handleAddNote = async () => {
    if (!selectedCustomer || !note.trim()) return;

    try {
      setUpdating(true);
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      const newNote = {
        text: note.trim(),
        timestamp: Timestamp.now(),
        addedBy: user.id
      };

      await updateDoc(customerRef, {
        notes: [...(selectedCustomer.notes || []), newNote],
        updatedAt: Timestamp.now()
      });

      setNote('');
      setNoteModalVisible(false);
      Alert.alert('Success', 'Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setUpdating(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower)
    );
  });

  const renderCustomerCard = (customer) => (
    <Surface key={customer.id} style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text variant="titleMedium">{customer.name}</Text>
          <Text variant="bodySmall" style={styles.customerSubtitle}>
            {customer.totalRepairs} repairs
          </Text>
        </View>
        <Menu
          visible={menuVisible && selectedCustomer?.id === customer.id}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => {
                setSelectedCustomer(customer);
                setMenuVisible(true);
              }}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setNoteModalVisible(true);
            }}
            title="Add Note"
            leadingIcon="note-plus"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('CustomerDetails', { customerId: customer.id });
            }}
            title="View Details"
            leadingIcon="information"
          />
        </Menu>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.customerDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="phone" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {customer.phone}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="email" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {customer.email}
          </Text>
        </View>
        {customer.lastRepair && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock" size={20} color="#666" />
            <Text variant="bodyMedium" style={styles.detailText}>
              Last repair: {customer.lastRepair.createdAt?.toDate().toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {customer.notes && customer.notes.length > 0 && (
        <View style={styles.notesSection}>
          <Text variant="titleSmall" style={styles.notesTitle}>Latest Note</Text>
          <Text variant="bodySmall" style={styles.noteText}>
            {customer.notes[customer.notes.length - 1].text}
          </Text>
        </View>
      )}
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search customers..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredCustomers.map(renderCustomerCard)}
      </ScrollView>

      <Portal>
        <Modal
          visible={noteModalVisible}
          onDismiss={() => setNoteModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Note</Text>
          <TextInput
            label="Note"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            style={styles.noteInput}
          />
          <Button
            mode="contained"
            onPress={handleAddNote}
            loading={updating}
            disabled={updating || !note.trim()}
            style={styles.noteButton}
          >
            Add Note
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  customerCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerSubtitle: {
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  customerDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#666',
  },
  notesSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesTitle: {
    marginBottom: 4,
  },
  noteText: {
    color: '#666',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  noteInput: {
    marginBottom: 16,
  },
  noteButton: {
    borderRadius: 8,
  },
}); 