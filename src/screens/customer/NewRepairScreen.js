import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const NewRepairScreen = ({ navigation }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    deviceType: '',
    issue: '',
    description: '',
    preferredDate: '',
    location: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    // Validate form
    const newErrors = {};
    if (!formData.deviceType) newErrors.deviceType = 'Device type is required';
    if (!formData.issue) newErrors.issue = 'Issue description is required';
    if (!formData.preferredDate) newErrors.preferredDate = 'Preferred date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // TODO: Submit repair request to backend
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="headlineMedium">New Repair Request</Text>
          <Text variant="bodyLarge">Fill in the details below</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Device Type"
            value={formData.deviceType}
            onChangeText={(text) => setFormData({ ...formData, deviceType: text })}
            error={!!errors.deviceType}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.deviceType}>
            {errors.deviceType}
          </HelperText>

          <TextInput
            label="Issue"
            value={formData.issue}
            onChangeText={(text) => setFormData({ ...formData, issue: text })}
            error={!!errors.issue}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.issue}>
            {errors.issue}
          </HelperText>

          <TextInput
            label="Detailed Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <TextInput
            label="Preferred Date"
            value={formData.preferredDate}
            onChangeText={(text) => setFormData({ ...formData, preferredDate: text })}
            error={!!errors.preferredDate}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.preferredDate}>
            {errors.preferredDate}
          </HelperText>

          <TextInput
            label="Location"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
          >
            Submit Request
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
  form: {
    padding: 20,
  },
  input: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  submitButton: {
    marginTop: 20,
  },
});

export default NewRepairScreen; 