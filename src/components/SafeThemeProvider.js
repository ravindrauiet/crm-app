import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Provider as PaperProvider } from 'react-native-paper';

/**
 * A component that waits for the theme to be loaded before rendering children.
 * This prevents flash of wrong theme color on app startup.
 */
export default function SafeThemeProvider({ children }) {
  const { theme, colors, isThemeLoaded } = useTheme();

  const paperTheme = {
    dark: theme === 'dark',
    colors: {
      primary: colors.primary,
      accent: colors.accent,
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      disabled: colors.disabled,
      placeholder: colors.placeholder,
      backdrop: colors.backdrop,
      notification: colors.notification,
      error: colors.error,
      onSurface: colors.text,
      card: colors.card,
      border: colors.border,
    },
    animation: {
      scale: 1.0,
    },
    roundness: 4,
  };

  if (!isThemeLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      {children}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 