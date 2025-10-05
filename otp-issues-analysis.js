/**
 * OTP Issues Analysis
 * This script identifies potential errors in the OTP process that could cause:
 * 1. OTP not displaying in retailer dashboard
 * 2. "OTP not found" error in line worker dashboard
 * 
 * Run this in the browser console to diagnose the issues
 */

(async function analyzeOTPIssues() {
  console.log('🔍 ===== OTP ISSUES ANALYSIS =====');
  
  try {
    // Get current user
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ Please log in first');
      return;
    }
    
    console.log('✅ Current user:', user.uid);
    
    // Import required modules
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    const { doc, getDoc, collection, query, where, getDocs, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    
    // Test the specific payment
    const paymentId = 'jyoxlztGX7FEZBNSzFeh';
    
    console.log('\n🔍 ISSUE 1: Checking if OTP exists in Firestore...');
    
    // Check secure_otps collection
    const otpQuery = query(
      collection(db, 'secure_otps'),
      where('paymentId', '==', paymentId)
    );
    
    const querySnapshot = await getDocs(otpQuery);
    console.log(`📄 Found ${querySnapshot.size} OTP documents in secure_otps collection`);
    
    if (querySnapshot.size === 0) {
      console.error('❌ CRITICAL ISSUE: OTP not found in secure_otps collection');
      console.log('This means the OTP was never stored properly during generation');
      console.log('\n🔧 POSSIBLE CAUSES:');
      console.log('1. OTP generation failed');
      console.log('2. secureOTPStorage.storeOTP() failed');
      console.log('3. Firestore write permissions issue');
      console.log('4. Network error during OTP storage');
      return;
    }
    
    const otpDoc = querySnapshot.docs[0];
    const otpData = otpDoc.data();
    
    console.log('✅ OTP found in Firestore:', {
      id: otpDoc.id,
      paymentId: otpData.paymentId,
      retailerId: otpData.retailerId,
      isUsed: otpData.isUsed,
      expiresAt: otpData.expiresAt?.toDate(),
      createdAt: otpData.createdAt?.toDate()
    });
    
    console.log('\n🔍 ISSUE 2: Checking retailer ID mismatch...');
    
    // Check if retailer ID matches
    if (otpData.retailerId !== user.uid) {
      console.error('❌ CRITICAL ISSUE: Retailer ID mismatch!');
      console.log('Expected retailerId:', user.uid);
      console.log('Actual retailerId:', otpData.retailerId);
      console.log('\n🔧 IMPACT:');
      console.log('- Retailer dashboard: OTP will NOT show (wrong retailer)');
      console.log('- Line worker verification: Will FAIL (retailerId mismatch in queries)');
      return;
    }
    
    console.log('✅ Retailer ID matches');
    
    console.log('\n🔍 ISSUE 3: Checking OTP expiration...');
    
    const now = new Date();
    const expiresAt = otpData.expiresAt?.toDate();
    
    if (!expiresAt || expiresAt <= now) {
      console.error('❌ CRITICAL ISSUE: OTP has expired!');
      console.log('Expired at:', expiresAt);
      console.log('Current time:', now);
      console.log('\n🔧 IMPACT:');
      console.log('- Retailer dashboard: OTP will be filtered out');
      console.log('- Line worker verification: Will return "OTP expired"');
      return;
    }
    
    console.log('✅ OTP is still valid');
    
    console.log('\n🔍 ISSUE 4: Testing secure storage retrieval...');
    
    // Test getOTP method
    const retrievedOTP = await secureOTPStorage.getOTP(paymentId);
    if (!retrievedOTP) {
      console.error('❌ CRITICAL ISSUE: getOTP() returned null!');
      console.log('This means the query in getOTP() is not finding the OTP');
      console.log('\n🔧 POSSIBLE CAUSES:');
      console.log('1. Query filter issue (isUsed, paymentId)');
      console.log('2. Timestamp conversion issue');
      console.log('3. Firestore query permissions');
      return;
    }
    
    console.log('✅ getOTP() successfully retrieved OTP');
    
    console.log('\n🔍 ISSUE 5: Testing getActiveOTPsForRetailer...');
    
    const activeOTPs = await secureOTPStorage.getActiveOTPsForRetailer(user.uid);
    console.log(`📋 getActiveOTPsForRetailer returned ${activeOTPs.length} OTPs`);
    
    const foundInActive = activeOTPs.find(otp => otp.paymentId === paymentId);
    if (!foundInActive) {
      console.error('❌ CRITICAL ISSUE: OTP not found in active list!');
      console.log('This means getActiveOTPsForRetailer() has a filtering issue');
      console.log('\n🔧 POSSIBLE CAUSES:');
      console.log('1. Retailer ID filter issue');
      console.log('2. isUsed filter issue');
      console.log('3. Timestamp conversion issue in expiresAt check');
      console.log('4. Decryption error');
      return;
    }
    
    console.log('✅ OTP found in active list');
    console.log('Decrypted OTP:', foundInActive.code);
    
    console.log('\n🔍 ISSUE 6: Testing decryption...');
    
    try {
      const encryptedCode = otpData.code;
      console.log('Encrypted code:', encryptedCode);
      
      // Test decryption
      const decoded = atob(encryptedCode);
      const decryptedCode = decoded.split('').reverse().join('');
      console.log('Decrypted code:', decryptedCode);
      
      // Test if it matches the active OTP code
      if (decryptedCode !== foundInActive.code) {
        console.error('❌ CRITICAL ISSUE: Decryption mismatch!');
        console.log('Manual decryption:', decryptedCode);
        console.log('System decryption:', foundInActive.code);
        console.log('\n🔧 IMPACT:');
        console.log('- Verification will always fail');
        console.log('- Wrong OTP might be displayed in dashboard');
      } else {
        console.log('✅ Decryption working correctly');
      }
    } catch (e) {
      console.error('❌ CRITICAL ISSUE: Decryption failed!', e);
      console.log('\n🔧 IMPACT:');
      console.log('- getActiveOTPsForRetailer() will fail');
      console.log('- Dashboard will not show OTPs');
    }
    
    console.log('\n🔍 ISSUE 7: Testing OTP verification...');
    
    // Test verification with the decrypted code
    const verifyResult = await secureOTPStorage.verifyOTP(paymentId, foundInActive.code);
    console.log('Verification result:', verifyResult);
    
    if (!verifyResult.valid) {
      console.error('❌ CRITICAL ISSUE: Verification failed!');
      console.log('Error:', verifyResult.error);
      console.log('\n🔧 POSSIBLE CAUSES:');
      console.log('1. OTP already marked as used');
      console.log('2. Security limits triggered');
      console.log('3. Decryption issue during verification');
    } else {
      console.log('✅ Verification successful');
    }
    
    console.log('\n🔍 ISSUE 8: Checking retailer document sync...');
    
    // Check if retailer document has the OTP
    const retailerDoc = await getDoc(doc(db, 'retailers', user.uid));
    if (retailerDoc.exists()) {
      const retailerData = retailerDoc.data();
      const firestoreOTPs = retailerData.activeOTPs || [];
      console.log(`📄 Retailer document has ${firestoreOTPs.length} OTPs`);
      
      const foundInRetailerDoc = firestoreOTPs.find(otp => otp.paymentId === paymentId);
      if (!foundInRetailerDoc) {
        console.warn('⚠️ WARNING: OTP not synced to retailer document');
        console.log('This might be why the dashboard is not showing it');
      } else {
        console.log('✅ OTP found in retailer document');
      }
    }
    
    console.log('\n📊 ===== ANALYSIS SUMMARY =====');
    
    if (activeOTPs.length > 0 && foundInActive && verifyResult.valid) {
      console.log('✅ OTP system is working correctly');
      console.log('\nIf you still see issues:');
      console.log('1. Dashboard: Check for JavaScript errors');
      console.log('2. Line worker: Verify the paymentId is correct');
      console.log('3. Both: Check network connection');
    } else {
      console.log('❌ Issues found in the OTP system');
      console.log('Check the 🔧 POSSIBLE CAUSES and 🔧 IMPACT sections above');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
})();