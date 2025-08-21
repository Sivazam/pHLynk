'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthComponent } from '@/components/auth/AuthComponent';
import { RoleSelection } from '@/components/RoleSelection';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { WholesalerAdminDashboard } from '@/components/WholesalerAdminDashboard';
import { LineWorkerDashboard } from '@/components/LineWorkerDashboard';
import { RetailerDashboard } from '@/components/RetailerDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, loading, hasRole } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [retailerId, setRetailerId] = useState<string | null>(null);

  // Check for retailer ID in localStorage on mount
  useEffect(() => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (storedRetailerId) {
      setRetailerId(storedRetailerId);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show retailer dashboard if retailer ID is present
  if (retailerId) {
    return <RetailerDashboard />;
  }

  if (!user) {
    return <AuthComponent onShowRoleSelection={() => setShowRoleSelection(true)} />;
  }

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