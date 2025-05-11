import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, Chip, useTheme, IconButton, Menu, Divider, Portal, Modal, TextInput, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FAB } from 'react-native-paper';
import { Linking } from 'react-native';

export default function RepairTicketsScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repairs, setRepairs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'priority'
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('pending');
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchRepairs();
  }, [filter]);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const repairsRef = collection(db, 'repairs');
      
      // Safe check for user ID
      const userId = user?.uid || user?.id;
      
      if (!userId) {
        console.error('User ID is undefined');
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      try {
        // First try with ordered queries (requires index)
        let q = query(
          repairsRef,
          where('shopId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        if (filter !== 'all') {
          q = query(
            repairsRef,
            where('shopId', '==', userId),
            where('status', '==', filter),
            orderBy('createdAt', 'desc')
          );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const repairsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRepairs(repairsList);
          setLoading(false);
          setRefreshing(false);
        }, (error) => {
          console.error('Error in repair snapshot listener:', error);
          
          // Handle index error with a fallback
          if (error.message && error.message.includes('index')) {
            console.log('Index error, falling back to simpler query');
            handleIndexError();
          } else {
            Alert.alert('Error', 'Failed to listen for repair updates');
            setLoading(false);
            setRefreshing(false);
          }
        });

        return unsubscribe;
      } catch (error) {
        // Handle expected errors from query
        if (error.message && error.message.includes('index')) {
          console.log('Index error in try block, falling back to simpler query');
          return handleIndexError();
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    } catch (error) {
      console.error('Error fetching repairs:', error);
      Alert.alert('Error', 'Failed to load repairs');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleIndexError = async () => {
    try {
      const repairsRef = collection(db, 'repairs');
      const userId = user?.uid || user?.id;
      
      // Simpler query without ordering (doesn't require composite index)
      let q = query(
        repairsRef,
        where('shopId', '==', userId)
      );
      
      if (filter !== 'all') {
        q = query(
          repairsRef,
          where('shopId', '==', userId),
          where('status', '==', filter)
        );
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let repairsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort manually on client side
        repairsList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;  // newest first
        });
        
        setRepairs(repairsList);
        setLoading(false);
        setRefreshing(false);
        
        // Show alert to create index
        Alert.alert(
          'Firebase Index Required',
          'To improve performance, please create the required index by clicking the link in your console or Firebase dashboard.',
          [{ text: 'OK' }]
        );
      }, (error) => {
        console.error('Error in fallback repair listener:', error);
        Alert.alert('Error', 'Failed to listen for repair updates');
        setLoading(false);
        setRefreshing(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error in fallback query:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRepairs();
    setRefreshing(false);
  };

  const handleStatusChange = async () => {
    if (!selectedRepair) return;

    try {
      setUpdating(true);
      const repairRef = doc(db, 'repairs', selectedRepair.id);
      await updateDoc(repairRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
        timeline: [...(selectedRepair.timeline || []), {
          status: newStatus,
          timestamp: new Date(),
          description: `Status updated to ${newStatus.replace('_', ' ')}`
        }]
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
      const currentNotes = selectedRepair.notes || [];
      const newNote = {
        text: note.trim(),
        timestamp: new Date(),
        addedBy: user.uid || user.id
      };

      await updateDoc(repairRef, {
        notes: [...currentNotes, newNote],
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

  const handleViewDetails = (repair) => {
    // Add debugging before navigation
    console.log('==== NAVIGATING TO REPAIR DETAILS ====');
    console.log('Repair ID:', repair.id);
    console.log('Customer data in repair:', {
      customerId: repair.customerId,
      customerName: repair.customerName,
      customerEmail: repair.customerEmail,
      customerPhone: repair.customerPhone
    });
    
    // Navigate to repair details with the full repair object
    navigation.navigate('RepairDetails', { 
      repairId: repair.id, 
      repair: repair 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'in_progress': return '#1976D2';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#D32F2F';
      default: return '#757575';
    }
  };

  // Sort repairs based on current sort option
  const getSortedRepairs = () => {
    if (!repairs || repairs.length === 0) return [];
    
    const repairsCopy = [...repairs];
    
    switch (sortBy) {
      case 'newest':
        return repairsCopy.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      case 'oldest':
        return repairsCopy.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateA - dateB;
        });
      case 'priority':
        return repairsCopy.sort((a, b) => {
          // Sort by status: in_progress first, then pending, then completed
          const statusOrder = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
          return (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
        });
      default:
        return repairsCopy;
    }
  };

  const renderStatusModal = () => (
    <Modal
      visible={statusModalVisible}
      onDismiss={() => setStatusModalVisible(false)}
      contentContainerStyle={styles.modalContainer}
    >
      <Text style={styles.modalTitle}>Update Repair Status</Text>
      <View style={styles.statusOptions}>
        <Button
          mode={newStatus === 'pending' ? 'contained' : 'outlined'}
          onPress={() => setNewStatus('pending')}
          style={styles.statusButton}
          disabled={updating}
        >
          Pending
        </Button>
        <Button
          mode={newStatus === 'in_progress' ? 'contained' : 'outlined'}
          onPress={() => setNewStatus('in_progress')}
          style={styles.statusButton}
          disabled={updating}
        >
          In Progress
        </Button>
        <Button
          mode={newStatus === 'completed' ? 'contained' : 'outlined'}
          onPress={() => setNewStatus('completed')}
          style={styles.statusButton}
          disabled={updating}
        >
          Completed
        </Button>
        <Button
          mode={newStatus === 'cancelled' ? 'contained' : 'outlined'}
          onPress={() => setNewStatus('cancelled')}
          style={styles.statusButton}
          disabled={updating}
        >
          Cancelled
        </Button>
      </View>
      <View style={styles.modalActions}>
        <Button
          mode="text"
          onPress={() => setStatusModalVisible(false)}
          disabled={updating}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleStatusChange}
          loading={updating}
          disabled={updating || !newStatus}
        >
          Update
        </Button>
      </View>
    </Modal>
  );

  const renderNoteModal = () => (
    <Modal
      visible={noteModalVisible}
      onDismiss={() => setNoteModalVisible(false)}
      contentContainerStyle={styles.modalContainer}
    >
      <Text style={styles.modalTitle}>Add Note</Text>
      <TextInput
        label="Note"
        value={note}
        onChangeText={setNote}
        style={styles.noteInput}
        multiline
        numberOfLines={4}
        mode="outlined"
      />
      <View style={styles.modalActions}>
        <Button
          mode="text"
          onPress={() => setNoteModalVisible(false)}
          disabled={updating}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleAddNote}
          loading={updating}
          disabled={updating || !note.trim()}
        >
          Add
        </Button>
      </View>
    </Modal>
  );

  const renderRepairCard = (repair) => {
    // Calculate days in repair
    const daysInRepair = () => {
      try {
        if (!repair.createdAt) return "N/A";
        const createdDate = repair.createdAt.toDate ? repair.createdAt.toDate() : new Date(repair.createdAt);
        const today = new Date();
        const diffTime = Math.abs(today - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays.toString();
      } catch (e) {
        return "N/A";
      }
    };
    
    // Format currency
    const formatCurrency = (amount) => {
      if (!amount) return "$0.00";
      return "$" + parseFloat(amount).toFixed(2);
    };
    
    return (
      <Surface style={styles.repairCard}>
        <View 
          style={[
            styles.statusBar, 
            {backgroundColor: getStatusColor(repair.status)}
          ]} 
        />
        <View style={styles.cardContent}>
          {/* Header Section */}
          <View style={styles.repairHeader}>
            <View style={styles.repairInfo}>
              <Text style={styles.repairTitle}>{repair.deviceType || 'Unknown Device'}</Text>
              <Chip
                mode="flat"
                textStyle={{ color: 'white' }}
                style={[styles.statusChip, { backgroundColor: getStatusColor(repair.status) }]}
              >
                {(repair.status || 'pending').replace('_', ' ')}
              </Chip>
            </View>
            <IconButton
              icon="dots-vertical"
              size={24}
              onPress={(event) => {
                // Get position of the button
                setMenuPosition({ x: event.nativeEvent.pageX - 160, y: event.nativeEvent.pageY });
                setSelectedRepair(repair);
                setMenuVisible(true);
              }}
              style={styles.menuButton}
            />
            <Menu
              visible={menuVisible && selectedRepair?.id === repair.id}
              onDismiss={() => setMenuVisible(false)}
              anchor={menuPosition}
              style={styles.menu}
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  setNewStatus(repair.status || 'pending');
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
                  handleViewDetails(repair);
                }}
                title="View Details"
                leadingIcon="information"
              />
            </Menu>
          </View>

          <Divider style={styles.divider} />

          {/* Device Info Section */}
          <View style={styles.deviceSection}>
            <View style={styles.deviceDetails}>
              <Text style={styles.deviceModel}>{repair.deviceModel || 'No model specified'}</Text>
              <Text style={styles.issuePreview} numberOfLines={2}>
                {repair.issueDescription || 'No description provided'}
              </Text>
            </View>
          </View>
          
          {/* Repair Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#2196F3" />
              <Text style={styles.metricLabel}>Days:</Text>
              <Text style={styles.metricValue}>{daysInRepair()}</Text>
            </View>
            
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="currency-usd" size={18} color="#2196F3" />
              <Text style={styles.metricLabel}>Cost:</Text>
              <Text style={styles.metricValue}>{formatCurrency(repair.estimatedCost)}</Text>
            </View>
            
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#2196F3" />
              <Text style={styles.metricLabel}>Est. Time:</Text>
              <Text style={styles.metricValue}>{repair.estimatedTime || 'N/A'}</Text>
            </View>
          </View>

          {/* Customer Info Section */}
          <View style={styles.customerSection}>
            <View style={styles.customerDetails}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account" size={18} color="#2196F3" />
                <Text style={styles.customerName}>{repair.customerName || 'Unknown Customer'}</Text>
              </View>
              
              {repair.customerPhone && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="phone" size={18} color="#2196F3" />
                  <Text style={styles.customerPhone}>{repair.customerPhone}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={18} color="#2196F3" />
                <Text style={styles.repairDate}>
                  {repair.createdAt && typeof repair.createdAt.toDate === 'function' 
                    ? repair.createdAt.toDate().toLocaleDateString() 
                    : 'Unknown date'}
                </Text>
              </View>
            </View>
            
            {/* Service Tags */}
            {repair.services && repair.services.length > 0 && (
              <View style={styles.servicesContainer}>
                {repair.services.slice(0, 2).map((service, index) => (
                  <Chip 
                    key={`service-${index}-${service}`}
                    style={styles.serviceChip}
                    textStyle={styles.serviceChipText}
                    mode="outlined"
                  >
                    {service}
                  </Chip>
                ))}
                {repair.services.length > 2 && (
                  <Chip 
                    key="service-more"
                    style={styles.serviceChip}
                    textStyle={styles.serviceChipText}
                    mode="outlined"
                  >
                    +{repair.services.length - 2} more
                  </Chip>
                )}
              </View>
            )}
          </View>

          {/* Progress Indicator */}
          {repair.status === 'in_progress' && repair.estimatedTime && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Repair Progress</Text>
                <Text style={styles.progressPercent}>
                  {Math.min(parseInt(daysInRepair()) / parseInt(repair.estimatedTime) * 100, 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    {
                      width: `${Math.min(parseInt(daysInRepair()) / parseInt(repair.estimatedTime) * 100, 100)}%`,
                      backgroundColor: parseInt(daysInRepair()) > parseInt(repair.estimatedTime) ? '#FF5252' : '#4CAF50'
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Last Note (if any) */}
          {repair.notes && Array.isArray(repair.notes) && repair.notes.length > 0 && typeof repair.notes[repair.notes.length - 1] === 'object' && repair.notes[repair.notes.length - 1].text && (
            <>
              <Divider style={styles.lightDivider} />
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>Latest Note:</Text>
                <Text style={styles.noteText} numberOfLines={2}>
                  {repair.notes[repair.notes.length - 1].text}
                </Text>
                <Text style={styles.noteDate}>
                  {repair.notes[repair.notes.length - 1].timestamp && 
                   typeof repair.notes[repair.notes.length - 1].timestamp.toDate === 'function' ? 
                   repair.notes[repair.notes.length - 1].timestamp.toDate().toLocaleDateString() : 'Recent'}
                </Text>
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.cardActions}>
            <Button 
              mode="outlined" 
              icon="phone"
              onPress={() => Linking.openURL(`tel:${repair.customerPhone}`)}
              style={styles.actionButton}
              disabled={!repair.customerPhone}
            >
              Call
            </Button>
            <Button 
              mode="outlined" 
              icon="message-text"
              onPress={() => {
                setSelectedRepair(repair);
                setNoteModalVisible(true);
              }}
              style={styles.actionButton}
            >
              Note
            </Button>
            <Button 
              mode="contained" 
              icon="eye"
              onPress={() => handleViewDetails(repair)}
              style={styles.actionButton}
            >
              View
            </Button>
          </View>
        </View>
      </Surface>
    );
  };

  const renderEmptyState = () => (
    <Surface style={styles.emptyStateCard}>
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="wrench" size={64} color="#2196F3" />
        <Text style={styles.emptyTitle}>No Repairs Found</Text>
        <Text style={styles.emptySubtitle}>
          {filter !== 'all' 
            ? 'No repairs match the current filter. Try selecting a different filter.' 
            : 'Create your first repair ticket to get started tracking repairs.'}
        </Text>
        
        {filter !== 'all' ? (
          <Button
            mode="contained"
            onPress={() => setFilter('all')}
            style={styles.emptyButton}
            icon="filter-variant-remove"
          >
            Clear Filter
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('RepairCreate')}
            style={styles.emptyButton}
            icon="plus"
          >
            Create New Repair
          </Button>
        )}
        
        <View style={styles.emptyTipsContainer}>
          <Text style={styles.emptyTipsTitle}>Quick Tips:</Text>
          <View style={styles.emptyTip}>
            <MaterialCommunityIcons name="lightbulb-on" size={18} color="#FFC107" />
            <Text style={styles.emptyTipText}>Create repair tickets to track customer devices</Text>
          </View>
          <View style={styles.emptyTip}>
            <MaterialCommunityIcons name="lightbulb-on" size={18} color="#FFC107" />
            <Text style={styles.emptyTipText}>Add notes to keep your team updated</Text>
          </View>
          <View style={styles.emptyTip}>
            <MaterialCommunityIcons name="lightbulb-on" size={18} color="#FFC107" />
            <Text style={styles.emptyTipText}>Update status to keep customers informed</Text>
          </View>
        </View>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Page Header */}
      <Surface style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Repair Tickets</Text>
          <View style={styles.headerActions}>
            <IconButton
              icon="sort-variant"
              size={24}
              onPress={() => setSortMenuVisible(true)}
            />
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={{ x: 0, y: 0 }}
              style={styles.sortMenu}
            >
              <Menu.Item
                onPress={() => {
                  setSortBy('newest');
                  setSortMenuVisible(false);
                }}
                title="Newest First"
                leadingIcon={sortBy === 'newest' ? "check" : "calendar-arrow-down"}
              />
              <Menu.Item
                onPress={() => {
                  setSortBy('oldest');
                  setSortMenuVisible(false);
                }}
                title="Oldest First"
                leadingIcon={sortBy === 'oldest' ? "check" : "calendar-arrow-up"}
              />
              <Menu.Item
                onPress={() => {
                  setSortBy('priority');
                  setSortMenuVisible(false);
                }}
                title="By Priority"
                leadingIcon={sortBy === 'priority' ? "check" : "alert-circle"}
              />
            </Menu>
          </View>
        </View>
        
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{repairs.filter(r => r.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{repairs.filter(r => r.status === 'in_progress').length}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{repairs.filter(r => r.status === 'completed').length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{repairs.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
        
        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <Chip
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
              style={[styles.filterChip, filter === 'all' ? styles.selectedChip : {}]}
              textStyle={filter === 'all' ? styles.selectedChipText : {}}
              icon="wrench"
            >
              All
            </Chip>
            <Chip
              selected={filter === 'pending'}
              onPress={() => setFilter('pending')}
              style={[styles.filterChip, filter === 'pending' ? styles.selectedChip : {}]}
              textStyle={filter === 'pending' ? styles.selectedChipText : {}}
              icon="clock-outline"
            >
              Pending
            </Chip>
            <Chip
              selected={filter === 'in_progress'}
              onPress={() => setFilter('in_progress')}
              style={[styles.filterChip, filter === 'in_progress' ? styles.selectedChip : {}]}
              textStyle={filter === 'in_progress' ? styles.selectedChipText : {}}
              icon="progress-wrench"
            >
              In Progress
            </Chip>
            <Chip
              selected={filter === 'completed'}
              onPress={() => setFilter('completed')}
              style={[styles.filterChip, filter === 'completed' ? styles.selectedChip : {}]}
              textStyle={filter === 'completed' ? styles.selectedChipText : {}}
              icon="check-circle"
            >
              Completed
            </Chip>
            <Chip
              selected={filter === 'cancelled'}
              onPress={() => setFilter('cancelled')}
              style={[styles.filterChip, filter === 'cancelled' ? styles.selectedChip : {}]}
              textStyle={filter === 'cancelled' ? styles.selectedChipText : {}}
              icon="close-circle"
            >
              Cancelled
            </Chip>
          </ScrollView>
        </View>
      </Surface>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading repairs...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2196F3"]} />
          }
        >
          {repairs.length > 0 ? 
            getSortedRepairs().map(repair => (
              <React.Fragment key={repair.id}>
                {renderRepairCard(repair)}
              </React.Fragment>
            )) : 
            renderEmptyState()
          }
        </ScrollView>
      )}

      {/* Create Repair Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('RepairCreate')}
        color="#fff"
      />

      {/* Modals */}
      <Portal>
        {renderStatusModal()}
        {renderNoteModal()}
      </Portal>
    </SafeAreaView>
  );
}

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
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    height: 30,
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  filterContainer: {
    marginTop: 8,
  },
  filtersScroll: {
    paddingRight: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
    height: 36,
  },
  selectedChip: {
    backgroundColor: '#000000',
  },
  selectedChipText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  repairCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardContent: {
    padding: 16,
    paddingLeft: 18,
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
    justifyContent: 'space-between',
  },
  repairTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    height: 28,
    borderRadius: 14,
  },
  menuButton: {
    margin: 0,
  },
  menu: {
    elevation: 4,
    minWidth: 180,
  },
  divider: {
    marginVertical: 12,
    height: 1,
  },
  lightDivider: {
    marginVertical: 10,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  deviceSection: {
    marginBottom: 12,
  },
  deviceDetails: {
    marginBottom: 4,
  },
  deviceModel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  issuePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerDetails: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  repairDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  servicesContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  serviceChip: {
    backgroundColor: '#e3f2fd',
    height: 26,
    margin: 0,
  },
  serviceChipText: {
    fontSize: 12,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  progressSection: {
    marginVertical: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  notesSection: {
    padding: 8,
    backgroundColor: '#fffde7',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  noteText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  noteDate: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    minWidth: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
    borderRadius: 28,
    elevation: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#2196F3',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    color: '#6c757d',
  },
  emptyButton: {
    marginTop: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
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
  statusOptions: {
    gap: 8,
    marginBottom: 16,
  },
  statusButton: {
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  noteInput: {
    marginBottom: 16,
  },
  emptyStateCard: {
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    backgroundColor: '#ffffff',
    marginVertical: 16,
  },
  emptyTipsContainer: {
    marginTop: 24,
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  emptyTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  sortMenu: {
    elevation: 4,
  },
}); 