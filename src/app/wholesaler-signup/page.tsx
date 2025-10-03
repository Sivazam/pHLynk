'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WholesalerSignupForm } from '@/components/auth/WholesalerSignupForm';

export default function WholesalerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wholesaler/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to login page with success message
        router.push('/?message=Account created successfully. Please wait for admin approval.');
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

  return (
    <WholesalerSignupForm
      onSubmit={handleSignup}
      onBackToLogin={handleBackToLogin}
      loading={loading}
      error={error}
    />
  );
}