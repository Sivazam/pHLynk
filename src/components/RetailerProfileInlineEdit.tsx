'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Store, 
  MapPin, 
  Mail, 
  FileText, 
  Edit2, 
  CheckCircle, 
  AlertCircle, 
  Save,
  X,
  Phone,
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
  phone: string;
  isPhoneVerified: boolean;
  verifiedAt?: string;
}

interface RetailerProfileInlineEditProps {
  retailerId: string;
  profile: RetailerProfile;
  onProfileUpdate: (updatedProfile: RetailerProfile) => void;
}

export function RetailerProfileInlineEdit({ 
  retailerId, 
  profile, 
  onProfileUpdate
}: RetailerProfileInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<RetailerProfile>(profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialProfile, setInitialProfile] = useState<RetailerProfile>(profile);
  const isEditingRef = useRef(false);
  
  const businessTypes = [
    'Pharmacy',
    'Medical Store',
    'Chemist Shop',
    'Hospital Pharmacy',
    'Wholesale Pharmacy',
    'Other'
  ];

  useEffect(() => {
    // Update initial profile when it changes from parent (but not during editing)
    console.log('📝 Profile updated from parent:', profile, { isEditing: isEditingRef.current });
    if (!isEditingRef.current) {
      setInitialProfile(profile);
      if (!isEditing) {
        setEditedProfile(profile);
      }
    }
  }, [profile, isEditing]);

  useEffect(() => {
    // Initialize edit mode
    if (isEditing) {
      isEditingRef.current = true;
      console.log('📝 Entering edit mode with profile:', initialProfile);
      setEditedProfile(initialProfile);
      setError(null);
      setSuccess(null);
    } else {
      isEditingRef.current = false;
    }
  }, [isEditing, initialProfile]);

  const handleInputChange = (field: keyof RetailerProfile, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateProfile = (): string | null => {
    if (!editedProfile.realName.trim()) {
      return 'Business name is required';
    }
    
    if (editedProfile.email && !/\S+@\S+\.\S+/.test(editedProfile.email)) {
      return 'Please enter a valid email address';
    }
    
    if (editedProfile.businessType === 'Other' && !editedProfile.realName.toLowerCase().includes('pharmacy') && 
        !editedProfile.realName.toLowerCase().includes('medical') && !editedProfile.realName.toLowerCase().includes('chemist')) {
      return 'Please specify your business type in the name or choose from the list';
    }
    
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
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
      console.log('📝 Updating retailer profile:', { retailerId, profile: editedProfile });
      
      // Update retailer profile (exclude phone as it's not editable)
      const { phone, isPhoneVerified, verifiedAt, ...updatableFields } = editedProfile;
      await RetailerProfileService.updateRetailerProfile(retailerId, updatableFields);
      
      setSuccess('Profile updated successfully!');
      
      // Notify parent component
      onProfileUpdate(editedProfile);
      
      // Update initial profile to reflect saved changes
      setInitialProfile(editedProfile);
      
      // Exit edit mode after a short delay
      setTimeout(() => {
        setIsEditing(false);
        setSuccess(null);
        isEditingRef.current = false;
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(initialProfile);
    setError(null);
    setSuccess(null);
    setIsEditing(false);
    isEditingRef.current = false;
  };

  const hasChanges = JSON.stringify(editedProfile) !== JSON.stringify(initialProfile);

  // Display mode
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Business Profile</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Business Name</Label>
            <p className="text-gray-900">{profile.realName || 'Not set'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
            <div className="flex items-center gap-2">
              <p className="text-gray-900">+91 {profile.phone}</p>
              {profile.isPhoneVerified && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Email</Label>
            <p className="text-gray-900">{profile.email || 'Not set'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Business Type</Label>
            <p className="text-gray-900">{profile.businessType || 'Not set'}</p>
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700">Address</Label>
          <p className="text-gray-900">{profile.address || 'Not set'}</p>
        </div>
        
        {profile.licenseNumber && (
          <div>
            <Label className="text-sm font-medium text-gray-700">Drug License Number</Label>
            <div className="flex items-center gap-2">
              <p className="text-gray-900">{profile.licenseNumber}</p>
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                License Registered
              </Badge>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 pt-2">
          {profile.isPhoneVerified && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Phone Verified
            </Badge>
          )}
          {profile.licenseNumber && (
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              License Registered
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Edit Business Profile</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || !hasChanges || !editedProfile.realName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Phone Number (Read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number
          </Label>
          <div className="flex items-center gap-2">
            <Input
              value={`+91 ${editedProfile.phone}`}
              disabled
              className="bg-gray-50 text-gray-600"
            />
            {editedProfile.isPhoneVerified && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Phone number cannot be changed as it's used for account verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="realName" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Business Name *
            </Label>
            <Input
              id="realName"
              placeholder="e.g., Siva Medicals, Apollo Pharmacy"
              value={editedProfile.realName}
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
              value={editedProfile.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="text-base"
            />
            <p className="text-sm text-gray-500">
              For order confirmations and business communications
            </p>
          </div>
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
            value={editedProfile.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            rows={3}
            className="text-base resize-none"
          />
          <p className="text-sm text-gray-500">
            This helps us verify your location and provide better service
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="businessType" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Business Type
            </Label>
            <Select 
              value={editedProfile.businessType || ''} 
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
              value={editedProfile.licenseNumber || ''}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              className="text-base"
            />
            <p className="text-sm text-gray-500">
              Your pharmacy/medical store license number (optional)
            </p>
          </div>
        </div>
      </form>

      {/* Security Note */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="h-4 w-4 text-green-600" />
          <span>Your information is secure and encrypted</span>
        </div>
      </div>
    </div>
  );
}