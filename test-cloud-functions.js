/**
 * Test script to verify Firebase Functions connectivity
 * This script tests the exact same cloud function calls that are made during payment collection
 */

const testCloudFunctions = async () => {
  const firebaseConfig = {
    projectId: "pharmalynkk"
  };

  const testUrls = [
    'sendWholesalerPaymentSMS',
    'sendRetailerPaymentSMS',
    'processSMSResponse'
  ];

  console.log('🧪 Testing Firebase Functions connectivity...\n');

  for (const functionName of testUrls) {
    const functionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;
    
    console.log(`🌐 Testing: ${functionName}`);
    console.log(`📡 URL: ${functionUrl}`);
    
    try {
      // Test with a simple OPTIONS request first
      const optionsResponse = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      console.log(`✅ OPTIONS Response: ${optionsResponse.status} ${optionsResponse.statusText}`);
      console.log(`📋 CORS Headers:`, {
        'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
      });

      // Test with actual POST request (this will likely fail due to auth/data, but should reach the function)
      const testData = {
        retailerId: "test-retailer-id",
        paymentId: "test-payment-id", 
        amount: 100,
        lineWorkerName: "Test Worker",
        retailerName: "Test Retailer",
        retailerArea: "Test Area",
        wholesalerName: "Test Wholesaler",
        collectionDate: new Date().toISOString().split('T')[0]
      };

      const postResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify(testData)
      });

      console.log(`📮 POST Response: ${postResponse.status} ${postResponse.statusText}`);
      
      if (postResponse.ok) {
        const result = await postResponse.json();
        console.log(`✅ Function Response:`, result);
      } else {
        const errorText = await postResponse.text();
        console.log(`❌ Function Error:`, errorText);
        
        // Check if it's an authentication error (expected for unauthenticated calls)
        if (postResponse.status === 401 || postResponse.status === 403) {
          console.log(`🔐 Authentication required (expected for unauthenticated test)`);
        } else if (postResponse.status >= 400 && postResponse.status < 500) {
          console.log(`📋 Client error - function is reachable but data/auth is invalid`);
        } else {
          console.log(`🚨 Server error - function may have issues`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Network error calling ${functionName}:`, error.message);
      
      if (error.message.includes('fetch')) {
        console.log(`🌐 Network connectivity issue - function may not exist or be reachable`);
      } else if (error.message.includes('timeout')) {
        console.log(`⏱️ Timeout issue - function may be slow or unresponsive`);
      }
    }
    
    console.log('---\n');
  }

  console.log('🏁 Firebase Functions connectivity test completed');
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCloudFunctions };
}

// Run if called directly
if (typeof window === 'undefined' && require.main === module) {
  testCloudFunctions();
}