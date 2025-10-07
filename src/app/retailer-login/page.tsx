'use client';

import { RetailerAuth } from '@/components/RetailerAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Store, Smartphone, Shield, BarChart3, CreditCard, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function RetailerLoginPage() {
  const handleAuthSuccess = async (retailerId: string) => {
    console.log('🔐 Retailer authentication successful, initializing FCM...');
    
    // Store retailer ID in localStorage
    localStorage.setItem('retailerId', retailerId);
    
    // Request notification permission and register device
    try {
      const { requestNotificationPermissionAndRegisterDevice } = await import('@/lib/fcm');
      const fcmToken = await requestNotificationPermissionAndRegisterDevice(retailerId);
      
      if (fcmToken) {
        console.log('✅ FCM device registered successfully for retailer:', retailerId);
      } else {
        console.warn('⚠️ FCM registration failed, but continuing with login...');
      }
    } catch (error) {
      console.error('❌ Error during FCM registration:', error);
      // Continue with login even if FCM fails
    }
    
    // Redirect to home page which will show retailer dashboard
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Professional Navbar - Similar to Dashboards */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section - Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Image 
                  src="/logoMain.png" 
                  alt="PharmaLync Logo" 
                  width={40} 
                  height={40}
                  className="h-10 w-10 rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">
                  PharmaLync
                </h1>
                <p className="text-sm text-gray-500">
                  Retailer Portal
                </p>
              </div>
            </div>

            {/* Right Section - Back Button */}
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Main Login</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Improved Layout */}
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            
            {/* Left Side - Content Section (Desktop) / Bottom Section (Mobile) */}
            <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center lg:justify-start p-3 bg-blue-100 rounded-full">
                  <Store className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  Welcome to Your Retailer Portal
                </h2>
                <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
                  Access your comprehensive dashboard to manage payments, view outstanding amounts, 
                  track invoices, and stay connected with your wholesale partners.
                </p>
              </div>

              {/* Compact Feature Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <Smartphone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm">Secure Mobile Login</h3>
                        <p className="text-xs text-gray-600">
                          OTP-protected access using your registered mobile number
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm">Real-time Dashboard</h3>
                        <p className="text-xs text-gray-600">
                          Live updates on payments, invoices, and account status
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm">Payment Management</h3>
                        <p className="text-xs text-gray-600">
                          Track outstanding amounts and payment history seamlessly
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <Shield className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm">Bank-level Security</h3>
                        <p className="text-xs text-gray-600">
                          Enterprise-grade protection for your financial data
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Compact Benefits Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Why Choose PharmaLync?</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Streamlined Operations:</span> Reduce manual paperwork
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Better Communication:</span> Stay connected with partners
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Financial Control:</span> Complete payment visibility
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center justify-center lg:justify-start space-x-2 text-xs text-gray-500">
                <Shield className="h-3 w-3 text-green-600" />
                <span>Secure • Reliable • Trusted by thousands of retailers</span>
              </div>
            </div>

            {/* Right Side - Login Form (Desktop) / Top Section (Mobile) */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="w-full max-w-md">
                <RetailerAuth 
                  onAuthSuccess={handleAuthSuccess}
                  onBackToRoleSelection={() => window.location.href = '/'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}