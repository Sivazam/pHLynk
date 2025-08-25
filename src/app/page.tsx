'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthComponent } from '@/components/auth/AuthComponent';
import { RoleSelection } from '@/components/RoleSelection';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { WholesalerAdminDashboard } from '@/components/WholesalerAdminDashboard';
import { LineWorkerDashboard } from '@/components/LineWorkerDashboard';
import { RetailerDashboard } from '@/components/RetailerDashboard';
import { AppIntroCarousel } from '@/components/AppIntroCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, loading, loadingProgress, loadingStage, hasRole } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  // Check for retailer ID in localStorage on mount
  useEffect(() => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (storedRetailerId) {
      setRetailerId(storedRetailerId);
    }
  }, []);

  // Check if we should show the intro carousel - only for completely new users
  useEffect(() => {
    if (!loading && !user && !retailerId) {
      const hasSeenIntro = localStorage.getItem('pharmalync-intro-seen');
      if (hasSeenIntro !== 'true') {
        setShowIntro(true);
      }
    }
  }, [loading, user, retailerId]);

  // Debug function to reset intro (remove in production)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        localStorage.removeItem('pharmalync-intro-seen');
        setShowIntro(true);
        console.log('🎠 Intro carousel reset for testing');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem('pharmalync-intro-seen', 'true');
  };

  const handleIntroSkip = () => {
    setShowIntro(false);
    localStorage.setItem('pharmalync-intro-seen', 'true');
  };

  // Loading state
  if (loading) {
    return <AppLoadingScreen progress={loadingProgress} stage={loadingStage} />;
  }

  // Show intro carousel for new users before anything else
  if (showIntro) {
    return <AppIntroCarousel onComplete={handleIntroComplete} onSkip={handleIntroSkip} />;
  }

  // Show retailer dashboard if retailer ID is present
  if (retailerId) {
    return <RetailerDashboard />;
  }

  // Show login for non-authenticated users
  if (!user) {
    return <AuthComponent onShowRoleSelection={() => setShowRoleSelection(true)} />;
  }

  // Show role selection if requested
  if (showRoleSelection) {
    return (
      <RoleSelection 
        onRoleSelect={(role) => {
          if (role === 'RETAILER') {
            // RoleSelection will handle retailer authentication
            return;
          }
          setShowRoleSelection(false);
        }}
        onBack={() => setShowRoleSelection(false)}
      />
    );
  }

  // Route based on user role
  if (hasRole('SUPER_ADMIN')) {
    return <SuperAdminDashboard />;
  }

  if (hasRole('WHOLESALER_ADMIN')) {
    return <WholesalerAdminDashboard />;
  }

  if (hasRole('LINE_WORKER')) {
    return <LineWorkerDashboard />;
  }

  // Fallback for users without proper roles - show role selection
  return (
    <RoleSelection 
      onRoleSelect={(role) => {
        if (role === 'RETAILER') {
          return;
        }
        setShowRoleSelection(false);
      }}
      onBack={() => setShowRoleSelection(false)}
    />
  );
}