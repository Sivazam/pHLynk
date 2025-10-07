#!/usr/bin/env node

/**
 * Test with the actual tenant/wholesaler data structure
 */

const TEST_DATA = {
  retailerId: 'AAx2VtFVmIMRG0LJYhwg',
  paymentId: 'Xhw1N8W52WNgc4DfUSdb', 
  amount: 1500,
  lineWorkerName: 'Suresh', // ACTUAL DISPLAY NAME FROM DATABASE
  lineWorkerId: '1npZCeZn67QQg52IDC2uCcJR86k1', // ACTUAL LINE WORKER ID
  retailerName: 'Med Plus',
  retailerArea: 'O3N0ZV0eEn3wrb96ZBkV',
  wholesalerName: 'ganesh medicals', // ACTUAL WHOLESALER NAME FROM TENANTS
  collectionDate: new Date().toLocaleDateString('en-IN')
};

async function testWithCorrectTenantStructure() {
  console.log('🧪 TESTING WITH CORRECT TENANT/WHOLESALER STRUCTURE');
  console.log('==================================================\n');
  
  console.log('📋 Line Worker Details:');
  console.log('   ID: 1npZCeZn67QQg52IDC2uCcJR86k1');
  console.log('   displayName: "Suresh"');
  console.log('   tenantId: "38Lcd3DIkVJuWFnrZAAL"');
  
  console.log('\n📋 Wholesaler/Tenant Details:');
  console.log('   ID: 38Lcd3DIkVJuWFnrZAAL');
  console.log('   Name: "ganesh medicals"');
  console.log('   Contact Phone: "9014882779"');
  console.log('   Contact Email: "ganni@m.com"');
  
  const requestData = { data: TEST_DATA };
  
  console.log('\n📤 Request Data:', JSON.stringify(requestData, null, 2));
  
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
      console.log('✅ The fix works - SMS sent to ganesh medicals');
      console.log('📱 Phone: 9014882779');
    } else if (response.status === 404 && responseText.includes('not assigned')) {
      console.log('\n⚠️ LINE WORKER FOUND BUT NOT ASSIGNED TO WHOLESALER');
      console.log('🔍 This means the cloud function needs to be deployed');
      console.log('📝 The updated function uses tenantId instead of wholesalerId');
    } else if (response.status === 404 && responseText.includes('phone number not found')) {
      console.log('\n⚠️ WHOLESALER FOUND BUT NO PHONE NUMBER');
      console.log('🔍 This means the cloud function is looking in wrong collection');
      console.log('📝 Should look in "tenants" collection, not "users"');
    } else {
      console.log('\n❌ Other error:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testWithCorrectTenantStructure();