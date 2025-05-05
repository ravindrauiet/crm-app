import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, Button, Chip, SegmentedButtons, TextInput, Portal, Modal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

export default function RepairTicketsScreen() {
  const user = useSelector(state => state.auth.user);
  const [repairs, setRepairs] = useState([]);
  const [filteredRepairs, setFilteredRepairs] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    fetchRepairs();
  }, []);

  useEffect(() => {
    filterRepairs();
  }, [selectedStatus, searchQuery, repairs]);

  const fetchRepairs = async () => {
    try {
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      // Filter repairs for this shop
      const shopRepairs = allRepairs.filter(repair => repair.shopId === user.id);
      setRepairs(shopRepairs);
    } catch (error) {
      console.error('Error fetching repairs:', error);
    }
  };

  const filterRepairs = () => {
    let filtered = [...repairs];
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(repair => repair.status === selectedStatus);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(repair => 
        repair.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repair.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repair.deviceModel.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredRepairs(filtered);
  };

  const handleUpdateStatus = async (repair, newStatus) => {
    try {
      // Get all repairs
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      // Find and update the repair
      const updatedRepairs = allRepairs.map(r => {
        if (r.id === repair.id) {
          const updateData = { 
            ...r,
            status: newStatus
          };
          
          if (newStatus === 'in_progress' && !r.startedAt) {
            updateData.startedAt = new Date().toISOString();
          } else if (newStatus === 'completed' && !r.completedAt) {
            updateData.completedAt = new Date().toISOString();
          }
          
          return updateData;
        }
        return r;
      });
      
      // Save updated repairs
      await AsyncStorage.setItem('repairs', JSON.stringify(updatedRepairs));
      fetchRepairs();
    } catch (error) {
      console.error('Error updating repair status:', error);
    }
  };

  const handleUpdateRepair = async () => {
    try {
      // Get all repairs
      const repairsJson = await AsyncStorage.getItem('repairs');
      const allRepairs = JSON.parse(repairsJson || '[]');
      
      // Find and update the repair
      const updatedRepairs = allRepairs.map(r => {
        if (r.id === selectedRepair.id) {
          return {
            ...r,
            estimatedCompletion: moment(estimatedCompletion).toISOString(),
            price: parseFloat(price)
          };
        }
        return r;
      });
      
      // Save updated repairs
      await AsyncStorage.setItem('repairs', JSON.stringify(updatedRepairs));
      
      setIsUpdateModalVisible(false);
      fetchRepairs();
    } catch (error) {
      console.error('Error updating repair details:', error);
    }
  };

  const renderUpdateModal = () => (
    <Portal>
      <Modal
        visible={isUpdateModalVisible}
        onDismiss={() => setIsUpdateModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title>Update Repair Details</Title>
        <TextInput
          label="Estimated Completion Date"
          value={estimatedCompletion}
          onChangeText={setEstimatedCompletion}
          mode="outlined"
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />
        <TextInput
          label="Price"
          value={price}
          onChangeText={setPrice}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
        />
        <Button mode="contained" onPress={handleUpdateRepair}>
          Update
        </Button>
      </Modal>
    </Portal>
  );

  return (
    <ScrollView style={styles.container}>
      <TextInput
        placeholder="Search repairs..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        style={styles.searchInput}
      />

      <SegmentedButtons
        value={selectedStatus}
        onValueChange={setSelectedStatus}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' }
        ]}
        style={styles.segmentedButtons}
      />

      {filteredRepairs.map(repair => (
        <Card key={repair.id} style={styles.card}>
          <Card.Content>
            <Title>{repair.deviceType} - {repair.deviceModel}</Title>
            <Paragraph>Customer: {repair.customerEmail}</Paragraph>
            <Paragraph>Status: {repair.status}</Paragraph>
            <View style={styles.services}>
              {repair.services.map((service, index) => (
                <Chip key={index} style={styles.chip}>{service}</Chip>
              ))}
            </View>
            <Paragraph>Issue: {repair.issueDescription}</Paragraph>
            {repair.estimatedCompletion && (
              <Paragraph>
                Estimated Completion: {moment(repair.estimatedCompletion.toDate()).format('MMM DD, YYYY')}
              </Paragraph>
            )}
            {repair.price && (
              <Paragraph>Price: ${repair.price.toFixed(2)}</Paragraph>
            )}
          </Card.Content>
          <Card.Actions>
            {repair.status === 'pending' && (
              <>
                <Button onPress={() => {
                  setSelectedRepair(repair);
                  setEstimatedCompletion('');
                  setPrice('');
                  setIsUpdateModalVisible(true);
                }}>
                  Set Details
                </Button>
                <Button onPress={() => handleUpdateStatus(repair, 'in_progress')}>
                  Start Repair
                </Button>
              </>
            )}
            {repair.status === 'in_progress' && (
              <Button onPress={() => handleUpdateStatus(repair, 'completed')}>
                Mark Completed
              </Button>
            )}
          </Card.Actions>
        </Card>
      ))}

      {renderUpdateModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  chip: {
    margin: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  input: {
    marginBottom: 16,
  },
}); 