import React from 'react';
import { Provider as StoreProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import SafeThemeProvider from './src/components/SafeThemeProvider';

export default function App() {
  return (
    <StoreProvider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SafeThemeProvider>
            <AppNavigator />
          </SafeThemeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </StoreProvider>
  );
}
