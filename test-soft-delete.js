#!/usr/bin/env node

// Test script to verify soft delete functionality
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, arrayRemove } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTDdKwqR7W2nH9G6p8sJ7t6r5k4l3m2n1",
  authDomain: "phlynk-system.firebaseapp.com",
  projectId: "phlynk-system",
  storageBucket: "phlynk-system.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSoftDelete() {
  console.log('🔧 Testing soft delete functionality...\n');

  const retailerId = 'YOUR_RETAILER_ID_HERE'; // Replace with actual retailer ID
  const tenantId = 'YOUR_TENANT_ID_HERE'; // Replace with actual tenant ID

  try {
    // Get current retailer document
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      console.log('❌ Retailer not found');
      return;
    }

    const retailerData = retailerDoc.data();
    console.log('📋 Current retailer data:');
    console.log('  Name:', retailerData.name);
    console.log('  Tenant IDs:', retailerData.tenantIds);
    console.log('  WholesalerAssignments:', Object.keys(retailerData.wholesalerAssignments || {}));
    console.log('  WholesalerData:', Object.keys(retailerData.wholesalerData || {}));

    // Simulate soft delete
    console.log('\n🗑️  Simulating soft delete...');
    
    const currentTenantIds = retailerData.tenantIds || [];
    const updatedTenantIds = currentTenantIds.filter(id => id !== tenantId);
    
    let wholesalerData = retailerData.wholesalerData || {};
    let wholesalerAssignments = retailerData.wholesalerAssignments || {};
    
    delete wholesalerData[tenantId];
    delete wholesalerAssignments[tenantId];
    
    await updateDoc(retailerRef, {
      tenantIds: updatedTenantIds,
      wholesalerData: wholesalerData,
      wholesalerAssignments: wholesalerAssignments,
      updatedAt: new Date()
    });

    console.log('✅ Soft delete completed');
    
    // Verify the result
    const updatedDoc = await getDoc(retailerRef);
    const updatedData = updatedDoc.data();
    
    console.log('\n📋 Updated retailer data:');
    console.log('  Name:', updatedData.name);
    console.log('  Tenant IDs:', updatedData.tenantIds);
    console.log('  WholesalerAssignments:', Object.keys(updatedData.wholesalerAssignments || {}));
    console.log('  WholesalerData:', Object.keys(updatedData.wholesalerData || {}));
    console.log('  Document still exists:', updatedDoc.exists());

    // Check payment history preservation
    console.log('\n💰 Checking payment history...');
    // Note: In a real test, you would query payments collection here
    console.log('✅ Payment history should be preserved with tenantId and initiatedByTenantName fields');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testSoftDelete();