import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

/**
 * StatusTimeline component for visualizing the progression of a repair through various status stages
 */
const StatusTimeline = ({ 
  currentStatus,
  statusUpdates = [],
  showEstimatedCompletion = true,
  estimatedCompletion = null
}) => {
  const theme = useTheme();
  
  // Define all possible statuses in order of progression
  const allStatuses = [
    { 
      key: 'pending', 
      label: 'Request Received',
      icon: 'clipboard-list'
    },
    { 
      key: 'confirmed', 
      label: 'Confirmed',
      icon: 'clipboard-check'
    },
    { 
      key: 'in progress', 
      label: 'In Progress',
      icon: 'tools'
    },
    { 
      key: 'waiting for parts', 
      label: 'Waiting for Parts',
      icon: 'truck-delivery'
    },
    { 
      key: 'testing', 
      label: 'Testing',
      icon: 'test-tube'
    },
    { 
      key: 'completed', 
      label: 'Completed',
      icon: 'check-circle'
    }
  ];
  
  // Special case for cancelled status
  const isCancelled = currentStatus?.toLowerCase() === 'cancelled';
  
  const getStatusColor = (status, isActive) => {
    if (isCancelled) return '#F44336';
    
    if (!isActive) return '#E0E0E0';
    
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'confirmed':
        return '#8BC34A';
      case 'in progress':
        return '#2196F3';
      case 'waiting for parts':
        return '#9C27B0';
      case 'testing':
        return '#00BCD4';
      case 'completed':
        return '#4CAF50';
      default:
        return theme.colors.primary;
    }
  };
  
  const getCurrentStatusIndex = () => {
    if (isCancelled) return -1;
    
    const index = allStatuses.findIndex(
      status => status.key === currentStatus?.toLowerCase()
    );
    return index === -1 ? 0 : index;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  const getUpdatedAtText = (statusKey) => {
    if (statusUpdates.length === 0) return null;
    
    const update = statusUpdates.find(
      update => update.status?.toLowerCase() === statusKey.toLowerCase()
    );
    
    if (update) {
      return formatDate(update.timestamp);
    }
    
    return null;
  };
  
  const renderTimelineItem = (status, index, isActive, isLast) => {
    const color = getStatusColor(status.key, isActive);
    
    return (
      <View key={status.key} style={styles.timelineItem}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconBackground, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={status.icon} size={16} color="#FFF" />
          </View>
          {!isLast && <View style={[styles.line, { backgroundColor: getStatusColor(status.key, index < getCurrentStatusIndex()) }]} />}
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={[styles.statusLabel, { color: isActive ? '#000' : '#757575' }]}>
            {status.label}
          </Text>
          
          {isActive && getUpdatedAtText(status.key) && (
            <Text style={styles.dateText}>
              {getUpdatedAtText(status.key)}
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  const renderCancelledStatus = () => {
    return (
      <View style={styles.cancelledContainer}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconBackground, { backgroundColor: '#F44336' }]}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#FFF" />
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={[styles.statusLabel, { color: '#F44336' }]}>
            Cancelled
          </Text>
          
          {getUpdatedAtText('cancelled') && (
            <Text style={styles.dateText}>
              {getUpdatedAtText('cancelled')}
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  const renderEstimatedCompletion = () => {
    if (!showEstimatedCompletion || !estimatedCompletion) return null;
    
    return (
      <View style={styles.estimatedContainer}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color="#757575" />
        <Text style={styles.estimatedText}>
          Estimated completion: {formatDate(estimatedCompletion)}
        </Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {isCancelled ? (
        renderCancelledStatus()
      ) : (
        allStatuses.map((status, index) => renderTimelineItem(
          status,
          index,
          index <= getCurrentStatusIndex(),
          index === allStatuses.length - 1
        ))
      )}
      
      {renderEstimatedCompletion()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  iconBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#757575',
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    left: 20,
    top: 32,
    bottom: -20,
    width: 2,
    backgroundColor: '#E0E0E0',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 5,
  },
  statusLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
  },
  cancelledContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  estimatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 40,
  },
  estimatedText: {
    marginLeft: 8,
    color: '#757575',
    fontSize: 14,
  },
});

export default StatusTimeline; 