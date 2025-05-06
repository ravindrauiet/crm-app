import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="headlineMedium">Welcome Back!</Text>
          <Text variant="bodyLarge">Manage your repairs and services</Text>
        </View>

        <View style={styles.cardsContainer}>
          <Card style={styles.card} onPress={() => navigation.navigate('ActiveRepairs')}>
            <Card.Content>
              <Text variant="titleMedium">Active Repairs</Text>
              <Text variant="displaySmall">2</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card} onPress={() => navigation.navigate('ServiceHistory')}>
            <Card.Content>
              <Text variant="titleMedium">Service History</Text>
              <Text variant="displaySmall">5</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card} onPress={() => navigation.navigate('UpcomingAppointments')}>
            <Card.Content>
              <Text variant="titleMedium">Upcoming Appointments</Text>
              <Text variant="displaySmall">1</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.actionsContainer}>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('NewRepair')}
            style={styles.button}
          >
            Request New Repair
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('FindShops')}
            style={styles.button}
          >
            Find Repair Shops
          </Button>
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
  cardsContainer: {
    padding: 10,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  actionsContainer: {
    padding: 20,
  },
  button: {
    marginBottom: 10,
  },
});

export default DashboardScreen; 