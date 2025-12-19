// Test script to validate the FCM fix
// Run this in the browser console to test the retailer validation

async function testRetailerValidation() {
  console.log('🧪 Testing retailer validation...');
  
  // Test the problematic retailer ID
  const problematicId = 'wYkRvGkpy9avV3SwxmpvuOh60hr2';
  
  try {
    // Import the validator function (if running in the app context)
    const { validateRetailer } = await import('/src/lib/retailer-validator.ts');
    
    const isValid = await validateRetailer(problematicId);
    console.log(`📋 Retailer ${problematicId} is valid:`, isValid);
    
    // Test localStorage cleanup
    const { validateAndCleanRetailerId } = await import('/src/lib/retailer-validator.ts');
    
    // Set the problematic ID first
    localStorage.setItem('retailerId', problematicId);
    console.log('📝 Set problematic retailerId in localStorage');
    
    // Run validation and cleanup
    const cleanedId = await validateAndCleanRetailerId();
    console.log('🧹 After validation/cleanup, retailerId:', cleanedId);
    console.log('📋 Current localStorage retailerId:', localStorage.getItem('retailerId'));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Manual cleanup function
function forceCleanStaleData() {
  console.log('🧹 Force cleaning stale data...');
  
  // Remove the specific problematic ID
  const problematicId = 'wYkRvGkpy9avV3SwxmpvuOh60hr2';
  const currentId = localStorage.getItem('retailerId');
  
  if (currentId === problematicId) {
    localStorage.removeItem('retailerId');
    console.log('✅ Removed problematic retailerId:', problematicId);
  } else {
    console.log('ℹ️ Current retailerId is different:', currentId);
  }
  
  // Clear all related data
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('retailer') || key.includes('fcm') || key.includes('device'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('🗑️ Removed:', key);
  });
  
  console.log(`✅ Cleaned ${keysToRemove.length} items. Please refresh the page.`);
}

// Export functions for global access
window.testRetailerValidation = testRetailerValidation;
window.forceCleanStaleData = forceCleanStaleData;

console.log('🔧 Test functions loaded. Use testRetailerValidation() or forceCleanStaleData()');