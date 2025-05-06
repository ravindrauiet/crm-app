import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Avatar, 
  List, 
  Divider,
  useTheme,
  Chip
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const shopDetails = user?.shopDetails;

  const handleLogout = () => {
    dispatch(logout());
  };

  const renderShopInfo = () => {
    if (!shopDetails) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Loading...</Title>
          </Card.Content>
        </Card>
      );
    }

    const initials = shopDetails.name ? shopDetails.name.split(' ').map(n => n[0]).join('') : '?';
    
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.shopInfoContent}>
          <Avatar.Text 
            size={80} 
            label={initials}
            style={styles.avatar}
          />
          <View style={styles.shopDetails}>
            <Title>{shopDetails.name || 'Shop Name'}</Title>
            <Paragraph>{shopDetails.address || 'No address provided'}</Paragraph>
            <Paragraph>{shopDetails.phone || 'No phone provided'}</Paragraph>
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={20} color={theme.colors.primary} />
              <Paragraph style={styles.rating}>
                {shopDetails.rating?.toFixed(1) || '0.0'} ({shopDetails.totalRatings || 0} reviews)
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderServices = () => {
    if (!shopDetails?.services) {
      return null;
    }

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Services Offered</Title>
          <View style={styles.servicesContainer}>
            {shopDetails.services.map((service, index) => (
              <Chip 
                key={index}
                style={styles.serviceChip}
                mode="outlined"
              >
                {service}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderMenuItems = () => (
    <Card style={styles.card}>
      <List.Section>
        <List.Item
          title="Shop Information"
          left={props => <List.Icon {...props} icon="store" />}
          onPress={() => navigation.navigate('EditShopProfile')}
        />
        <Divider />
        <List.Item
          title="Business Hours"
          left={props => <List.Icon {...props} icon="clock" />}
          onPress={() => navigation.navigate('BusinessHours')}
        />
        <Divider />
        <List.Item
          title="Service Management"
          left={props => <List.Icon {...props} icon="tools" />}
          onPress={() => navigation.navigate('ServiceManagement')}
        />
        <Divider />
        <List.Item
          title="Payment Settings"
          left={props => <List.Icon {...props} icon="credit-card" />}
          onPress={() => navigation.navigate('PaymentSettings')}
        />
        <Divider />
        <List.Item
          title="Notification Settings"
          left={props => <List.Icon {...props} icon="bell" />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </List.Section>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {renderShopInfo()}
        {renderServices()}
        {renderMenuItems()}
        <View style={styles.logoutContainer}>
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            icon="logout"
            style={styles.logoutButton}
          >
            Logout
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
  card: {
    margin: 16,
    marginBottom: 8,
  },
  shopInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  shopDetails: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    marginLeft: 4,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    marginBottom: 8,
  },
  logoutContainer: {
    padding: 16,
    paddingTop: 8,
  },
  logoutButton: {
    borderColor: '#ff4444',
  },
});

export default ProfileScreen; 