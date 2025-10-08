'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WholesalerSignupForm } from '@/components/auth/WholesalerSignupForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export default function WholesalerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = async (data: any) => {
    console.log('🚀 Starting wholesaler signup process:', { businessName: data.businessName, email: data.email });
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📤 Sending request to API...');
      const response = await fetch('/api/wholesaler/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📡 Received response from API, status:', response.status);
      
      const result = await response.json();
      console.log('📥 Wholesaler signup API response:', result);

      if (result.success) {
        console.log('✅ Wholesaler signup successful, showing success message...');
        console.log('📄 Success details:', { 
          message: result.message, 
          tenantId: result.tenantId, 
          userId: result.userId,
          status: result.status 
        });
        
        // Show success message on this page first
        setSuccess(result.message || 'Account created successfully! Please wait for admin approval.');
        
        // Wait a moment to show the success message, then redirect
        setTimeout(() => {
          console.log('🔄 Redirecting to login page with success message...');
          router.push('/?message=' + encodeURIComponent(result.message || 'Account created successfully. Please wait for admin approval.'));
        }, 3000);
      } else {
        console.error('❌ Wholesaler signup failed:', result.error);
        setError(result.error || 'Failed to create account');
      }
    } catch (err: any) {
      console.error('❌ Wholesaler signup error:', err);
      console.error('❌ Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      console.log('🏁 Signup process completed, loading set to false');
    }
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen relative">
      {/* Debug Panel - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs z-50 max-w-xs">
          <p><strong>Debug Info:</strong></p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Error: {error || 'None'}</p>
          <p>Success: {success || 'None'}</p>
        </div>
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-700 font-medium">Creating your wholesaler account...</p>
          </div>
        </div>
      )}
      
      {/* Success Message Overlay */}
      {success && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="border-green-200 bg-green-50 shadow-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <WholesalerSignupForm
        onSubmit={handleSignup}
        onBackToLogin={handleBackToLogin}
        loading={loading}
        error={error}
      />
    </div>
  );
}