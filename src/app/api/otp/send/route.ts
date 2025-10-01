// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { otpStore, sendOTPToRetailer, cleanupExpiredOTPs, addActiveOTP } from '@/lib/otp-store';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService } from '@/services/firestore';
import { Timestamp as FirebaseTimestamp } from 'firebase/firestore';

interface OTPRequest {
  retailerId: string;
  paymentId: string;
  amount: number;
  lineWorkerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OTPRequest = await request.json();
    const { retailerId, paymentId, amount, lineWorkerName } = body;

    if (!retailerId || !paymentId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if there's already an active OTP for this payment
    const existingOTP = otpStore.get(paymentId);
    if (existingOTP) {
      const now = new Date();
      const timeRemaining = Math.ceil((existingOTP.expiresAt.getTime() - now.getTime()) / 1000);
      
      if (timeRemaining > 0) {
        // Format remaining time for display
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeString = minutes > 0 
          ? `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`
          : `${seconds} second${seconds !== 1 ? 's' : ''}`;
        
        return NextResponse.json(
          { 
            error: `Active OTP already exists. Please wait ${timeString} for the current OTP to expire.`,
            activeOTP: true,
            timeRemaining,
            expiresAt: existingOTP.expiresAt.toISOString()
          },
          { status: 400 }
        );
      } else {
        // OTP has expired, remove it and continue
        otpStore.delete(paymentId);
        console.log('🗑️ Removed expired OTP before generating new one');
      }
    }

    // Get retailer user details from retailerUsers collection
    const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
    
    if (!retailerUser) {
      return NextResponse.json(
        { error: 'Retailer user not found' },
        { status: 404 }
      );
    }

    if (!retailerUser.phone) {
      return NextResponse.json(
        { error: 'Retailer phone number not found' },
        { status: 400 }
      );
    }

    console.log('📱 OTP SEND REQUEST - Using Cloud Function:');
    console.log('Retailer ID:', retailerId);
    console.log('Payment ID:', paymentId);
    console.log('Amount:', amount);
    console.log('Line Worker Name:', lineWorkerName);
    console.log('Retailer User Data:', retailerUser);

    // Use Cloud Function to generate OTP (more secure) - if available
    let otpData;
    try {
      // Try to use Firebase Functions if available (server-side only)
      const functionsModule = await import('firebase/functions');
      if (typeof window === 'undefined') {
        const { getFunctions, httpsCallable } = functionsModule;
        const functionsInstance = getFunctions();
        const generateOTPFunction = httpsCallable(functionsInstance, 'generateOTP');
        
        const result = await generateOTPFunction({
          retailerId,
          paymentId,
          amount,
          lineWorkerName: lineWorkerName || 'Line Worker'
        });

        console.log('🔐 Cloud Function result:', result.data);

        const data = result.data as any;
        if (data && data.success) {
          otpData = data;
          console.log('✅ OTP generated successfully via cloud function');
        } else {
          throw new Error(data?.error || 'Failed to generate OTP via cloud function');
        }
      } else {
        throw new Error('Firebase Functions not available in this environment');
      }
    } catch (cloudFunctionError) {
      console.error('❌ Error calling cloud function:', cloudFunctionError);
      
      // Fallback to local generation if cloud function fails
      console.log('⚠️ Falling back to local OTP generation');
      const { generateOTP } = await import('@/lib/otp-store');
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 7 * 60 * 1000);
      
      otpData = {
        success: true,
        otpId: `local_${Date.now()}`,
        code: otp,
        expiresAt: expiresAt.toISOString(),
        retailerName: retailerUser.name,
        retailerPhone: retailerUser.phone
      };
      
      // Store OTP locally for fallback
      otpStore.set(paymentId, {
        code: otp,
        expiresAt,
        attempts: 0,
        lastAttemptAt: null,
        cooldownUntil: null,
        consecutiveFailures: 0,
        breachDetected: false
      });
    }

    console.log('📝 OTP generated:', otpData.code);

    // Save OTP directly to retailer document for persistence (if not already done by cloud function)
    try {
      const firestoreExpiresAt = FirebaseTimestamp.fromDate(new Date(otpData.expiresAt));
      const otpDocumentData = {
        paymentId,
        code: otpData.code,
        amount,
        lineWorkerName: lineWorkerName || 'Line Worker',
        expiresAt: firestoreExpiresAt,
        createdAt: FirebaseTimestamp.now(),
        isUsed: false
      };

      console.log('🔍 Attempting to save OTP to retailer document:');
      console.log('  Retailer ID:', retailerId);
      console.log('  Tenant ID:', retailerUser.tenantId);
      console.log('  OTP Data:', otpDocumentData);

      // Add OTP to retailer's activeOTPs array with correct tenantId
      await retailerService.addOTPToRetailer(retailerId, retailerUser.tenantId, otpDocumentData);
      console.log('✅ OTP saved to retailer document successfully');
    } catch (firestoreError) {
      console.error('❌ Error saving OTP to retailer document:', firestoreError);
      // Don't fail the request if Firestore save fails, still continue with in-memory storage
    }

    // Add OTP to active OTPs for retailer dashboard display
    addActiveOTP({
      code: otpData.code,
      retailerId,
      amount,
      paymentId,
      lineWorkerName: lineWorkerName || 'Line Worker'
    });

    console.log('📱 OTP added to active OTPs for retailer dashboard');

    // Send OTP to retailer (now just logs to console)
    const sent = sendOTPToRetailer(retailerUser.phone, otpData.code, amount);
    console.log('📤 OTP send result:', sent);
    
    // Send PWA push notification to RETAILER ONLY (client-side only)
    // Skip notification on server side - notifications will be handled by client
    if (typeof window !== 'undefined') {
      try {
        const { roleBasedNotificationService } = await import('@/services/role-based-notification-service');
        const notificationSent = await roleBasedNotificationService.sendOTPToRetailer({
          otp: otpData.code,
          amount,
          paymentId,
          retailerName: retailerUser.name,
          lineWorkerName: lineWorkerName || 'Line Worker'
        });
        
        if (notificationSent) {
          console.log('📱 PWA OTP notification sent to retailer only');
        } else {
          console.log('⚠️ PWA OTP notification failed, but OTP was generated');
        }
      } catch (notificationError) {
        console.error('❌ Error sending PWA OTP notification:', notificationError);
        // Don't fail the request if notification fails
      }
    } else {
      console.log('🖥️ Server environment - skipping PWA notification (will be handled by client)');
    }
    
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      );
    }

    // Clean up expired OTPs
    cleanupExpiredOTPs();

    // Update payment state to OTP_SENT
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        state: 'OTP_SENT',
        'timeline.otpSentAt': new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Payment state updated to OTP_SENT');
    } catch (paymentUpdateError) {
      console.error('❌ Error updating payment state to OTP_SENT:', paymentUpdateError);
      // Don't fail the request if payment update fails
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otpSent: true,
      expiresAt: otpData.expiresAt,
      retailerName: retailerUser.name,
      retailerPhone: retailerUser.phone,
      usedCloudFunction: !!otpData.otpId && !otpData.otpId.startsWith('local_')
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}