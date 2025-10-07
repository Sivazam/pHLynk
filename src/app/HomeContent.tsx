'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthComponent } from '@/components/auth/AuthComponent';
import { RoleSelection } from '@/components/RoleSelection';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { WholesalerAdminDashboard } from '@/components/WholesalerAdminDashboard';
import { LineWorkerDashboard } from '@/components/LineWorkerDashboard';
import { RetailerDashboard } from '@/components/RetailerDashboard';
import { AppIntroCarousel } from '@/components/AppIntroCarousel';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { TenantStatusGuard } from '@/components/TenantStatusGuard';
import { TenantStatusScreen } from '@/components/TenantStatusScreen';
import { useRouteProtection } from '@/hooks/use-route-protection';
import { useState, useEffect } from 'react';
import { hasSeenIntroCarousel, resetIntroCarousel } from '@/lib/intro-carousel';
import { useSearchParams } from 'next/navigation';

export function HomeContent() {
  const { user, loading, loadingProgress, loadingStage, hasRole } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const searchParams = useSearchParams();
  const successMessage = searchParams?.get('message');

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle any future keyboard shortcuts here
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

  // Show retailer dashboard if user is a retailer (authenticated)
  if (user && user.isRetailer) {
    return <RetailerDashboard />;
  }

  // Show retailer dashboard if retailer ID is present AND user is loading (for backward compatibility during initial load)
  // This should only apply during the initial loading state, not after logout
  if (retailerId && !user && loading) {
    return <RetailerDashboard />;
  }

  // Show login for non-authenticated users
  if (!user) {
    return <AuthComponent onShowRoleSelection={() => setShowRoleSelection(true)} successMessage={successMessage} />;
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
    // Check if tenant is active
    if (user?.tenantStatus && user.tenantStatus !== 'ACTIVE') {
      return <TenantStatusScreen tenantId={user.tenantId!} initialStatus={user.tenantStatus} />;
    }
    
    return (
      <TenantStatusGuard>
        <WholesalerAdminDashboard />
      </TenantStatusGuard>
    );
  }

  if (hasRole('LINE_WORKER')) {
    // Check if tenant is active
    if (user?.tenantStatus && user.tenantStatus !== 'ACTIVE') {
      return <TenantStatusScreen tenantId={user.tenantId!} initialStatus={user.tenantStatus} />;
    }
    
    return (
      <TenantStatusGuard>
        <LineWorkerDashboard />
      </TenantStatusGuard>
    );
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