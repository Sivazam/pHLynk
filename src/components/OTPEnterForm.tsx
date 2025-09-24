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
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOTPChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    if (/^\d{0,6}$/.test(value)) {
      setOTP(value);
      if (error) setError(null);
    }
  };

  const handleVerifyOTP = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setError(null);
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
      setError(error.message || 'Failed to verify OTP. Please try again.');
    }
  }, [otp, payment.id, onVerifySuccess]);

  const handleResendOTP = async () => {
    if (onResendOTP) {
      try {
        await onResendOTP();
        setTimeLeft(600); // Reset timer to 10 minutes
        setCanResend(false);
        setError(null);
        setOTP('');
      } catch (error: any) {
        setError(error.message || 'Failed to resend OTP');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Retailer:</span>
                <span className="font-medium text-gray-900">{retailer.name}</span>
              </div>
              {retailer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Phone:</span>
                  <span className="font-medium text-gray-900">{retailer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Initiated:</span>
                <span className="font-medium text-gray-900">{formatTimestampWithTime(payment.createdAt)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(payment.totalPaid)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Method:</span>
                <Badge variant="secondary">{payment.method}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className="bg-yellow-100 text-yellow-800">{payment.state}</Badge>
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
            Enter the 6-digit OTP sent to the retailer's phone number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">OTP expires in:</span>
              <Badge variant={timeLeft > 60 ? "secondary" : "destructive"}>
                {formatTime(timeLeft)}
              </Badge>
            </div>
            {canResend && onResendOTP && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendOTP}
                className="text-sm"
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

          {/* OTP Input */}
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
              Enter 6-digit OTP
            </Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
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
              disabled={verifyingOTP}
              className="h-10 px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || verifyingOTP}
              className="h-10 px-6 min-w-[120px]"
            >
              {verifyingOTP ? (
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