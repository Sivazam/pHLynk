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
        setSuccess('OTP sent successfully to your mobile number');
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
        console.log('OTP verified successfully');
        console.log('User authenticated:', firebaseResult.user);
        
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
        setSuccess('OTP resent successfully to your mobile number');
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
    <Card className="w-full shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container" className={showRecaptcha ? "mb-4" : "hidden"}></div>
      
      {/* Back Button */}
      {onBackToRoleSelection && (
        // <Button
        //   variant="ghost"
        //   className="mb-4"
        //   onClick={onBackToRoleSelection}
        // >
        //   <ArrowLeft className="h-4 w-4 mr-2" />
        //   Backzz
        // </Button>
        <>
        </>
      )}

      <CardHeader className="text-center space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-full shadow-lg">
            <Phone className="h-8 w-8 text-white" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Retailer Login
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Secure access to your retailer dashboard
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
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
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-gray-700 font-medium">
                Mobile Number
              </Label>
              <div className="flex">
                <div className="flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 font-medium">
                  +91
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="rounded-l-none border-l-0 focus:border-l focus:border-gray-300 text-lg"
                  maxLength={10}
                />
              </div>
              <p className="text-sm text-gray-500">
                Enter your 10-digit mobile number registered with your wholesale partner
              </p>
            </div>

            <Button 
              onClick={handleSendOTP} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 text-base transition-colors" 
              disabled={loading || phoneNumber.length !== 10}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="otp" className="text-gray-700 font-medium">
                Enter OTP
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-xl tracking-widest font-mono py-3"
              />
              <p className="text-sm text-gray-600 text-center">
                OTP sent to +91 {phoneNumber}
              </p>
                  
              {/* Security Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  For your security, this OTP is valid for 3 minutes only
                </AlertDescription>
              </Alert>
            </div>

            <Button 
              onClick={handleVerifyOTP} 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 text-base transition-colors" 
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>

            <div className="text-center space-y-3">
              <Button
                variant="link"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Didn't receive OTP? Resend OTP
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowOTP(false);
                  setOtp('');
                  setError(null);
                  setSuccess(null);
                }}
                disabled={loading}
                className="text-gray-600 hover:text-gray-700 text-sm font-medium w-full"
              >
                Use different mobile number
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100">
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
            <div className="flex items-center justify-center space-x-1">
              <Shield className="h-3 w-3 text-green-600" />
              <span>Secured with enterprise-grade encryption</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}