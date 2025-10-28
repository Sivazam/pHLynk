'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { 
  User, 
  Store, 
  Mail, 
  MapPin, 
  Building, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Save,
  ArrowLeft,
  Shield,
  Phone
} from 'lucide-react';

interface RetailerProfile {
  realName: string;
  email?: string;
  address?: string;
  businessType?: string;
  licenseNumber?: string;
}

interface RetailerProfileFormProps {
  retailerId: string;
  phone: string;
  initialProfile?: RetailerProfile;
  isCompletion?: boolean; // true for first-time completion, false for editing
  onSuccess?: (profile: RetailerProfile) => void;
  onBack?: () => void;
}

const BUSINESS_TYPES = [
  'Pharmacy',
  'Medical Store',
  'Hospital Pharmacy',
  'Wholesale Pharmacy',
  'Clinic Pharmacy',
  'Other'
];

export function RetailerProfileForm({ 
  retailerId, 
  phone, 
  initialProfile, 
  isCompletion = false,
  onSuccess,
  onBack
}: RetailerProfileFormProps) {
  const [profile, setProfile] = useState<RetailerProfile>({
    realName: '',
    email: '',
    address: '',
    businessType: '',
    licenseNumber: '',
    ...initialProfile
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setProfile(prev => ({ ...prev, ...initialProfile }));
    }
  }, [initialProfile]);

  const handleInputChange = (field: keyof RetailerProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setError(null);
    setSuccess(null);
  };

  const validateProfile = (): string | null => {
    if (!profile.realName.trim()) {
      return 'Business name is required';
    }
    
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      return 'Please enter a valid email address';
    }
    
    if (profile.businessType && !BUSINESS_TYPES.includes(profile.businessType)) {
      return 'Please select a valid business type';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateProfile();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/retailer/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId,
          profile
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setSuccess(isCompletion 
        ? 'Profile completed successfully! Welcome to your dashboard.' 
        : 'Profile updated successfully!'
      );
      
      setIsDirty(false);

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(profile);
        }
      }, 1500);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = profile.realName.trim() !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
            <Store className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isCompletion ? 'Complete Your Profile' : 'Edit Your Profile'}
          </h1>
          <p className="text-gray-600">
            {isCompletion 
              ? 'Please provide your business details to get started'
              : 'Update your business information'
            }
          </p>
        </div>

        {/* Phone Number Display */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Registered Mobile Number</p>
                <p className="text-lg font-semibold text-blue-800">+91 {phone}</p>
                <p className="text-xs text-blue-600 mt-1">
                  <Shield className="h-3 w-3 inline mr-1" />
                  This number cannot be changed as it's used for verification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Business Information</span>
            </CardTitle>
            <CardDescription>
              {isCompletion 
                ? 'Fill in your business details to complete your profile'
                : 'Update your business information below'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Alert */}
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {/* Business Name (Required) */}
              <div className="space-y-2">
                <Label htmlFor="realName" className="flex items-center space-x-1">
                  <Store className="h-4 w-4" />
                  <span>Business Name *</span>
                </Label>
                <Input
                  id="realName"
                  type="text"
                  placeholder="Enter your business name"
                  value={profile.realName}
                  onChange={(e) => handleInputChange('realName', e.target.value)}
                  required
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  This will be displayed as your business name on invoices and communications
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>Email Address</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={profile.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  Optional: Used for important notifications and receipts
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Business Address</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="Enter your complete business address"
                  value={profile.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="text-base resize-none"
                />
                <p className="text-sm text-gray-500">
                  Optional: Used for delivery and communication purposes
                </p>
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <Label htmlFor="businessType" className="flex items-center space-x-1">
                  <Building className="h-4 w-4" />
                  <span>Business Type</span>
                </Label>
                <Select 
                  value={profile.businessType || ''} 
                  onValueChange={(value) => handleInputChange('businessType', value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Optional: Helps us provide better service for your business type
                </p>
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <Label htmlFor="licenseNumber" className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>Pharmacy License Number</span>
                </Label>
                <Input
                  id="licenseNumber"
                  type="text"
                  placeholder="Enter your pharmacy license number"
                  value={profile.licenseNumber || ''}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  Optional: For verification and compliance purposes
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                {onBack && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                )}
                
                <LoadingButton
                  type="submit"
                  isLoading={loading}
                  disabled={!isFormValid || !isDirty}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isCompletion ? 'Complete Profile' : 'Update Profile'}
                  </span>
                </LoadingButton>
              </div>

              {/* Form Status */}
              {!isDirty && !isCompletion && (
                <div className="text-center text-sm text-gray-500">
                  No changes made to your profile
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-3 w-3 text-green-600" />
            <span>Your information is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}