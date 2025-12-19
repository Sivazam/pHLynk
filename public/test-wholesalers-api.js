// Test script to check wholesalers API
// Run this in browser console on the retailer dashboard

async function testWholesalersAPI() {
  console.log('🧪 Testing wholesalers API...');
  
  try {
    // Get current retailer phone from the dashboard
    const retailerPhone = '9014882779'; // Test phone number
    
    console.log('📱 Testing with phone:', retailerPhone);
    
    // Test the API directly
    const response = await fetch(`/api/reports/wholesalers?phone=${retailerPhone}`);
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📡 Response data:', data);
    
    if (data.success) {
      console.log('✅ API call successful');
      console.log('📊 Wholesalers found:', data.data?.wholesalers?.length || 0);
      data.data?.wholesalers?.forEach(w => {
        console.log(`  - ${w.name} (${w.id})`);
      });
    } else {
      console.error('❌ API call failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test function to check retailer data
async function testRetailerData() {
  console.log('🧪 Testing retailer data...');
  
  try {
    const retailerPhone = '9014882779';
    
    // Test retailer lookup
    const response = await fetch(`/api/retailer/current?phone=${retailerPhone}`);
    console.log('📡 Retailer API Response status:', response.status);
    
    const data = await response.json();
    console.log('📡 Retailer API Response data:', data);
    
  } catch (error) {
    console.error('❌ Retailer test failed:', error);
  }
}

// Test function to check tenants collection
async function testTenantsCollection() {
  console.log('🧪 Testing tenants collection...');
  
  try {
    const response = await fetch('/api/health');
    console.log('📡 Health check status:', response.status);
    
    // This is just to test if the server is responding
    const data = await response.json();
    console.log('📡 Health check response:', data);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

// Export functions for global access
window.testWholesalersAPI = testWholesalersAPI;
window.testRetailerData = testRetailerData;
window.testTenantsCollection = testTenantsCollection;

console.log('🔧 Test functions loaded. Use testWholesalersAPI(), testRetailerData(), or testTenantsCollection()');