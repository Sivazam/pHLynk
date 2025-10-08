'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db, COLLECTIONS, TENANT_STATUSES } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CheckCircle, XCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TenantStatusScreenProps {
  tenantId: string;
  initialStatus?: string;
}

export function TenantStatusScreen({ tenantId, initialStatus }: TenantStatusScreenProps) {
  const { logout } = useAuth();
  const [tenantStatus, setTenantStatus] = useState<string>(initialStatus || 'UNKNOWN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkTenantStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, tenantId));
      
      if (!tenantDoc.exists()) {
        setError('Tenant account not found');
        return;
      }

      const tenantData = tenantDoc.data();
      setTenantStatus(tenantData.status);
      setLastChecked(new Date());

    } catch (err) {
      console.error('Error checking tenant status:', err);
      setError('Failed to verify account status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialStatus) {
      checkTenantStatus();
    }
  }, [tenantId, initialStatus]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case TENANT_STATUSES.ACTIVE:
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          title: 'Account Active',
          message: 'Your account is active and ready to use.',
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          badgeVariant: 'default' as const
        };
      
      case TENANT_STATUSES.PENDING:
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          title: 'Account Pending Approval',
          message: 'Your account is pending approval by the administrator.',
          color: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          badgeVariant: 'secondary' as const
        };
      
      case TENANT_STATUSES.SUSPENDED:
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: 'Account Suspended',
          message: 'Your account has been suspended. Please contact support.',
          color: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          badgeVariant: 'destructive' as const
        };
      
      case 'REJECTED':
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: 'Account Rejected',
          message: 'Your account application has been rejected. Please contact support.',
          color: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          badgeVariant: 'destructive' as const
        };
      
      default:
        return {
          icon: <AlertTriangle className="h-12 w-12 text-gray-500" />,
          title: 'Account Status Unknown',
          message: 'Unable to determine your account status. Please contact support.',
          color: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          badgeVariant: 'outline' as const
        };
    }
  };

  const statusConfig = getStatusConfig(tenantStatus);

  const handleLogout = async () => {
    await logout();
  };

  const formatLastChecked = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {statusConfig.icon}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {statusConfig.title}
            </CardTitle>
            <Badge variant={statusConfig.badgeVariant} className="text-sm">
              {tenantStatus}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className={`border rounded-lg p-4 ${statusConfig.color}`}>
            <p className={`text-sm ${statusConfig.textColor} text-center`}>
              {statusConfig.message}
            </p>
          </div>
          
          {/* Status-specific additional information */}
          {tenantStatus === TENANT_STATUSES.PENDING && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>What happens next?</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• Administrator will review your application</li>
                  <li>• You'll receive an email notification</li>
                  <li>• Approval typically takes 1-2 business days</li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Last checked: {formatLastChecked(lastChecked)}
                </p>
              </div>
            </div>
          )}
          
          {tenantStatus === TENANT_STATUSES.SUSPENDED && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>To reactivate your account:</strong>
              </p>
              <ul className="text-xs text-orange-700 mt-2 space-y-1">
                <li>• Contact your system administrator</li>
                <li>• Resolve any outstanding issues</li>
                <li>• Wait for administrator approval</li>
              </ul>
            </div>
          )}
          
          {tenantStatus === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>If you believe this is an error:</strong>
              </p>
              <ul className="text-xs text-red-700 mt-2 space-y-1">
                <li>• Contact support team immediately</li>
                <li>• Provide your account details</li>
                <li>• Request a review of your application</li>
              </ul>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center gap-2"
              disabled={loading}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
            
            {(tenantStatus === TENANT_STATUSES.PENDING || error) && (
              <Button 
                onClick={checkTenantStatus}
                variant="ghost"
                className="w-full flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Checking...' : 'Refresh Status'}
              </Button>
            )}
          </div>
          
          {/* Contact information */}
          <div className="text-center border-t pt-4">
            <p className="text-xs text-gray-500">
              Need help? Contact your administrator or support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}