import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Linking } from 'react-native';
import { Text, Card, Button, useTheme, Divider, Chip, Portal, Modal, TextInput, ActivityIndicator, FAB, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import StatusTimeline from '../../components/StatusTimeline';

const RepairDetailsScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { repairId } = route.params;
  const user = useSelector(state => state.auth.user);
  const userType = user?.userType;

  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [statusUpdateVisible, setStatusUpdateVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [price, setPrice] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);

  useEffect(() => {
    fetchRepairDetails();
  }, [repairId]);

  const fetchRepairDetails = async () => {
    try {
      setLoading(true);
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      const foundRepair = repairs.find(r => r.id === repairId);
      
      if (foundRepair) {
        setRepair(foundRepair);
        
        // Fetch additional information based on user type
        if (userType === 'shop') {
          fetchCustomerInfo(foundRepair.customerId);
        } else if (userType === 'customer') {
          fetchShopInfo(foundRepair.shopId);
        }
        
        // Mark all messages as read
        markMessagesAsRead(foundRepair, repairs);
      } else {
        Alert.alert('Error', 'Repair details not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching repair details:', error);
      Alert.alert('Error', 'Failed to load repair details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerInfo = async (customerId) => {
    if (!customerId) return;
    
    try {
      const usersJson = await AsyncStorage.getItem('users');
      const users = JSON.parse(usersJson || '[]');
      const customer = users.find(u => u.id === customerId);
      
      if (customer) {
        setCustomerInfo(customer);
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const fetchShopInfo = async (shopId) => {
    if (!shopId) return;
    
    try {
      const usersJson = await AsyncStorage.getItem('users');
      const users = JSON.parse(usersJson || '[]');
      const shop = users.find(u => u.id === shopId);
      
      if (shop) {
        setShopInfo(shop);
      }
    } catch (error) {
      console.error('Error fetching shop info:', error);
    }
  };

  const markMessagesAsRead = async (currentRepair, allRepairs) => {
    if (!currentRepair.messages || userType === 'customer' && !currentRepair.messages.some(m => m.sender === 'shop' && !m.read)) {
      return;
    }
    
    try {
      // Mark messages as read based on user type
      const updatedRepairs = allRepairs.map(r => {
        if (r.id === repairId) {
          const updatedMessages = r.messages.map(m => {
            if ((userType === 'shop' && m.sender === 'customer') || 
                (userType === 'customer' && m.sender === 'shop')) {
              return { ...m, read: true };
            }
            return m;
          });
          
          return { ...r, messages: updatedMessages };
        }
        return r;
      });
      
      await AsyncStorage.setItem('repairs', JSON.stringify(updatedRepairs));
      
      // Update local state
      const updatedRepair = updatedRepairs.find(r => r.id === repairId);
      setRepair(updatedRepair);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      // Get existing repairs
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      
      // Find the repair to update
      const updatedRepairs = repairs.map(r => {
        if (r.id === repairId) {
          // Initialize messages array if it doesn't exist
          const messages = r.messages || [];
          
          // Add new message
          const newMessage = {
            id: Date.now().toString(),
            text: message,
            sender: userType,
            senderName: user.name || user.email,
            timestamp: new Date().toISOString(),
            read: false
          };
          
          return {
            ...r,
            messages: [...messages, newMessage]
          };
        }
        return r;
      });
      
      // Save updated repairs
      await AsyncStorage.setItem('repairs', JSON.stringify(updatedRepairs));
      
      // Update local state
      setRepair(updatedRepairs.find(r => r.id === repairId));
      setMessage('');
      setMessageModalVisible(false);
      
      Alert.alert('Success', 'Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const updateRepairStatus = async () => {
    if (!newStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    try {
      // Get existing repairs
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      
      // Find the repair to update
      const updatedRepairs = repairs.map(r => {
        if (r.id === repairId) {
          // Add status update to history
          const statusUpdates = r.statusUpdates || [];
          const update = {
            status: newStatus,
            timestamp: new Date().toISOString(),
            updatedBy: user.name || user.email
          };
          
          return {
            ...r,
            status: newStatus,
            estimatedCompletion: estimatedCompletion || r.estimatedCompletion,
            price: price || r.price,
            statusUpdates: [...statusUpdates, update]
          };
        }
        return r;
      });
      
      // Save updated repairs
      await AsyncStorage.setItem('repairs', JSON.stringify(updatedRepairs));
      
      // Update local state
      setRepair(updatedRepairs.find(r => r.id === repairId));
      setNewStatus('');
      setEstimatedCompletion('');
      setPrice('');
      setStatusUpdateVisible(false);
      
      Alert.alert('Success', 'Repair status updated successfully');
    } catch (error) {
      console.error('Error updating repair status:', error);
      Alert.alert('Error', 'Failed to update repair status');
    }
  };

  const handleContact = (type, value) => {
    if (!value) return;
    
    switch (type) {
      case 'phone':
        Linking.openURL(`tel:${value}`);
        break;
      case 'email':
        Linking.openURL(`mailto:${value}`);
        break;
      default:
        break;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    return formatDate(dateString);
  };

  const renderStatusChip = (status) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'pending':
          return '#FF9800';
        case 'in progress':
          return '#2196F3';
        case 'completed':
          return '#4CAF50';
        case 'cancelled':
          return '#F44336';
        case 'waiting for parts':
          return '#9C27B0';
        default:
          return '#757575';
      }
    };

    return (
      <Chip
        mode="outlined"
        style={[styles.statusChip, { borderColor: getStatusColor(status) }]}
        textStyle={{ color: getStatusColor(status) }}
      >
        {status || 'Unknown'}
      </Chip>
    );
  };

  const renderMessageModal = () => (
    <Portal>
      <Modal
        visible={messageModalVisible}
        onDismiss={() => setMessageModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>Send Message</Text>
        <TextInput
          label="Message"
          value={message}
          onChangeText={setMessage}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.modalInput}
        />
        <View style={styles.modalButtons}>
          <Button
            mode="text"
            onPress={() => setMessageModalVisible(false)}
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSendMessage}
            style={styles.modalButton}
          >
            Send
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  const renderStatusUpdateModal = () => (
    <Portal>
      <Modal
        visible={statusUpdateVisible}
        onDismiss={() => setStatusUpdateVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>Update Repair Status</Text>
        <Text variant="bodyMedium" style={styles.modalSubtitle}>Current status: {repair?.status}</Text>
        <View style={styles.statusButtons}>
          {['Pending', 'In Progress', 'Waiting for Parts', 'Testing', 'Completed', 'Cancelled'].map((status) => (
            <Chip
              key={status}
              selected={newStatus === status}
              onPress={() => setNewStatus(status)}
              style={styles.statusOption}
              selectedColor="#fff"
              selectedBackgroundColor={
                status === 'Completed' ? '#4CAF50' : 
                status === 'Cancelled' ? '#F44336' : 
                theme.colors.primary
              }
            >
              {status}
            </Chip>
          ))}
        </View>
        <TextInput
          label="Estimated Completion Date (YYYY-MM-DD)"
          value={estimatedCompletion}
          onChangeText={setEstimatedCompletion}
          mode="outlined"
          style={styles.modalInput}
        />
        <TextInput
          label="Price ($)"
          value={price}
          onChangeText={setPrice}
          mode="outlined"
          style={styles.modalInput}
          keyboardType="numeric"
        />
        <View style={styles.modalButtons}>
          <Button
            mode="text"
            onPress={() => setStatusUpdateVisible(false)}
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={updateRepairStatus}
            style={styles.modalButton}
          >
            Update
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Loading repair details...</Text>
      </View>
    );
  }

  if (!repair) {
    return (
      <View style={styles.centerContainer}>
        <Text>No repair details found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.header}>
              <View>
                <Text variant="headlineMedium">{repair.deviceType} {repair.deviceModel}</Text>
                <Text variant="bodyMedium">Repair ID: #{repairId.substring(0, 8)}</Text>
              </View>
              {renderStatusChip(repair.status)}
            </View>
            
            <View style={styles.priceContainer}>
              {repair.price ? (
                <Text variant="titleLarge" style={styles.price}>${repair.price}</Text>
              ) : (
                <Text variant="bodyMedium" style={styles.noPriceText}>No price set</Text>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              <MaterialCommunityIcons name="progress-clock" size={20} color={theme.colors.primary} /> Status Timeline
            </Text>
            <StatusTimeline 
              currentStatus={repair.status}
              statusUpdates={repair.statusUpdates}
              estimatedCompletion={repair.estimatedCompletion}
            />
          </Card.Content>
        </Card>

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} /> Repair Information
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Issue:</Text>
              <Text variant="bodyMedium">{repair.issueDescription}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Services:</Text>
              <View style={styles.servicesContainer}>
                {repair.services?.map((service, index) => (
                  <Chip key={index} style={styles.serviceChip} compact>
                    {service}
                  </Chip>
                ))}
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Created On:</Text>
              <Text variant="bodyMedium">{formatDate(repair.createdAt)}</Text>
            </View>
            {repair.estimatedCompletion && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>Est. Completion:</Text>
                <Text variant="bodyMedium">{formatDate(repair.estimatedCompletion)}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {userType === 'shop' && customerInfo && (
          <Card style={styles.section}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} /> Customer Information
              </Text>
              <View style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text variant="titleSmall">{customerInfo.name || "Customer"}</Text>
                  <Text variant="bodyMedium">{repair.customerEmail}</Text>
                  {customerInfo.phone && (
                    <Text variant="bodyMedium">{customerInfo.phone}</Text>
                  )}
                </View>
                <View style={styles.contactButtons}>
                  <IconButton 
                    icon="email" 
                    mode="contained" 
                    containerColor={theme.colors.primary} 
                    iconColor="#fff"
                    size={20}
                    onPress={() => handleContact('email', repair.customerEmail)}
                  />
                  {customerInfo.phone && (
                    <IconButton 
                      icon="phone" 
                      mode="contained" 
                      containerColor="#4CAF50" 
                      iconColor="#fff"
                      size={20}
                      onPress={() => handleContact('phone', customerInfo.phone)}
                    />
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {userType === 'customer' && shopInfo && (
          <Card style={styles.section}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                <MaterialCommunityIcons name="store" size={20} color={theme.colors.primary} /> Shop Information
              </Text>
              <View style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text variant="titleSmall">{repair.shopName}</Text>
                  {shopInfo.email && (
                    <Text variant="bodyMedium">{shopInfo.email}</Text>
                  )}
                  {shopInfo.shopDetails?.phone && (
                    <Text variant="bodyMedium">{shopInfo.shopDetails.phone}</Text>
                  )}
                  {shopInfo.shopDetails?.address && (
                    <Text variant="bodyMedium" numberOfLines={2}>
                      {shopInfo.shopDetails.address}
                    </Text>
                  )}
                </View>
                <View style={styles.contactButtons}>
                  {shopInfo.email && (
                    <IconButton 
                      icon="email" 
                      mode="contained" 
                      containerColor={theme.colors.primary} 
                      iconColor="#fff"
                      size={20}
                      onPress={() => handleContact('email', shopInfo.email)}
                    />
                  )}
                  {shopInfo.shopDetails?.phone && (
                    <IconButton 
                      icon="phone" 
                      mode="contained" 
                      containerColor="#4CAF50" 
                      iconColor="#fff"
                      size={20}
                      onPress={() => handleContact('phone', shopInfo.shopDetails.phone)}
                    />
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {repair.messages && repair.messages.length > 0 && (
          <Card style={styles.section}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                <MaterialCommunityIcons name="message-text" size={20} color={theme.colors.primary} /> Messages
              </Text>
              {repair.messages.map((msg, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.messageItem, 
                    msg.sender === userType ? styles.sentMessage : styles.receivedMessage
                  ]}
                >
                  <Surface style={[
                    styles.messageContent,
                    msg.sender === userType ? styles.sentMessageBubble : styles.receivedMessageBubble
                  ]}>
                    <Text variant="bodyMedium">{msg.text}</Text>
                    <View style={styles.messageFooter}>
                      <Text variant="bodySmall">{formatTimeAgo(msg.timestamp)}</Text>
                      <Text variant="bodySmall">{msg.senderName}</Text>
                    </View>
                  </Surface>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="message"
            onPress={() => setMessageModalVisible(true)}
            style={styles.button}
          >
            Send Message
          </Button>

          {userType === 'shop' && (
            <Button
              mode="outlined"
              icon="update"
              onPress={() => setStatusUpdateVisible(true)}
              style={styles.button}
            >
              Update Status
            </Button>
          )}
        </View>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="message-plus"
        onPress={() => setMessageModalVisible(true)}
      />
      
      {renderMessageModal()}
      {renderStatusUpdateModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceContainer: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  price: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  noPriceText: {
    color: '#757575',
    fontStyle: 'italic',
  },
  section: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  label: {
    width: 120,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 32,
  },
  servicesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    margin: 2,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactButtons: {
    flexDirection: 'row',
  },
  messageItem: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  sentMessageBubble: {
    backgroundColor: '#E3F2FD',
    borderBottomRightRadius: 4,
    elevation: 1,
  },
  receivedMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  actions: {
    padding: 20,
  },
  button: {
    marginBottom: 10,
    borderRadius: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginBottom: 15,
    color: '#757575',
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 10,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    justifyContent: 'center',
  },
  statusOption: {
    margin: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default RepairDetailsScreen; 