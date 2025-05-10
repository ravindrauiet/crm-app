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
      elevation: {
        level0: colors.elevation[0],
        level1: colors.elevation[1],
        level2: colors.elevation[2],
        level3: colors.elevation[3],
        level4: colors.elevation[4],
        level5: colors.elevation[5],
        level6: colors.elevation[6],
        level7: colors.elevation[7],
        level8: colors.elevation[8],
        level9: colors.elevation[9],
        level10: colors.elevation[10],
        level11: colors.elevation[11],
        level12: colors.elevation[12],
        level13: colors.elevation[13],
        level14: colors.elevation[14],
        level15: colors.elevation[15],
        level16: colors.elevation[16],
      }
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