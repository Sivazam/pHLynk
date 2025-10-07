// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { callFirebaseFunction } from '@/lib/firebase';
import { secureOTPStorage } from '@/lib/secure-otp-storage';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService } from '@/services/firestore';
import { Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import { secureLogger } from '@/lib/secure-logger';

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
    const existingOTP = await secureOTPStorage.getOTP(paymentId);
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
        // OTP has expired, continue with generating new one
        secureLogger.otp('Expired OTP found, generating new one', { paymentId });
      }
    }

    // Get retailer user details from retailerUsers collection with retry logic
    let retailerUser: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !retailerUser) {
      try {
        secureLogger.otp('Attempting to find retailer user', { 
          attempt: retryCount + 1, 
          maxRetries,
          retailerId 
        });
        retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
        
        if (retailerUser) {
          secureLogger.otp('Retailer user found successfully', { retailerId });
          break;
        }
      } catch (error) {
        secureLogger.warn('Retailer user search attempt failed', { 
          attempt: retryCount + 1, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!retailerUser) {
      secureLogger.error('Failed to find retailer user after retries', { 
        maxRetries, 
        retailerId 
      });
      return NextResponse.json(
        { error: 'Retailer user not found. Please try again.' },
        { status: 404 }
      );
    }

    if (!retailerUser.phone) {
      return NextResponse.json(
        { error: 'Retailer phone number not found' },
        { status: 400 }
      );
    }

    secureLogger.otp('OTP send request - using local generation', {
      retailerId,
      paymentId,
      amount,
      lineWorkerName,
      hasPhone: !!retailerUser.phone
    });

    // Generate OTP and store securely
    let otpData;
    try {
      secureLogger.otp('Generating OTP locally');
      const { generateOTP } = await import('@/lib/otp-store');
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 7 * 60 * 1000);
      
      // Store OTP securely in database
      const otpId = await secureOTPStorage.storeOTP({
        paymentId,
        code: otp,
        retailerId,
        amount,
        lineWorkerName: lineWorkerName || 'Line Worker',
        expiresAt
      });
      
      console.log('🔍 OTP Send - Retailer ID Debug:', {
        'retailerId from request': retailerId,
        'paymentId': paymentId,
        'retailerUser.retailerId': retailerUser.retailerId,
        'otpId': otpId
      });
      
      otpData = {
        success: true,
        otpId,
        code: otp,
        expiresAt: expiresAt.toISOString(),
        retailerName: retailerUser.name,
        retailerPhone: retailerUser.phone
      };
      
      secureLogger.otp('OTP generated and stored successfully');
    } catch (localGenerationError) {
      secureLogger.error('Error generating OTP locally', { error: localGenerationError instanceof Error ? localGenerationError.message : 'Unknown error' });
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    secureLogger.otp('OTP generated', { maskedCode: otpData.code.substring(0, 1) + '***' });

    // Send OTP to retailer
    const sent = await (async () => {
      try {
        const { sendOTPToRetailer } = await import('@/lib/otp-store');
        return await sendOTPToRetailer(retailerUser.phone, otpData.code, amount);
      } catch (error) {
        secureLogger.error('Failed to send OTP to retailer', { error: error instanceof Error ? error.message : 'Unknown error' });
        return false;
      }
    })();
    
    secureLogger.otp('OTP send result', { success: sent });
    
    // Send FCM notification to retailer using cloud function
    try {
      secureLogger.otp('Sending FCM OTP notification via cloud function');
      const result = await callFirebaseFunction('sendOTPNotification', {
        retailerId,
        otp: otpData.code,
        retailerName: retailerUser.name,
        paymentId,
        amount,
        lineWorkerName: lineWorkerName || 'Line Worker'
      });

      secureLogger.otp('FCM OTP notification sent successfully via cloud function', { success: true });
    } catch (fcmError) {
      secureLogger.warn('Error sending FCM OTP notification', { error: fcmError instanceof Error ? fcmError.message : 'Unknown error' });
      secureLogger.otp('FCM error - OTP will be available in retailer dashboard');
      // Don't fail the request if FCM fails
    }

    // PWA notifications are now handled by FCM - no need for duplicate local notifications
    secureLogger.otp('FCM notification sent - skipping local PWA notification to avoid duplicates');
    
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      );
    }

    // Clean up expired OTPs
    await secureOTPStorage.cleanupExpiredOTPs();

    // Update payment state to OTP_SENT
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        state: 'OTP_SENT',
        'timeline.otpSentAt': new Date(),
        updatedAt: new Date()
      });
      secureLogger.otp('Payment state updated to OTP_SENT');
    } catch (paymentUpdateError) {
      secureLogger.error('Error updating payment state to OTP_SENT', { error: paymentUpdateError instanceof Error ? paymentUpdateError.message : 'Unknown error' });
      // Don't fail the request if payment update fails
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otpSent: true,
      expiresAt: otpData.expiresAt,
      retailerName: retailerUser.name,
      retailerPhone: retailerUser.phone,
      usedCloudFunction: false // Always false now since we removed cloud functions
    });

  } catch (error) {
    secureLogger.error('Error sending OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}