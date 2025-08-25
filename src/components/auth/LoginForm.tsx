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
import { Loader2, Mail, Lock, Chrome, Shield, Store, Smartphone } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode: () => void;
  onResetPassword: () => void;
  onShowRoleSelection?: () => void;
}

export function LoginForm({ onToggleMode, onResetPassword, onShowRoleSelection }: LoginFormProps) {
  const { login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

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
    <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-gray-900">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Sign in to access your PharmaLync account
        </CardDescription>
        
        {/* Retailer Login Notice */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 mt-4">
          <div className="flex items-start space-x-2">
            <div className="bg-green-100 p-1 rounded-full">
              <Smartphone className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm text-green-800">
              <strong className="font-semibold">Retailers:</strong> Use the "Retailer Login" button below to login with your mobile number via OTP
            </div>
          </div>
        </div>
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

        {/* <Button 
          variant="outline" 
          className="w-full border-gray-300 hover:bg-gray-50 font-medium"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <Chrome className="mr-2 h-4 w-4" />
          Sign in with Google
        </Button> */}

        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={onResetPassword}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Forgot your password?
          </button>
          
          {/* <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Create account
            </button>
          </div> */}
          
          <div className="pt-4 border-t border-gray-200 space-y-2">
            {/* Retailer Login Button */}
            <Link href="/retailer-login" className="block">
              <Button
                variant="default"
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-2.5"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Retailer Login (Mobile OTP)
              </Button>
            </Link>
            
            {/* Other Roles Button */}
            {/* {onShowRoleSelection && (
              <Button
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-50 font-medium"
                onClick={onShowRoleSelection}
              >
                <Store className="mr-2 h-4 w-4" />
                Other Roles (Line Worker, Admin)
              </Button>
            )} */}
            
            {/* Super Admin Registration */}
            <Link href="/init" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
              <Shield className="h-4 w-4 mr-1" />
              Super Admin Registration
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}