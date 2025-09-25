'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Confetti } from '@/components/ui/Confetti';
import { Payment, Retailer } from '@/types';
import { formatCurrency, formatTimestampWithTime } from '@/lib/timestamp-utils';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Store,
  Phone,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface OTPEnterFormProps {
  payment: Payment;
  retailer: Retailer;
  onVerifySuccess: () => void;
  onBack: () => void;
  onResendOTP?: () => void;
  verifyingOTP: boolean;
}

export const OTPEnterForm: React.FC<OTPEnterFormProps> = ({
  payment,
  retailer,
  onVerifySuccess,
  onBack,
  onResendOTP,
  verifyingOTP
}) => {
  const [otp, setOTP] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0); // Will be calculated based on OTP creation time
  const [canResend, setCanResend] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [securityStatus, setSecurityStatus] = useState<{
    attempts: number;
    consecutiveFailures: number;
    breachDetected: boolean;
    inCooldown: boolean;
    cooldownTime?: number;
  } | null>(null);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false); // Local loading state for verification

  // Calculate time left based on OTP sent time from payment timeline
  const calculateTimeLeft = useCallback(() => {
    // Try to get otpSentAt from timeline, but fall back to createdAt if not available
    const otpSentTime = payment.timeline?.otpSentAt?.toDate?.() || 
                       payment.createdAt?.toDate?.() || 
                       new Date();
    
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - otpSentTime.getTime()) / 1000);
    const totalDuration = 420; // 7 minutes in seconds
    const remaining = Math.max(0, totalDuration - elapsedSeconds);
    
    // Debug logging
    console.log('🔧 OTP expiration calculation:', {
      paymentId: payment.id,
      paymentState: payment.state,
      otpSentAt: payment.timeline?.otpSentAt?.toDate?.() ? payment.timeline.otpSentAt.toDate().toISOString() : 'NOT SET',
      createdAt: payment.createdAt?.toDate?.() ? payment.createdAt.toDate().toISOString() : 'NOT SET',
      fallbackTime: new Date().toISOString(),
      otpSentTime: otpSentTime.toISOString(),
      now: now.toISOString(),
      elapsedSeconds,
      totalDuration,
      remaining,
      isExpired: remaining <= 0
    });
    
    // Special case: If OTP was just sent (within last 10 seconds) and shows as expired, 
    // it's likely a timing issue with the real-time update. Give it more time.
    if (remaining <= 0 && elapsedSeconds < 30 && payment.state === 'OTP_SENT') {
      console.log('⚠️ OTP shows as expired but was just sent, giving more time:', {
        elapsedSeconds,
        paymentState: payment.state
      });
      return totalDuration; // Give full time if it was just sent
    }
    
    if (remaining <= 0) {
      setCanResend(true);
    }
    
    return remaining;
  }, [payment.timeline?.otpSentAt, payment.createdAt, payment.id, payment.state]);

  // Initialize time left on component mount
  useEffect(() => {
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);
    setCanResend(initialTimeLeft <= 0);
    
    // If OTP is already expired when component mounts, notify parent
    if (initialTimeLeft <= 0) {
      setError('This OTP has expired. Please request a new one.');
    }
  }, [calculateTimeLeft]);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      // Set error message when OTP expires
      if (!error) {
        setError('OTP has expired. Please request a new one.');
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          // Set error message when OTP expires
          setError('OTP has expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, error]);

  // Fetch security status on component mount and periodically
  useEffect(() => {
    const fetchSecurityStatus = async () => {
      try {
        const response = await fetch(`/api/otp/security-status?paymentId=${payment.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const status = await response.json();
          setSecurityStatus(status);
          setRemainingAttempts(Math.max(0, 3 - status.attempts));
          
          // Update cooldown time left
          if (status.inCooldown && status.cooldownTime) {
            setCooldownTimeLeft(status.cooldownTime);
          }
        } else {
          // Don't set error for failed security status checks, just log them
          console.warn('Security status check failed:', response.status);
        }
      } catch (error) {
        // Don't set error for failed security status checks, just log them
        console.warn('Error fetching security status:', error);
      }
    };

    // Fetch immediately
    fetchSecurityStatus();
    
    // Fetch every 2 seconds
    const interval = setInterval(fetchSecurityStatus, 2000);
    
    return () => clearInterval(interval);
  }, [payment.id]);

  // Debug logging for component lifecycle
  useEffect(() => {
    console.log('🔧 OTPEnterForm mounted for payment:', payment.id);
    
    return () => {
      console.log('🔧 OTPEnterForm unmounting for payment:', payment.id);
    };
  }, [payment.id]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownTimeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Refresh security status when cooldown expires
          const fetchSecurityStatus = async () => {
            try {
              const response = await fetch(`/api/otp/security-status?paymentId=${payment.id}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const status = await response.json();
                setSecurityStatus(status);
                setRemainingAttempts(Math.max(0, 3 - status.attempts));
              }
            } catch (error) {
              console.error('Error refreshing security status:', error);
            }
          };
          fetchSecurityStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownTimeLeft, payment.id]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOTPChange = (value: string) => {
    // Only allow alphanumeric characters and limit to 6 characters
    if (/^[a-zA-Z0-9]{0,6}$/.test(value)) {
      setOTP(value);
      if (error) setError(null);
    }
  };

  const handleVerifyOTP = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-character alphanumeric OTP');
      return;
    }

    // Check if OTP is expired
    if (timeLeft <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    // Check if in cooldown
    if (securityStatus?.inCooldown) {
      const cooldownMinutes = Math.floor((securityStatus.cooldownTime || 0) / 60);
      const cooldownSeconds = (securityStatus.cooldownTime || 0) % 60;
      setError(`Too many attempts. Please wait ${cooldownMinutes}:${cooldownSeconds.toString().padStart(2, '0')} before trying again.`);
      return;
    }

    // Check if breach detected
    if (securityStatus?.breachDetected) {
      setError('Security breach detected. Please contact your wholesaler.');
      return;
    }

    // Check remaining attempts
    if (remainingAttempts <= 0) {
      setError('No attempts remaining. Please request a new OTP.');
      return;
    }

    try {
      setError(null);
      setIsVerifying(true); // Start loading
      console.log('🔍 Verifying OTP for payment:', payment.id);

      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: payment.id,
          otp: otp
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Update remaining attempts based on response
        if (result.securityStatus) {
          setSecurityStatus(result.securityStatus);
          setRemainingAttempts(Math.max(0, 3 - result.securityStatus.attempts));
        }
        
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
        
        // Handle max attempts reached
        if (result.maxAttemptsReached) {
          setCanResend(true); // Enable resend immediately when max attempts reached
        }
        
        // Handle cooldown
        if (result.cooldownTriggered || result.securityStatus?.inCooldown) {
          // Disable verification during cooldown
          console.log('Cooldown triggered, disabling verification');
        }
        
        throw new Error(result.error || 'OTP verification failed');
      }

      if (result.success) {
        console.log('✅ OTP verified successfully!');
        setShowSuccess(true);
        setTriggerConfetti(true);
        
        // Call success callback after a short delay
        setTimeout(() => {
          onVerifySuccess();
        }, 1500);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error verifying OTP:', error);
      // Don't automatically close the dialog on error, let the user try again
      setError(error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false); // Stop loading
    }
  }, [otp, payment.id, onVerifySuccess, securityStatus, remainingAttempts, timeLeft]);

  const handleResendOTP = async () => {
    if (onResendOTP) {
      try {
        await onResendOTP();
        // Recalculate time left based on new OTP creation time
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
        setCanResend(newTimeLeft <= 0);
        setError(null);
        setOTP('');
        setRemainingAttempts(3); // Reset attempts on resend
        setSecurityStatus(null); // Reset security status
        setCooldownTimeLeft(0); // Reset cooldown timer
      } catch (error: any) {
        console.warn('Failed to resend OTP:', error);
        setError(error.message || 'Failed to resend OTP');
        // Don't close the dialog on resend failure
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otp.length === 6) {
      handleVerifyOTP();
    }
  };

  const handleConfettiComplete = () => {
    setTriggerConfetti(false);
  };

  if (showSuccess) {
    return (
      <>
        <Confetti trigger={triggerConfetti} onComplete={handleConfettiComplete} />
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-700 mb-2">Payment Completed Successfully!</h3>
          <p className="text-gray-600">The payment has been verified and completed.</p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Confetti trigger={triggerConfetti} onComplete={handleConfettiComplete} />
      
      {/* Payment Summary */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Payment Details</CardTitle>
          <CardDescription>Review the payment information before entering OTP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">Retailer:</span>
                <span className="font-medium text-gray-900 truncate">{retailer.name}</span>
              </div>
              {retailer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-600">Phone:</span>
                  <span className="font-medium text-gray-900">{retailer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">Initiated:</span>
                <span className="font-medium text-gray-900 text-sm">{formatTimestampWithTime(payment.createdAt)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(payment.totalPaid)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Method:</span>
                <Badge variant="secondary" className="text-xs">{payment.method}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">{payment.state}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OTP Entry */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Enter OTP</CardTitle>
          <CardDescription>
            Enter the 6-character alphanumeric OTP sent to the retailer's phone number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer and Attempts */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">OTP expires in:</span>
              <Badge variant={timeLeft > 60 ? "secondary" : "destructive"} className="text-xs">
                {formatTime(timeLeft)}
              </Badge>
            </div>
            
            {/* Attempts Counter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Attempts remaining:</span>
              <Badge variant={remainingAttempts > 1 ? "secondary" : remainingAttempts === 1 ? "outline" : "destructive"} className="text-xs">
                {remainingAttempts}/3
              </Badge>
            </div>
            
            {canResend && onResendOTP && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendOTP}
                className="text-xs h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Resend OTP
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Cooldown Warning */}
          {cooldownTimeLeft > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                Too many failed attempts. Please wait {Math.floor(cooldownTimeLeft / 60)}:{(cooldownTimeLeft % 60).toString().padStart(2, '0')} before trying again.
              </AlertDescription>
            </Alert>
          )}

          {/* Breach Warning */}
          {securityStatus?.breachDetected && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Security breach detected. Wholesaler has been notified.
              </AlertDescription>
            </Alert>
          )}

          {/* OTP Input */}
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
              Enter 6-character alphanumeric OTP
            </Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-character OTP"
              value={otp}
              onChange={(e) => handleOTPChange(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={6}
              className="text-center text-lg tracking-widest h-12"
              disabled={verifyingOTP}
            />
            <p className="text-xs text-gray-500 text-center">
              The retailer should have received the OTP on their phone
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isVerifying || verifyingOTP}
              className="h-10 px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || isVerifying || verifyingOTP || cooldownTimeLeft > 0 || remainingAttempts <= 0 || timeLeft <= 0}
              className="h-10 px-6 min-w-[120px]"
            >
              {isVerifying || verifyingOTP ? (
                <div className="flex items-center">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};