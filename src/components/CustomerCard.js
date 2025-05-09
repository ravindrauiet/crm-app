import React, { useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Card, Text, Button, Avatar, Chip, IconButton, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * CustomerCard component for displaying customer information in a CRM context
 * Features include contact options, repair history summary, tags, and action menu
 */
const CustomerCard = ({
  customer,
  onPress,
  onViewHistory,
  onAddNote,
  onSendMessage,
  compact = false,
  showActions = true,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  
  const handleCall = () => {
    if (customer.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };
  
  const handleEmail = () => {
    if (customer.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };
  
  const renderTags = () => {
    if (!customer.tags || customer.tags.length === 0) return null;
    
    return (
      <View style={styles.tagsContainer}>
        {customer.tags.map((tag, index) => (
          <Chip 
            key={index} 
            style={styles.tag}
            compact
          >
            {tag}
          </Chip>
        ))}
      </View>
    );
  };
  
  const renderCustomerValue = () => {
    const lifetime = customer.lifetimeValue || 0;
    let valueColor = '#757575';
    
    if (lifetime > 1000) {
      valueColor = '#4CAF50';
    } else if (lifetime > 500) {
      valueColor = '#2196F3';
    } else if (lifetime > 100) {
      valueColor = '#FF9800';
    }
    
    return (
      <View style={styles.valueContainer}>
        <Text style={[styles.valueLabel, { color: valueColor }]}>Lifetime Value</Text>
        <Text style={[styles.valueAmount, { color: valueColor }]}>${lifetime}</Text>
      </View>
    );
  };
  
  // Compact version for lists
  if (compact) {
    return (
      <Card style={styles.compactCard} onPress={onPress}>
        <Card.Content style={styles.compactContent}>
          <Avatar.Text 
            size={40} 
            label={customer.name ? customer.name.substring(0, 2).toUpperCase() : customer.email.substring(0, 2).toUpperCase()} 
          />
          <View style={styles.compactInfo}>
            <Text variant="titleMedium">{customer.name || 'Customer'}</Text>
            <Text variant="bodySmall">{customer.email}</Text>
          </View>
          <View style={styles.compactActions}>
            {customer.phone && (
              <IconButton 
                icon="phone" 
                size={20} 
                onPress={handleCall}
              />
            )}
            <IconButton 
              icon="email" 
              size={20} 
              onPress={handleEmail}
            />
          </View>
        </Card.Content>
      </Card>
    );
  }
  
  // Full customer card
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.customerInfo}>
            <Avatar.Text 
              size={50} 
              label={customer.name ? customer.name.substring(0, 2).toUpperCase() : customer.email.substring(0, 2).toUpperCase()} 
            />
            <View style={styles.nameContainer}>
              <Text variant="titleLarge">{customer.name || 'Customer'}</Text>
              <Text variant="bodyMedium">{customer.email}</Text>
              {customer.phone && (
                <Text variant="bodyMedium">{customer.phone}</Text>
              )}
            </View>
          </View>
          
          {showActions && (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item 
                onPress={() => {
                  setMenuVisible(false);
                  onViewHistory && onViewHistory();
                }} 
                title="View Repair History"
                leadingIcon="history"
              />
              <Menu.Item 
                onPress={() => {
                  setMenuVisible(false);
                  onAddNote && onAddNote();
                }} 
                title="Add Note"
                leadingIcon="note-text"
              />
              <Menu.Item 
                onPress={() => {
                  setMenuVisible(false);
                  onSendMessage && onSendMessage();
                }} 
                title="Send Message"
                leadingIcon="message-text"
              />
              <Divider />
              <Menu.Item 
                onPress={() => {
                  setMenuVisible(false);
                  handleEmail();
                }} 
                title="Send Email"
                leadingIcon="email"
              />
              {customer.phone && (
                <Menu.Item 
                  onPress={() => {
                    setMenuVisible(false);
                    handleCall();
                  }} 
                  title="Call"
                  leadingIcon="phone"
                />
              )}
            </Menu>
          )}
        </View>
        
        {renderTags()}
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleLarge">{customer.totalRepairs || 0}</Text>
            <Text variant="bodySmall">Repairs</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="titleLarge">{customer.activeRepairs || 0}</Text>
            <Text variant="bodySmall">Active</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="titleLarge">{customer.lastRepair || '-'}</Text>
            <Text variant="bodySmall">Last Repair</Text>
          </View>
          
          {renderCustomerValue()}
        </View>
        
        {customer.notes && (
          <View style={styles.notesContainer}>
            <Text variant="bodySmall" style={styles.notesLabel}>Notes:</Text>
            <Text variant="bodyMedium">{customer.notes}</Text>
          </View>
        )}
      </Card.Content>
      
      {showActions && (
        <Card.Actions>
          <Button onPress={() => onViewHistory && onViewHistory()}>
            Repair History
          </Button>
          <Button 
            mode="contained"
            onPress={() => onSendMessage && onSendMessage()}
          >
            Message
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
  },
  compactCard: {
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  compactActions: {
    flexDirection: 'row',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  nameContainer: {
    marginLeft: 16,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    margin: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  valueContainer: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 12,
  },
  valueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  notesLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});

export default CustomerCard; 