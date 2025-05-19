import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Switch, RadioButton, Divider, useTheme as usePaperTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const SettingsScreen = () => {
  const paperTheme = usePaperTheme();
  const { theme, toggleTheme, setSystemTheme, followSystem, colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <List.Section>
          <List.Subheader style={{ color: colors.text }}>Appearance</List.Subheader>
          
          <List.Item
            title="Dark Mode"
            titleStyle={{ color: colors.text }}
            description="Toggle dark mode on or off"
            descriptionStyle={{ color: colors.disabled }}
            left={props => <List.Icon {...props} icon="theme-light-dark" color={colors.primary} />}
            right={() => (
              <Switch
                value={theme === 'dark'}
                onValueChange={() => {
                  if (followSystem) {
                    // If following system, first disable that
                    setSystemTheme(false);
                  }
                  toggleTheme();
                }}
                color={colors.primary}
                disabled={followSystem}
              />
            )}
          />
          
          <Divider style={{ backgroundColor: colors.divider }} />
          
          <List.Item
            title="Follow System Theme"
            titleStyle={{ color: colors.text }}
            description="Automatically switch theme based on device settings"
            descriptionStyle={{ color: colors.disabled }}
            left={props => <List.Icon {...props} icon="sync" color={colors.primary} />}
            right={() => (
              <Switch
                value={followSystem}
                onValueChange={setSystemTheme}
                color={colors.primary}
              />
            )}
          />
          
          <Divider style={{ backgroundColor: colors.divider }} />
          
          <List.Subheader style={{ color: colors.text }}>Theme Option</List.Subheader>
          
          <RadioButton.Group 
            onValueChange={value => {
              if (value === 'system') {
                setSystemTheme();
              } else {
                if (followSystem) {
                  // First disable follow system
                  setSystemTheme(false);
                }
                if (value !== theme) {
                  toggleTheme();
                }
              }
            }} 
            value={followSystem ? 'system' : theme}
          >
            <RadioButton.Item
              label="Light Mode"
              value="light"
              labelStyle={{ color: colors.text }}
              color={colors.primary}
              uncheckedColor={colors.disabled}
            />
            <RadioButton.Item
              label="Dark Mode"
              value="dark"
              labelStyle={{ color: colors.text }}
              color={colors.primary}
              uncheckedColor={colors.disabled}
            />
            <RadioButton.Item
              label="System Default"
              value="system"
              labelStyle={{ color: colors.text }}
              color={colors.primary}
              uncheckedColor={colors.disabled}
            />
          </RadioButton.Group>
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SettingsScreen; 