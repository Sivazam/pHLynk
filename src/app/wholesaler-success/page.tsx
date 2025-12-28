'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2 } from 'lucide-react';

function WholesalerSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingIn, setIsLoggingIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const message = searchParams.get('message') || 'Account created successfully! Please wait for admin approval.';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    console.log('🎉 Wholesaler success page loaded with params:', { message, email });

    // Store params in session storage to ensure they survive any URL clearing
    const signupData = {
      message,
      email,
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem('wholesalerSignupSuccess', JSON.stringify(signupData));
      console.log('✅ Stored signup data in session storage:', signupData);
    } catch (error) {
      console.error('❌ Failed to store signup data:', error);
    }

    // Redirect to login page after showing success message (2.5 seconds)
    const timer = setTimeout(() => {
      console.log('🔑 Redirecting to login page...');
      window.location.href = '/login';
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [router, message, email]);

  const handleManualLogin = () => {
    console.log('🔑 User requested manual login...');
    setIsLoggingIn(false);

    // Store data in session storage before redirecting
    const signupData = {
      message,
      email,
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem('wholesalerSignupSuccess', JSON.stringify(signupData));
      console.log('✅ Stored signup data in session storage before manual redirect');
    } catch (error) {
      console.error('❌ Failed to store signup data:', error);
    }

    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4">
            <CheckCircle className="w-full h-full text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Account Created Successfully!
          </h1>
          <p className="text-gray-600">
            Your wholesaler account has been created and is pending admin approval.
          </p>
        </div>

        {/* Success Message */}
        <Alert className="mb-6 border-green-200 bg-green-50 shadow-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {message}
          </AlertDescription>
        </Alert>

        {/* Loading State */}
        {isLoggingIn && (
          <div className="bg-white rounded-lg p-6 shadow-lg border border-green-200">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
              <p className="text-gray-700 font-medium">
                Redirecting to login page...
              </p>
              <p className="text-sm text-gray-500">
                Preparing your login credentials.
              </p>
            </div>
          </div>
        )}

        {!isLoggingIn && !error && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <p className="text-center text-gray-700 mb-4">
                Please login with your email and password to access your account.
              </p>
              <button
                onClick={handleManualLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Go to Login Page
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => window.location.href = '/'}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WholesalerSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <WholesalerSuccessContent />
    </Suspense>
  );
}

export default WholesalerSuccessPage;
