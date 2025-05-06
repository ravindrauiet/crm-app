import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, Divider, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const RepairDetailsScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { repairId, userType } = route.params;

  // Mock data - replace with actual data from your backend
  const repair = {
    id: repairId,
    deviceType: 'iPhone 12',
    customerName: 'John Doe',
    customerPhone: '+1 234 567 8900',
    issue: 'Screen replacement',
    description: 'Screen is cracked and unresponsive. Needs complete replacement.',
    status: 'In Progress',
    estimatedCost: '$150',
    dueDate: '2024-03-20',
    createdAt: '2024-03-15',
    technician: 'Mike Johnson',
    notes: [
      {
        date: '2024-03-15',
        text: 'Initial assessment completed. Parts ordered.',
        author: 'Mike Johnson',
      },
      {
        date: '2024-03-16',
        text: 'Parts received. Starting repair process.',
        author: 'Mike Johnson',
      },
    ],
  };

  const renderStatusChip = (status) => {
    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'in progress':
          return '#2196F3';
        case 'completed':
          return '#4CAF50';
        case 'waiting for parts':
          return '#FF9800';
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
        {status}
      </Chip>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="headlineMedium">{repair.deviceType}</Text>
          {renderStatusChip(repair.status)}
        </View>

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Repair Information
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Issue:</Text>
              <Text variant="bodyMedium">{repair.issue}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Description:</Text>
              <Text variant="bodyMedium">{repair.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Estimated Cost:</Text>
              <Text variant="bodyMedium">{repair.estimatedCost}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Due Date:</Text>
              <Text variant="bodyMedium">{repair.dueDate}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Customer Information
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Name:</Text>
              <Text variant="bodyMedium">{repair.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Phone:</Text>
              <Text variant="bodyMedium">{repair.customerPhone}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Repair Progress
            </Text>
            {repair.notes.map((note, index) => (
              <View key={index}>
                <View style={styles.noteHeader}>
                  <Text variant="bodySmall" style={styles.noteDate}>{note.date}</Text>
                  <Text variant="bodySmall" style={styles.noteAuthor}>{note.author}</Text>
                </View>
                <Text variant="bodyMedium" style={styles.noteText}>{note.text}</Text>
                {index < repair.notes.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {userType === 'shop' && (
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('UpdateRepair', { repairId })}
              style={styles.button}
            >
              Update Status
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('AddNote', { repairId })}
              style={styles.button}
            >
              Add Note
            </Button>
          </View>
        )}

        {userType === 'customer' && (
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('ContactShop', { repairId })}
              style={styles.button}
            >
              Contact Shop
            </Button>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    margin: 10,
    marginBottom: 0,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 32,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  noteDate: {
    color: '#666',
  },
  noteAuthor: {
    color: '#666',
  },
  noteText: {
    marginBottom: 10,
  },
  divider: {
    marginVertical: 10,
  },
  actions: {
    padding: 20,
  },
  button: {
    marginBottom: 10,
  },
});

export default RepairDetailsScreen; 