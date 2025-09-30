#!/usr/bin/env node

/**
 * Debug script to test wholesaler SMS function with real data
 */

const TEST_DATA = {
  retailerId: 'AAx2VtFVmIMRG0LJYhwg', // From console logs
  paymentId: 'Xhw1N8W52WNgc4DfUSdb',   // From console logs
  amount: 1500,
  lineWorkerName: 'Test Line Worker',  // This might be the issue
  retailerName: 'Med Plus',            // From console logs
  retailerArea: 'O3N0ZV0eEn3wrb96ZBkV', // From console logs
  wholesalerName: 'Test Wholesaler',
  collectionDate: new Date().toLocaleDateString('en-IN')
};

async function testWholesalerSMS() {
  const url = 'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS';
  
  // Firebase Functions expect data wrapped in a 'data' property
  const requestData = {
    data: TEST_DATA
  };
  
  console.log('🧪 Testing Wholesaler SMS Function...');
  console.log('📤 Test Data:', JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Wholesaler SMS function test PASSED');
    } else {
      console.log('❌ Wholesaler SMS function test FAILED');
      console.log('🔍 Error Details:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

// Test with different line worker names to find the correct one
async function testDifferentLineWorkerNames() {
  const possibleNames = [
    'Test Line Worker',
    'Line Worker',
    'Demo Line Worker',
    'John Doe',
    'Jane Smith'
  ];
  
  for (const name of possibleNames) {
    console.log(`\n🔍 Testing with lineWorkerName: "${name}"`);
    
    const testData = { ...TEST_DATA, lineWorkerName: name };
    const requestData = { data: testData };
    const url = 'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        console.log(`✅ SUCCESS with lineWorkerName: "${name}"`);
        console.log('Response:', responseText);
        return name;
      } else {
        console.log(`❌ FAILED with lineWorkerName: "${name}" - ${response.status}`);
        if (responseText.includes('not found')) {
          console.log('   → Line worker not found with this name');
        } else if (responseText.includes('not assigned')) {
          console.log('   → Line worker found but not assigned to wholesaler');
        } else {
          console.log('   → Other error:', responseText);
        }
      }
    } catch (error) {
      console.log(`❌ Network error with lineWorkerName: "${name}" -`, error.message);
    }
  }
}

async function main() {
  console.log('🔍 WHOLESALER SMS DEBUG SCRIPT');
  console.log('=====================================\n');
  
  await testWholesalerSMS();
  
  console.log('\n🔍 Testing different line worker names...');
  await testDifferentLineWorkerNames();
  
  console.log('\n🏁 Debug script completed');
}

main().catch(console.error);