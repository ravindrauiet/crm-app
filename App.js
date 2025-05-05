import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { checkAuth } from './src/store/slices/authSlice';

export default function App() {
  useEffect(() => {
    store.dispatch(checkAuth());
  }, []);

  return (
    <StoreProvider store={store}>
      <PaperProvider>
        <AppNavigator />
      </PaperProvider>
    </StoreProvider>
  );
}
