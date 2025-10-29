// Test script to verify retailer lookup fix
const { getDocs, collection, query, where } = require('firebase/firestore');
const { db } = require('./lib/firebase');
const { RetailerProfileService } = require('./services/retailer-profile-service');

async function testRetailerLookup() {
  try {
    console.log('🧪 Testing retailer lookup fix...\n');
    
    // Test phone number from the sample document
    const testPhone = '9014882779';
    
    console.log('📞 Testing lookup for phone:', testPhone);
    
    // Test the updated service method
    const retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(testPhone);
    
    if (retailerProfile) {
      console.log('✅ SUCCESS: Found retailer in retailers collection');
      console.log('📊 Retailer data:', {
        id: retailerProfile.id,
        name: retailerProfile.profile?.realName || retailerProfile.name,
        phone: retailerProfile.profile?.phone || retailerProfile.phone,
        email: retailerProfile.profile?.email || retailerProfile.email,
        address: retailerProfile.profile?.address || retailerProfile.address,
        businessType: retailerProfile.profile?.businessType || retailerProfile.businessType,
        licenseNumber: retailerProfile.profile?.licenseNumber || retailerProfile.licenseNumber,
        isVerified: retailerProfile.verification?.isPhoneVerified || retailerProfile.phoneVerified,
        tenantIds: retailerProfile.tenantIds || [],
        assignedLineWorkerId: retailerProfile.assignedLineWorkerId,
        totalPaidAmount: retailerProfile.totalPaidAmount || 0,
        totalPaymentsCount: retailerProfile.totalPaymentsCount || 0,
        lastPaymentDate: retailerProfile.lastPaymentDate,
        recentPaymentsCount: retailerProfile.recentPayments?.length || 0
      });
      
      // Check if it's legacy or new format
      const isLegacyFormat = retailerProfile.name || retailerProfile.phone || retailerProfile.address;
      console.log('📋 Format:', isLegacyFormat ? 'LEGACY' : 'NEW PROFILE');
      
    } else {
      console.log('❌ FAILED: No retailer found');
      
      // Let's check if the document exists with direct query
      console.log('🔍 Checking if document exists with direct query...');
      const retailersRef = collection(db, 'retailers');
      const q = query(retailersRef, where('profile.phone', '==', testPhone));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('✅ Found with direct query - document exists');
        querySnapshot.forEach((doc) => {
          console.log('📄 Document ID:', doc.id);
          console.log('📄 Document data:', doc.data());
        });
      } else {
        console.log('❌ No document found with direct query either');
      }
    }
    
    console.log('\n🎯 Test completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testRetailerLookup();