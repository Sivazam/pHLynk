'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { retailerService, paymentService } from '@/services/firestore';
import { RetailerAuthService } from '@/services/retailer-auth';
import { Retailer, Payment } from '@/types';
import { formatTimestamp, formatTimestampWithTime } from '@/lib/timestamp-utils';
import { getActiveOTPsForRetailer, getCompletedPaymentsForRetailer, removeCompletedPayment } from '@/lib/otp-store';
import { 
  Store, 
  DollarSign, 
  Phone, 
  MapPin, 
  LogOut,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee,
  Smartphone,
  Shield,
  History,
  FileText,
  Bell,
  Eye,
  Volume2
} from 'lucide-react';

export function RetailerDashboard() {
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [retailerUser, setRetailerUser] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOTPs, setActiveOTPs] = useState<Array<{
    code: string;
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    expiresAt: Date;
    createdAt: Date;
  }>>([]);
  const [completedPayments, setCompletedPayments] = useState<Array<{
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    completedAt: Date;
    remainingOutstanding: number;
  }>>([]);
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [newPayment, setNewPayment] = useState<Payment | null>(null);
  const [newCompletedPayment, setNewCompletedPayment] = useState<{
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    completedAt: Date;
    remainingOutstanding: number;
  } | null>(null);

  useEffect(() => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (storedRetailerId) {
      fetchRetailerData(storedRetailerId);
    }
  }, []);

  useEffect(() => {
    // Check for active OTPs every 5 seconds
    const interval = setInterval(() => {
      const storedRetailerId = localStorage.getItem('retailerId');
      if (storedRetailerId) {
        checkActiveOTPs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchRetailerData = async (retailerId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching retailer data for:', retailerId);
      
      // Get retailer user account - this contains all the data we need
      const retailerUserData = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
      if (!retailerUserData) {
        setError('Retailer user account not found');
        return;
      }
      
      console.log('Retailer user data found:', retailerUserData);
      console.log('Tenant ID from user data:', retailerUserData.tenantId);
      
      // Try to get retailer details from retailers collection first
      let retailerData;
      try {
        const { doc, getDoc, db } = await import('@/lib/firebase');
        const retailerRef = doc(db, 'retailers', retailerId);
        const retailerDoc = await getDoc(retailerRef);
        
        if (retailerDoc.exists()) {
          retailerData = {
            id: retailerId,
            ...retailerDoc.data()
          };
          console.log('✅ Retailer data found in retailers collection:', retailerData);
        } else {
          console.log('⚠️ Retailer document not found in retailers collection, using user data');
          // Fallback to user data
          retailerData = {
            id: retailerUserData.retailerId,
            name: retailerUserData.name,
            phone: retailerUserData.phone,
            email: retailerUserData.email || '',
            tenantId: retailerUserData.tenantId,
            address: 'Address not specified',
            currentOutstanding: 0,
            areaId: '',
            zipcodes: []
          };
        }
      } catch (error) {
        console.log('❌ Error accessing retailers collection, using user data:', error);
        // Fallback to user data
        retailerData = {
          id: retailerUserData.retailerId,
          name: retailerUserData.name,
          phone: retailerUserData.phone,
          email: retailerUserData.email || '',
          tenantId: retailerUserData.tenantId,
          address: 'Address not specified',
          currentOutstanding: 0,
          areaId: '',
          zipcodes: []
        };
      }
      
      // Get payment history using the tenantId and retailerId from user data
      const paymentsData = await paymentService.getPaymentsByRetailer(retailerUserData.tenantId, retailerUserData.retailerId);
      
      console.log('Payments data fetched:', paymentsData);
      console.log('Payments details:', paymentsData.map(p => ({ 
        id: p.id, 
        state: p.state, 
        totalPaid: p.totalPaid,
        method: p.method 
      })));
      
      // Calculate current outstanding from payments
      const completedPayments = paymentsData.filter(p => p.state === 'COMPLETED');
      const totalPaid = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
      
      console.log('Completed payments:', completedPayments.length);
      console.log('Total paid amount:', totalPaid);
      console.log('Outstanding from retailer document:', retailerData.currentOutstanding);
      
      // Use the outstanding from retailer document if available, otherwise calculate from payments
      const finalOutstanding = retailerData.currentOutstanding || totalPaid;
      
      // Update the retailer object with calculated outstanding
      retailerData.currentOutstanding = finalOutstanding;
      
      setRetailer(retailerData as any);
      setPayments(paymentsData);
      setRetailerUser(retailerUserData);
      
      console.log('Final retailer data:', retailerData);
      console.log('Payments loaded:', paymentsData.length);
      console.log('Final outstanding amount:', finalOutstanding);
      
    } catch (err: any) {
      console.error('Error fetching retailer data:', err);
      setError(err.message || 'Failed to fetch retailer data');
    } finally {
      setLoading(false);
    }
  };

  const checkActiveOTPs = () => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (!storedRetailerId) return;
    
    const activeOTPsForRetailer = getActiveOTPsForRetailer(storedRetailerId);
    const completedPaymentsForRetailer = getCompletedPaymentsForRetailer(storedRetailerId);
    
    // Check if there are new OTPs
    const newOTPs = activeOTPsForRetailer.filter(otp => 
      !activeOTPs.some(existingOtp => existingOtp.paymentId === otp.paymentId)
    );
    
    // Check if there are new completed payments
    const newCompleted = completedPaymentsForRetailer.filter(payment => 
      !completedPayments.some(existingPayment => existingPayment.paymentId === payment.paymentId)
    );
    
    if (newOTPs.length > 0) {
      console.log('🔔 New OTP detected for retailer:', newOTPs);
      setActiveOTPs(activeOTPsForRetailer);
      setShowOTPPopup(true);
      
      // Set the latest new payment for notification
      const latestOTP = newOTPs[newOTPs.length - 1];
      setNewPayment({
        id: latestOTP.paymentId,
        tenantId: retailerUser?.tenantId || '', // Use retailerUser tenantId if available
        retailerId: storedRetailerId,
        lineWorkerId: '',
        invoiceAllocations: [],
        totalPaid: latestOTP.amount,
        method: 'CASH',
        state: 'OTP_SENT',
        evidence: [],
        timeline: {
          initiatedAt: latestOTP.createdAt,
          otpSentAt: latestOTP.createdAt
        },
        createdAt: latestOTP.createdAt,
        updatedAt: latestOTP.createdAt
      });
    } else {
      setActiveOTPs(activeOTPsForRetailer);
    }
    
    if (newCompleted.length > 0) {
      console.log('✅ New completed payment detected for retailer:', newCompleted);
      setCompletedPayments(completedPaymentsForRetailer);
      setShowSettlementPopup(true);
      
      // Set the latest completed payment for notification
      const latestCompleted = newCompleted[newCompleted.length - 1];
      setNewCompletedPayment(latestCompleted);
      
      // Refresh retailer data to update outstanding amount
      const storedRetailerId = localStorage.getItem('retailerId');
      if (storedRetailerId) {
        fetchRetailerData(storedRetailerId);
      }
    } else {
      setCompletedPayments(completedPaymentsForRetailer);
    }
  };

  const getPaymentStatusColor = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'OTP_VERIFIED':
        return 'bg-blue-100 text-blue-800';
      case 'OTP_SENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'OTP_VERIFIED':
        return <Clock className="h-4 w-4" />;
      case 'OTP_SENT':
        return <AlertCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      case 'EXPIRED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleAcknowledgeSettlement = (paymentId: string) => {
    removeCompletedPayment(paymentId);
    setShowSettlementPopup(false);
    setNewCompletedPayment(null);
    
    // Refresh the completed payments list
    const storedRetailerId = localStorage.getItem('retailerId');
    if (storedRetailerId) {
      const updatedCompletedPayments = getCompletedPaymentsForRetailer(storedRetailerId);
      setCompletedPayments(updatedCompletedPayments);
    }
  };

  const handleLogout = () => {
    // Clear retailer ID from localStorage
    localStorage.removeItem('retailerId');
    // Redirect to retailer login page
    window.location.href = '/retailer-login';
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (diff <= 0) return 'Expired';
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!retailer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Retailer Not Found</h3>
              <p className="text-gray-600 mb-4">
                Your retailer account could not be found.
              </p>
              <Button onClick={handleLogout}>Logout</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-green-600 p-2 rounded-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">Retailer Dashboard</h1>
                <p className="text-sm text-gray-500">PharmaLynk Collections</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{retailer.name}</p>
                <p className="text-xs text-gray-500">{retailer.phone}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Account Status Alert */}
        {retailerUser && retailerUser.verificationStatus === 'pending' && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <Shield className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Account Pending Verification:</strong> Your account has been created but not yet verified. 
              This is your first login - your account is now fully active and ready to use.
            </AlertDescription>
          </Alert>
        )}

        {/* Account Status Alert */}
        {retailerUser && retailerUser.verificationStatus === 'verified' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Account Verified:</strong> Your account is fully verified and active.
            </AlertDescription>
          </Alert>
        )}

        {/* Test OTP Generation (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6">
            <Card className="border-dashed border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
                  Development Tools
                </CardTitle>
                <CardDescription>
                  Test OTP generation and display functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={async () => {
                      const storedRetailerId = localStorage.getItem('retailerId');
                      if (storedRetailerId) {
                        try {
                          const response = await fetch('/api/test-otp', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              retailerId: storedRetailerId,
                              amount: Math.floor(Math.random() * 5000) + 500, // Random amount between 500-5500
                              lineWorkerName: 'Test Worker ' + Math.floor(Math.random() * 100)
                            }),
                          });
                          
                          const result = await response.json();
                          if (result.success) {
                            console.log('✅ Test OTP generated:', result);
                            // Force refresh OTPs
                            checkActiveOTPs();
                          } else {
                            console.error('❌ Failed to generate test OTP:', result);
                          }
                        } catch (error) {
                          console.error('❌ Error generating test OTP:', error);
                        }
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Generate Test OTP
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // Clear all OTPs for testing
                      const storedRetailerId = localStorage.getItem('retailerId');
                      if (storedRetailerId) {
                        // Import dynamically to avoid circular dependencies
                        import('@/lib/otp-store').then(({ activeOTPs }) => {
                          // Clear all OTPs for this retailer
                          for (const [paymentId, otpData] of activeOTPs.entries()) {
                            if (otpData.retailerId === storedRetailerId) {
                              activeOTPs.delete(paymentId);
                            }
                          }
                          setActiveOTPs([]);
                          console.log('🗑️ Cleared all OTPs for testing');
                        });
                      }
                    }}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear All OTPs
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // Simulate completed payment
                      const storedRetailerId = localStorage.getItem('retailerId');
                      if (storedRetailerId) {
                        // Import dynamically to avoid circular dependencies
                        import('@/lib/otp-store').then(({ addCompletedPayment }) => {
                          addCompletedPayment({
                            retailerId: storedRetailerId,
                            amount: Math.floor(Math.random() * 3000) + 200,
                            paymentId: 'test_completed_' + Date.now(),
                            lineWorkerName: 'Test Worker',
                            remainingOutstanding: Math.floor(Math.random() * 1000)
                          });
                          console.log('✅ Added test completed payment');
                          checkActiveOTPs();
                        });
                      }
                    }}
                    variant="outline"
                    className="border-green-300 text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Simulate Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Persistent OTP Display */}
        {activeOTPs.length > 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-6 rounded-lg shadow-2xl border-2 border-yellow-300 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Bell className="h-8 w-8 mr-3 animate-bounce" />
                  <div>
                    <h2 className="text-2xl font-bold">🚨 ACTIVE OTP REQUESTS</h2>
                    <p className="text-sm text-yellow-100">Share these codes with line workers immediately</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white text-red-800 text-lg px-3 py-1">
                  {activeOTPs.length} Active
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOTPs.map((otp, index) => (
                  <div key={otp.paymentId} className="bg-white/30 backdrop-blur-sm p-6 rounded-xl border-2 border-white/50 shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="text-center">
                      <div className="mb-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2">
                          <Smartphone className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-lg font-semibold text-white/90">OTP CODE #{index + 1}</p>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl border-4 border-yellow-300 mb-4 shadow-inner">
                        <p className="text-4xl font-mono font-bold text-red-600 tracking-wider">
                          {otp.code}
                        </p>
                      </div>
                      
                      <div className="space-y-2 text-sm text-white/95">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Amount:</span>
                          <span className="text-xl font-bold text-yellow-200">₹{otp.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Line Worker:</span>
                          <span className="text-yellow-100">{otp.lineWorkerName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Expires in:</span>
                          <span className={`font-bold ${formatTimeRemaining(otp.expiresAt).includes('Expired') ? 'text-red-200' : 'text-green-200'}`}>
                            {formatTimeRemaining(otp.expiresAt)}
                          </span>
                        </div>
                        <div className="text-xs text-white/70 mt-2">
                          Generated: {otp.createdAt.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center bg-black/20 p-4 rounded-lg">
                <p className="text-lg text-white font-semibold mb-2">
                  📱 Please share the OTP code(s) above with the line worker to complete the payment(s)
                </p>
                <p className="text-sm text-yellow-100 mb-4">
                  Each OTP is valid for 10 minutes. New OTP requests will appear automatically.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button 
                    variant="secondary" 
                    className="bg-white text-red-800 hover:bg-yellow-100 font-semibold px-6 py-2"
                    onClick={() => setShowOTPPopup(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-transparent border-white text-white hover:bg-white/20 font-semibold px-6 py-2"
                    onClick={() => {
                      // Play a sound (in production, you'd use an actual sound file)
                      console.log('🔔 Playing notification sound');
                    }}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Test Sound
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Outstanding Amount Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Current Outstanding</p>
                  <p className="text-2xl font-bold">₹{retailer.currentOutstanding.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Paid</p>
                  <p className="text-2xl font-bold">
                    ₹{payments
                      .filter(p => p.state === 'COMPLETED')
                      .reduce((sum, p) => sum + p.totalPaid, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Active OTPs</p>
                  <p className="text-2xl font-bold">{activeOTPs.length}</p>
                </div>
                <Smartphone className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Retailer Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Store Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Store className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Store Name:</span>
                  <span className="ml-2">{retailer.name}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2">{retailer.phone}</span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Address:</span>
                  <span className="ml-2">{retailer.address || 'Not provided'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Credit Limit:</span>
                  <span className="ml-2">₹{retailer.creditLimit?.toLocaleString() || 'Not set'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">GST Number:</span>
                  <span className="ml-2">{retailer.gstNumber || 'Not provided'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Payment Terms:</span>
                  <span className="ml-2">{retailer.paymentTerms || 'Not set'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Payment History
            </CardTitle>
            <CardDescription>
              View all your payment transactions and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No payment history found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Line Worker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatTimestamp(payment.createdAt)}</div>
                          <div className="text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {payment.totalPaid.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getPaymentStatusIcon(payment.state)}
                          <Badge className={getPaymentStatusColor(payment.state)}>
                            {payment.state}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {payment.lineWorkerId ? (
                            <span className="font-medium">Line Worker</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* OTP Popup */}
      <Dialog open={showOTPPopup} onOpenChange={setShowOTPPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-yellow-600" />
              New OTP Request
            </DialogTitle>
            <DialogDescription>
              A new payment has been initiated. Please share the OTP with the line worker.
            </DialogDescription>
          </DialogHeader>
          {newPayment && (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Your OTP is:</p>
                  <div className="bg-white p-4 rounded border-2 border-yellow-300">
                    <p className="text-3xl font-mono font-bold text-yellow-800">
                      {activeOTPs.find(otp => otp.paymentId === newPayment.id)?.code || '------'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Amount: ₹{newPayment.totalPaid.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Share this OTP with the line worker</li>
                  <li>The line worker will enter this OTP to complete the payment</li>
                  <li>This OTP will expire in 10 minutes</li>
                  <li>You can view all active OTPs in your dashboard</li>
                </ol>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowOTPPopup(false)}>
                  Close
                </Button>
                <Button onClick={() => setShowOTPPopup(false)}>
                  I Understand
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settlement Popup */}
      <Dialog open={showSettlementPopup} onOpenChange={setShowSettlementPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Payment Completed Successfully
            </DialogTitle>
            <DialogDescription>
              Your payment has been successfully processed and settled.
            </DialogDescription>
          </DialogHeader>
          {newCompletedPayment && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-center">
                  <div className="text-green-800 mb-2">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  </div>
                  <p className="text-lg font-semibold text-green-800 mb-2">
                    Payment Settled
                  </p>
                  <div className="bg-white p-3 rounded border border-green-300 mb-3">
                    <p className="text-2xl font-bold text-green-700">
                      ₹{newCompletedPayment.amount.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Processed by: {newCompletedPayment.lineWorkerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Remaining Outstanding: ₹{newCompletedPayment.remainingOutstanding.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Payment Details:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Payment ID: {newCompletedPayment.paymentId}</li>
                  <li>Amount Paid: ₹{newCompletedPayment.amount.toLocaleString()}</li>
                  <li>Remaining Outstanding: ₹{newCompletedPayment.remainingOutstanding.toLocaleString()}</li>
                  <li>Processed by: {newCompletedPayment.lineWorkerName}</li>
                  <li>Completed at: {newCompletedPayment.completedAt.toLocaleString()}</li>
                </ul>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSettlementPopup(false)}>
                  Close
                </Button>
                <Button onClick={() => handleAcknowledgeSettlement(newCompletedPayment.paymentId)}>
                  Acknowledge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}