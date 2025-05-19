import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const HomeScreen = ({ navigation }) => {
  const paperTheme = usePaperTheme();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={[styles.title, { color: colors.text }]}>
            Repair Shop CRM
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: colors.disabled }]}>
            Choose your role to continue
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.text }]}>
            <View style={styles.cardContent}>
              <Text variant="headlineSmall" style={[styles.cardTitle, { color: colors.text }]}>
                I'm a Customer
              </Text>
              <Text variant="bodyMedium" style={[styles.cardDescription, { color: colors.disabled }]}>
                Track your repairs, schedule appointments, and manage your devices
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('CustomerDashboard')}
                style={styles.button}
              >
                Continue as Customer
              </Button>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.text }]}>
            <View style={styles.cardContent}>
              <Text variant="headlineSmall" style={[styles.cardTitle, { color: colors.text }]}>
                I'm a Shop Owner
              </Text>
              <Text variant="bodyMedium" style={[styles.cardDescription, { color: colors.disabled }]}>
                Manage repairs, inventory, and customer relationships
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('ShopDashboard')}
                style={styles.button}
              >
                Continue as Shop Owner
              </Button>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 10,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    marginBottom: 10,
  },
  cardDescription: {
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
});

export default HomeScreen; 