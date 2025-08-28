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
import { useRouteProtection } from '@/hooks/use-route-protection';
import { useState, useEffect } from 'react';
import { hasSeenIntroCarousel, resetIntroCarousel } from '@/lib/intro-carousel';

export default function Home() {
  const { user, loading, loadingProgress, loadingStage, hasRole } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  // Apply route protection to prevent back navigation after logout
  useRouteProtection();

  // Check for retailer ID in localStorage on mount
  useEffect(() => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (storedRetailerId) {
      setRetailerId(storedRetailerId);
    }
  }, []);

  // Prevent back navigation to dashboard after logout
  useEffect(() => {
    if (!loading && !user) {
      // Clear any potential dashboard state from history
      const handlePopState = (event: PopStateEvent) => {
        // If user tries to navigate back to a dashboard, prevent it
        if (!user && window.location.pathname === '/') {
          window.history.pushState({}, '', '/');
        }
      };

      window.addEventListener('popstate', handlePopState);
      
      // Replace current history state to prevent back navigation to dashboard
      window.history.replaceState({}, '', '/');
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [user, loading]);

  // Check if we should show the intro carousel - only for completely new users
  useEffect(() => {
    if (!loading && !user && !retailerId) {
      const hasSeenIntro = hasSeenIntroCarousel();
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    }
  }, [loading, user, retailerId]);

  // Debug function to reset intro (remove in production)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        resetIntroCarousel();
        setShowIntro(true);
        console.log('Intro carousel reset for testing', { context: 'Debug' });
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    // The carousel component itself handles marking as seen
  };

  const handleIntroSkip = () => {
    setShowIntro(false);
    // The carousel component itself handles marking as seen
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