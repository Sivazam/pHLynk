'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, useLineWorker } from '@/contexts/AuthContext';
import { 
  retailerService, 
  invoiceService, 
  paymentService,
  PaymentInvoiceAllocation,
  Timestamp
} from '@/services/firestore';
import { Retailer, Invoice, Payment } from '@/types';
import { formatTimestamp, formatTimestampWithTime } from '@/lib/timestamp-utils';
import { 
  Store, 
  DollarSign, 
  Phone, 
  MapPin, 
  Plus, 
  LogOut,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  IndianRupee,
  Smartphone,
  Shield,
  Eye,
  History,
  FileText
} from 'lucide-react';

export function LineWorkerDashboard() {
  const { user, logout } = useAuth();
  const isLineWorker = useLineWorker();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [retailerPaymentHistory, setRetailerPaymentHistory] = useState<Payment[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    totalPaid: 0,
    method: 'CASH' as 'CASH' | 'UPI',
    invoiceAllocations: [] as PaymentInvoiceAllocation[],
    evidenceImage: null as File | null
  });
  const [otpCode, setOtpCode] = useState('');
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);

  useEffect(() => {
    if (isLineWorker && user?.tenantId) {
      // Check if user has the required assigned data
      if (!user.assignedAreas || user.assignedAreas.length === 0) {
        setError('No areas assigned to your account. Please contact your administrator.');
        setLoading(false);
        return;
      }
      fetchLineWorkerData();
    }
  }, [isLineWorker, user]);

  // Resend OTP timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const fetchLineWorkerData = async () => {
    if (!user?.tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching line worker data for user:', user.uid);
      console.log('User assigned areas:', user.assignedAreas);
      console.log('User assigned zips:', user.assignedZips);
      
      // Clean up any stuck payments first
      try {
        await paymentService.cleanupStuckPayments(user.tenantId);
        console.log('✅ Cleaned up stuck payments');
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up stuck payments:', cleanupError);
      }
      
      // Get all retailers first
      const allRetailers = await retailerService.getAll(user.tenantId);
      const allInvoices = await invoiceService.getAll(user.tenantId);
      const paymentsData = await paymentService.getPaymentsByLineWorker(user.tenantId, user.uid);

      console.log('Total retailers found:', allRetailers.length);
      console.log('Total invoices found:', allInvoices.length);
      console.log('Payments found:', paymentsData.length);

      // Filter retailers by assigned areas
      const assignedRetailers = allRetailers.filter(retailer => {
        // If no areas assigned, can't see any retailers
        if (!user?.assignedAreas || user.assignedAreas.length === 0) {
          console.log('No assigned areas for user');
          return false;
        }
        
        // Check if retailer is in assigned areas (by areaId)
        if (retailer.areaId && user.assignedAreas.includes(retailer.areaId)) {
          console.log(`Retailer ${retailer.name} matched by areaId: ${retailer.areaId}`);
          return true;
        }
        
        // Check if retailer has zipcodes that match assigned zips
        if (retailer.zipcodes && retailer.zipcodes.length > 0 && user.assignedZips && user.assignedZips.length > 0) {
          const matchingZips = retailer.zipcodes.filter(zip => user.assignedZips!.includes(zip));
          if (matchingZips.length > 0) {
            console.log(`Retailer ${retailer.name} matched by zips: ${matchingZips.join(', ')}`);
            return true;
          }
        }
        
        console.log(`Retailer ${retailer.name} not matched - areaId: ${retailer.areaId}, zips: ${retailer.zipcodes?.join(', ') || 'none'}`);
        return false;
      });

      console.log('Assigned retailers after filtering:', assignedRetailers.length);

      // Filter invoices to only show those for assigned retailers
      const assignedInvoices = allInvoices.filter(invoice => 
        assignedRetailers.some(retailer => retailer.id === invoice.retailerId)
      );

      setRetailers(assignedRetailers);
      setInvoices(assignedInvoices);
      setPayments(paymentsData);
      
      if (assignedRetailers.length === 0) {
        setError('No retailers assigned to your areas. Please contact your administrator.');
      }
    } catch (err: any) {
      console.error('Error fetching line worker data:', err);
      setError(err.message || 'Failed to fetch line worker data');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    
    // Get payment history for this retailer
    const retailerPayments = payments.filter(p => p.retailerId === retailer.id);
    
    setPaymentForm({
      totalPaid: Math.min(retailer.currentOutstanding, retailer.currentOutstanding), // Default to full amount
      method: 'CASH',
      invoiceAllocations: [], // Not using invoice allocations anymore
      evidenceImage: null
    });
    
    setRetailerPaymentHistory(retailerPayments);
    setShowPaymentDialog(true);
  };

  const handleSendOtp = async () => {
    if (!user?.tenantId || !selectedRetailer) return;
    
    setOtpSending(true);
    try {
      // Create payment first
      const paymentId = await paymentService.initiatePayment(user.tenantId, {
        retailerId: selectedRetailer.id,
        lineWorkerId: user.uid,
        totalPaid: paymentForm.totalPaid,
        method: paymentForm.method,
        invoiceAllocations: [] // No invoice allocations needed
      });

      // Call actual OTP API
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: selectedRetailer.id,
          paymentId: paymentId,
          amount: paymentForm.totalPaid,
          lineWorkerName: user.name || 'Line Worker' // Add line worker name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Update payment state to OTP_SENT in database
      await paymentService.updatePaymentState(paymentId, user.tenantId, 'OTP_SENT', {
        timeline: {
          ...currentPayment?.timeline,
          otpSentAt: Timestamp.now()
        }
      });

      setOtpSent(true);
      setShowOtpSection(true);
      setOtpSending(false);
      setResendDisabled(true);
      setResendTimer(30); // Start 30-second timer
      
      // Set the current payment with updated state
      const updatedPayment: Payment = {
        id: paymentId,
        tenantId: user.tenantId!,
        retailerId: selectedRetailer.id,
        lineWorkerId: user.uid,
        invoiceAllocations: [],
        totalPaid: paymentForm.totalPaid,
        method: paymentForm.method,
        state: 'OTP_SENT',
        evidence: [],
        timeline: {
          initiatedAt: Timestamp.now(),
          otpSentAt: Timestamp.now()
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      setCurrentPayment(updatedPayment);
      
      // Show success message
      console.log('✅ OTP sent successfully to retailer:', selectedRetailer.phone);
      
    } catch (err: any) {
      console.error('❌ Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP');
      setOtpSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (!currentPayment || !user?.tenantId) return;
    
    setOtpSending(true);
    try {
      // Call actual OTP API
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: currentPayment.retailerId,
          paymentId: currentPayment.id,
          amount: currentPayment.totalPaid,
          lineWorkerName: user.name || 'Line Worker' // Add line worker name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend OTP');
      }

      // Update payment state to OTP_SENT in database (update timeline)
      await paymentService.updatePaymentState(currentPayment.id, currentPayment.tenantId, 'OTP_SENT', {
        timeline: {
          ...currentPayment.timeline,
          otpSentAt: Timestamp.now()
        }
      });

      setOtpSending(false);
      setResendDisabled(true);
      setResendTimer(30); // Reset timer to 30 seconds
      
      // Update current payment timeline
      setCurrentPayment(prev => prev ? {
        ...prev,
        timeline: {
          ...prev.timeline,
          otpSentAt: Timestamp.now()
        }
      } : null);
      
      // Clear previous OTP code
      setOtpCode('');
      
      // Show success message
      console.log('✅ OTP resent successfully to retailer:', selectedRetailer?.phone);
      
    } catch (err: any) {
      console.error('❌ Error resending OTP:', err);
      setError(err.message || 'Failed to resend OTP');
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!currentPayment || !otpCode) return;
    
    try {
      // Call actual OTP verification API
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: currentPayment.id,
          otp: otpCode
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to verify OTP');
      }

      // OTP verified successfully, complete the payment
      await paymentService.updatePaymentState(currentPayment.id, currentPayment.tenantId, 'COMPLETED', {
        timeline: {
          ...currentPayment.timeline,
          completedAt: Timestamp.now()
        }
      });
      
      // Update retailer outstanding amount
      await retailerService.updateOutstanding(selectedRetailer!.id, currentPayment.tenantId, -currentPayment.totalPaid);
      
      console.log('✅ OTP verified and payment completed successfully');
      
      setShowPaymentDialog(false);
      setShowOtpSection(false);
      setOtpSent(false);
      setOtpCode('');
      setCurrentPayment(null);
      setResendTimer(0);
      setResendDisabled(false);
      await fetchLineWorkerData();
      setError(null);
    } catch (err: any) {
      console.error('❌ Error verifying OTP:', err);
      setError(err.message || 'Failed to verify OTP');
    }
  };

  const handlePaymentDialogChange = (open: boolean) => {
    if (!open) {
      // Reset all timer and OTP states when dialog is closed
      setResendTimer(0);
      setResendDisabled(false);
      setShowOtpSection(false);
      setOtpSent(false);
      setOtpCode('');
      setCurrentPayment(null);
    }
    setShowPaymentDialog(open);
  };

  const handlePaymentSubmit = async () => {
    // This is now just for validation, actual payment happens in OTP flow
    if (!selectedRetailer) return;
    
    if (paymentForm.totalPaid <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    
    if (paymentForm.totalPaid > selectedRetailer.currentOutstanding) {
      setError('Payment amount cannot exceed outstanding amount');
      return;
    }
    
    // Proceed to OTP flow
    await handleSendOtp();
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

  if (!isLineWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600 mb-4">
                You don't have permission to access this area.
              </p>
              <Button onClick={logout}>Logout</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">PharmaLynk Collections</h1>
                <p className="text-sm text-gray-500">Line Worker Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Welcome, {user?.displayName || user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  Line Worker
                </div>
              </div>
              <Button variant="outline" onClick={logout} className="hover:bg-gray-50 transition-colors">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">My Retailers</CardTitle>
              <div className="bg-blue-100 p-2 rounded-full">
                <Store className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
              <p className="text-xs text-gray-500">
                Assigned to collect
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
              <div className="bg-red-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{retailers.reduce((sum, r) => sum + r.currentOutstanding, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                Across all retailers
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Collections</CardTitle>
              <div className="bg-green-100 p-2 rounded-full">
                <IndianRupee className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{payments
                  .filter(p => p.state === 'COMPLETED' && p.timeline.completedAt)
                  .reduce((sum, p) => sum + p.totalPaid, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                Completed payments
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
              <div className="bg-yellow-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {payments.filter(p => ['INITIATED', 'OTP_SENT', 'OTP_VERIFIED'].includes(p.state)).length}
              </div>
              <p className="text-xs text-gray-500">
                Awaiting completion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="retailers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="retailers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
              <Store className="h-4 w-4 mr-2" />
              My Retailers
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
              <History className="h-4 w-4 mr-2" />
              Payment History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="retailers" className="space-y-6">
            <h2 className="text-2xl font-bold">My Assigned Retailers</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {retailers.map((retailer) => (
                <Card key={retailer.id} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center">
                        <div className="bg-blue-600 p-1.5 rounded-full mr-3">
                          <Store className="h-4 w-4 text-white" />
                        </div>
                        {retailer.name}
                      </span>
                      {retailer.currentOutstanding > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          Outstanding
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1 text-blue-600" />
                          {retailer.phone}
                        </div>
                        {retailer.address && (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-1 text-blue-600" />
                            {retailer.address}
                          </div>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 font-medium">Outstanding:</span>
                          <span className={`font-bold text-lg ${
                            retailer.currentOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ₹{retailer.currentOutstanding.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          Recent Invoices:
                        </h4>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {invoices
                            .filter(inv => inv.retailerId === retailer.id)
                            .slice(0, 3)
                            .map((invoice) => (
                              <div key={invoice.id} className="flex justify-between text-xs p-2 bg-gray-50 rounded">
                                <span className="font-medium">{invoice.invoiceNumber}</span>
                                <span className={
                                  invoice.outstandingAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600'
                                }>
                                  ₹{invoice.outstandingAmount}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 transform hover:scale-105"
                        onClick={() => initiatePayment(retailer)}
                        disabled={retailer.currentOutstanding === 0}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Collect Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-2xl font-bold">Payment History</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>Your payment collection history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {retailers.find(r => r.id === payment.retailerId)?.name}
                        </TableCell>
                        <TableCell>₹{payment.totalPaid}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {payment.method === 'UPI' ? 
                              <QrCode className="h-4 w-4 mr-1" /> : 
                              <DollarSign className="h-4 w-4 mr-1" />
                            }
                            {payment.method}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusColor(payment.state)}>
                            <div className="flex items-center space-x-1">
                              {getPaymentStatusIcon(payment.state)}
                              <span>{payment.state}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatTimestamp(payment.timeline.initiatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setCurrentPayment(payment);
                                setShowPaymentDetails(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            {/* Show Resume OTP button for OTP_SENT payments */}
                            {payment.state === 'OTP_SENT' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                onClick={() => {
                                  // Find the retailer for this payment
                                  const retailer = retailers.find(r => r.id === payment.retailerId);
                                  if (retailer) {
                                    setSelectedRetailer(retailer);
                                    setCurrentPayment(payment);
                                    setShowPaymentDialog(true);
                                    setShowOtpSection(true);
                                    setOtpSent(true);
                                    
                                    // Set payment form data
                                    setPaymentForm({
                                      totalPaid: payment.totalPaid,
                                      method: payment.method
                                    });
                                    
                                    console.log('🔄 Resuming OTP session for payment:', payment.id);
                                  }
                                }}
                              >
                                <Smartphone className="h-3 w-3 mr-1" />
                                Resume OTP
                              </Button>
                            )}
                            
                            {/* Show Proceed to OTP for initiated payments */}
                            {payment.state === 'INITIATED' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => {
                                  // Find the retailer for this payment
                                  const retailer = retailers.find(r => r.id === payment.retailerId);
                                  if (retailer) {
                                    setSelectedRetailer(retailer);
                                    setCurrentPayment(payment);
                                    setShowPaymentDialog(true);
                                    setShowOtpSection(true);
                                    setOtpSent(false);
                                    
                                    // Set payment form data
                                    setPaymentForm({
                                      totalPaid: payment.totalPaid,
                                      method: payment.method
                                    });
                                    
                                    console.log('🔄 Proceeding to OTP for payment:', payment.id);
                                  }
                                }}
                              >
                                <Smartphone className="h-3 w-3 mr-1" />
                                Proceed to OTP
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete payment information
            </DialogDescription>
          </DialogHeader>
          
          {currentPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Payment ID</Label>
                  <p className="text-sm">{currentPayment.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={getPaymentStatusColor(currentPayment.state)}>
                    {currentPayment.state}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Amount</Label>
                  <p className="text-sm font-medium">₹{currentPayment.totalPaid}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Method</Label>
                  <p className="text-sm">{currentPayment.method}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Retailer</Label>
                  <p className="text-sm">{retailers.find(r => r.id === currentPayment.retailerId)?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Initiated</Label>
                  <p className="text-sm">{formatTimestampWithTime(currentPayment.timeline.initiatedAt)}</p>
                </div>
              </div>
              
              {currentPayment.timeline.otpSentAt && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">OTP Sent</Label>
                  <p className="text-sm">{formatTimestampWithTime(currentPayment.timeline.otpSentAt)}</p>
                </div>
              )}
              
              {currentPayment.timeline.completedAt && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Completed</Label>
                  <p className="text-sm">{formatTimestampWithTime(currentPayment.timeline.completedAt)}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowPaymentDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={handlePaymentDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Collect payment from {selectedRetailer?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRetailer && (
            <div className="space-y-6">
              {/* Retailer Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-lg">{selectedRetailer.name}</h3>
                  <Badge variant={selectedRetailer.currentOutstanding > 0 ? "destructive" : "default"}>
                    {selectedRetailer.currentOutstanding > 0 ? "Outstanding" : "Clear"}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {selectedRetailer.phone}
                  </div>
                  {selectedRetailer.address && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {selectedRetailer.address}
                    </div>
                  )}
                  <div className="font-medium text-red-600">
                    Total Outstanding: ₹{selectedRetailer.currentOutstanding.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center">
                    <History className="h-4 w-4 mr-2" />
                    Payment History
                  </h3>
                  <Badge variant="outline">
                    {retailerPaymentHistory.length} payments
                  </Badge>
                </div>
                {retailerPaymentHistory.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {retailerPaymentHistory.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">₹{payment.totalPaid}</p>
                          <p className="text-sm text-gray-600">
                            {formatTimestamp(payment.timeline.initiatedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getPaymentStatusColor(payment.state)}>
                            {payment.state}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No payment history found</p>
                  </div>
                )}
              </div>

              {/* OTP Section */}
              {showOtpSection ? (
                <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-green-800">
                    <Shield className="h-5 w-5 mr-2" />
                    <h3 className="font-medium">OTP Verification</h3>
                  </div>
                  {otpSent ? (
                    <div className="space-y-4">
                      <p className="text-sm text-green-700">
                        OTP has been sent to {selectedRetailer.phone}. Please ask the retailer for the OTP and enter it below.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      
                      {/* Resend OTP Section */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {resendTimer > 0 ? (
                            <span>Resend OTP in {resendTimer}s</span>
                          ) : (
                            <span>Didn't receive OTP?</span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResendOtp}
                          disabled={resendDisabled || otpSending}
                          className="text-sm"
                        >
                          {otpSending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : null}
                          Resend OTP
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button onClick={handleVerifyOtp} disabled={!otpCode || otpCode.length !== 6}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify OTP
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setShowOtpSection(false);
                          setResendTimer(0);
                          setResendDisabled(false);
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-green-700">
                        Click "Send OTP" to send a one-time password to the retailer's mobile number.
                      </p>
                      <Button 
                        onClick={handleSendOtp} 
                        disabled={otpSending}
                        className="w-full"
                      >
                        {otpSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            <Smartphone className="h-4 w-4 mr-2" />
                            Send OTP to {selectedRetailer.phone}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Payment Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalPaid">Payment Amount (₹)</Label>
                      <Input
                        id="totalPaid"
                        type="number"
                        value={paymentForm.totalPaid}
                        onChange={(e) => setPaymentForm(prev => ({ 
                          ...prev, 
                          totalPaid: parseFloat(e.target.value) || 0 
                        }))}
                        step="0.01"
                        min="0"
                        max={selectedRetailer.currentOutstanding}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">
                        Max: ₹{selectedRetailer.currentOutstanding.toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method">Payment Method</Label>
                      <Select 
                        value={paymentForm.method} 
                        onValueChange={(value: 'CASH' | 'UPI') => setPaymentForm(prev => ({ ...prev, method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={handlePaymentSubmit}
                      disabled={paymentForm.totalPaid <= 0 || paymentForm.totalPaid > selectedRetailer.currentOutstanding}
                      className="flex-1"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Proceed to OTP
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowPaymentDialog(false);
                      setResendTimer(0);
                      setResendDisabled(false);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}