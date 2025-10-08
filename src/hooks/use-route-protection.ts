'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useRouteProtection() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Prevent back navigation to authenticated routes when logged out
      const handlePopState = (event: PopStateEvent) => {
        if (!user) {
          // If user is logged out and tries to navigate back, prevent it
          window.history.pushState({}, '', '/');
          
          // Clear any potential dashboard-related state
          sessionStorage.removeItem('auth_view');
          sessionStorage.removeItem('selected_role');
          localStorage.removeItem('retailerId');
          
          // Clear any notification states
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('notifications_') || key.includes('auth')) {
              sessionStorage.removeItem(key);
            }
          });
        }
      };

      window.addEventListener('popstate', handlePopState);
      
      // Replace current history state to prevent back navigation
      window.history.replaceState({}, '', '/');

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [user, loading]);

  // Additional protection: Clear any lingering state when user becomes null
  useEffect(() => {
    if (!user && !loading) {
      // Clear all authentication-related storage
      const keysToClear = [
        'retailerId',
        'auth_view',
        'selected_role',
        'pharmalync-intro-seen'
      ];
      
      keysToClear.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear notification states
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('notifications_') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });

      // Clear any potential dashboard state
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('dashboard') || key.includes('nav')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [user, loading]);
}