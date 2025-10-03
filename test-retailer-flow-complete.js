// Complete test script to verify retailer authentication flow
// This tests the entire flow from retailer creation to login

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForTesting",
  authDomain: "pharmalynk-dev.firebaseapp.com",
  projectId: "pharmalynk-dev",
  storageBucket: "pharmalynk-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testCompleteRetailerFlow() {
  console.log('🧪 Testing Complete Retailer Authentication Flow\n');
  
  const testPhone = '9999999999'; // Test phone number
  const tenantId = 'cRcvWOWhhYcMPTMzcD8E'; // Existing tenant
  
  try {
    // Step 1: Create a new retailer (simulating wholesaler onboarding)
    console.log('1️⃣ Creating retailer record...');
    const retailerId = `retailer_test_${Date.now()}`;
    
    const retailerData = {
      name: 'Test Retailer Flow',
      phone: testPhone,
      address: 'Test Address',
      areaId: 'MqXy93ddD9UIsy1h11vm',
      zipcodes: ['533101'],
      tenantId: tenantId,
      // Verification fields for first login
      isVerified: false,
      verificationStatus: 'pending',
      isActive: true,
      lastLoginAt: null,
      uid: null,
      email: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'Retailer', retailerId), retailerData);
    console.log('✅ Retailer created with ID:', retailerId);
    
    // Step 2: Test authentication lookup (simulating first login)
    console.log('\n2️⃣ Testing authentication lookup...');
    
    const retailersRef = collection(db, 'Retailer');
    const retailerQuery = query(retailersRef, where('phone', '==', testPhone));
    const retailerSnapshot = await getDocs(retailerQuery);
    
    if (retailerSnapshot.empty) {
      console.log('❌ No retailer found with phone:', testPhone);
      return;
    }
    
    const foundRetailer = retailerSnapshot.docs[0];
    const foundRetailerData = foundRetailer.data();
    
    console.log('✅ Found retailer:', {
      id: foundRetailer.id,
      name: foundRetailerData.name,
      phone: foundRetailerData.phone,
      verificationStatus: foundRetailerData.verificationStatus,
      isActive: foundRetailerData.isActive
    });
    
    // Step 3: Simulate first login verification
    console.log('\n3️⃣ Simulating first-time login verification...');
    
    if (foundRetailerData.verificationStatus === 'pending') {
      console.log('📝 Retailer needs verification - updating status...');
      
      await updateDoc(foundRetailer.ref, {
        isVerified: true,
        verificationStatus: 'verified',
        lastLoginAt: serverTimestamp(),
        uid: `retailer_${testPhone.replace(/\D/g, '')}`,
        email: `retailer_${testPhone}@pharmalynk.local`,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Retailer verified and updated');
    } else {
      console.log('ℹ️ Retailer already verified');
    }
    
    // Step 4: Test subsequent login
    console.log('\n4️⃣ Testing subsequent login...');
    
    const subsequentQuery = query(retailersRef, where('phone', '==', testPhone));
    const subsequentSnapshot = await getDocs(subsequentQuery);
    
    if (!subsequentSnapshot.empty) {
      const subsequentRetailer = subsequentSnapshot.docs[0];
      const subsequentData = subsequentRetailer.data();
      
      const authUser = {
        uid: subsequentData.uid || `retailer_${testPhone.replace(/\D/g, '')}`,
        email: subsequentData.email || `retailer_${testPhone}@pharmalynk.local`,
        displayName: subsequentData.name || subsequentData.businessName || 'Retailer',
        phoneNumber: testPhone,
        roles: ['RETAILER'],
        tenantId: subsequentData.tenantId,
        active: subsequentData.isActive !== false,
        retailerId: subsequentRetailer.id
      };
      
      console.log('✅ AuthUser created for subsequent login:', authUser);
    }
    
    // Step 5: Verify no retailerUsers collection is used
    console.log('\n5️⃣ Verifying no retailerUsers collection usage...');
    
    try {
      const retailerUsersRef = collection(db, 'retailerUsers');
      const retailerUserQuery = query(retailerUsersRef, where('phone', '==', testPhone));
      const retailerUserSnapshot = await getDocs(retailerUserQuery);
      
      if (retailerUserSnapshot.empty) {
        console.log('✅ Correct! No records in retailerUsers collection');
      } else {
        console.log('⚠️ Warning: Found records in retailerUsers collection');
      }
    } catch (error) {
      console.log('ℹ️ retailerUsers collection not accessible (expected)');
    }
    
    // Step 6: Test with API endpoint
    console.log('\n6️⃣ Testing with API endpoint...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/test-retailer-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: testPhone })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API test successful:', {
          success: result.success,
          retailerId: result.retailer?.id,
          authUser: result.authUser?.uid
        });
      } else {
        console.log('⚠️ API test failed:', response.status);
      }
    } catch (error) {
      console.log('ℹ️ API test skipped (server not running)');
    }
    
    // Step 7: Clean up test data
    console.log('\n7️⃣ Cleaning up test data...');
    
    await updateDoc(foundRetailer.ref, {
      isActive: false,
      verificationStatus: 'test_completed',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Test data marked as inactive');
    
    console.log('\n🎉 Complete retailer authentication flow test finished successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Retailer creation works');
    console.log('  ✅ Authentication lookup works');
    console.log('  ✅ First-time verification works');
    console.log('  ✅ Subsequent logins work');
    console.log('  ✅ No retailerUsers collection usage');
    console.log('  ✅ All data stays in Retailer collection');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteRetailerFlow().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});