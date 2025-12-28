'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, Lock, Shield, Building2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StatusBarColor } from '../ui/StatusBarColor';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode: () => void;
  onResetPassword: () => void;
  onShowRoleSelection?: () => void;
  selectedRole?: string | null;
}

export function LoginForm({ onToggleMode, onResetPassword, onShowRoleSelection, selectedRole }: LoginFormProps) {
  const { login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // Check for success message and credentials in URL parameters
  useEffect(() => {
    const message = searchParams.get('message');
    const email = searchParams.get('email');
    const password = searchParams.get('password');

    if (message) {
      setSuccessMessage(decodeURIComponent(message));
    }

    // Pre-fill email and password if provided
    if (email || password) {
      const formValues: Partial<LoginFormData> = {};
      if (email) formValues.email = decodeURIComponent(email);
      if (password) formValues.password = decodeURIComponent(password);

      // Use setValue to pre-fill the form
      Object.entries(formValues).forEach(([key, value]) => {
        setValue(key as keyof LoginFormData, value);
      });

      // Clear URL parameters after using them
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      url.searchParams.delete('email');
      url.searchParams.delete('password');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
     <>
      <StatusBarColor theme="white" />

      <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Sign in to access your PharmaLync account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or Need Help</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <button
              type="button"
              onClick={onResetPassword}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Forgot your password?
            </button>
          </div>

          {/* Super Admin Registration */}
          {selectedRole === 'SUPER_ADMIN' && (
            <div className="text-center pt-4">
              <Link href="/init" className="inline-flex items-center">
                <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 cursor-pointer bg-[#3d6dcf] hover:bg-[#345bb0]">
                  <Shield className="w-4 h-4 mr-1 text-white" />
                  <span className="text-white">Super Admin Registration</span>
                </div>
              </Link>
            </div>)
          }

          {/* Wholesaler Registration */}
          {selectedRole === 'WHOLESALER_ADMIN' && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  console.log('🔗 Navigating to wholesaler signup...');
                  window.location.href = '/wholesaler-signup';
                }}
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 cursor-pointer bg-green-600 hover:bg-green-700"
              >
                <Building2 className="w-4 h-4 mr-1 text-white" />
                <span className="text-white">Create Wholesaler Account</span>
              </button>
            </div>)
          }
        </CardContent>
      </Card>
    </>

  );
}
