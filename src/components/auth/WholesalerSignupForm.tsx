'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, Lock, Phone, User, MapPin, FileText, Shield } from 'lucide-react';
import { StatusBarColor } from '../ui/StatusBarColor';

const wholesalerSignupSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  email: z.string().email('Please enter a valid email address'),
  gstNumber: z.string().optional(),
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits').max(15, 'Mobile number must not exceed 15 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type WholesalerSignupFormData = z.infer<typeof wholesalerSignupSchema>;

interface WholesalerSignupFormProps {
  onSubmit: (data: WholesalerSignupFormData) => Promise<void>;
  onBackToLogin: () => void;
  loading?: boolean;
  error?: string | null;
}

export function WholesalerSignupForm({ onSubmit, onBackToLogin, loading = false, error = null }: WholesalerSignupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<WholesalerSignupFormData>({
    resolver: zodResolver(wholesalerSignupSchema),
  });

  const password = watch('password');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFormSubmit = async (data: WholesalerSignupFormData) => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Form already submitting, ignoring duplicate click');
      return;
    }

    console.log('🚀 Wholesaler signup form submitted:', data);
    console.log('📤 Submitting to parent component...');

    setIsSubmitting(true);

    try {
      await onSubmit(data);
      console.log('✅ Wholesaler signup completed successfully');
      // Reset form after successful submission
      // formState: { isSubmitting: false } // React Hook Form will handle this
    } catch (error) {
      console.error('❌ Wholesaler signup failed:', error);
      // Re-throw error so parent component can handle it
      throw error;
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Form submission completed, isSubmitting set to false');
    }
  };

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
                  Wholesaler Registration
                </p>
              </div>
            </div>
          </div>

          <Card className="w-full border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-gray-900">
                Create Wholesaler Account
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Register your wholesale business to start using PharmaLync
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit((data) => {
                console.log('📝 Form validation passed, submitting with data:', data);
                onFormSubmit(data);
              })} className="space-y-4">
                {/* Business Information */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                        Business Name *
                      </Label>
                      <Input
                        id="businessName"
                        type="text"
                        placeholder="Enter your business name"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={loading || isSubmitting}
                        {...register('businessName')}
                      />
                      {errors.businessName && (
                        <p className="text-sm text-red-600">{errors.businessName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ownerName" className="text-sm font-medium text-gray-700">
                        Owner Name *
                      </Label>
                      <Input
                        id="ownerName"
                        type="text"
                        placeholder="Enter owner's full name"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={loading || isSubmitting}
                        {...register('ownerName')}
                      />
                      {errors.ownerName && (
                        <p className="text-sm text-red-600">{errors.ownerName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Business Address *
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="Enter complete business address"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
                      disabled={loading || isSubmitting}
                      {...register('address')}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstNumber" className="text-sm font-medium text-gray-700">
                      GST Number (Optional)
                    </Label>
                    <Input
                      id="gstNumber"
                      type="text"
                      placeholder="Enter GST number if applicable"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={loading || isSubmitting}
                      {...register('gstNumber')}
                    />
                    {errors.gstNumber && (
                      <p className="text-sm text-red-600">{errors.gstNumber.message}</p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          disabled={loading || isSubmitting}
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber" className="text-sm font-medium text-gray-700">
                        Mobile Number *
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="mobileNumber"
                          type="tel"
                          placeholder="Enter mobile number"
                          className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          disabled={loading || isSubmitting}
                          {...register('mobileNumber')}
                        />
                      </div>
                      {errors.mobileNumber && (
                        <p className="text-sm text-red-600">{errors.mobileNumber.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Security */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password *
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create password"
                          className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          disabled={loading || isSubmitting}
                          {...register('password')}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-sm text-red-600">{errors.password.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password *
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm password"
                          className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          disabled={loading || isSubmitting}
                          {...register('confirmPassword')}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Password requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>At least 8 characters long</li>
                      <li>Contains at least one uppercase letter</li>
                      <li>Contains at least one lowercase letter</li>
                      <li>Contains at least one number</li>
                    </ul>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3"
                  disabled={loading || isSubmitting}
                >
                  {loading || isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Wholesaler Account'
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  disabled={loading || isSubmitting}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back to Wholesaler Login
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-xs text-gray-500">
            <p>©2026 PharmaLync. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="/privacy-policy" className="hover:text-blue-600 transition-colors duration-200">Privacy Policy</a>
              <a href="/terms-of-use" className="hover:text-blue-600 transition-colors duration-200">Terms of Service</a>
              <a href="/help-center" className="hover:text-blue-600 transition-colors duration-200">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
