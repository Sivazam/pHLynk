'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/firestore';
import { ROLES } from '@/lib/firebase';
import { Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InitPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    superAdminCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      // Create the auth user
      const authResult = await signup(
        formData.email,
        formData.password,
        formData.displayName,
        formData.superAdminCode
      );

      if (authResult.isSuperAdmin) {
        // Create the super admin user document in Firestore with the Firebase Auth UID as document ID
        await userService.createUserWithId(authResult.user.uid, 'system', {
          email: formData.email,
          displayName: formData.displayName || formData.email.split('@')[0],
          roles: [ROLES.SUPER_ADMIN],
          active: true
        });

        setResult({
          success: true,
          message: 'Super admin account created successfully! Redirecting to login...'
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setResult({
          success: false,
          message: 'Invalid super admin code. Only super admins can create accounts directly.'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Failed to create account: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Super Admin Registration</CardTitle>
          <CardDescription>
            Create the first super admin account for PharmaLync
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="superAdminCode">Super Admin Code</Label>
              <Input
                id="superAdminCode"
                type="password"
                value={formData.superAdminCode}
                onChange={(e) => setFormData(prev => ({ ...prev, superAdminCode: e.target.value }))}
                required
                placeholder="Enter the secret code"
              />
            </div>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Super Admin Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-sm text-gray-600 text-center">
            <p className="font-semibold">Important:</p>
            <p>This page is for creating the first super admin only.</p>
            <p>The super admin code is required for registration.</p>
            <p className="mt-2">After creation, super admins can create wholesaler accounts.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}