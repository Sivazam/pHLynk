'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TENANT_STATUSES } from '@/lib/firebase';

interface TenantStatusGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function TenantStatusGuard({ children, fallback }: TenantStatusGuardProps) {
  const { user, loading } = useAuth();
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTenantStatus = async () => {
      if (!user || !user.tenantId) {
        return;
      }

      // Only check tenant status for wholesaler admins and line workers
      if (!user.roles.includes('WHOLESALER_ADMIN') && !user.roles.includes('LINE_WORKER')) {
        return;
      }

      try {
        setCheckingStatus(true);
        setError(null);

        const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, user.tenantId));
        
        if (!tenantDoc.exists()) {
          setError('Tenant account not found');
          return;
        }

        const tenantData = tenantDoc.data();
        setTenantStatus(tenantData.status);

      } catch (err) {
        console.error('Error checking tenant status:', err);
        setError('Failed to verify account status');
      } finally {
        setCheckingStatus(false);
      }
    };

    checkTenantStatus();
  }, [user]);

  // If still loading or checking status, show loading
  if (loading || checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If no user or user doesn't need tenant status check, allow access
  if (!user || (!user.roles.includes('WHOLESALER_ADMIN') && !user.roles.includes('LINE_WORKER'))) {
    return <>{children}</>;
  }

  // If there's an error or tenant is not active, show restricted access
  if (error || tenantStatus !== 'ACTIVE') {
    const statusMessage = tenantStatus === 'PENDING' 
      ? 'Your account is pending approval by the administrator.'
      : tenantStatus === 'SUSPENDED'
      ? 'Your account has been suspended. Please contact support.'
      : error || 'Your account is not active.';

    const statusIcon = tenantStatus === 'PENDING' 
      ? <Clock className="h-8 w-8 text-yellow-500" />
      : tenantStatus === 'SUSPENDED'
      ? <XCircle className="h-8 w-8 text-red-500" />
      : <AlertTriangle className="h-8 w-8 text-red-500" />;

    const statusTitle = tenantStatus === 'PENDING'
      ? 'Account Pending Approval'
      : tenantStatus === 'SUSPENDED'
      ? 'Account Suspended'
      : 'Access Restricted';

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {statusIcon}
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {statusTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              {statusMessage}
            </p>
            
            {tenantStatus === 'PENDING' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  You will receive an email once your account has been approved. 
                  This typically takes 1-2 business days.
                </p>
              </div>
            )}
            
            {tenantStatus === 'SUSPENDED' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  Please contact your administrator or support team for assistance 
                  with reactivating your account.
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  // Clear auth state and redirect to login
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
              
              {tenantStatus === 'PENDING' && (
                <Button 
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  className="w-full"
                >
                  Refresh Status
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tenant is active, allow access
  return <>{children}</>;
}

// Higher-order component for easy wrapping
export function withTenantStatus<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithTenantStatus(props: P) {
    return (
      <TenantStatusGuard fallback={fallback}>
        <Component {...props} />
      </TenantStatusGuard>
    );
  };
}