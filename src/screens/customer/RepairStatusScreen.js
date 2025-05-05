import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Title, Paragraph, List, Button, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

export default function RepairStatusScreen({ route, navigation }) {
  const { repairId } = route.params;
  const theme = useTheme();
  const [repair, setRepair] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetchRepairDetails();
  }, [repairId]);

  const fetchRepairDetails = async () => {
    try {
      // Get repairs from AsyncStorage
      const repairsJson = await AsyncStorage.getItem('repairs');
      const repairs = JSON.parse(repairsJson || '[]');
      
      // Find the specific repair
      const repairData = repairs.find(r => r.id === repairId);
      
      if (repairData) {
        setRepair(repairData);
        
        // Build timeline
        const timelineEvents = [
          {
            time: new Date(repairData.createdAt),
            title: 'Repair Request Created',
            description: 'Your repair request has been submitted.',
            icon: 'clipboard-text-outline'
          }
        ];

        if (repairData.acceptedAt) {
          timelineEvents.push({
            time: new Date(repairData.acceptedAt),
            title: 'Request Accepted',
            description: `Estimated completion: ${moment(repairData.estimatedCompletion).format('MMM DD, YYYY')}`,
            icon: 'check-circle-outline'
          });
        }

        if (repairData.startedAt) {
          timelineEvents.push({
            time: new Date(repairData.startedAt),
            title: 'Repair Started',
            description: 'Technician has started working on your device.',
            icon: 'tools'
          });
        }

        if (repairData.completedAt) {
          timelineEvents.push({
            time: new Date(repairData.completedAt),
            title: 'Repair Completed',
            description: 'Your device is ready for pickup.',
            icon: 'flag-checkered'
          });
        }

        setTimeline(timelineEvents.sort((a, b) => b.time - a.time));
      }
    } catch (error) {
      console.error('Error fetching repair details:', error);
    }
  };

  const getStatusColor = (status) => {
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

  if (!repair) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Repair Details</Title>
          <List.Item
            title="Status"
            description={repair.status.toUpperCase()}
            left={props => (
              <MaterialCommunityIcons
                {...props}
                name="information"
                size={24}
                color={getStatusColor(repair.status)}
              />
            )}
          />
          <Divider style={styles.divider} />
          
          <List.Item
            title="Device"
            description={`${repair.deviceType} - ${repair.deviceModel}`}
            left={props => (
              <MaterialCommunityIcons
                {...props}
                name="cellphone"
                size={24}
              />
            )}
          />
          <Divider style={styles.divider} />

          <List.Item
            title="Shop"
            description={repair.shopName}
            left={props => (
              <MaterialCommunityIcons
                {...props}
                name="store"
                size={24}
              />
            )}
          />
          <Divider style={styles.divider} />

          <Title style={styles.sectionTitle}>Services</Title>
          {repair.services.map((service, index) => (
            <Paragraph key={index} style={styles.service}>• {service}</Paragraph>
          ))}

          <Title style={styles.sectionTitle}>Issue Description</Title>
          <Paragraph>{repair.issueDescription}</Paragraph>

          {repair.price && (
            <>
              <Title style={styles.sectionTitle}>Price</Title>
              <Paragraph>${repair.price.toFixed(2)}</Paragraph>
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Timeline</Title>
          {timeline.map((event, index) => (
            <List.Item
              key={index}
              title={event.title}
              description={`${moment(event.time).format('MMM DD, YYYY hh:mm A')}\n${event.description}`}
              left={props => (
                <MaterialCommunityIcons
                  {...props}
                  name={event.icon}
                  size={24}
                  color={theme.colors.primary}
                />
              )}
              style={styles.timelineItem}
            />
          ))}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.goBack()}
        style={styles.button}
      >
        Back to Home
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  service: {
    marginLeft: 16,
    marginBottom: 4,
  },
  timelineItem: {
    marginBottom: 8,
  },
  button: {
    marginBottom: 24,
  },
}); 