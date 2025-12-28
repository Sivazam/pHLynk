'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthComponent } from '@/components/auth/AuthComponent';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get success message from URL (if redirected from signup)
  const successMessage = searchParams.get('message');
  const email = searchParams.get('email');

  // Function to go to role selection
  const handleShowRoleSelection = () => {
    router.push('/?showRoleSelection=true');
  };

  return (
    <AuthComponent
      onShowRoleSelection={handleShowRoleSelection}
      successMessage={successMessage}
    />
  );
}

function LoginPage() {
  return (
    <Suspense fallback={<AppLoadingScreen progress={0} stage="Loading..." />}>
      <LoginContent />
    </Suspense>
  );
}

export default LoginPage;
