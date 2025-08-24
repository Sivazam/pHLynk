'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirebaseErrorHandler } from '@/components/ui/FirebaseErrorHandler';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RetailerAuthService } from '@/services/retailer-auth';
import { firebasePhoneAuthService } from '@/services/firebase-phone-auth';
import { Phone, Shield, ArrowLeft, Loader2, Smartphone, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface RetailerAuthProps {
  onAuthSuccess: (retailerId: string) => void;
  onBackToRoleSelection?: () => void;
}

export function RetailerAuth({ onAuthSuccess, onBackToRoleSelection }: RetailerAuthProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);

  // Initialize Firebase phone auth when component mounts
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      firebasePhoneAuthService.cleanup();
    };
  }, []);

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
      console.log('Sending OTP to:', phoneNumber);
      
      // Check if retailer account exists
      const retailerUser = await RetailerAuthService.getRetailerUserByPhone(phoneNumber);
      
      if (!retailerUser) {
        setError('No retailer account found for this phone number. Please contact your wholesale administrator.');
        return;
      }
      
      console.log('Retailer account found:', retailerUser);
      
      // Send OTP via Firebase Authentication
      const firebaseResult = await firebasePhoneAuthService.sendOTP(phoneNumber);
      
      if (firebaseResult.success) {
        setShowOTP(true);
        setSuccess(firebaseResult.message);
      } else {
        // Check if the error message indicates we need to show reCAPTCHA
        if (firebaseResult.message.includes('reCAPTCHA') || firebaseResult.message.includes('domain configuration')) {
          setShowRecaptcha(true);
          setError(firebaseResult.message);
        } else {
          throw new Error(firebaseResult.message);
        }
      }
      
    } catch (err: any) {
      console.log('Error sending OTP:', err);
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
      console.log('Verifying OTP for phone:', phoneNumber);
      console.log('Entered OTP:', otp);
      
      // Verify OTP using Firebase Authentication
      const firebaseResult = await firebasePhoneAuthService.verifyOTP(otp);
      
      if (firebaseResult.success && firebaseResult.user) {
        console.log('OTP verified successfully via Firebase');
        console.log('Firebase User:', firebaseResult.user);
        
        setFirebaseUser(firebaseResult.user);
        
        // Get retailer user account
        const retailerUser = await RetailerAuthService.getRetailerUserByPhone(phoneNumber);
        
        if (retailerUser) {
          console.log('Retailer user found:', retailerUser);
          
          // Check if account is pending verification
          if (retailerUser.verificationStatus === 'pending') {
            console.log('Account is pending, verifying...');
            const verifiedUser = await RetailerAuthService.verifyRetailerAccount(phoneNumber);
            
            if (verifiedUser) {
              console.log('Account verified successfully');
              setSuccess('Account verified successfully! Welcome to your dashboard.');
            } else {
              console.log('Failed to verify account');
              setError('Failed to verify account. Please try again.');
              return;
            }
          } else {
            // Update last login for existing verified users
            await RetailerAuthService.updateLastLogin(retailerUser.uid);
            console.log('Last login updated');
          }
          
          // Return retailer ID to parent component
          setTimeout(() => {
            onAuthSuccess(retailerUser.retailerId);
          }, 1000); // Small delay to show success message
          
        } else {
          console.log('No retailer account found for phone:', phoneNumber);
          setError('No retailer account found for this phone number. Please contact your wholesale administrator.');
        }
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

  const handleResendOTP = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Resending OTP to:', phoneNumber);
      
      // Resend OTP via Firebase Authentication
      const firebaseResult = await firebasePhoneAuthService.resendOTP(phoneNumber);
      
      if (firebaseResult.success) {
        setSuccess(firebaseResult.message);
        setOtp(''); // Clear previous OTP input
      } else {
        // Check if the error message indicates we need to show reCAPTCHA
        if (firebaseResult.message.includes('reCAPTCHA') || firebaseResult.message.includes('domain configuration')) {
          setShowRecaptcha(true);
          setError(firebaseResult.message);
        } else {
          throw new Error(firebaseResult.message);
        }
      }
      
    } catch (err: any) {
      console.log('Error resending OTP:', err);
      setError(err.message || 'Failed to resend OTP');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* reCAPTCHA container */}
        <div id="recaptcha-container" className={showRecaptcha ? "mb-4" : "hidden"}></div>
        
        {/* Back Button */}
        {onBackToRoleSelection && (
          <Button
            variant="ghost"
            className="mb-4"
            onClick={onBackToRoleSelection}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Retailer Login</CardTitle>
            <CardDescription>
              Enter your phone number to access your retailer dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Alert */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
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
                  <Label htmlFor="phone">Phone Number</Label>
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
                    Enter your 10-digit mobile number without +91
                  </p>
                </div>

                <Button 
                  onClick={handleSendOTP} 
                  className="w-full" 
                  disabled={loading || phoneNumber.length !== 10}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
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
                    OTP sent to +91{phoneNumber}
                  </p>
                  
                  {/* Firebase Authentication Info */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-xs">
                      Using Firebase Authentication for secure OTP verification
                    </AlertDescription>
                  </Alert>
                </div>

                <Button 
                  onClick={handleVerifyOTP} 
                  className="w-full" 
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

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-sm"
                  >
                    Didn't receive OTP? Resend OTP
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
              <p className="mt-1">
                <strong>Note:</strong> OTP will be sent to your mobile number via Firebase Authentication.
              </p>
              <p className="mt-1 text-blue-600">
                This service uses Google's secure authentication system.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}