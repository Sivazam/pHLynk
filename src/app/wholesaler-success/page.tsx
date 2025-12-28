'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function WholesalerSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingIn, setIsLoggingIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const message = searchParams.get('message') || 'Account created successfully! Please wait for admin approval.';
  const email = searchParams.get('email') || '';
  const password = searchParams.get('password') || '';

  useEffect(() => {
    console.log('🎉 Wholesaler success page loaded with params:', { message, email, hasPassword: !!password });

    if (!email || !password) {
      console.warn('⚠️ No email or password in URL params, showing success message only');
      setIsLoggingIn(false);
      return;
    }

    // Auto-submit login after showing success message
    const timer = setTimeout(async () => {
      console.log('🔑 Attempting automatic login...');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const result = await response.json();
        console.log('📥 Auto-login response:', result);

        if (result.success) {
          console.log('✅ Auto-login successful, redirecting to dashboard...');
          router.push('/');
        } else {
          console.error('❌ Auto-login failed:', result.error);
          setError(result.error || 'Auto-login failed. Please login manually.');
          setIsLoggingIn(false);
        }
      } catch (err: any) {
        console.error('❌ Auto-login error:', err);
        setError(err.message || 'An error occurred during auto-login. Please login manually.');
        setIsLoggingIn(false);
      }
    }, 2000); // 2 second delay to show success message

    return () => {
      clearTimeout(timer);
    };
  }, [router, message, email, password]);

  const handleManualLogin = () => {
    console.log('🔑 User requested manual login...');
    setIsLoggingIn(false);
    router.push('/?' + new URLSearchParams({
      message,
      email,
      password,
    }).toString());
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
                Logging you in automatically...
              </p>
              <p className="text-sm text-gray-500">
                Please wait while we set up your account.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoggingIn && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!isLoggingIn && !error && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <p className="text-center text-gray-700 mb-4">
                We couldn't log you in automatically. Please click the button below to go to the login page.
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
                onClick={() => router.push('/')}
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
