// Currency formatting utility
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return '₹' + parseFloat(amount).toFixed(2);
};

// Format currency without symbol
export const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  return parseFloat(amount).toFixed(2);
};

// Format currency for input fields
export const formatCurrencyInput = (amount) => {
  if (amount === undefined || amount === null) return '';
  return parseFloat(amount).toFixed(2);
}; 