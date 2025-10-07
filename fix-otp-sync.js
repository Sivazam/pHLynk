/**
 * Fix OTP Sync Issue
 * This script patches the RetailerDashboard to work with the new secure_otps collection
 * 
 * The problem: Dashboard is still trying to sync OTPs from retailer document array
 * but OTPs are now stored as individual documents in secure_otps collection
 */

// First, let's create a patch for the syncOTPsFromFirestore function
const patchCode = `
// PATCH: Replace the syncOTPsFromFirestore function in RetailerDashboard.tsx

const syncOTPsFromFirestore = async () => {
  if (!retailer || !tenantId) return;
  
  try {
    console.log('🔄 Syncing OTPs from secure storage...');
    
    // Get OTPs from secure storage instead of retailer document array
    const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailer.id);
    
    // Get valid OTPs (not expired)
    const validOTPsFromSecureStorage = secureOTPs.filter(otp => !otp.isExpired);
    
    console.log('🔄 Sync: Found', validOTPsFromSecureStorage.length, 'valid OTPs from secure storage');
    
    // Get current active OTPs from local store
    const currentActiveOTPs = getActiveOTPsForRetailer(retailer.id);
    const secureStoragePaymentIds = new Set(validOTPsFromSecureStorage.map(otp => otp.paymentId));
    
    // Remove OTPs that are no longer valid in secure storage
    const otpsToRemove = currentActiveOTPs.filter(otp => !secureStoragePaymentIds.has(otp.paymentId));
    
    if (otpsToRemove.length > 0) {
      console.log('🔄 Sync: Removing invalid OTPs:', otpsToRemove.length);
      otpsToRemove.forEach(otp => {
        removeActiveOTP(otp.paymentId);
        otpBridge.removeOTP(otp.paymentId);
      });
      
      // Update the state
      const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
      setActiveOTPs(updatedActiveOTPs);
    }
    
    // Add any new OTPs from secure storage that aren't in local store
    const currentPaymentIds = new Set(currentActiveOTPs.map(otp => otp.paymentId));
    const newOTPs = validOTPsFromSecureStorage.filter(otp => !currentPaymentIds.has(otp.paymentId));
    
    if (newOTPs.length > 0) {
      console.log('🔄 Sync: Adding new OTPs:', newOTPs.length);
      newOTPs.forEach(otp => {
        addActiveOTP({
          code: otp.code,
          retailerId: retailer.id,
          amount: otp.amount,
          paymentId: otp.paymentId,
          lineWorkerName: otp.lineWorkerName,
          expiresAt: otp.expiresAt,
          createdAt: otp.createdAt
        });
      });
      
      // Update the state
      const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
      setActiveOTPs(updatedActiveOTPs);
    }
    
  } catch (error) {
    console.error('❌ Error syncing OTPs from secure storage:', error);
  }
};
`;

console.log('🔧 ===== OTP SYNC FIX =====');
console.log('\nThe issue is that your RetailerDashboard is still trying to sync OTPs from:');
console.log('❌ OLD: retailerData.activeOTPs (array in retailer document)');
console.log('✅ NEW: secure_otps collection (individual documents)');
console.log('\nHere are two ways to fix this:');

console.log('\n📋 OPTION 1: Quick Fix (Run this in console)');
console.log('Copy and paste this code in your retailer dashboard console:');
console.log('----------------------------------------');

console.log(`
(async function quickFix() {
  console.log('🔧 Applying quick fix for OTP sync...');
  
  try {
    // Get current user
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ Please log in first');
      return;
    }
    
    // Import required modules
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    const { addActiveOTP, getActiveOTPsForRetailer } = await import('@/lib/otp-store');
    
    // Get OTPs from secure storage
    const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(user.uid);
    console.log('📋 Found', secureOTPs.length, 'OTPs in secure storage');
    
    if (secureOTPs.length > 0) {
      // Add them to the local store
      secureOTPs.forEach(otp => {
        addActiveOTP({
          code: otp.code,
          retailerId: user.uid,
          amount: otp.amount,
          paymentId: otp.paymentId,
          lineWorkerName: otp.lineWorkerName,
          expiresAt: otp.expiresAt,
          createdAt: otp.createdAt
        });
      });
      
      console.log('✅ OTPs added to local store');
      console.log('Refresh the page to see them in the dashboard');
      
      // Force a refresh
      window.location.reload();
    } else {
      console.log('ℹ️ No OTPs found in secure storage');
    }
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
  }
})();
`);

console.log('----------------------------------------');

console.log('\n📋 OPTION 2: Permanent Fix (Code Change)');
console.log('In /src/components/RetailerDashboard.tsx, replace the syncOTPsFromFirestore function');
console.log('Find it around line 743 and replace it with the code I provided above');
console.log('\nThe key change is:');
console.log('❌ OLD: const activeOTPsFromFirestore = retailerData.activeOTPs || [];');
console.log('✅ NEW: const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailer.id);');

console.log('\n🎯 ROOT CAUSE:');
console.log('Your dashboard has a hybrid approach that tries to sync from both:');
console.log('1. Old method: retailer document array (no longer has OTPs)');
console.log('2. New method: secure_otps collection (where OTPs actually are)');
console.log('The old method is overriding the new method, so OTPs don\'t show up.');

console.log('\n🔍 ===== DIAGNOSTIC =====');
console.log('To verify this is the issue, run this in console:');
console.log(`
(async function diagnose() {
  const { doc, getDoc, getFirestore } = await import('firebase/firestore');
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const db = getFirestore();
  
  const retailerDoc = await getDoc(doc(db, 'retailers', auth.currentUser.uid));
  const retailerData = retailerDoc.data();
  
  console.log('Retailer document activeOTPs array:', retailerData.activeOTPs?.length || 0);
  console.log('This should be 0 since OTPs are now in secure_otps collection');
})();
`);

console.log('\n🔧 ===== FIX COMPLETE =====');