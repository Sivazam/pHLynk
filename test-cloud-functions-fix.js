/**
 * Test script to verify cloud function fixes
 * This tests the actual deployed cloud functions with proper parameter structure
 */

const https = require('https');

// Test data for cloud functions
const testRetailerData = {
  retailerId: "test-retailer-001",
  paymentId: "test-payment-001", 
  amount: 1500,
  lineWorkerName: "Test Line Worker",
  retailerName: "Test Medical Store",
  retailerArea: "Test Area",
  wholesalerName: "Test Wholesaler",
  collectionDate: "20-06-2025"
};

const testWholesalerData = {
  retailerId: "test-retailer-001",
  paymentId: "test-payment-001",
  amount: 1500,
  lineWorkerName: "Test Line Worker", 
  retailerName: "Test Medical Store",
  retailerArea: "Test Area",
  wholesalerName: "Test Wholesaler",
  collectionDate: "20-06-2025"
};

function makeRequest(functionName, testData) {
  return new Promise((resolve, reject) => {
    const url = `https://us-central1-pharmalynkk.cloudfunctions.net/${functionName}`;
    
    // Firebase Functions expect data wrapped in 'data' property for callable functions
    const requestData = {
      data: testData
    };
    
    console.log(`\n🧪 Testing ${functionName}...`);
    console.log(`📤 URL: ${url}`);
    console.log(`📤 Request data:`, JSON.stringify(requestData, null, 2));
    
    const postData = JSON.stringify(requestData);
    
    const options = {
      hostname: 'us-central1-pharmalynkk.cloudfunctions.net',
      port: 443,
      path: `/${functionName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      console.log(`📥 Status Code: ${res.statusCode}`);
      console.log(`📥 Status Text: ${res.statusMessage}`);
      console.log(`📥 Headers:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📥 Response Body:`, data);
        
        try {
          const response = JSON.parse(data);
          console.log(`✅ Parsed Response:`, JSON.stringify(response, null, 2));
          resolve({
            functionName,
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            response
          });
        } catch (parseError) {
          console.error(`❌ Failed to parse response:`, parseError);
          resolve({
            functionName,
            status: res.statusCode,
            success: false,
            error: 'Failed to parse response',
            rawResponse: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ Request error for ${functionName}:`, error);
      resolve({
        functionName,
        status: 0,
        success: false,
        error: error.message
      });
    });
    
    req.write(postData);
    req.end();
  });
}

async function testAllFunctions() {
  console.log('🚀 Starting Cloud Function Tests...\n');
  
  const functions = [
    { name: 'sendRetailerPaymentSMS', data: testRetailerData },
    { name: 'sendWholesalerPaymentSMS', data: testWholesalerData }
  ];
  
  const results = [];
  
  for (const func of functions) {
    try {
      const result = await makeRequest(func.name, func.data);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${func.name}: SUCCESS`);
      } else {
        console.log(`❌ ${func.name}: FAILED`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ ${func.name}: EXCEPTION`, error);
      results.push({
        functionName: func.name,
        status: 0,
        success: false,
        error: error.message
      });
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.functionName}: ${result.status} ${result.error || ''}`);
  });
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n🏁 Overall: ${passed}/${total} functions working correctly`);
  
  if (passed === total) {
    console.log('🎉 All cloud functions are working correctly!');
  } else {
    console.log('⚠️ Some cloud functions need attention.');
  }
}

// Run the tests
testAllFunctions().catch(console.error);