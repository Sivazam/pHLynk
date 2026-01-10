'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RetailerProfileForm } from '@/components/RetailerProfileForm';
import { RetailerProfileService } from '@/services/retailer-profile-service';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RetailerProfilePageProps {
  searchParams: Promise<{
    mode?: 'complete' | 'edit';
    retailerId?: string;
    phone?: string;
  }>;
}

export default function RetailerProfilePage({ searchParams }: RetailerProfilePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [retailerData, setRetailerData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<{
    mode?: 'complete' | 'edit';
    retailerId?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await searchParams;
      setParams(resolvedParams);
    };
    getParams();
  }, [searchParams]);

  const { mode = 'complete', retailerId, phone } = params;
  const isCompletion = mode === 'complete';

  useEffect(() => {
    // Wait for params to be resolved, then load data
    // Check if retailerId exists in URL params or localStorage
    const actualRetailerId = retailerId || (typeof window !== 'undefined' ? localStorage.getItem('retailerId') : null);
    if (actualRetailerId) {
      loadRetailerData(); // Function reads retailerId internally from params or localStorage
    } else if (Object.keys(params).length > 0) {
      // Params resolved but no retailerId found
      setError('Retailer ID not found. Please login again.');
      setLoading(false);
    }
  }, [params, retailerId]);

  const loadRetailerData = async () => {
    try {
      setLoading(true);
      setError(null);

      let actualRetailerId = retailerId;
      let actualPhone = phone;

      // If retailerId is not provided, try to get from localStorage
      if (!actualRetailerId) {
        const storedRetailerId = localStorage.getItem('retailerId');
        actualRetailerId = storedRetailerId || undefined;
      }

      if (!actualRetailerId) {
        throw new Error('Retailer ID not found. Please login again.');
      }

      // Get retailer profile data
      const retailerProfile = await RetailerProfileService.getRetailerProfile(actualRetailerId);

      if (!retailerProfile) {
        throw new Error('Retailer profile not found. Please contact support.');
      }

      // Handle both legacy and new profile formats
      let profileData, phoneData;
      if (retailerProfile.profile) {
        // New profile format
        profileData = retailerProfile.profile;
        phoneData = retailerProfile.profile.phone;
      } else {
        // Legacy format - cast to any to access legacy properties
        const legacyProfile = retailerProfile as any;
        profileData = {
          realName: legacyProfile.name || '',
          phone: legacyProfile.phone || '',
          email: legacyProfile.email || '',
          address: legacyProfile.address || '',
          businessType: legacyProfile.businessType || '',
          licenseNumber: legacyProfile.licenseNumber || ''
        };
        phoneData = legacyProfile.phone || '';
      }

      setRetailerData({
        id: actualRetailerId,
        phone: actualPhone || phoneData,
        profile: profileData,
        verification: retailerProfile.verification || {
          isPhoneVerified: (retailerProfile as any).phoneVerified || false,
          verificationMethod: 'OTP' as const
        }
      });

    } catch (err: any) {
      console.error('Error loading retailer data:', err);
      setError(err.message || 'Failed to load retailer data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSuccess = (updatedProfile: any) => {
    if (isCompletion) {
      // For profile completion, redirect to dashboard
      router.push('/retailer');
    } else {
      // For profile editing, show success and optionally redirect
      setTimeout(() => {
        router.push('/retailer');
      }, 2000);
    }
  };

  const handleBack = () => {
    if (isCompletion) {
      // For completion mode, go back to login
      router.push('/retailer-login');
    } else {
      // For edit mode, go back to dashboard
      router.push('/retailer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={loadRetailerData} variant="outline" className="w-full">
                Try Again
              </Button>
              <Button onClick={handleBack} variant="ghost" className="w-full">
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!retailerData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">PharmaLync</h1>
                  <p className="text-sm text-gray-500">Retailer Portal</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Form */}
      <RetailerProfileForm
        retailerId={retailerData.id}
        phone={retailerData.phone}
        initialProfile={retailerData.profile}
        isCompletion={isCompletion}
        onSuccess={handleProfileSuccess}
        onBack={handleBack}
      />
    </div>
  );
}