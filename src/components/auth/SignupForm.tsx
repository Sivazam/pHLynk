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
import { Loader2, Mail, Lock, User as UserIcon, Chrome } from 'lucide-react';

const signupSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onToggleMode: () => void;
}

export function SignupForm({ onToggleMode }: SignupFormProps) {
  const { signup, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      await signup(data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-gray-900">
          Create Account
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Join PharmaLynk to streamline your pharmaceutical supply chain
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
            <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your full name"
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...register('displayName')}
              />
            </div>
            {errors.displayName && (
              <p className="text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>

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
                placeholder="Create a strong password"
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full border-gray-300 hover:bg-gray-50 font-medium"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <Chrome className="mr-2 h-4 w-4" />
          Sign up with Google
        </Button>

        <div className="text-center">
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}