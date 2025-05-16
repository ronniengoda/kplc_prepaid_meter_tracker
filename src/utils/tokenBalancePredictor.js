/**
 * Token Balance Predictor Utility
 * Handles prediction of remaining token balance based on consumption patterns
 */

// Calculate hourly consumption rate based on transaction history
export const calculateHourlyConsumption = (transactions) => {
  if (!transactions || transactions.length < 2) {
    return null; // Not enough data to calculate rate
  }

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  // Get the two most recent transactions to calculate consumption rate
  const recentPurchases = sortedTransactions.slice(0, 2);
  
  const newerDate = new Date(recentPurchases[0].date);
  const olderDate = new Date(recentPurchases[1].date);
  
  // Calculate time difference in hours
  const hoursDifference = (newerDate - olderDate) / (1000 * 60 * 60);
  
  // If the time difference is too small, return a default value
  if (hoursDifference < 1) {
    return 0.5; // Default value of 0.5 units per hour
  }
  
  // Calculate units consumed between purchases
  const unitsConsumed = recentPurchases[1].units;
  
  // Calculate hourly consumption rate
  return unitsConsumed / hoursDifference;
};

// Predict current token balance based on initial balance, purchases, and consumption rate
export const predictCurrentBalance = (initialBalance, transactions, hourlyRate) => {
  if (initialBalance === null || initialBalance === undefined) {
    return null; // Initial balance not set
  }
  
  if (!hourlyRate) {
    return initialBalance; // Can't predict without consumption rate
  }
  
  // Convert initialBalance to a number to ensure proper calculations
  let currentBalance = Number(initialBalance);
  const now = new Date();
  
  // Add all purchased units to balance
  if (transactions && transactions.length > 0) {
    // Ensure we're working with a sorted copy (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    // Loop through transactions and add units
    sortedTransactions.forEach(transaction => {
      // Ensure units is treated as a number
      currentBalance += Number(transaction.units || 0);
    });
  
    // Calculate time since last purchase in hours
    const lastPurchaseDate = new Date(sortedTransactions[0].date);
    const hoursSinceLastPurchase = (now - lastPurchaseDate) / (1000 * 60 * 60);
    
    // Subtract consumed units based on hourly rate
    currentBalance -= hoursSinceLastPurchase * hourlyRate;
  }
  
  // Ensure balance doesn't go below zero
  return Math.max(0, currentBalance);
};

// Format balance for display with appropriate precision
export const formatBalance = (balance) => {
  if (balance === null || balance === undefined) {
    return '0';
  }
  
  // Format with 1 decimal place
  return parseFloat(balance).toFixed(1);
};

// Check if the balance is low (below threshold)
export const isBalanceLow = (balance, threshold = 10) => {
  return balance !== null && balance < threshold;
};

// Estimate days remaining based on current balance and hourly consumption
export const estimateDaysRemaining = (currentBalance, hourlyRate) => {
  if (currentBalance === null || !hourlyRate || hourlyRate === 0) {
    return null;
  }
  
  const hoursRemaining = currentBalance / hourlyRate;
  return Math.round(hoursRemaining / 24);
}; 