import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, Chip, useTheme, IconButton, Menu, Divider, Portal, Modal, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function RepairTicketsScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repairs, setRepairs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRepairs();
  }, [filter]);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const repairsRef = collection(db, 'repairs');
      let q = query(
        repairsRef,
        where('shopId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      if (filter !== 'all') {
        q = query(q, where('status', '==', filter));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const repairsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRepairs(repairsList);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching repairs:', error);
      Alert.alert('Error', 'Failed to load repairs');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRepairs();
    setRefreshing(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedRepair) return;

    try {
      setUpdating(true);
      const repairRef = doc(db, 'repairs', selectedRepair.id);
      await updateDoc(repairRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      setStatusModalVisible(false);
      Alert.alert('Success', 'Repair status updated successfully');
    } catch (error) {
      console.error('Error updating repair status:', error);
      Alert.alert('Error', 'Failed to update repair status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedRepair || !note.trim()) return;

    try {
      setUpdating(true);
      const repairRef = doc(db, 'repairs', selectedRepair.id);
      const newNote = {
        text: note.trim(),
        timestamp: Timestamp.now(),
        addedBy: user.id
      };

      await updateDoc(repairRef, {
        notes: [...(selectedRepair.notes || []), newNote],
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'in_progress': return '#1976D2';
      case 'completed': return '#388E3C';
      case 'cancelled': return '#D32F2F';
      default: return '#757575';
    }
  };

  const renderRepairCard = (repair) => (
    <Surface key={repair.id} style={styles.repairCard}>
      <View style={styles.repairHeader}>
        <View style={styles.repairInfo}>
          <Text variant="titleMedium">{repair.deviceType}</Text>
          <Chip
            mode="flat"
            textStyle={{ color: '#fff' }}
            style={[styles.statusChip, { backgroundColor: getStatusColor(repair.status) }]}
          >
            {repair.status.replace('_', ' ')}
          </Chip>
        </View>
        <Menu
          visible={menuVisible && selectedRepair?.id === repair.id}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => {
                setSelectedRepair(repair);
                setMenuVisible(true);
              }}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setStatusModalVisible(true);
            }}
            title="Update Status"
            leadingIcon="update"
          />
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
              navigation.navigate('RepairDetails', { repairId: repair.id });
            }}
            title="View Details"
            leadingIcon="information"
          />
        </Menu>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.repairDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {repair.customerName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="phone" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {repair.customerPhone}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={20} color="#666" />
          <Text variant="bodyMedium" style={styles.detailText}>
            {repair.createdAt?.toDate().toLocaleDateString()}
          </Text>
        </View>
      </View>

      {repair.notes && repair.notes.length > 0 && (
        <View style={styles.notesSection}>
          <Text variant="titleSmall" style={styles.notesTitle}>Latest Note</Text>
          <Text variant="bodySmall" style={styles.noteText}>
            {repair.notes[repair.notes.length - 1].text}
          </Text>
        </View>
      )}
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.filterContainer}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
            style={styles.filterChip}
          >
            Pending
          </Chip>
          <Chip
            selected={filter === 'in_progress'}
            onPress={() => setFilter('in_progress')}
            style={styles.filterChip}
          >
            In Progress
          </Chip>
          <Chip
            selected={filter === 'completed'}
            onPress={() => setFilter('completed')}
            style={styles.filterChip}
          >
            Completed
          </Chip>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {repairs.map(renderRepairCard)}
      </ScrollView>

      <Portal>
        <Modal
          visible={statusModalVisible}
          onDismiss={() => setStatusModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Update Status</Text>
          <View style={styles.statusButtons}>
            <Button
              mode="outlined"
              onPress={() => handleStatusChange('pending')}
              loading={updating}
              disabled={updating}
              style={styles.statusButton}
            >
              Pending
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleStatusChange('in_progress')}
              loading={updating}
              disabled={updating}
              style={styles.statusButton}
            >
              In Progress
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleStatusChange('completed')}
              loading={updating}
              disabled={updating}
              style={styles.statusButton}
            >
              Completed
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleStatusChange('cancelled')}
              loading={updating}
              disabled={updating}
              style={styles.statusButton}
            >
              Cancelled
            </Button>
          </View>
        </Modal>

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
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  repairCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    height: 24,
  },
  divider: {
    marginVertical: 12,
  },
  repairDetails: {
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
  statusButtons: {
    gap: 8,
  },
  statusButton: {
    marginBottom: 8,
  },
  noteInput: {
    marginBottom: 16,
  },
  noteButton: {
    borderRadius: 8,
  },
}); 