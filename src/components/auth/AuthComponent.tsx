'use client';

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ResetPasswordForm } from './ResetPasswordForm';

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthComponentProps {
  onShowRoleSelection?: () => void;
}

export function AuthComponent({ onShowRoleSelection }: AuthComponentProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  const showResetPassword = () => {
    setMode('reset');
  };

  const backToLogin = () => {
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {mode === 'login' && (
          <LoginForm 
            onToggleMode={toggleMode}
            onResetPassword={showResetPassword}
            onShowRoleSelection={onShowRoleSelection}
          />
        )}
        {mode === 'signup' && (
          <SignupForm onToggleMode={toggleMode} />
        )}
        {mode === 'reset' && (
          <ResetPasswordForm onBackToLogin={backToLogin} />
        )}
      </div>
    </div>
  );
}