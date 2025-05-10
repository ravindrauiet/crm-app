// Theme colors for the application
export const lightTheme = {
  primary: '#2196F3',
  accent: '#FF4081',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  error: '#F44336',
  text: '#212121',
  disabled: '#9E9E9E',
  placeholder: '#757575',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF9800',
  card: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  divider: '#E0E0E0',
  elevation: {
    0: '#FFFFFF',
    1: '#F5F5F5',
    2: '#EEEEEE',
    3: '#E0E0E0',
    4: '#D6D6D6',
    5: '#C2C2C2',
    6: '#BBBBBB',
    7: '#AAAAAA',
    8: '#999999',
    9: '#888888',
    10: '#777777',
    11: '#666666',
    12: '#555555',
    13: '#444444',
    14: '#333333',
    15: '#222222',
    16: '#111111',
  }
};

export const darkTheme = {
  primary: '#90CAF9',
  accent: '#FF80AB',
  background: '#121212',
  surface: '#1E1E1E',
  error: '#CF6679',
  text: '#FFFFFF',
  disabled: '#757575',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  notification: '#FFB74D',
  card: '#1E1E1E',
  border: '#333333',
  success: '#81C784',
  warning: '#FFB74D',
  info: '#90CAF9',
  divider: '#333333',
  elevation: {
    0: '#121212',
    1: '#1E1E1E',
    2: '#222222',
    3: '#252525',
    4: '#272727',
    5: '#2C2C2C',
    6: '#2F2F2F',
    7: '#323232',
    8: '#353535',
    9: '#383838',
    10: '#3C3C3C',
    11: '#404040',
    12: '#444444',
    13: '#484848',
    14: '#4F4F4F',
    15: '#555555',
    16: '#5C5C5C',
  }
};

// Helper functions for theme management
export const getContrastColor = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance using the relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

export const alpha = (color, opacity) => {
  // Extract RGB components
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Return as rgba
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Typography
export const typography = {
  fontFamilyRegular: 'System',
  fontFamilyMedium: 'System',
  fontFamilyBold: 'System',
  
  titleLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.15,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: 'normal',
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: 'normal',
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: 'normal',
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
}; 