'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RetailerAuthService } from '@/services/retailer-auth';
import { Phone, Shield, ArrowLeft, Loader2, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [generatedOTP, setGeneratedOTP] = useState<string>('');

  const generateSimpleOTP = () => {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📱 Sending OTP to:', phoneNumber);
      
      // Generate OTP locally instead of using Firebase
      const otpCode = generateSimpleOTP();
      setGeneratedOTP(otpCode);
      
      // Check if retailer account exists
      const retailerUser = await RetailerAuthService.getRetailerUserByPhone(phoneNumber);
      
      if (!retailerUser) {
        setError('No retailer account found for this phone number. Please contact your wholesale administrator.');
        return;
      }
      
      console.log('✅ OTP generated successfully:', otpCode);
      console.log('👤 Retailer account found:', retailerUser);
      
      setShowOTP(true);
      setSuccess(`OTP has been generated for your mobile number. In a production environment, this would be sent via SMS.`);
      
      // In development, show the OTP for testing
      if (process.env.NODE_ENV === 'development') {
        setSuccess(prev => prev + ` Development OTP: ${otpCode}`);
      }
      
    } catch (err: any) {
      console.error('❌ Error sending OTP:', err);
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
      console.log('🔍 Verifying OTP for phone:', phoneNumber);
      console.log('🔍 Entered OTP:', otp);
      console.log('🔍 Generated OTP:', generatedOTP);
      
      // Verify OTP locally
      if (otp === generatedOTP) {
        console.log('✅ OTP verified successfully');
        
        // Get retailer user account
        const retailerUser = await RetailerAuthService.getRetailerUserByPhone(phoneNumber);
        
        if (retailerUser) {
          console.log('👤 Retailer user found:', retailerUser);
          
          // Check if account is pending verification
          if (retailerUser.verificationStatus === 'pending') {
            console.log('🔍 Account is pending, verifying...');
            const verifiedUser = await RetailerAuthService.verifyRetailerAccount(phoneNumber);
            
            if (verifiedUser) {
              console.log('✅ Account verified successfully');
              setSuccess('Account verified successfully! Welcome to your dashboard.');
            } else {
              console.log('❌ Failed to verify account');
              setError('Failed to verify account. Please try again.');
              return;
            }
          } else {
            // Update last login for existing verified users
            await RetailerAuthService.updateLastLogin(retailerUser.uid);
            console.log('✅ Last login updated');
          }
          
          // Return retailer ID to parent component
          setTimeout(() => {
            onAuthSuccess(retailerUser.retailerId);
          }, 1000); // Small delay to show success message
          
        } else {
          console.log('❌ No retailer account found for phone:', phoneNumber);
          setError('No retailer account found for this phone number. Please contact your wholesale administrator.');
        }
      } else {
        console.log('❌ OTP verification failed');
        setError('Invalid OTP. Please try again.');
      }
      
    } catch (err: any) {
      console.error('❌ Error verifying OTP:', err);
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
      console.log('📱 Resending OTP to:', phoneNumber);
      
      // Generate new OTP
      const otpCode = generateSimpleOTP();
      setGeneratedOTP(otpCode);
      setOtp('');
      
      console.log('✅ OTP resent successfully:', otpCode);
      setSuccess(`New OTP has been generated for your mobile number.`);
      
      // In development, show the OTP for testing
      if (process.env.NODE_ENV === 'development') {
        setSuccess(prev => prev + ` Development OTP: ${otpCode}`);
      }
      
    } catch (err: any) {
      console.error('❌ Error resending OTP:', err);
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
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
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
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
                      Generating OTP...
                    </>
                  ) : (
                    'Generate OTP'
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
                    OTP generated for +91{phoneNumber}
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-blue-600 text-center font-medium">
                      Development Mode: OTP is {generatedOTP}
                    </p>
                  )}
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
                    Didn't receive OTP? Generate New OTP
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
              <p className="mt-1">
                <strong>Note:</strong> This is a development environment. In production, OTPs will be sent via SMS.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}