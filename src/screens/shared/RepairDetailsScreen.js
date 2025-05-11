import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Linking } from 'react-native';
import { Text, Card, Button, useTheme, Divider, Chip, Portal, Modal, TextInput, ActivityIndicator, FAB, IconButton, Surface, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import StatusTimeline from '../../components/StatusTimeline';

const RepairDetailsScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { repairId, repair: initialRepair } = route.params;
  const user = useSelector(state => state.auth.user);
  const userType = useSelector(state => state.auth.userType);

  const [repair, setRepair] = useState(initialRepair || null);
  const [loading, setLoading] = useState(!initialRepair);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [statusUpdateVisible, setStatusUpdateVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [price, setPrice] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);

  useEffect(() => {
    if (!repair) {
      fetchRepairDetails();
    } else if (userType === 'shop') {
      fetchCustomerInfo(repair.customerId);
    } else if (userType === 'customer') {
      fetchShopInfo(repair.shopId);
    }
  }, [repairId, repair]);

  const fetchRepairDetails = async () => {
    if (!repairId) {
      Alert.alert('Error', 'Repair ID is missing');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const repairRef = doc(db, 'repairs', repairId);
      const repairDoc = await getDoc(repairRef);
      
      if (repairDoc.exists()) {
        const repairData = { 
          id: repairDoc.id, 
          ...repairDoc.data() 
        };
        console.log('Repair data loaded:', repairData);
        console.log('Customer info in repair:', {
          customerId: repairData.customerId,
          customerName: repairData.customerName,
          customerEmail: repairData.customerEmail,
          customerPhone: repairData.customerPhone
        });
        
        setRepair(repairData);
        
        // Fetch additional information based on user type
        if (userType === 'shop') {
          fetchCustomerInfo(repairData.customerId);
        } else if (userType === 'customer') {
          fetchShopInfo(repairData.shopId);
        }
      } else {
        console.error('Repair not found with ID:', repairId);
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
    if (!customerId) {
      console.warn('Customer ID is missing, cannot fetch customer info');
      return;
    }
    
    try {
      console.log('Fetching customer info for ID:', customerId);
      const customerRef = doc(db, 'users', customerId);
      const customerDoc = await getDoc(customerRef);
      
      if (customerDoc.exists()) {
        const customerData = {
          id: customerDoc.id,
          ...customerDoc.data()
        };
        console.log('Customer data loaded:', customerData);
        setCustomerInfo(customerData);
      } else {
        console.warn('Customer document not found for ID:', customerId);
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const fetchShopInfo = async (shopId) => {
    if (!shopId) return;
    
    try {
      const shopRef = doc(db, 'shops', shopId);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        setShopInfo({
          id: shopDoc.id,
          ...shopDoc.data()
        });
      }
    } catch (error) {
      console.error('Error fetching shop info:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      const repairRef = doc(db, 'repairs', repairId);
      const repairDoc = await getDoc(repairRef);
      
      if (!repairDoc.exists()) {
        Alert.alert('Error', 'Repair not found');
        return;
      }
      
      const repairData = repairDoc.data();
      const messages = repairData.messages || [];
      
      // Add new message
      const newMessage = {
        id: Date.now().toString(),
        text: message,
        sender: userType,
        senderName: user.name || user.email,
        timestamp: new Date(),
        read: false
      };
      
      await updateDoc(repairRef, {
        messages: [...messages, newMessage],
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setRepair({
        ...repair,
        messages: [...(repair.messages || []), newMessage]
      });
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
      const repairRef = doc(db, 'repairs', repairId);
      
      const timeline = [
        ...(repair.timeline || []),
        {
          status: newStatus,
          timestamp: new Date(),
          description: `Status updated to ${newStatus.replace('_', ' ')}`
        }
      ];
      
      const updateData = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        timeline
      };
      
      if (estimatedCompletion) {
        updateData.estimatedTime = estimatedCompletion;
      }
      
      if (price) {
        updateData.estimatedCost = price;
      }
      
      await updateDoc(repairRef, updateData);
      
      // Update local state
      setRepair({
        ...repair,
        status: newStatus,
        estimatedTime: estimatedCompletion || repair.estimatedTime,
        estimatedCost: price || repair.estimatedCost,
        timeline
      });
      
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

  const formatDate = (dateTime) => {
    if (!dateTime) return 'Not set';
    
    try {
      // Handle Firestore Timestamp
      if (dateTime.toDate && typeof dateTime.toDate === 'function') {
        return new Date(dateTime.toDate()).toLocaleDateString();
      }
      
      // Handle Date objects
      if (dateTime instanceof Date) {
        return dateTime.toLocaleDateString();
      }
      
      // Handle string dates
      if (typeof dateTime === 'string') {
        return new Date(dateTime).toLocaleDateString();
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  const formatTimeAgo = (dateTime) => {
    if (!dateTime) return '';
    
    try {
      let date;
      
      // Handle Firestore Timestamp
      if (dateTime.toDate && typeof dateTime.toDate === 'function') {
        date = dateTime.toDate();
      } else if (dateTime instanceof Date) {
        date = dateTime;
      } else if (typeof dateTime === 'string') {
        date = new Date(dateTime);
      } else {
        return '';
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay < 30) return `${diffDay}d ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  // Move getStatusColor function outside of renderStatusChip
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'in_progress': return '#1976D2';
      case 'completed': return '#388E3C';
      case 'cancelled': return '#D32F2F';
      default: return '#757575';
    }
  };

  const renderStatusChip = (status) => {
    return (
      <Chip
        mode="flat"
        textStyle={{ color: 'white' }}
        style={[styles.statusChip, { backgroundColor: getStatusColor(status) }]}
      >
        {(status || 'pending').replace('_', ' ')}
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
        <Text style={styles.modalTitle}>Send Message</Text>
        <TextInput
          label="Message"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          style={styles.messageInput}
          mode="outlined"
        />
        <View style={styles.modalActions}>
          <Button 
            mode="text" 
            onPress={() => setMessageModalVisible(false)}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSendMessage}
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
        <Text style={styles.modalTitle}>Update Repair Status</Text>
        
        <Text style={styles.inputLabel}>Status</Text>
        <View style={styles.statusOptions}>
          <Button
            mode={newStatus === 'pending' ? 'contained' : 'outlined'}
            onPress={() => setNewStatus('pending')}
            style={styles.statusButton}
          >
            Pending
          </Button>
          <Button
            mode={newStatus === 'in_progress' ? 'contained' : 'outlined'}
            onPress={() => setNewStatus('in_progress')}
            style={styles.statusButton}
          >
            In Progress
          </Button>
          <Button
            mode={newStatus === 'completed' ? 'contained' : 'outlined'}
            onPress={() => setNewStatus('completed')}
            style={styles.statusButton}
          >
            Completed
          </Button>
          <Button
            mode={newStatus === 'cancelled' ? 'contained' : 'outlined'}
            onPress={() => setNewStatus('cancelled')}
            style={styles.statusButton}
          >
            Cancelled
          </Button>
        </View>
        
        <TextInput
          label="Estimated Completion (e.g., 3 days)"
          value={estimatedCompletion}
          onChangeText={setEstimatedCompletion}
          style={styles.textInput}
          mode="outlined"
        />
        
        <TextInput
          label="Price ($)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={styles.textInput}
          mode="outlined"
        />
        
        <View style={styles.modalActions}>
          <Button 
            mode="text" 
            onPress={() => setStatusUpdateVisible(false)}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={updateRepairStatus}
          >
            Update
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading repair details...</Text>
      </View>
    );
  }

  if (!repair) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color={theme.colors.error} />
        <Text style={styles.errorText}>Repair not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Details Card */}
        <Surface style={styles.card}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.deviceType}>{repair.deviceType || 'Unknown Device'}</Text>
              <Text style={styles.deviceModel}>{repair.deviceModel || 'No model specified'}</Text>
            </View>
            <View style={styles.headerRight}>
              {renderStatusChip(repair.status)}
            </View>
          </View>

          <Divider style={styles.divider} />
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={20} color="#2196F3" />
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(repair.createdAt)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#2196F3" />
              <Text style={styles.detailLabel}>Est. Time:</Text>
              <Text style={styles.detailValue}>{repair.estimatedTime || 'Not specified'} days</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="currency-usd" size={20} color="#2196F3" />
              <Text style={styles.detailLabel}>Est. Cost:</Text>
              <Text style={styles.detailValue}>
                ${typeof repair.estimatedCost === 'number' ? repair.estimatedCost.toFixed(2) : repair.estimatedCost || '0.00'}
              </Text>
            </View>
          </View>
        </Surface>
        
        {/* Customer Card */}
        <Surface style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account" size={24} color="#2196F3" />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.customerContainer}>
            <View style={styles.customerAvatarSection}>
              <Avatar.Text 
                size={60} 
                label={((repair.customerName || customerInfo?.name || 'C').substring(0, 1)).toUpperCase()} 
                style={styles.customerAvatar}
              />
              <Text style={styles.customerName}>{repair.customerName || customerInfo?.name || 'Unknown Customer'}</Text>
              <Text style={styles.customerEmail}>{repair.customerEmail || customerInfo?.email || 'No email provided'}</Text>
            </View>
            
            <View style={styles.customerDetails}>
              {repair.customerPhone && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="phone" size={20} color="#2196F3" />
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{repair.customerPhone}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.contactActions}>
              {repair.customerPhone && (
                <Button 
                  mode="contained" 
                  icon="phone" 
                  onPress={() => handleContact('phone', repair.customerPhone)}
                  style={styles.contactButton}
                >
                  Call
                </Button>
              )}
              {repair.customerEmail && (
                <Button 
                  mode="contained" 
                  icon="email" 
                  onPress={() => handleContact('email', repair.customerEmail)}
                  style={styles.contactButton}
                >
                  Email
                </Button>
              )}
            </View>
          </View>
        </Surface>
        
        {/* Issue Description Card */}
        <Surface style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
            <Text style={styles.sectionTitle}>Issue Description</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.description}>
            {repair.issueDescription || 'No description provided'}
          </Text>
        </Surface>
        
        {/* Services Card */}
        {repair.services && repair.services.length > 0 && (
          <Surface style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="wrench" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Services</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.servicesContainer}>
              {repair.services.map((service, index) => (
                <Chip 
                  key={index} 
                  style={styles.serviceChip}
                  mode="outlined"
                  icon="check"
                >
                  {service}
                </Chip>
              ))}
            </View>
          </Surface>
        )}
        
        {/* Parts Used Card */}
        {repair.partsUsed && repair.partsUsed.length > 0 && (
          <Surface style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Parts Used</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            {repair.partsUsed.map((part, index) => (
              <View key={index} style={styles.partItem}>
                <Text style={styles.partName}>{part.name}</Text>
                <View style={styles.partDetails}>
                  <Text style={styles.partQuantity}>Qty: {part.quantity}</Text>
                  <Text style={styles.partCost}>
                    ${typeof part.unitCost === 'number' ? part.unitCost.toFixed(2) : part.unitCost || '0.00'} each
                  </Text>
                </View>
              </View>
            ))}
            
            <Divider style={styles.lightDivider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Parts Cost:</Text>
              <Text style={styles.totalCost}>
                ${repair.partsUsed.reduce((total, part) => total + (part.unitCost || 0) * (part.quantity || 1), 0).toFixed(2)}
              </Text>
            </View>
          </Surface>
        )}
        
        {/* Timeline Card */}
        {repair.timeline && repair.timeline.length > 0 && (
          <Surface style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="timeline" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Repair Timeline</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            {repair.timeline.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(event.status) }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{event.status.replace('_', ' ')}</Text>
                  <Text style={styles.timelineDesc}>{event.description}</Text>
                  <Text style={styles.timelineDate}>{formatDate(event.timestamp)}</Text>
                </View>
              </View>
            ))}
          </Surface>
        )}
        
        {/* Notes Card */}
        {repair.notes && repair.notes.length > 0 && typeof repair.notes[0] === 'object' && userType === 'shop' && (
          <Surface style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="note-text" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Notes (Shop Only)</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            {repair.notes.filter(note => typeof note === 'object' && note.text).map((note, index) => (
              <Surface key={index} style={styles.noteItem}>
                <Text style={styles.noteText}>{note.text}</Text>
                <Text style={styles.noteTime}>{formatDate(note.timestamp)}</Text>
              </Surface>
            ))}
          </Surface>
        )}
        
        {/* Messages Card */}
        {repair.messages && repair.messages.length > 0 && (
          <Surface style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="message-text" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Messages</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            {repair.messages.map((msg, index) => (
              <Surface 
                key={index} 
                style={[
                  styles.messageItem,
                  msg.sender === userType ? styles.outgoingMessage : styles.incomingMessage
                ]}
              >
                <Text style={styles.messageSender}>{msg.senderName || msg.sender}</Text>
                <Text style={styles.messageText}>{msg.text}</Text>
                <Text style={styles.messageTime}>{formatTimeAgo(msg.timestamp)}</Text>
              </Surface>
            ))}
          </Surface>
        )}
      </ScrollView>
      
      <FAB
        style={styles.messageFab}
        icon="message"
        onPress={() => setMessageModalVisible(true)}
        color="#fff"
      />
      
      {userType === 'shop' && (
        <FAB
          style={styles.statusFab}
          icon="pencil"
          onPress={() => {
            setNewStatus(repair.status || 'pending');
            setEstimatedCompletion(repair.estimatedTime || '');
            setPrice(repair.estimatedCost || '');
            setStatusUpdateVisible(true);
          }}
          color="#fff"
        />
      )}
      
      {renderMessageModal()}
      {renderStatusUpdateModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginVertical: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra space for FABs
  },
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  deviceType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceModel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  headerRight: {
    marginLeft: 16,
  },
  statusChip: {
    height: 32,
    paddingHorizontal: 12,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  lightDivider: {
    marginVertical: 12,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    width: 80,
    color: '#555',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  customerContainer: {
    alignItems: 'center',
  },
  customerAvatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    marginBottom: 12,
    backgroundColor: '#2196F3',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  customerDetails: {
    width: '100%',
    marginBottom: 16,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  contactButton: {
    borderRadius: 8,
    minWidth: 110,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    margin: 4,
    backgroundColor: '#e3f2fd',
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  partName: {
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  partDetails: {
    alignItems: 'flex-end',
  },
  partQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  partCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalCost: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    color: '#333',
  },
  timelineDesc: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
  },
  messageItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  outgoingMessage: {
    backgroundColor: '#E3F2FD',
    marginLeft: 32,
  },
  incomingMessage: {
    backgroundColor: '#F5F5F5',
    marginRight: 32,
  },
  messageSender: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
  },
  noteItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#e8f5e9',
    elevation: 1,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
  },
  noteTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  messageFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  statusFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
    backgroundColor: '#FF9800',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusOptions: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  statusButton: {
    marginBottom: 8,
  },
  textInput: {
    marginBottom: 16,
  },
});

export default RepairDetailsScreen; 