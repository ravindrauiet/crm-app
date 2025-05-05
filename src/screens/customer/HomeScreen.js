import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const repairs = useSelector(state => state.repairs.repairs);
  const user = useSelector(state => state.auth.user);

  const activeRepairs = repairs.filter(repair => 
    repair.customerId === user.uid && repair.status !== 'completed'
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Button
        mode="contained"
        icon="tools"
        onPress={() => navigation.navigate('ShopList')}
        style={styles.actionButton}
      >
        Book Repair
      </Button>
      <Button
        mode="contained"
        icon="map-marker"
        onPress={() => navigation.navigate('ShopList')}
        style={styles.actionButton}
      >
        Find Shops
      </Button>
    </View>
  );

  const renderActiveRepairs = () => (
    <View style={styles.section}>
      <Title style={styles.sectionTitle}>Active Repairs</Title>
      {activeRepairs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Paragraph>No active repairs</Paragraph>
          </Card.Content>
        </Card>
      ) : (
        activeRepairs.map(repair => (
          <Card 
            key={repair.id} 
            style={styles.repairCard}
            onPress={() => navigation.navigate('RepairStatus', { repairId: repair.id })}
          >
            <Card.Content>
              <View style={styles.repairHeader}>
                <Title>{repair.deviceType}</Title>
                <MaterialCommunityIcons
                  name={getStatusIcon(repair.status)}
                  size={24}
                  color={getStatusColor(repair.status, theme)}
                />
              </View>
              <Paragraph>Shop: {repair.shopName}</Paragraph>
              <Paragraph>Status: {repair.status}</Paragraph>
              <Paragraph>Estimated Completion: {repair.estimatedCompletion}</Paragraph>
            </Card.Content>
          </Card>
        ))
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.welcomeCard}>
        <Card.Content>
          <Title>Welcome back!</Title>
          <Paragraph>What would you like to do today?</Paragraph>
        </Card.Content>
      </Card>

      {renderQuickActions()}
      {renderActiveRepairs()}
    </ScrollView>
  );
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending':
      return 'clock-outline';
    case 'in_progress':
      return 'progress-wrench';
    case 'completed':
      return 'check-circle-outline';
    default:
      return 'information-outline';
  }
};

const getStatusColor = (status, theme) => {
  switch (status) {
    case 'pending':
      return theme.colors.warning;
    case 'in_progress':
      return theme.colors.primary;
    case 'completed':
      return theme.colors.success;
    default:
      return theme.colors.disabled;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeCard: {
    margin: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  repairCard: {
    marginBottom: 16,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
}); 