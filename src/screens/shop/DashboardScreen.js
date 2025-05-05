import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, Button, List, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen({ navigation }) {
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const [stats, setStats] = useState({
    totalRepairs: 0,
    pendingRepairs: 0,
    inProgressRepairs: 0,
    completedRepairs: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get repairs from AsyncStorage
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      
      // Filter repairs for this shop
      const shopRepairs = repairs.filter(repair => repair.shopId === user.id);
      const uniqueCustomers = new Set(shopRepairs.map(repair => repair.customerId));

      setStats({
        totalRepairs: shopRepairs.length,
        pendingRepairs: shopRepairs.filter(r => r.status === 'pending').length,
        inProgressRepairs: shopRepairs.filter(r => r.status === 'in_progress').length,
        completedRepairs: shopRepairs.filter(r => r.status === 'completed').length,
        totalCustomers: uniqueCustomers.size,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Button
        mode="contained"
        icon="clipboard-list"
        onPress={() => navigation.navigate('RepairTickets')}
        style={styles.actionButton}
      >
        View Repairs
      </Button>
      <Button
        mode="contained"
        icon="account-group"
        onPress={() => navigation.navigate('CustomerList')}
        style={styles.actionButton}
      >
        Customers
      </Button>
      <Button
        mode="contained"
        icon="chart-bar"
        onPress={() => navigation.navigate('Analytics')}
        style={styles.actionButton}
      >
        Analytics
      </Button>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.welcomeCard}>
        <Card.Content>
          <Title>Welcome back!</Title>
          <Paragraph>Here's an overview of your repair shop</Paragraph>
        </Card.Content>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.totalRepairs}</Title>
            <Paragraph style={styles.statLabel}>Total Repairs</Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.statsCard, { backgroundColor: theme.colors.warning }]}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.pendingRepairs}</Title>
            <Paragraph style={styles.statLabel}>Pending</Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.statsCard, { backgroundColor: theme.colors.accent }]}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.inProgressRepairs}</Title>
            <Paragraph style={styles.statLabel}>In Progress</Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.statsCard, { backgroundColor: theme.colors.success }]}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.completedRepairs}</Title>
            <Paragraph style={styles.statLabel}>Completed</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {renderQuickActions()}

      <Card style={styles.customersCard}>
        <Card.Content>
          <List.Item
            title="Total Customers"
            description={stats.totalCustomers.toString()}
            left={props => (
              <MaterialCommunityIcons
                {...props}
                name="account-group"
                size={24}
                color={theme.colors.primary}
              />
            )}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeCard: {
    margin: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '48%',
    marginBottom: 16,
    marginHorizontal: '1%',
  },
  statNumber: {
    color: 'white',
    fontSize: 32,
  },
  statLabel: {
    color: 'white',
    opacity: 0.8,
  },
  quickActions: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  customersCard: {
    margin: 16,
    marginTop: 0,
  },
}); 