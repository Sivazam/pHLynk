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
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onBackToLogin: () => void;
}

export function ResetPasswordForm({ onBackToLogin }: ResetPasswordFormProps) {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            We've sent you a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-800">
                Please check your email and click the reset link to create a new password.
              </p>
            </div>
            <Button 
              variant="outline"
              className="w-full border-gray-300 hover:bg-gray-50 font-medium"
              onClick={onBackToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-gray-900">
          Reset Password
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Enter your email to receive a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={onBackToLogin}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}