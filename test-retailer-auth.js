// Test script to verify retailer authentication flow
// This simulates the complete flow from wholesaler onboarding to retailer login

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs } = require('firebase/firestore');

// Firebase config (use your actual config)
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

async function testRetailerFlow() {
  console.log('🧪 Testing Retailer Authentication Flow\n');
  
  const testPhone = '9014882779'; // retailer1's phone
  const tenantId = 'TENANT_123';
  
  try {
    // Step 1: Check if retailer exists in Retailer collection
    console.log('1️⃣ Checking if retailer exists in Retailer collection...');
    const retailersRef = collection(db, 'Retailer');
    const retailerQuery = query(retailersRef, where('phone', '==', testPhone));
    const retailerSnapshot = await getDocs(retailerQuery);
    
    if (retailerSnapshot.empty) {
      console.log('❌ No retailer found with phone:', testPhone);
      return;
    }
    
    const retailerDoc = retailerSnapshot.docs[0];
    const retailerData = retailerDoc.data();
    
    console.log('✅ Found retailer:', {
      id: retailerDoc.id,
      name: retailerData.name,
      phone: retailerData.phone,
      isVerified: retailerData.isVerified,
      verificationStatus: retailerData.verificationStatus,
      isActive: retailerData.isActive
    });
    
    // Step 2: Simulate first login verification
    console.log('\n2️⃣ Simulating first-time login verification...');
    
    if (retailerData.verificationStatus === 'pending') {
      console.log('📝 Retailer needs verification - updating status...');
      
      // Update retailer with verification data
      const retailerRef = doc(db, 'Retailer', retailerDoc.id);
      await setDoc(retailerRef, {
        isVerified: true,
        verificationStatus: 'verified',
        lastLoginAt: new Date(),
        uid: `retailer_${testPhone.replace(/\D/g, '')}`,
        email: retailerData.email || `retailer_${testPhone}@pharmalynk.local`
      }, { merge: true });
      
      console.log('✅ Retailer verified and updated');
    } else {
      console.log('ℹ️ Retailer already verified');
    }
    
    // Step 3: Test authentication lookup
    console.log('\n3️⃣ Testing authentication lookup...');
    
    // Simulate what AuthContext does
    const authQuery = query(retailersRef, where('phone', '==', testPhone));
    const authSnapshot = await getDocs(authQuery);
    
    if (!authSnapshot.empty) {
      const authRetailerDoc = authSnapshot.docs[0];
      const authRetailerData = authRetailerDoc.data();
      
      const authUser = {
        uid: authRetailerData.uid || `retailer_${testPhone.replace(/\D/g, '')}`,
        email: authRetailerData.email || `retailer_${testPhone}@pharmalynk.local`,
        displayName: authRetailerData.name || authRetailerData.businessName || 'Retailer',
        phoneNumber: testPhone,
        roles: ['RETAILER'],
        tenantId: authRetailerData.tenantId,
        active: authRetailerData.isActive !== false,
        retailerId: authRetailerDoc.id
      };
      
      console.log('✅ AuthUser created successfully:', authUser);
    }
    
    // Step 4: Verify no retailerUsers collection is used
    console.log('\n4️⃣ Verifying retailerUsers collection is not used...');
    const retailerUsersRef = collection(db, 'retailerUsers');
    const retailerUserQuery = query(retailerUsersRef, where('phone', '==', testPhone));
    const retailerUserSnapshot = await getDocs(retailerUserQuery);
    
    if (retailerUserSnapshot.empty) {
      console.log('✅ Correct! No records in retailerUsers collection');
    } else {
      console.log('⚠️ Warning: Found records in retailerUsers collection');
    }
    
    console.log('\n🎉 Retailer authentication flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRetailerFlow().then(() => {
  console.log('\n✨ Test finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});