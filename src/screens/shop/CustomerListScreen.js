import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, TextInput, List, Avatar, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomerListScreen() {
  const user = useSelector(state => state.auth.user);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      // Get repairs from AsyncStorage
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      
      // Filter repairs for this shop
      const shopRepairs = repairs.filter(repair => repair.shopId === user.id);
      
      // Get unique customers from repairs
      const customersMap = new Map();
      
      shopRepairs.forEach(repair => {
        if (!customersMap.has(repair.customerId)) {
          customersMap.set(repair.customerId, {
            id: repair.customerId,
            email: repair.customerEmail,
            totalRepairs: 1,
            lastRepair: repair.createdAt,
            totalSpent: repair.price || 0
          });
        } else {
          const customer = customersMap.get(repair.customerId);
          customer.totalRepairs++;
          customer.totalSpent += repair.price || 0;
          if (new Date(repair.createdAt) > new Date(customer.lastRepair)) {
            customer.lastRepair = repair.createdAt;
          }
        }
      });
      
      setCustomers(Array.from(customersMap.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const getInitials = (email) => {
    return email
      .split('@')[0]
      .split(/[._-]/)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>Customer Overview</Title>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Title>{customers.length}</Title>
              <Paragraph>Total Customers</Paragraph>
            </View>
            <View style={styles.stat}>
              <Title>
                ${customers.reduce((sum, customer) => sum + customer.totalSpent, 0).toFixed(2)}
              </Title>
              <Paragraph>Total Revenue</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      <TextInput
        placeholder="Search customers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        style={styles.searchInput}
      />

      <Card>
        <Card.Content>
          {filteredCustomers.map((customer, index) => (
            <React.Fragment key={customer.id}>
              <List.Item
                title={customer.email}
                description={`${customer.totalRepairs} repairs • $${customer.totalSpent.toFixed(2)} spent`}
                left={props => (
                  <Avatar.Text
                    {...props}
                    label={getInitials(customer.email)}
                    size={40}
                  />
                )}
              />
              {index < filteredCustomers.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  searchInput: {
    marginBottom: 16,
  },
}); 