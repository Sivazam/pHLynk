/**
 * Test Deployed Firebase Functions
 * This script tests the actual deployed cloud functions
 */

const fetch = require('node-fetch');

async function testDeployedFunctions() {
  console.log('🚀 Testing Deployed Firebase Functions...\n');
  
  const functionUrls = [
    'https://us-central1-pharmalynkk.cloudfunctions.net/sendRetailerPaymentSMS',
    'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS',
    'https://us-central1-pharmalynkk.cloudfunctions.net/processSMSResponse'
  ];
  
  const testData = {
    retailerId: 'test-retailer-123',
    paymentId: 'test-payment-123',
    amount: 1500,
    lineWorkerName: 'Test Line Worker',
    retailerName: 'Test Retailer',
    retailerArea: 'Test Area',
    wholesalerName: 'Test Wholesaler',
    collectionDate: '30/09/2025'
  };
  
  for (const url of functionUrls) {
    console.log(`🌐 Testing: ${url.split('/').pop()}`);
    
    try {
      // Test OPTIONS request
      const optionsResponse = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      console.log(`   ✅ OPTIONS: ${optionsResponse.status}`);
      
      // Test POST request
      const postResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        },
        body: JSON.stringify({
          data: testData
        })
      });
      
      const responseText = await postResponse.text();
      console.log(`   📮 POST: ${postResponse.status}`);
      console.log(`   📋 Response: ${responseText.substring(0, 200)}...`);
      
      if (postResponse.status === 404) {
        console.log('   ❌ Function not deployed or URL incorrect');
      } else if (postResponse.status === 400) {
        console.log('   ✅ Function deployed and handling requests');
      } else {
        console.log(`   ⚠️  Unexpected status: ${postResponse.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Test different URL formats
async function testAlternativeUrls() {
  console.log('🔍 Testing Alternative URL Formats...\n');
  
  const alternatives = [
    'https://sendRetailerPaymentSMS-pharmalynkk.uc.r.appspot.com',
    'https://us-central1-pharmalynkk.cloudfunctions.net/sendRetailerPaymentSMS',
    'https://pharmalynkk.web.app/sendRetailerPaymentSMS'
  ];
  
  for (const url of alternatives) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`✅ ${url}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${url}: ${error.message}`);
    }
  }
}

// Run tests
if (require.main === module) {
  testDeployedFunctions()
    .then(() => testAlternativeUrls())
    .catch(console.error);
}

module.exports = { testDeployedFunctions, testAlternativeUrls };