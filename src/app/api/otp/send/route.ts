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
  lineWorkerId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OTPRequest = await request.json();
    const { retailerId, paymentId, amount, lineWorkerName, lineWorkerId } = body;

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
        
        secureLogger.otp('Active OTP already exists, rejecting duplicate request', {
          paymentId,
          timeRemaining,
          retailerId
        });
        
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

    // Additional check: Prevent OTP generation spam for same payment within 30 seconds
    const recentOTPKey = `recent_otp_${paymentId}`;
    const recentOTP = await secureOTPStorage.getOTP(recentOTPKey);
    if (recentOTP) {
      const timeSinceLastOTP = (Date.now() - recentOTP.createdAt.getTime()) / 1000;
      if (timeSinceLastOTP < 30) {
        secureLogger.otp('OTP generation too frequent, rejecting request', {
          paymentId,
          timeSinceLastOTP,
          retailerId
        });
        
        return NextResponse.json(
          { 
            error: 'OTP was recently generated. Please wait before requesting a new one.',
            tooFrequent: true,
            waitTime: Math.ceil(30 - timeSinceLastOTP)
          },
          { status: 429 }
        );
      }
    }

    // Get retailer user details from retailerUsers collection with optimized retry logic
    let retailerUser: any = null;
    let retryCount = 0;
    const maxRetries = 2; // Reduced from 3 to 2
    
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
        // Reduced wait time from 1 second to 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
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
      lineWorkerId,
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

      // Also store a recent OTP marker to prevent spam
      await secureOTPStorage.storeOTP({
        paymentId: `recent_otp_${paymentId}`,
        code: 'recent_marker',
        retailerId,
        amount: 0,
        lineWorkerName: lineWorkerName || 'Line Worker',
        expiresAt: new Date(Date.now() + 30 * 1000) // 30 seconds
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

    // Send OTP notification with FCM as primary and SMS as fallback
    let notificationSent = false;
    let notificationMethod = '';
    
    try {
      // First, try to send FCM notification
      secureLogger.otp('Attempting to send FCM OTP notification first');
      const { sendOTPNotificationViaCloudFunction } = await import('@/lib/cloud-functions');
      const fcmResult = await sendOTPNotificationViaCloudFunction({
        retailerId,
        otp: otpData.code,
        paymentId,
        amount,
        lineWorkerName: lineWorkerName || 'Line Worker',
        lineWorkerId: lineWorkerId || ''
      });

      if (fcmResult.success) {
        secureLogger.otp('FCM OTP notification sent successfully', { 
          success: true, 
          messageId: fcmResult.messageId,
          type: fcmResult.type,
          deviceCount: fcmResult.data?.deviceCount || 0
        });
        notificationSent = true;
        notificationMethod = 'fcm';
        
        // Log warning if multiple devices were found
        if (fcmResult.data?.deviceCount > 1) {
          secureLogger.warn('Multiple active devices found for retailer', {
            retailerId,
            deviceCount: fcmResult.data.deviceCount,
            paymentId
          });
        }
      } else {
        secureLogger.warn('FCM OTP notification failed', { 
          error: fcmResult.error,
          fallbackToSMS: fcmResult.fallbackToSMS 
        });
      }
    } catch (fcmError) {
      secureLogger.warn('Error sending FCM OTP notification', { error: fcmError instanceof Error ? fcmError.message : 'Unknown error' });
    }
    
    // If FCM failed, send SMS as fallback
    if (!notificationSent) {
      try {
        secureLogger.otp('Sending OTP via SMS as fallback');
        const { sendOTPToRetailer } = await import('@/lib/otp-store');
        const smsResult = await sendOTPToRetailer(retailerUser.phone, otpData.code, amount);
        
        if (smsResult) {
          secureLogger.otp('SMS OTP sent successfully as fallback');
          notificationSent = true;
          notificationMethod = 'sms';
        } else {
          secureLogger.error('Failed to send SMS OTP fallback');
        }
      } catch (smsError) {
        secureLogger.error('Error sending SMS OTP fallback', { error: smsError instanceof Error ? smsError.message : 'Unknown error' });
      }
    }
    
    secureLogger.otp('Notification process completed', { 
      notificationSent,
      notificationMethod
    });
    
    if (!notificationSent) {
      return NextResponse.json(
        { error: 'Failed to send OTP via both FCM and SMS' },
        { status: 500 }
      );
    }

    // Update payment state to OTP_SENT (run asynchronously to not block response)
    (async () => {
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
      }
    })();

    // Clean up expired OTPs (run asynchronously to not block response)
    (async () => {
      try {
        await secureOTPStorage.cleanupExpiredOTPs();
      } catch (cleanupError) {
        secureLogger.warn('Failed to cleanup expired OTPs', { error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' });
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otpSent: true,
      expiresAt: otpData.expiresAt,
      retailerName: retailerUser.name,
      retailerPhone: retailerUser.phone,
      notificationMethod, // 'fcm' or 'sms'
      usedCloudFunction: notificationMethod === 'fcm' // true if FCM was used
    });

  } catch (error) {
    secureLogger.error('Error sending OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}