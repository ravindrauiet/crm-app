import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Surface, Button, useTheme, IconButton, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { signOut } from '../../store/slices/authSlice';

export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(true);
  const [shopData, setShopData] = useState(null);
  const [stats, setStats] = useState({
    totalRepairs: 0,
    completedRepairs: 0,
    totalRevenue: 0,
    averageRating: 0
  });

  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      setLoading(true);
      const shopRef = doc(db, 'shops', user.id);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        setShopData(shopDoc.data());
        // Calculate stats from shop data
        const shopStats = shopDoc.data();
        setStats({
          totalRepairs: shopStats.totalRepairs || 0,
          completedRepairs: shopStats.completedRepairs || 0,
          totalRevenue: shopStats.totalRevenue || 0,
          averageRating: shopStats.averageRating || 0
        });
      }
    } catch (error) {
      console.error('Error fetching shop profile:', error);
      Alert.alert('Error', 'Failed to load shop profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    dispatch(signOut());
  };

  const renderStats = () => (
    <Surface style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            {stats.totalRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Total Repairs
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            {stats.completedRepairs}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Completed
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            ${stats.totalRevenue.toFixed(2)}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Revenue
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statValue}>
            {stats.averageRating.toFixed(1)}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Rating
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderProfileSection = () => (
    <Surface style={styles.profileCard}>
      <View style={styles.profileHeader}>
        {shopData?.logo ? (
          <Image source={{ uri: shopData.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.placeholderLogo]}>
            <MaterialCommunityIcons name="store" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text variant="titleLarge">{shopData?.name}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {shopData?.description}
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <List.Section>
        <List.Item
          title="Edit Profile"
          left={props => <List.Icon {...props} icon="account-edit" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditShopProfile')}
        />
        <List.Item
          title="Working Hours"
          left={props => <List.Icon {...props} icon="clock-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('WorkingHours')}
        />
        <List.Item
          title="Services"
          left={props => <List.Icon {...props} icon="tools" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Services')}
        />
      </List.Section>
    </Surface>
  );

  const renderContactSection = () => (
    <Surface style={styles.contactCard}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
      <Divider style={styles.divider} />
      
      <List.Section>
        <List.Item
          title={shopData?.phone || 'Not set'}
          description="Phone"
          left={props => <List.Icon {...props} icon="phone" />}
        />
        <List.Item
          title={shopData?.email || 'Not set'}
          description="Email"
          left={props => <List.Icon {...props} icon="email" />}
        />
        <List.Item
          title={shopData?.address || 'Not set'}
          description="Address"
          left={props => <List.Icon {...props} icon="map-marker" />}
        />
        {shopData?.website && (
          <List.Item
            title={shopData.website}
            description="Website"
            left={props => <List.Icon {...props} icon="web" />}
          />
        )}
      </List.Section>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {renderStats()}
        {renderProfileSection()}
        {renderContactSection()}
        
        <Surface style={styles.settingsCard}>
          <List.Section>
            <List.Item
              title="Settings"
              left={props => <List.Icon {...props} icon="cog" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Settings')}
            />
            <List.Item
              title="Help & Support"
              left={props => <List.Icon {...props} icon="help-circle" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Support')}
            />
            <List.Item
              title="Sign Out"
              left={props => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
              onPress={handleSignOut}
            />
          </List.Section>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
  },
  profileCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  profileHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  placeholderLogo: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  contactCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  settingsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
}); 