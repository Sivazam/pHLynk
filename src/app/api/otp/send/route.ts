// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { callFirebaseFunction } from '@/lib/firebase';
import { secureOTPStorage } from '@/lib/secure-otp-storage';
import { RetailerAuthService } from '@/services/retailer-auth';
import { rateLimiters, withRateLimitHandler } from '@/lib/api-rate-limit';
import { validateInput, VALIDATION_RULES } from '@/lib/input-validation';
import { secureLogger } from '@/lib/secure-logger';

interface OTPRequest {
  retailerId: string;
  paymentId: string;
  amount: number;
  lineWorkerName?: string;
}

export const POST = withRateLimitHandler(
  async (request: NextRequest) => {
    const startTime = Date.now();
    
    try {
      // Parse and validate input
      const body: OTPRequest = await request.json();
      
      // Validate input data
      const validation = validateInput(body, 'OTP_SEND');
      if (!validation.isValid) {
        secureLogger.security('Invalid OTP send request', {
          errors: validation.errors,
          retailerId: body.retailerId,
          paymentId: body.paymentId
        });
        
        return NextResponse.json(
          { 
            error: 'Invalid input data',
            details: validation.errors 
          },
          { status: 400 }
        );
      }
      
      const { retailerId, paymentId, amount, lineWorkerName } = validation.data!;

      secureLogger.otp('OTP send request started', {
        retailerId,
        paymentId,
        amount,
        lineWorkerName,
        processingTime: 0
      });

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
          
          secureLogger.otp('Active OTP already exists', {
            paymentId,
            timeRemaining,
            expiresAt: existingOTP.expiresAt
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

      // Get retailer user details with retry logic
      let retailerUser = null;
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
            error: error.message 
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
        secureLogger.security('Retailer phone number missing', { retailerId });
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
        
        otpData = {
          success: true,
          otpId,
          code: otp,
          expiresAt: expiresAt.toISOString(),
          retailerName: retailerUser.name,
          retailerPhone: retailerUser.phone
        };
        
        secureLogger.otp('OTP generated and stored successfully', {
          otpId,
          paymentId,
          expiresAt: otpData.expiresAt
        });
      } catch (localGenerationError) {
        secureLogger.error('Error generating OTP locally', { 
          error: localGenerationError.message,
          retailerId,
          paymentId
        });
        return NextResponse.json(
          { error: 'Failed to generate OTP' },
          { status: 500 }
        );
      }

      secureLogger.otp('OTP generated', { 
        maskedCode: otpData.code.substring(0, 1) + '***',
        paymentId 
      });

      // Send OTP to retailer
      const sent = await (async () => {
        try {
          const { sendOTPToRetailer } = await import('@/lib/otp-store');
          return await sendOTPToRetailer(retailerUser.phone, otpData.code, amount);
        } catch (error) {
          secureLogger.error('Failed to send OTP to retailer', { 
            error: error.message,
            retailerId,
            paymentId
          });
          return false;
        }
      })();
      
      secureLogger.otp('OTP send result', { 
        success: sent, 
        retailerId,
        paymentId 
      });
      
      // Send FCM notification to retailer using cloud function
      try {
        secureLogger.otp('Sending FCM OTP notification via cloud function');
        const result = await callFirebaseFunction('sendFCMNotification', {
          retailerId,
          notification: {
            title: '🔐 OTP Verification Required',
            body: `Your OTP code is: ${otpData.code}`,
            data: {
              type: 'otp',
              otp: otpData.code,
              retailerId,
              paymentId,
              amount: amount.toString(),
              retailerName: retailerUser.name,
              lineWorkerName: lineWorkerName || 'Line Worker'
            },
            icon: '/icon-192x192.png',
            tag: `otp-${paymentId}`,
            clickAction: '/retailer/dashboard'
          }
        });

        secureLogger.otp('FCM OTP notification sent successfully via cloud function', { 
          success: true,
          retailerId,
          paymentId
        });
      } catch (fcmError) {
        secureLogger.warn('Error sending FCM OTP notification', { 
          error: fcmError.message,
          retailerId,
          paymentId
        });
        secureLogger.otp('FCM error - OTP will be available in retailer dashboard');
        // Don't fail the request if FCM fails
      }

      // PWA notifications are now handled by FCM - no need for duplicate local notifications
      secureLogger.otp('FCM notification sent - skipping local PWA notification to avoid duplicates');
      
      if (!sent) {
        secureLogger.error('OTP sending failed', {
          retailerId,
          paymentId,
          processingTime: Date.now() - startTime
        });
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
        secureLogger.otp('Payment state updated to OTP_SENT', { paymentId });
      } catch (paymentUpdateError) {
        secureLogger.error('Error updating payment state to OTP_SENT', { 
          error: paymentUpdateError.message,
          paymentId
        });
        // Don't fail the request if payment update fails
      }

      secureLogger.otp('OTP send completed successfully', {
        retailerId,
        paymentId,
        processingTime: Date.now() - startTime
      });

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
      secureLogger.error('Error sending OTP', {
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  {
    config: 'OTP',
    identifierGenerator: (req) => {
      // Use retailer ID for more specific rate limiting
      const url = new URL(req.url);
      const retailerId = url.searchParams.get('retailerId');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      
      return retailerId ? `otp_send:retailer:${retailerId}` : `otp_send:ip:${ip}`;
    },
    onLimitReached: (result) => {
      secureLogger.security('OTP send rate limit exceeded', {
        retryAfter: result.retryAfter,
        severity: 'high'
      });
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
);