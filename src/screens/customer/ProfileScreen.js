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
  useTheme 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
  };

  const renderUserInfo = () => {
    if (!user) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Loading...</Title>
          </Card.Content>
        </Card>
      );
    }

    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('') : '?';
    
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.userInfoContent}>
          <Avatar.Text 
            size={80} 
            label={initials}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Title>{user.name || 'User'}</Title>
            <Paragraph>{user.email || 'No email provided'}</Paragraph>
            <Paragraph>{user.phone || 'No phone provided'}</Paragraph>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderMenuItems = () => (
    <Card style={styles.card}>
      <List.Section>
        <List.Item
          title="Personal Information"
          left={props => <List.Icon {...props} icon="account" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider />
        <List.Item
          title="Payment Methods"
          left={props => <List.Icon {...props} icon="credit-card" />}
          onPress={() => navigation.navigate('PaymentMethods')}
        />
        <Divider />
        <List.Item
          title="Notification Settings"
          left={props => <List.Icon {...props} icon="bell" />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <Divider />
        <List.Item
          title="Privacy Policy"
          left={props => <List.Icon {...props} icon="shield-account" />}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
        <Divider />
        <List.Item
          title="Terms of Service"
          left={props => <List.Icon {...props} icon="file-document" />}
          onPress={() => navigation.navigate('TermsOfService')}
        />
      </List.Section>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {renderUserInfo()}
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
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
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