import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, AppState } from 'react-native';
import { lightTheme, darkTheme } from '../utils/theme';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [followSystem, setFollowSystem] = useState(true);

  // Handle app state changes to update theme when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && followSystem) {
        setTheme(deviceTheme);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [deviceTheme, followSystem]);

  // Initial theme loading
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        const savedFollowSystem = await AsyncStorage.getItem('followSystem');
        
        if (savedFollowSystem !== null) {
          const shouldFollowSystem = savedFollowSystem === 'true';
          setFollowSystem(shouldFollowSystem);
          
          if (shouldFollowSystem && deviceTheme) {
            setTheme(deviceTheme);
          } else if (savedTheme) {
            setTheme(savedTheme);
          }
        } else if (deviceTheme) {
          setTheme(deviceTheme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsThemeLoaded(true);
      }
    };

    loadTheme();
  }, [deviceTheme]);

  // Update theme when device theme changes (if followSystem is true)
  useEffect(() => {
    if (followSystem && deviceTheme) {
      setTheme(deviceTheme);
    }
  }, [deviceTheme, followSystem]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    try {
      await AsyncStorage.setItem('theme', newTheme);
      await AsyncStorage.setItem('followSystem', 'false');
      setFollowSystem(false);
      setTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const setSystemTheme = async () => {
    try {
      await AsyncStorage.setItem('followSystem', 'true');
      setFollowSystem(true);
      if (deviceTheme) {
        setTheme(deviceTheme);
      }
    } catch (error) {
      console.error('Failed to set system theme:', error);
    }
  };

  const themeData = {
    theme,
    toggleTheme,
    setSystemTheme,
    followSystem,
    colors: theme === 'light' ? lightTheme : darkTheme,
    isThemeLoaded
  };

  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 