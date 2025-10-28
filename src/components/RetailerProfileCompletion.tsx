'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Store, 
  MapPin, 
  Mail, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Building,
  Shield,
  Loader2
} from 'lucide-react';
import { RetailerProfileService } from '@/services/retailer-profile-service';

interface RetailerProfile {
  realName: string;
  email?: string;
  address?: string;
  businessType?: string;
  licenseNumber?: string;
  // Legacy format fields
  name?: string;
  phone?: string;
  phoneVerified?: boolean;
  profile?: {
    realName: string;
    phone: string;
    email?: string;
    address?: string;
    businessType?: string;
    licenseNumber?: string;
  };
}

interface RetailerProfileCompletionProps {
  retailerId: string;
  phone: string;
  onProfileComplete: (profile: RetailerProfile) => void;
  onSkip?: () => void;
}

export function RetailerProfileCompletion({ 
  retailerId, 
  phone, 
  onProfileComplete, 
  onSkip 
}: RetailerProfileCompletionProps) {
  const [profile, setProfile] = useState<RetailerProfile>({
    realName: '',
    email: '',
    address: '',
    businessType: '',
    licenseNumber: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calculate profile completion percentage
  const completionPercentage = Object.values(profile).filter(value => 
    value && value.trim() !== ''
  ).length * 20; // 5 fields = 100%

  const businessTypes = [
    'Pharmacy',
    'Medical Store',
    'Chemist Shop',
    'Hospital Pharmacy',
    'Wholesale Pharmacy',
    'Other'
  ];

  useEffect(() => {
    // Load existing profile data if any
    const loadProfile = async () => {
      try {
        const existingProfile = await RetailerProfileService.getRetailerProfile(retailerId);
        if (existingProfile) {
          // Handle both legacy and new profile formats
          if (existingProfile.profile) {
            // New profile format
            setProfile({
              realName: existingProfile.profile.realName || '',
              email: existingProfile.profile.email || '',
              address: existingProfile.profile.address || '',
              businessType: existingProfile.profile.businessType || '',
              licenseNumber: existingProfile.profile.licenseNumber || ''
            });
          } else {
            // Legacy format - the data is directly on the document
            const legacyProfile = existingProfile as any;
            setProfile({
              realName: legacyProfile.name || '',
              email: legacyProfile.email || '',
              address: legacyProfile.address || '',
              businessType: legacyProfile.businessType || '',
              licenseNumber: legacyProfile.licenseNumber || ''
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
  }, [retailerId]);

  const handleInputChange = (field: keyof RetailerProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateProfile = (): string | null => {
    if (!profile.realName.trim()) {
      return 'Business name is required';
    }
    
    if (profile.email && !/\S+@\S+\.\S+/.test(profile.email)) {
      return 'Please enter a valid email address';
    }
    
    if (profile.businessType === 'Other' && !profile.realName.toLowerCase().includes('pharmacy') && 
        !profile.realName.toLowerCase().includes('medical') && !profile.realName.toLowerCase().includes('chemist')) {
      return 'Please specify your business type in the name or choose from the list';
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
    
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Completing retailer profile:', { retailerId, profile });
      
      // Update retailer profile
      await RetailerProfileService.updateRetailerProfile(retailerId, profile);
      
      // Mark phone as verified if not already
      await RetailerProfileService.verifyPhone(retailerId);
      
      setSuccess('Profile completed successfully!');
      
      // Notify parent component
      setTimeout(() => {
        onProfileComplete(profile);
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error completing profile:', error);
      setError(error.message || 'Failed to complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
            <Store className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Help us serve you better by completing your business information
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Phone: +91 {phone}
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completion</span>
              <span className="text-sm text-gray-500">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="mt-2 text-xs text-gray-500">
              Complete your profile to get the best experience
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Please provide your business details. All fields marked with * are required.
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

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="realName" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Business Name *
                </Label>
                <Input
                  id="realName"
                  placeholder="e.g., Siva Medicals, Apollo Pharmacy"
                  value={profile.realName}
                  onChange={(e) => handleInputChange('realName', e.target.value)}
                  required
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  This will be displayed as your business name throughout the platform
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="business@example.com"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  For order confirmations and business communications
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Business Address
                </Label>
                <Textarea
                  id="address"
                  placeholder="Enter your complete business address"
                  value={profile.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="text-base resize-none"
                />
                <p className="text-sm text-gray-500">
                  This helps us verify your location and provide better service
                </p>
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <Label htmlFor="businessType" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Business Type
                </Label>
                <Select 
                  value={profile.businessType} 
                  onValueChange={(value) => handleInputChange('businessType', value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Helps us understand your business needs better
                </p>
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <Label htmlFor="licenseNumber" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Drug License Number
                </Label>
                <Input
                  id="licenseNumber"
                  placeholder="e.g., DL/PH/2023/12345"
                  value={profile.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  Your pharmacy/medical store license number (optional)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !profile.realName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing Profile...
                    </>
                  ) : (
                    <>
                      Complete Profile
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                
                {onSkip && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    Skip for Now
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Your information is secure and will only be used for business purposes</span>
          </div>
        </div>
      </div>
    </div>
  );
}