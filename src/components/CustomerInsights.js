import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Button, Chip, Divider, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

/**
 * CustomerInsights component for displaying customer analytics in the CRM system
 */
const CustomerInsights = ({
  customerData = {},
  recentRepairs = [],
  onViewAllRepairs,
}) => {
  const theme = useTheme();
  
  const {
    totalSpent = 0,
    avgRepairCost = 0,
    repairCount = 0,
    lastRepairDate = null,
    deviceTypes = {},
    repairsByMonth = [],
    customerSince = null,
    preferredServices = [],
    lifetimeValue = 0,
    loyaltyScore = 0,
  } = customerData;
  
  const chartWidth = width - 40;
  
  const getDeviceTypeData = () => {
    if (!deviceTypes || Object.keys(deviceTypes).length === 0) {
      return [{
        name: 'No Data',
        count: 1,
        color: '#CCCCCC',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }];
    }
    
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    return Object.entries(deviceTypes).map(([type, count], index) => ({
      name: type,
      count,
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  };
  
  const getMonthlyRepairsData = () => {
    const emptyData = {
      labels: ['No Data'],
      datasets: [{ data: [0] }]
    };
    
    if (!repairsByMonth || repairsByMonth.length === 0) {
      return emptyData;
    }
    
    // Ensure we have at most 6 months of data to display
    const recentMonths = repairsByMonth.slice(-6);
    
    return {
      labels: recentMonths.map(item => item.month),
      datasets: [{ data: recentMonths.map(item => item.count) }]
    };
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };
  
  const getLoyaltyStatusText = (score) => {
    if (score >= 80) return 'VIP';
    if (score >= 60) return 'Loyal';
    if (score >= 40) return 'Regular';
    if (score >= 20) return 'Occasional';
    return 'New';
  };
  
  const getLoyaltyColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#2196F3';
    if (score >= 20) return '#FF9800';
    return '#757575';
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            <MaterialCommunityIcons name="account-cash" size={20} color={theme.colors.primary} /> Customer Value
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>${totalSpent}</Text>
              <Text style={styles.metricLabel}>Total Spent</Text>
            </View>
            
            <View style={styles.metricDivider} />
            
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{repairCount}</Text>
              <Text style={styles.metricLabel}>Repairs</Text>
            </View>
            
            <View style={styles.metricDivider} />
            
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>${avgRepairCost}</Text>
              <Text style={styles.metricLabel}>Avg. Cost</Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.loyaltySection}>
            <View style={styles.loyaltyTextSection}>
              <Text variant="titleSmall">Loyalty Status</Text>
              <Chip 
                style={[styles.loyaltyChip, { borderColor: getLoyaltyColor(loyaltyScore) }]}
                textStyle={{ color: getLoyaltyColor(loyaltyScore) }}
                mode="outlined"
              >
                {getLoyaltyStatusText(loyaltyScore)}
              </Chip>
              <Text variant="bodySmall" style={styles.customerSince}>
                Customer since: {formatDate(customerSince)}
              </Text>
            </View>
            
            <View style={styles.lifetimeValueContainer}>
              <Text variant="bodySmall" style={styles.lifetimeLabel}>Lifetime Value</Text>
              <Text style={[styles.lifetimeValue, { color: getLoyaltyColor(loyaltyScore) }]}>
                ${lifetimeValue}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            <MaterialCommunityIcons name="cellphone" size={20} color={theme.colors.primary} /> Device Types
          </Text>
          
          <PieChart
            data={getDeviceTypeData()}
            width={chartWidth}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={theme.colors.primary} /> Repair History
          </Text>
          
          <BarChart
            data={getMonthlyRepairsData()}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              barPercentage: 0.7,
            }}
            style={styles.chart}
          />
          
          {lastRepairDate && (
            <Text variant="bodySmall" style={styles.lastRepairText}>
              Last repair: {formatDate(lastRepairDate)}
            </Text>
          )}
        </Card.Content>
      </Card>
      
      {preferredServices.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              <MaterialCommunityIcons name="star" size={20} color={theme.colors.primary} /> Preferred Services
            </Text>
            
            <View style={styles.servicesContainer}>
              {preferredServices.map((service, index) => (
                <Chip key={index} style={styles.serviceChip}>
                  {service.name} ({service.count})
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}
      
      {recentRepairs.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              <MaterialCommunityIcons name="history" size={20} color={theme.colors.primary} /> Recent Repairs
            </Text>
            
            {recentRepairs.map((repair, index) => (
              <Surface key={index} style={styles.repairItem}>
                <View style={styles.repairLeft}>
                  <Text variant="titleSmall">{repair.deviceType} {repair.deviceModel}</Text>
                  <Text variant="bodySmall">{formatDate(repair.date)}</Text>
                </View>
                <View style={styles.repairRight}>
                  <Chip 
                    compact 
                    style={[styles.repairStatusChip, { backgroundColor: getLoyaltyColor(80) }]}
                  >
                    ${repair.cost}
                  </Chip>
                </View>
              </Surface>
            ))}
            
            <Button 
              mode="text" 
              onPress={onViewAllRepairs}
              style={styles.viewAllButton}
            >
              View All Repairs
            </Button>
          </Card.Content>
        </Card>
      )}
      
      <View style={styles.actionsContainer}>
        <Button 
          mode="contained" 
          icon="email" 
          style={styles.actionButton}
        >
          Send Marketing Email
        </Button>
        <Button 
          mode="outlined" 
          icon="account-check" 
          style={styles.actionButton}
        >
          Recommended Services
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  divider: {
    marginVertical: 16,
  },
  loyaltySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loyaltyTextSection: {
    flex: 1,
  },
  loyaltyChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  customerSince: {
    marginTop: 8,
    color: '#757575',
  },
  lifetimeValueContainer: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  lifetimeLabel: {
    color: '#757575',
    marginBottom: 4,
  },
  lifetimeValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  lastRepairText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#757575',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    margin: 4,
  },
  repairItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    elevation: 1,
  },
  repairLeft: {
    flex: 1,
  },
  repairRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repairStatusChip: {
    height: 28,
  },
  viewAllButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  actionsContainer: {
    margin: 16,
  },
  actionButton: {
    borderRadius: 8,
    marginBottom: 12,
  },
});

export default CustomerInsights; 