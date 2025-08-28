'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { NetflixRoleSelection } from './NetflixRoleSelection';
import Image from 'next/image';

type AuthMode = 'login' | 'signup' | 'reset';
type AuthView = 'roleSelection' | 'authForm';

interface AuthComponentProps {
  onShowRoleSelection?: () => void;
}

export function AuthComponent({ onShowRoleSelection }: AuthComponentProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [view, setView] = useState<AuthView>('roleSelection');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Always start with Netflix role selection for unauthenticated users
  useEffect(() => {
    setView('roleSelection');
    setSelectedRole(null);
  }, []);

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  const showResetPassword = () => {
    setMode('reset');
  };

  const backToLogin = () => {
    setMode('login');
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    if (role !== 'RETAILER') { // Retailer redirects directly, others show login form
      setView('authForm');
    }
  };

  const backToRoleSelection = () => {
    setView('roleSelection');
    setSelectedRole(null);
  };

  // Show Netflix role selection first
  if (view === 'roleSelection') {
    return (
      <NetflixRoleSelection 
        onRoleSelect={handleRoleSelect}
        onBack={() => {}} // No back action from initial role selection
      />
    );
  }

  // Show auth forms after role selection
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {/* Logo and Brand Name Container - Horizontal Layout */}
          <div className="flex items-center justify-center mb-6">
            {/* Logo Container with white border and shadow */}
            <div className="w-16 h-16 flex items-center justify-center">
              <Image 
                src="/logo.png" 
                alt="pHLynk Logo" 
                width={50}
                height={50}
                className="drop-shadow-lg rounded-lg"
              />
            </div>
            
            {/* Brand Text aligned to logo height */}
            <div className="ml-4 text-left h-16 flex flex-col justify-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 bg-clip-text text-transparent leading-none">
                PharmaLync
              </h1>
              <p className="text-gray-500 text-xs font-medium mt-1">
                Verify. Collect. Track.
              </p>
            </div>
          </div>
          
          {/* Selected Role Display */}
          {selectedRole && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
              {selectedRole === 'WHOLESALER_ADMIN' && 'Wholesale Admin'}
              {selectedRole === 'LINE_WORKER' && 'Line Worker'}
              {selectedRole === 'SUPER_ADMIN' && 'Super Admin'}
            </div>
          )}
        </div>

        {/* Back to Role Selection Button */}
        <div className="mb-4">
          <button
            onClick={backToRoleSelection}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to Role Selection
          </button>
        </div>

        {/* Auth Forms */}
        {mode === 'login' && (
          <LoginForm 
            onToggleMode={toggleMode}
            onResetPassword={showResetPassword}
            onShowRoleSelection={onShowRoleSelection}
            selectedRole={selectedRole}
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
            <a href="#" className="hover:text-blue-600 transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors duration-200">Terms of Service</a>
            <a href="#" className="hover:text-blue-600 transition-colors duration-200">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}