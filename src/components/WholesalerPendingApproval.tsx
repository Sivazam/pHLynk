'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Building2, Clock, Edit, Save, X, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StatusBarColor } from './ui/StatusBarColor';

interface TenantData {
  name: string;
  address: string;
  gstNumber?: string;
  ownerName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
}

export function WholesalerPendingApproval() {
  const { user } = useAuth();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TenantData>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Fetch tenant data
  const fetchTenantData = async () => {
    if (!user?.tenantId) return;

    try {
      const response = await fetch(`/api/wholesaler/tenant-data?tenantId=${user.tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setTenantData(data.tenant);
        setEditData({
          name: data.tenant.name,
          address: data.tenant.address,
          gstNumber: data.tenant.gstNumber,
          ownerName: data.tenant.ownerName,
          contactPhone: data.tenant.contactPhone
        });
      } else {
        setError('Failed to fetch tenant data');
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      setError('Failed to fetch tenant data');
    }
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    fetchTenantData();
    // Check status every 30 seconds
    const interval = setInterval(fetchTenantData, 30000);
    return () => clearInterval(interval);
  }, [user?.tenantId]);

  const handleEdit = () => {
    setEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({
      name: tenantData?.name,
      address: tenantData?.address,
      gstNumber: tenantData?.gstNumber,
      ownerName: tenantData?.ownerName,
      contactPhone: tenantData?.contactPhone
    });
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!user?.tenantId || !editData) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tenantRef = doc(db, 'tenants', user.tenantId);
      await updateDoc(tenantRef, {
        ...editData,
        updatedAt: serverTimestamp()
      });

      // Update user display name if owner name changed
      if (editData.ownerName && editData.ownerName !== tenantData?.ownerName) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: editData.ownerName,
          updatedAt: serverTimestamp()
        });
      }

      setSuccess('Business information updated successfully');
      setEditing(false);
      fetchTenantData(); // Refresh data
    } catch (error) {
      console.error('Error updating tenant data:', error);
      setError('Failed to update business information');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTenantData();
  };

  if (!tenantData) {
    return (
      <>
        <StatusBarColor theme="white" />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your account information...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StatusBarColor theme="white" />
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <div className="ml-4 text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 bg-clip-text text-transparent">
                  PharmaLync
                </h1>
                <p className="text-gray-500 text-xs font-medium mt-1">
                  Account Pending Approval
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Status Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-yellow-600 mr-2" />
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">
                    Pending Approval
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Your Account is Under Review
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Please wait while our team reviews your wholesaler account application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    <strong>Estimated review time:</strong> 12-24 hours
                    <br />
                    <strong>Last updated:</strong> {lastRefreshed.toLocaleString()}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-center">
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Status</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Business Information Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Business Information
                    </CardTitle>
                  </div>
                  {!editing && (
                    <Button
                      onClick={handleEdit}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          value={editData.name || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ownerName">Owner Name</Label>
                        <Input
                          id="ownerName"
                          value={editData.ownerName || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, ownerName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Business Address</Label>
                      <Textarea
                        id="address"
                        value={editData.address || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                        <Input
                          id="gstNumber"
                          value={editData.gstNumber || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, gstNumber: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Contact Phone</Label>
                        <Input
                          id="contactPhone"
                          value={editData.contactPhone || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, contactPhone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button onClick={handleCancel} variant="outline" disabled={loading}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Business Name</Label>
                        <p className="text-gray-900 font-medium">{tenantData.name}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Owner Name</Label>
                        <p className="text-gray-900 font-medium">{tenantData.ownerName}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Business Address</Label>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-900">{tenantData.address}</p>
                      </div>
                    </div>
                    {tenantData.gstNumber && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">GST Number</Label>
                        <p className="text-gray-900 font-mono">{tenantData.gstNumber}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Contact Email</Label>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900">{tenantData.contactEmail}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Contact Phone</Label>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900">{tenantData.contactPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  What Happens Next?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Our admin team will review your business information and verify your details</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>You can edit your business information above (except email and password)</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Once approved, you'll receive full access to the PharmaLync wholesaler dashboard</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>You'll be able to add line workers, manage retailers, and track collections</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <div className="text-center text-sm text-gray-500">
              <p>Need help? Contact our support team at support@pharmalynk.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}