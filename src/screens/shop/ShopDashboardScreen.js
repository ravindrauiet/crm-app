import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ShopDashboardScreen = ({ navigation }) => {
  const theme = useTheme();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="store"
          size={24}
          onPress={() => navigation.navigate('ShopProfile')}
        />
      ),
    });
  }, [navigation]);

  const renderRepairCard = (repair) => (
    <Card key={repair.id} style={styles.repairCard}>
      <Card.Content>
        <View style={styles.repairHeader}>
          <Text variant="titleMedium">{repair.deviceType}</Text>
          <Chip mode="outlined" style={styles.statusChip}>
            {repair.status}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.customerName}>
          Customer: {repair.customerName}
        </Text>
        <Text variant="bodySmall" style={styles.issue}>
          Issue: {repair.issue}
        </Text>
        <Text variant="bodySmall" style={styles.date}>
          Due: {repair.dueDate}
        </Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}>
          View Details
        </Button>
        <Button mode="contained" onPress={() => navigation.navigate('UpdateRepair', { repairId: repair.id })}>
          Update Status
        </Button>
      </Card.Actions>
    </Card>
  );

  // Mock data - replace with actual data from your backend
  const activeRepairs = [
    {
      id: '1',
      deviceType: 'iPhone 12',
      customerName: 'John Doe',
      issue: 'Screen replacement',
      status: 'In Progress',
      dueDate: '2024-03-20',
    },
    {
      id: '2',
      deviceType: 'Samsung S21',
      customerName: 'Jane Smith',
      issue: 'Battery replacement',
      status: 'Waiting for Parts',
      dueDate: '2024-03-22',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="headlineMedium">Shop Dashboard</Text>
          <Text variant="bodyLarge">Manage your repair shop</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="titleMedium">Active Repairs</Text>
              <Text variant="displaySmall">{activeRepairs.length}</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="titleMedium">Today's Appointments</Text>
              <Text variant="displaySmall">3</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.actionsContainer}>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('Schedule')}
            style={styles.button}
          >
            View Schedule
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('Inventory')}
            style={styles.button}
          >
            Manage Inventory
          </Button>
        </View>

        <View style={styles.repairsContainer}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Active Repairs
          </Text>
          {activeRepairs.map(renderRepairCard)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    margin: 5,
  },
  actionsContainer: {
    padding: 20,
  },
  button: {
    marginBottom: 10,
  },
  repairsContainer: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  repairCard: {
    marginBottom: 15,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChip: {
    height: 24,
  },
  customerName: {
    marginBottom: 4,
  },
  issue: {
    marginBottom: 4,
  },
  date: {
    color: '#666',
  },
});

export default ShopDashboardScreen; 