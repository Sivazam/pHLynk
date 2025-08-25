'use client';

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import Image from 'next/image';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg">
              <Image 
                src="/logo.png" 
                alt="pHLynk Logo" 
                width={60}
                height={60}
                className="drop-shadow-lg rounded"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            PharmaLync
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            PharmaLync - Professional Medical Distribution Platfor
          </p>
        </div>

        {/* Auth Forms */}
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

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>© 2025 PharmaLync. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}