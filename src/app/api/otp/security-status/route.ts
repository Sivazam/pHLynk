import { NextRequest, NextResponse } from 'next/server';
import { getSecurityStatus, otpStore } from '@/lib/otp-store';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService, paymentService } from '@/services/firestore';

// Helper function to get payment with correct tenantId (copied from verify API)
async function getPaymentWithCorrectTenant(paymentId: string) {
  console.log('🔍 getPaymentWithCorrectTenant called for paymentId:', paymentId);
  
  // First try with 'system' tenant
  console.log('🔍 Trying with system tenant...');
  let payment = await paymentService.getById(paymentId, 'system');
  
  if (!payment) {
    // If not found with 'system', try to get the payment document directly without tenantId checking
    console.log('🔍 Not found with system tenant, trying direct document access...');
    try {
      const { doc, getDoc, db } = await import('@/lib/firebase');
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (paymentDoc.exists()) {
        const paymentData = paymentDoc.data();
        console.log('🔍 Found payment document directly:', {
          id: paymentDoc.id,
          tenantId: paymentData.tenantId,
          retailerId: paymentData.retailerId
        });
        
        // Create a payment object with the correct structure
        payment = {
          id: paymentDoc.id,
          ...paymentData
        } as any;
        
        console.log('🔍 Payment found via direct access');
      } else {
        console.log('🔍 Payment document not found via direct access');
      }
    } catch (error) {
      console.error('Error accessing payment document directly:', error);
    }
  }
  
  console.log('🔍 Final payment result:', payment ? 'FOUND' : 'NOT FOUND');
  return payment;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId parameter' },
        { status: 400 }
      );
    }

    // First check if we have the OTP in memory
    let otpData = otpStore.get(paymentId);
    
    // If not found in memory, try to load from retailer document
    if (!otpData) {
      console.log('🔍 OTP not in memory, checking retailer document for security status...');
      try {
        const payment = await getPaymentWithCorrectTenant(paymentId);
        
        if (payment && payment.retailerId) {
          const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
          
          if (retailerUser && retailerUser.tenantId) {
            const retailerOTPs = await retailerService.getActiveOTPsFromRetailer(payment.retailerId, retailerUser.tenantId);
            const retailerOTP = retailerOTPs.find(otp => otp.paymentId === paymentId);
            
            if (retailerOTP) {
              // Check if we already have security tracking for this payment
              const existingSecurityData = otpStore.get(paymentId);
              const existingAttempts = existingSecurityData ? existingSecurityData.attempts : 0;
              const existingConsecutiveFailures = existingSecurityData ? existingSecurityData.consecutiveFailures : 0;
              
              // Convert retailer OTP to in-memory format, preserving existing security data
              otpData = {
                code: retailerOTP.code,
                expiresAt: retailerOTP.expiresAt.toDate(),
                attempts: existingAttempts, // Preserve existing attempts
                lastAttemptAt: existingSecurityData?.lastAttemptAt || null,
                cooldownUntil: existingSecurityData?.cooldownUntil || null,
                consecutiveFailures: existingConsecutiveFailures, // Preserve consecutive failures
                breachDetected: existingSecurityData?.breachDetected || false
              };
              
              // Update the in-memory store with the preserved data
              otpStore.set(paymentId, otpData);
              
              console.log('🔍 Loaded OTP from retailer document for security status:', {
                paymentId,
                attempts: otpData.attempts,
                consecutiveFailures: otpData.consecutiveFailures,
                breachDetected: otpData.breachDetected
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading OTP from retailer document for security status:', error);
      }
    }

    const securityStatus = getSecurityStatus(paymentId);
    
    // Add debug information
    console.log('🔍 Security status for payment:', paymentId, securityStatus);
    
    return NextResponse.json(securityStatus);
  } catch (error) {
    console.error('Error getting security status:', error);
    return NextResponse.json(
      { error: 'Failed to get security status' },
      { status: 500 }
    );
  }
}