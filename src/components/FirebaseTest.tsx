'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirebaseErrorHandler } from '@/components/ui/FirebaseErrorHandler';
import { firebasePhoneAuthService } from '@/services/firebase-phone-auth';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function FirebaseTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowRecaptcha(false);

    try {
      console.log('Testing Firebase OTP to:', phoneNumber);
      
      const firebaseResult = await firebasePhoneAuthService.sendOTP(phoneNumber);
      
      if (firebaseResult.success) {
        setShowOTP(true);
        setSuccess(firebaseResult.message);
      } else {
        if (firebaseResult.message.includes('reCAPTCHA') || firebaseResult.message.includes('domain configuration')) {
          setShowRecaptcha(true);
          setError(firebaseResult.message);
        } else {
          throw new Error(firebaseResult.message);
        }
      }
      
    } catch (err: any) {
      console.log('Error testing Firebase:', err);
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Testing Firebase OTP verification');
      
      const firebaseResult = await firebasePhoneAuthService.verifyOTP(otp);
      
      if (firebaseResult.success) {
        setSuccess('Firebase authentication test successful!');
        console.log('Firebase User:', firebaseResult.user);
      } else {
        throw new Error(firebaseResult.message);
      }
      
    } catch (err: any) {
      console.log('Error verifying OTP:', err);
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    firebasePhoneAuthService.cleanup();
    setShowRecaptcha(false);
    setError(null);
    setSuccess(null);
  };

  const handleUseVisibleRecaptcha = () => {
    firebasePhoneAuthService.cleanup();
    setShowRecaptcha(true);
    setError(null);
    setSuccess(null);
  };

  const cleanup = () => {
    firebasePhoneAuthService.cleanup();
    setShowOTP(false);
    setPhoneNumber('');
    setOtp('');
    setError(null);
    setSuccess(null);
    setShowRecaptcha(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* reCAPTCHA container */}
        <div id="recaptcha-container" className={showRecaptcha ? "mb-4" : "hidden"}></div>
        
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Firebase Authentication Test</CardTitle>
            <CardDescription>
              Test Firebase phone authentication with reCAPTCHA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Alert */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <div className="text-sm text-green-800">{success}</div>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <FirebaseErrorHandler
                error={error}
                onRetry={handleRetry}
                onUseVisibleRecaptcha={handleUseVisibleRecaptcha}
                showRetry={!showRecaptcha}
                showVisibleRecaptchaOption={!showRecaptcha}
              />
            )}

            {!showOTP ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Test Phone Number</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="rounded-l-none"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter any 10-digit number for testing (Firebase will validate format)
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSendOTP} 
                    className="flex-1" 
                    disabled={loading || phoneNumber.length !== 10}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Send OTP'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={cleanup}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Enter the OTP sent to +91{phoneNumber}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleVerifyOTP} 
                    className="flex-1" 
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={cleanup}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              <p>This is a test page for Firebase authentication.</p>
              <p>It helps verify that reCAPTCHA and phone authentication are working correctly.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}