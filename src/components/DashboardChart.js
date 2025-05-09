import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * DashboardChart component for displaying various chart types in the CRM app
 * Supports line, bar, and pie charts with customization options
 */
const DashboardChart = ({
  type = 'line', // 'line', 'bar', 'pie'
  title,
  subtitle,
  data,
  labels,
  height = 220,
  colors,
  icon,
  containerStyle,
  legendPosition = 'bottom',
}) => {
  const theme = useTheme();
  
  // Default chart width with padding
  const chartWidth = width - 40;
  
  // Default colors if not provided
  const defaultColors = {
    primary: theme.colors.primary,
    gradient: [theme.colors.primary, '#b2dfdb'],
    background: '#ffffff',
    text: '#333333',
  };
  
  const chartColors = { ...defaultColors, ...colors };
  
  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <MaterialCommunityIcons 
        name={icon} 
        size={24} 
        color={chartColors.primary} 
        style={styles.icon}
      />
    );
  };
  
  const renderSubtitle = () => {
    if (!subtitle) return null;
    
    return (
      <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text>
    );
  };
  
  const renderChart = () => {
    // Common chart configuration
    const chartConfig = {
      backgroundColor: chartColors.background,
      backgroundGradientFrom: chartColors.background,
      backgroundGradientTo: chartColors.background,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: chartColors.primary,
      },
    };
    
    // Chart-specific rendering
    switch (type) {
      case 'line':
        return (
          <LineChart
            data={{
              labels: labels || [],
              datasets: [
                {
                  data: data || [0],
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                },
              ],
            }}
            width={chartWidth}
            height={height}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        );
        
      case 'bar':
        return (
          <BarChart
            data={{
              labels: labels || [],
              datasets: [
                {
                  data: data || [0],
                },
              ],
            }}
            width={chartWidth}
            height={height}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              barPercentage: 0.7,
            }}
            style={styles.chart}
          />
        );
        
      case 'pie':
        // For pie charts, data should be an array of objects with name, population, color
        return (
          <PieChart
            data={data || [
              {
                name: 'No Data',
                population: 1,
                color: '#CCCCCC',
                legendFontColor: '#7F7F7F',
                legendFontSize: 12,
              },
            ]}
            width={chartWidth}
            height={height}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            hasLegend={legendPosition === 'bottom'}
          />
        );
        
      default:
        return (
          <View style={styles.emptyChart}>
            <Text>Invalid chart type</Text>
          </View>
        );
    }
  };
  
  return (
    <Card style={[styles.card, containerStyle]}>
      <Card.Content>
        <View style={styles.titleContainer}>
          {renderIcon()}
          <Text variant="titleMedium" style={styles.title}>{title || 'Chart'}</Text>
        </View>
        {renderSubtitle()}
        {renderChart()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    marginBottom: 12,
    color: '#757575',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DashboardChart; 