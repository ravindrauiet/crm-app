import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Surface, Button, Avatar, Divider, useTheme, IconButton, TextInput, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { updateUser } from '../../store/slices/authSlice';

export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    profileImage: null
  });
  const [stats, setStats] = useState({
    totalRepairs: 0,
    activeRepairs: 0,
    completedRepairs: 0,
    totalSpent: 0
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        profileImage: user.profileImage || null
      });
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setStats({
          totalRepairs: userData.totalRepairs || 0,
          activeRepairs: userData.activeRepairs || 0,
          completedRepairs: userData.completedRepairs || 0,
          totalSpent: userData.totalSpent || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        updatedAt: new Date()
      });

      dispatch(updateUser({
        ...user,
        ...formData
      }));

      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEditModal = () => (
    <Portal>
      <Modal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          
          <TextInput
            label="Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="Address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowEditModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              loading={loading}
              style={styles.modalButton}
            >
              Save Changes
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Surface style={styles.header}>
          <View style={styles.profileHeader}>
            <Avatar.Image
              size={100}
              source={formData.profileImage ? { uri: formData.profileImage } : require('../../../assets/default-avatar.png')}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.name}>
                {formData.name || 'Add Your Name'}
              </Text>
              <Text variant="bodyMedium" style={styles.email}>
                {user.email}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowEditModal(true)}
                style={styles.editButton}
                icon="pencil"
              >
                Edit Profile
              </Button>
            </View>
          </View>
        </Surface>

        <Surface style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="tools" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium">{stats.totalRepairs}</Text>
              <Text variant="bodySmall">Total Repairs</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium">{stats.activeRepairs}</Text>
              <Text variant="bodySmall">Active Repairs</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium">{stats.completedRepairs}</Text>
              <Text variant="bodySmall">Completed</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="currency-usd" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium">${stats.totalSpent}</Text>
              <Text variant="bodySmall">Total Spent</Text>
            </View>
          </View>
        </Surface>

        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="phone" size={20} color="#666" />
            <Text style={styles.infoText}>{formData.phone || 'Add phone number'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
            <Text style={styles.infoText}>{formData.address || 'Add address'}</Text>
          </View>
        </Surface>

        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Settings</Text>
          </View>
          <Divider style={styles.divider} />
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.settingButton}
            icon="bell-outline"
          >
            Notification Settings
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Security')}
            style={styles.settingButton}
            icon="shield-outline"
          >
            Security Settings
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Help')}
            style={styles.settingButton}
            icon="help-circle-outline"
          >
            Help & Support
          </Button>
        </Surface>
      </ScrollView>
      {renderEditModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 12,
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginLeft: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
  },
  settingButton: {
    marginBottom: 12,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
}); 