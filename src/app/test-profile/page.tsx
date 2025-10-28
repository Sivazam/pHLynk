'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RetailerProfileService } from '@/services/retailer-profile-service';
import { CheckCircle, AlertCircle, User, Phone } from 'lucide-react';

export default function TestProfilePage() {
  const [retailerId, setRetailerId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testProfileLookup = async () => {
    if (!retailerId && !phone) {
      setError('Please enter either a retailer ID or phone number');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let profileData;
      
      if (retailerId) {
        profileData = await RetailerProfileService.getRetailerProfile(retailerId);
      } else if (phone) {
        profileData = await RetailerProfileService.getRetailerProfileByPhone(phone);
      }

      if (profileData) {
        setResult(profileData);
      } else {
        setError('No profile found');
      }
    } catch (err: any) {
      console.error('Error testing profile:', err);
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const testProfileCompletion = () => {
    if (result?.id) {
      window.location.href = `/retailer/profile?mode=complete&retailerId=${result.id}&phone=${result.profile.phone}`;
    }
  };

  const testProfileEdit = () => {
    if (result?.id) {
      window.location.href = `/retailer/profile?mode=edit&retailerId=${result.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile System Test</h1>
          <p className="text-gray-600">Test retailer profile lookup and management</p>
        </div>

        {/* Test Form */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Lookup</CardTitle>
            <CardDescription>Enter retailer ID or phone number to test profile lookup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retailerId">Retailer ID</Label>
                <Input
                  id="retailerId"
                  placeholder="Enter retailer ID"
                  value={retailerId}
                  onChange={(e) => setRetailerId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={testProfileLookup} disabled={loading} className="w-full">
              {loading ? 'Loading...' : 'Test Profile Lookup'}
            </Button>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Profile Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Profile Found</span>
              </CardTitle>
              <CardDescription>Retailer profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Retailer ID</Label>
                  <p className="text-gray-900">{result.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-gray-900">{result.profile.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Business Name</Label>
                  <p className="text-gray-900">{result.profile.realName || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-gray-900">{result.profile.email || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-gray-900">{result.profile.address || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Business Type</Label>
                  <p className="text-gray-900">{result.profile.businessType || 'Not set'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Verification Status</Label>
                <div className="flex items-center space-x-2 mt-1">
                  {result.verification?.isPhoneVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">Phone Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-700">Phone Not Verified</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <Button onClick={testProfileCompletion} variant="outline">
                  Test Profile Completion
                </Button>
                <Button onClick={testProfileEdit}>
                  Test Profile Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">1.</span>
              <p className="text-sm">Enter a retailer ID or phone number and click "Test Profile Lookup"</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">2.</span>
              <p className="text-sm">If profile is found, you can test profile completion or edit functionality</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">3.</span>
              <p className="text-sm">Profile completion will show the form with current data pre-filled</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">4.</span>
              <p className="text-sm">Profile edit will allow updating existing information</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}