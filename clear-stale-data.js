// Clear stale retailer data from localStorage
console.log('🧹 Clearing stale retailer data...');

// Remove problematic retailer ID
localStorage.removeItem('retailerId');
localStorage.removeItem('logged_out_at');

// Clear any other retailer-related data
Object.keys(localStorage).forEach(key => {
  if (key.includes('retailer') || key.includes('fcm') || key.includes('device')) {
    console.log('Removing:', key);
    localStorage.removeItem(key);
  }
});

console.log('✅ Stale data cleared. Please refresh the page.');