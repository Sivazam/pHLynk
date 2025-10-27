#!/usr/bin/env node

// Test script to verify wholesaler assignments fix
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

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

async function testWholesalerAssignments() {
  console.log('🔧 Testing wholesaler assignments fix...\n');

  const retailerId = 'YOUR_RETAILER_ID_HERE'; // Replace with actual retailer ID
  const tenantId = 'bi8oOBrrtxrA5Laq4eId'; // New wholesaler tenant ID
  const areaId = 'xxVyL54B0ah7g4t8Lo7P'; // Area ID
  const zipcodes = ['533101'];

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
    console.log('  WholesalerAssignments:', retailerData.wholesalerAssignments);
    console.log('  WholesalerData:', retailerData.wholesalerData);

    // Check if wholesalerAssignments has the correct structure for new tenant
    const assignment = retailerData.wholesalerAssignments?.[tenantId];
    const wholesalerData = retailerData.wholesalerData?.[tenantId];

    console.log('\n🔍 New wholesaler assignment check:');
    console.log('  Assignment exists:', !!assignment);
    console.log('  WholesalerData exists:', !!wholesalerData);

    if (assignment) {
      console.log('  Assignment areaId:', assignment.areaId);
      console.log('  Assignment zipcodes:', assignment.zipcodes);
    }

    if (wholesalerData) {
      console.log('  WholesalerData currentAreaId:', wholesalerData.currentAreaId);
      console.log('  WholesalerData currentZipcodes:', wholesalerData.currentZipcodes);
    }

    // Test manual fix if needed
    if (!assignment || !assignment.areaId) {
      console.log('\n🔧 Applying manual fix...');
      
      const updatedAssignments = {
        ...retailerData.wholesalerAssignments,
        [tenantId]: {
          areaId: areaId,
          zipcodes: zipcodes,
          assignedAt: new Date()
        }
      };

      await updateDoc(retailerRef, {
        wholesalerAssignments: updatedAssignments
      });

      console.log('✅ Manual fix applied');
    } else {
      console.log('\n✅ Wholesaler assignments are correctly structured');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testWholesalerAssignments();