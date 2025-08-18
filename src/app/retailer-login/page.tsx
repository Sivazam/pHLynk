'use client';

import { RetailerAuth } from '@/components/RetailerAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Store, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function RetailerLoginPage() {
  const handleAuthSuccess = (retailerId: string) => {
    // Store retailer ID in localStorage
    localStorage.setItem('retailerId', retailerId);
    // Redirect to home page which will show retailer dashboard
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-green-600 p-2 rounded-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">PharmaLynk Retailer Login</h1>
                <p className="text-sm text-gray-500">Secure access to your account</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Main Login
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Information Section */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Retailer Login
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Access your retailer dashboard to view outstanding amounts, payment history, and manage your account.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mobile Number Login</h3>
                    <p className="text-gray-600">Login securely using your registered mobile number with OTP verification</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Account Dashboard</h3>
                    <p className="text-gray-600">View your outstanding amounts, payment history, and active OTP requests</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-time Updates</h3>
                    <p className="text-gray-600">Get instant notifications for new payment requests and settlements</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">First Time Login?</h4>
                <p className="text-sm text-yellow-700">
                  If this is your first time logging in, your account will be automatically verified after OTP authentication.
                </p>
              </div>
            </div>

            {/* Login Form Section */}
            <div>
              <RetailerAuth 
                onAuthSuccess={handleAuthSuccess}
                onBackToRoleSelection={() => window.location.href = '/'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}