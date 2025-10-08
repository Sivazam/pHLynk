#!/usr/bin/env node

/**
 * Test with the actual line worker display name
 */

const TEST_DATA = {
  retailerId: 'AAx2VtFVmIMRG0LJYhwg',
  paymentId: 'Xhw1N8W52WNgc4DfUSdb', 
  amount: 1500,
  lineWorkerName: 'Suresh', // ACTUAL DISPLAY NAME FROM DATABASE
  lineWorkerId: '1npZCeZn67QQg52IDC2uCcJR86k1', // ACTUAL LINE WORKER ID
  retailerName: 'Med Plus',
  retailerArea: 'O3N0ZV0eEn3wrb96ZBkV',
  wholesalerName: 'Test Wholesaler',
  collectionDate: new Date().toLocaleDateString('en-IN')
};

async function testWithCorrectName() {
  console.log('🧪 TESTING WITH CORRECT LINE WORKER NAME');
  console.log('======================================\n');
  
  console.log('📋 Line Worker Details:');
  console.log('   ID: 1npZCeZn67QQg52IDC2uCcJR86k1');
  console.log('   displayName: "Suresh"');
  console.log('   Email: l9@m.com');
  console.log('   Phone: 8888888888');
  console.log('   Assigned Areas: O3N0ZV0eEn3wrb96ZBkV\n');
  
  const requestData = { data: TEST_DATA };
  
  console.log('📤 Request Data:', JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(
      'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      }
    );
    
    console.log('\n📥 Response Status:', response.status);
    
    const responseText = await response.text();
    console.log('📥 Response Body:', responseText);
    
    if (response.ok) {
      console.log('\n🎉 SUCCESS! Wholesaler SMS should be sent now!');
      console.log('✅ The fix works - deploy the updated cloud function');
    } else if (response.status === 404 && responseText.includes('not assigned')) {
      console.log('\n⚠️ LINE WORKER FOUND BUT NOT ASSIGNED TO WHOLESALER');
      console.log('🔍 This means the line worker exists but has no wholesalerId');
      console.log('📝 Need to check if line worker has wholesalerId field');
    } else if (response.status === 404 && responseText.includes('phone number not found')) {
      console.log('\n⚠️ WHOLESALER FOUND BUT NO PHONE NUMBER');
      console.log('🔍 Line worker is assigned to wholesaler but wholesaler has no phone');
      console.log('📝 Need to check wholesaler document for phone field');
    } else {
      console.log('\n❌ Other error:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testWithCorrectName();