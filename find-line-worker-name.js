#!/usr/bin/env node

/**
 * Script to find the actual display name of the line worker
 * This helps identify the correct name that should be passed to the cloud function
 */

const LINE_WORKER_ID = '1npZCeZn67QQg52IDC2uCcJR86k1'; // From console logs

async function findLineWorkerDetails() {
  console.log('🔍 LOOKING FOR LINE WORKER DETAILS');
  console.log('===================================\n');
  
  console.log('📋 Line Worker ID from console logs:', LINE_WORKER_ID);
  console.log('🎯 Goal: Find the correct displayName/name for this line worker\n');
  
  // Since we can't directly query Firebase from this script,
  // let's create a test that tries common display name patterns
  
  const possibleNames = [
    'Demo Line Worker',
    'Test Line Worker',
    'Line Worker',
    'John Doe',
    'Jane Smith',
    'Sales Rep',
    'Collection Agent',
    'Field Agent',
    'Delivery Person',
    'Sales Executive',
    'Collection Executive',
    'Pharma Rep',
    'Medical Rep'
  ];
  
  console.log('🧪 Testing possible display names...\n');
  
  let foundName = null;
  
  for (const name of possibleNames) {
    console.log(`🔍 Testing: "${name}"`);
    
    const testData = {
      data: {
        retailerId: 'AAx2VtFVmIMRG0LJYhwg',
        paymentId: 'Xhw1N8W52WNgc4DfUSdb',
        amount: 1500,
        lineWorkerName: name,
        retailerName: 'Med Plus',
        retailerArea: 'O3N0ZV0eEn3wrb96ZBkV',
        wholesalerName: 'Test Wholesaler',
        collectionDate: new Date().toLocaleDateString('en-IN')
      }
    };
    
    try {
      const response = await fetch(
        'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData)
        }
      );
      
      const responseText = await response.text();
      
      if (response.status === 404 && responseText.includes('not found')) {
        console.log(`   ❌ Not found with this name`);
      } else if (response.status === 404 && responseText.includes('not assigned')) {
        console.log(`   ✅ FOUND! But not assigned to wholesaler`);
        foundName = name;
        break;
      } else if (response.status === 404 && responseText.includes('phone number not found')) {
        console.log(`   ✅ FOUND! Assigned to wholesaler but no phone number`);
        foundName = name;
        break;
      } else if (response.ok) {
        console.log(`   ✅ FOUND AND WORKS! SMS sent successfully`);
        foundName = name;
        break;
      } else {
        console.log(`   ⚠️ Unexpected response: ${response.status} - ${responseText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (foundName) {
    console.log(`🎉 SUCCESS! Found line worker display name: "${foundName}"`);
    console.log('\n📝 TEMPORARY FIX (if you can\'t deploy cloud function):');
    console.log('1. Update the frontend to use this exact name');
    console.log('2. In /src/app/api/otp/verify/route.ts');
    console.log('3. Replace the lineWorkerName extraction with:');
    console.log(`   const lineWorkerName = "${foundName}"; // Hardcoded temporary fix`);
    console.log('\n⚠️ This is a temporary workaround. The proper fix is to deploy the updated cloud function.');
  } else {
    console.log('❌ Could not find the line worker display name');
    console.log('\n🔍 Next steps:');
    console.log('1. Check Firebase Console directly for the line worker document');
    console.log('2. Look for the displayName field in the users collection');
    console.log('3. Deploy the updated cloud function that uses lineWorkerId');
  }
}

async function main() {
  await findLineWorkerDetails();
}

main().catch(console.error);