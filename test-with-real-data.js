/**
 * Test Cloud Functions with Real Data
 * Use this after creating real test data in Firebase
 */

const fetch = require('node-fetch');

async function testWithRealData() {
  console.log('🚀 Testing Cloud Functions with Real Data...\n');
  
  // Replace with your actual test data from Firebase
  const realTestData = {
    retailerId: 'YOUR_ACTUAL_RETAILER_ID', // Get from Firestore
    paymentId: 'test_payment_' + Date.now(),
    amount: 1500,
    lineWorkerName: 'YOUR_ACTUAL_LINE_WORKER_NAME', // Get from Firestore
    retailerName: 'YOUR_ACTUAL_RETAILER_NAME',
    retailerArea: 'YOUR_ACTUAL_RETAILER_AREA',
    wholesalerName: 'YOUR_ACTUAL_WHOLESALER_NAME',
    collectionDate: new Date().toLocaleDateString('en-GB')
  };
  
  console.log('📋 Test Data:', realTestData);
  
  const functions = [
    'sendRetailerPaymentSMS',
    'sendWholesalerPaymentSMS'
  ];
  
  for (const functionName of functions) {
    const url = `https://us-central1-pharmalynkk.cloudfunctions.net/${functionName}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: realTestData
        })
      });
      
      const result = await response.json();
      
      console.log(`\n🌐 ${functionName}:`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, result);
      
      if (response.ok) {
        console.log('✅ SUCCESS - SMS should be sent!');
      } else {
        console.log('❌ Error - Check data and configuration');
      }
      
    } catch (error) {
      console.log(`❌ ${functionName} failed:`, error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  console.log('⚠️  UPDATE THE TEST DATA FIRST with your real Firebase data');
  console.log('Then run: node test-with-real-data.js\n');
  testWithRealData();
}

module.exports = { testWithRealData };