// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { secureOTPStorage } from '@/lib/secure-otp-storage';
import { optimizedPaymentVerification } from '@/lib/payment-verification';
import { rateLimiters, withRateLimitHandler } from '@/lib/api-rate-limit';
import { validateInput, VALIDATION_RULES } from '@/lib/input-validation';
import { secureLogger } from '@/lib/secure-logger';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OTPVerifyRequest {
  paymentId: string;
  otp: string;
  retailerId?: string;
}

export const POST = withRateLimitHandler(
  async (request: NextRequest) => {
    const startTime = Date.now();
    
    try {
      // Parse and validate input
      const body: OTPVerifyRequest = await request.json();
      
      // Validate input data
      const validation = validateInput(body, 'OTP_VERIFY');
      if (!validation.isValid) {
        secureLogger.security('Invalid OTP verification request', {
          errors: validation.errors,
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
      
      const { paymentId, otp, retailerId } = validation.data!;

      secureLogger.otp('OTP verification started', {
        paymentId,
        retailerId,
        processingTime: 0
      });

      // Use the new secure OTP storage for verification
      const otpResult = await secureOTPStorage.verifyOTP(paymentId, otp);
      
      if (!otpResult.valid) {
        secureLogger.otp('OTP verification failed', {
          paymentId,
          error: otpResult.error,
          processingTime: Date.now() - startTime
        });
        
        return NextResponse.json(
          { 
            error: otpResult.error || 'Invalid OTP',
            paymentId 
          },
          { status: 400 }
        );
      }

      // OTP is valid, now verify payment
      if (retailerId && otpResult.otp) {
        const paymentResult = await optimizedPaymentVerification.verifyPayment({
          paymentId,
          retailerId,
          otpCode: otp
        });
        
        if (!paymentResult.success) {
          secureLogger.payment('Payment verification failed after OTP success', {
            paymentId,
            retailerId,
            error: paymentResult.error,
            processingTime: Date.now() - startTime
          });
          
          return NextResponse.json(
            { 
              error: paymentResult.error || 'Payment verification failed',
              paymentId 
            },
            { status: 400 }
          );
        }
        
        // Update payment with additional verification details
        try {
          const paymentRef = doc(db, 'payments', paymentId);
          await updateDoc(paymentRef, {
            state: 'COMPLETED',
            verifiedAt: new Date(),
            verificationMethod: 'OTP',
            'timeline.completedAt': Timestamp.fromDate(new Date()),
            updatedAt: new Date()
          });
          
          secureLogger.payment('Payment fully verified and completed', {
            paymentId,
            retailerId,
            amount: paymentResult.payment?.amount,
            processingTime: Date.now() - startTime
          });
          
        } catch (updateError) {
          secureLogger.error('Failed to update payment status', {
            error: updateError.message,
            paymentId,
            retailerId
          });
          
          // Don't fail the request, but log the error
        }
        
        return NextResponse.json({
          success: true,
          message: 'Payment verified successfully',
          payment: paymentResult.payment,
          processingTime: Date.now() - startTime
        });
        
      } else {
        // OTP verified but no retailerId provided - just return OTP success
        secureLogger.otp('OTP verified successfully (no payment verification)', {
          paymentId,
          processingTime: Date.now() - startTime
        });
        
        return NextResponse.json({
          success: true,
          message: 'OTP verified successfully',
          paymentId,
          processingTime: Date.now() - startTime
        });
      }
      
    } catch (error) {
      secureLogger.error('OTP verification error', {
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: 'OTP verification failed due to system error'
        },
        { status: 500 }
      );
    }
  },
  {
    config: 'OTP',
    identifierGenerator: (req) => {
      // Try to get paymentId from request body for more specific rate limiting
      const url = new URL(req.url);
      const paymentId = url.searchParams.get('paymentId');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      
      return paymentId ? `otp_verify:payment:${paymentId}` : `otp_verify:ip:${ip}`;
    },
    onLimitReached: (result) => {
      secureLogger.security('OTP verification rate limit exceeded', {
        retryAfter: result.retryAfter,
        severity: 'high'
      });
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
);