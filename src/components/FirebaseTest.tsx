'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirebaseErrorHandler } from '@/components/ui/FirebaseErrorHandler';
import { firebasePhoneAuthService } from '@/services/firebase-phone-auth';
import { initializeFCM, isFCMSupported } from '@/lib/fcm';
import { Phone, Loader2, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';

export function FirebaseTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmIsSupported, setFcmIsSupported] = useState(false);
  const [activeTab, setActiveTab] = useState<'auth' | 'fcm'>('auth');

  // Check FCM support on mount
  useEffect(() => {
    setFcmIsSupported(isFCMSupported());
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

  // FCM Testing Functions
  const handleTestFCMSupport = () => {
    const supported = isFCMSupported();
    setFcmIsSupported(supported);
    
    if (supported) {
      toast.success('✅ FCM is supported in this browser!');
    } else {
      toast.error('❌ FCM is not supported in this browser');
    }
  };

  const handleInitializeFCM = async () => {
    if (!fcmIsSupported) {
      toast.error('❌ FCM is not supported in this browser');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Testing FCM initialization...');
      
      const token = await initializeFCM();
      
      if (token) {
        setFcmToken(token);
        setSuccess('FCM initialized successfully! Token obtained.');
        toast.success('✅ FCM initialized successfully!');
      } else {
        throw new Error('Failed to obtain FCM token');
      }
      
    } catch (err: any) {
      console.error('Error initializing FCM:', err);
      setError(err.message || 'Failed to initialize FCM');
      toast.error('❌ Failed to initialize FCM');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!fcmToken) {
      toast.error('❌ Please initialize FCM first');
      return;
    }

    try {
      console.log('Testing FCM notification...');
      
      // Send test notification via API
      const response = await fetch('/api/fcm/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: fcmToken,
          title: '🧪 Test Notification',
          body: 'This is a test FCM notification from FirebaseTest component',
          data: {
            type: 'test',
            timestamp: Date.now().toString()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess('Test notification sent successfully!');
        toast.success('✅ Test notification sent!');
      } else {
        throw new Error('Failed to send test notification');
      }
      
    } catch (err: any) {
      console.error('Error sending test notification:', err);
      setError(err.message || 'Failed to send test notification');
      toast.error('❌ Failed to send test notification');
    }
  };

  const handleCopyToken = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      toast.success('✅ FCM token copied to clipboard!');
    }
  };

  const resetFCM = () => {
    setFcmToken(null);
    setError(null);
    setSuccess(null);
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
                {activeTab === 'auth' ? (
                  <Phone className="h-8 w-8 text-white" />
                ) : (
                  <Bell className="h-8 w-8 text-white" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {activeTab === 'auth' ? 'Firebase Auth Test' : 'FCM Test'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'auth' 
                ? 'Test Firebase phone authentication with reCAPTCHA'
                : 'Test Firebase Cloud Messaging notifications'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setActiveTab('auth')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'auth'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Auth
              </button>
              <button
                onClick={() => setActiveTab('fcm')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'fcm'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                FCM
              </button>
            </div>

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
                onRetry={activeTab === 'auth' ? handleRetry : () => {}}
                onUseVisibleRecaptcha={activeTab === 'auth' ? handleUseVisibleRecaptcha : () => {}}
                showRetry={activeTab === 'auth' && !showRecaptcha}
                showVisibleRecaptchaOption={activeTab === 'auth' && !showRecaptcha}
              />
            )}

            {activeTab === 'auth' ? (
              /* Authentication Testing */
              !showOTP ? (
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
              )
            ) : (
              /* FCM Testing */
              <div className="space-y-4">
                {/* FCM Support Status */}
                <div className="space-y-2">
                  <Label>FCM Support Status</Label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${fcmIsSupported ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">
                        {fcmIsSupported ? 'Supported' : 'Not Supported'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestFCMSupport}
                    >
                      Check
                    </Button>
                  </div>
                </div>

                {/* FCM Token Display */}
                {fcmToken && (
                  <div className="space-y-2">
                    <Label>FCM Token</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 break-all mb-2">
                        {fcmToken.substring(0, 50)}...
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToken}
                        className="w-full"
                      >
                        Copy Token
                      </Button>
                    </div>
                  </div>
                )}

                {/* FCM Actions */}
                <div className="space-y-2">
                  <Label>FCM Testing</Label>
                  <div className="space-y-2">
                    <Button
                      onClick={handleInitializeFCM}
                      className="w-full"
                      disabled={loading || !fcmIsSupported}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        'Initialize FCM'
                      )}
                    </Button>

                    <Button
                      onClick={handleTestNotification}
                      variant="outline"
                      className="w-full"
                      disabled={loading || !fcmToken}
                    >
                      Send Test Notification
                    </Button>

                    <Button
                      onClick={resetFCM}
                      variant="outline"
                      className="w-full"
                      disabled={loading}
                    >
                      Reset FCM
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• FCM requires HTTPS and service worker support</p>
                  <p>• Notifications work in foreground and background</p>
                  <p>• Check browser console for detailed logs</p>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              <p>This is a test page for Firebase services.</p>
              <p>It helps verify that authentication and notifications are working correctly.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}