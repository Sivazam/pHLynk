/**
 * OTP Display Fix Script
 * This script attempts to fix the OTP display issue by manually triggering the necessary updates
 * 
 * Run this in the retailer dashboard console if OTPs are not showing
 */

(async function fixOTPDisplay() {
  console.log('🔧 ===== OTP DISPLAY FIX ATTEMPT =====');
  
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
    const { doc, getDoc, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    
    // 1. Force refresh OTPs from secure storage
    console.log('\n🔄 Force refreshing OTPs...');
    const activeOTPs = await secureOTPStorage.getActiveOTPsForRetailer(user.uid);
    console.log(`Found ${activeOTPs.length} active OTPs`);
    
    if (activeOTPs.length > 0) {
      console.log('Active OTPs:');
      activeOTPs.forEach(otp => {
        console.log(`  - ${otp.code} (₹${otp.amount}) from ${otp.lineWorkerName}`);
      });
    }
    
    // 2. Check if retailer document has activeOTPs
    console.log('\n📄 Checking retailer document...');
    const retailerDoc = await getDoc(doc(db, 'retailers', user.uid));
    if (retailerDoc.exists()) {
      const retailerData = retailerDoc.data();
      const firestoreOTPs = retailerData.activeOTPs || [];
      console.log(`Retailer document has ${firestoreOTPs.length} OTPs`);
    }
    
    // 3. Try to trigger dashboard updates
    console.log('\n🖥️ Attempting to trigger dashboard updates...');
    
    // Dispatch custom events that might be listened by the dashboard
    window.dispatchEvent(new CustomEvent('otpDataUpdate', { detail: { activeOTPs } }));
    window.dispatchEvent(new CustomEvent('refreshOTPData'));
    
    // Try to find and call the refresh function if it exists
    if (typeof window !== 'undefined') {
      // Look for any global refresh functions
      if (window.refreshOTPData) {
        console.log('Calling global refreshOTPData function...');
        await window.refreshOTPData();
      }
      
      // Try to access React component internals (this is a hack, but might work)
      const reactRoot = document.querySelector('#__next');
      if (reactRoot && reactRoot._reactRootContainer) {
        console.log('React root found, attempting to force update...');
        try {
          const fiberNode = reactRoot._reactRootContainer._internalRoot.current;
          if (fiberNode && fiberNode.child && fiberNode.child.memoizedState) {
            // Find the RetailerDashboard component
            let node = fiberNode.child;
            while (node) {
              if (node.type && node.type.name === 'RetailerDashboard') {
                console.log('Found RetailerDashboard component');
                if (node.memoizedState && node.memoizedState.queue) {
                  // Force a state update
                  node.memoizedState.queue.dispatch({ type: 'FORCE_UPDATE' });
                  console.log('✅ Forced dashboard update');
                }
                break;
              }
              node = node.child;
            }
          }
        } catch (e) {
          console.log('Could not force React update:', e);
        }
      }
    }
    
    // 4. Manual page refresh as last resort
    console.log('\n⚠️ If OTPs are still not showing, try these manual steps:');
    console.log('1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. Clear browser cache and refresh');
    console.log('3. Check for JavaScript errors in the console');
    console.log('4. Try logging out and logging back in');
    
    // 5. Create a test OTP to verify the system is working
    console.log('\n🧪 Creating a test OTP to verify the system...');
    const testPaymentId = 'test_' + Date.now();
    const testCode = 'TEST123';
    
    try {
      await secureOTPStorage.storeOTP({
        paymentId: testPaymentId,
        code: testCode,
        retailerId: user.uid,
        amount: 100,
        lineWorkerName: 'Test Worker',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      
      console.log('✅ Test OTP created successfully');
      console.log('Payment ID:', testPaymentId);
      console.log('Code:', testCode);
      console.log('This test OTP should appear in your dashboard immediately');
      
      // Clean up test OTP after 5 seconds
      setTimeout(async () => {
        try {
          // Mark as used to clean up
          await secureOTPStorage.verifyOTP(testPaymentId, testCode);
          console.log('🧹 Test OTP cleaned up');
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 5000);
      
    } catch (e) {
      console.error('❌ Failed to create test OTP:', e);
    }
    
    console.log('\n🔧 ===== FIX ATTEMPT COMPLETE =====');
    
  } catch (error) {
    console.error('❌ Fix script failed:', error);
  }
})();