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
import { DashboardNavigation, NavItem } from '@/components/DashboardNavigation';
import { useAuth, useLineWorker } from '@/contexts/AuthContext';
import { 
  retailerService, 
  invoiceService, 
  paymentService,
  PaymentInvoiceAllocation,
  Timestamp
} from '@/services/firestore';
import { Retailer, Invoice, Payment } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
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
  FileText,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Bell
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
  const [notificationCount, setNotificationCount] = useState(0);

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'History', icon: History },
  ];

  const [activeNav, setActiveNav] = useState('overview');

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
      
      // Calculate notification count
      const overdueRetailers = assignedRetailers.filter(r => r.currentOutstanding > 0).length;
      const pendingPayments = paymentsData.filter(p => p.state === 'PENDING' || p.state === 'OTP_SENT').length;
      setNotificationCount(overdueRetailers + pendingPayments);
      
      // Recompute retailer data for accuracy (can be removed once all data is consistent)
      try {
        console.log('🔄 Recomputing retailer data for accuracy...');
        for (const retailer of assignedRetailers) {
          await retailerService.recomputeRetailerData(retailer.id, user.tenantId);
        }
        // Refresh retailers after recomputation
        const updatedRetailers = await retailerService.getAll(user.tenantId);
        const updatedAssignedRetailers = updatedRetailers.filter(retailer => {
          if (!user?.assignedAreas || user.assignedAreas.length === 0) return false;
          if (retailer.areaId && user.assignedAreas.includes(retailer.areaId)) return true;
          if (retailer.zipcodes && retailer.zipcodes.length > 0 && user.assignedZips && user.assignedZips.length > 0) {
            const matchingZips = retailer.zipcodes.filter(zip => user.assignedZips!.includes(zip));
            return matchingZips.length > 0;
          }
          return false;
        });
        setRetailers(updatedAssignedRetailers);
        console.log('✅ Retailer data recomputed and updated');
      } catch (error) {
        console.warn('Warning: Could not recompute retailer data:', error);
      }
      
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
          lineWorkerName: user.displayName || 'Line Worker' // Add line worker name
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
          lineWorkerName: user.displayName || 'Line Worker' // Add line worker name
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
      
      console.log('✅ OTP verified and payment completed successfully');
      
      // Send notification about the collection
      try {
        const { notificationService } = await import('@/services/notification-service');
        notificationService.addPaymentCollectedNotification(
          user?.displayName || 'Line Worker',
          selectedRetailer?.name || 'Retailer',
          currentPayment.totalPaid,
          currentPayment.id
        );
      } catch (error) {
        console.warn('Warning: Could not send notification:', error);
      }
      
      setShowPaymentDialog(false);
      setShowOtpSection(false);
      setOtpSent(false);
      setOtpCode('');
      setCurrentPayment(null);
      setResendTimer(0);
      setResendDisabled(false);
      
      // Add a small delay to ensure database updates are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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

  // Overview Component
  const Overview = () => {
    const totalOutstanding = retailers.reduce((sum, r) => sum + r.currentOutstanding, 0);
    const todayPayments = payments.filter(p => {
      const today = new Date();
      const paymentDate = p.createdAt.toDate();
      return paymentDate.toDateString() === today.toDateString() && p.state === 'COMPLETED';
    }).length;
    const totalPayments = payments.filter(p => p.state === 'COMPLETED').length;
    
    // Calculate today's total collections amount
    const todayTotalCollections = payments.filter(p => {
      const today = new Date();
      const paymentDate = p.createdAt.toDate();
      return paymentDate.toDateString() === today.toDateString() && p.state === 'COMPLETED';
    }).reduce((sum, p) => sum + p.totalPaid, 0);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Retailers</CardTitle>
              <div className="bg-blue-100 p-2 rounded-full">
                <Store className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
              <p className="text-xs text-gray-500">In your assigned areas</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
              <div className="bg-green-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-gray-500">Across all retailers</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Collections</CardTitle>
              <div className="bg-purple-100 p-2 rounded-full">
                <IndianRupee className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{todayPayments}</div>
              <p className="text-xs text-gray-500">Payments collected today</p>
              <div className="text-lg font-bold text-purple-600 mt-2">{formatCurrency(todayTotalCollections)}</div>
              <p className="text-xs text-gray-500">Total amount collected today</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Collections</CardTitle>
              <div className="bg-orange-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalPayments}</div>
              <p className="text-xs text-gray-500">All-time payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your latest payment collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments
                .filter(p => p.state === 'COMPLETED')
                .slice(0, 5)
                .map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</div>
                        <div className="text-sm text-purple-600 font-medium">Collected: {formatCurrency(payment.totalPaid)} by {user?.displayName || 'Line Worker'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">{formatCurrency(payment.totalPaid)}</div>
                      <div className="text-sm text-gray-500">{payment.method}</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Retailers Component
  const RetailersComponent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Retailers</h2>
        <p className="text-gray-600">Retailers assigned to your areas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Retailers</CardTitle>
          <CardDescription>Manage and collect payments from your assigned retailers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {retailers.map((retailer) => (
              <div key={retailer.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{retailer.name}</div>
                    <div className="text-sm text-gray-500">
                      <Phone className="h-3 w-3 inline mr-1" />
                      {retailer.phone}
                    </div>
                    <div className="text-sm text-gray-500">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {retailer.address}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(retailer.currentOutstanding)}</div>
                    <div className="text-sm text-gray-500">Outstanding</div>
                  </div>
                  <Button
                    onClick={() => initiatePayment(retailer)}
                    disabled={retailer.currentOutstanding <= 0}
                  >
                    <IndianRupee className="h-4 w-4 mr-2" />
                    Collect Payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Payments Component
  const PaymentsComponent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
        <p className="text-gray-600">All your payment collections</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>Your payment collection history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                    <TableCell>{retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.method}</Badge>
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
                      <Button variant="outline" size="sm" onClick={() => setShowPaymentDetails(true)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // History Component
  const HistoryComponent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Activity History</h2>
        <p className="text-gray-600">Your recent activities and achievements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Your latest payment collections and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments
              .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
              .slice(0, 10)
              .map((payment) => (
                <div key={payment.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {payment.state === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {payment.state === 'OTP_SENT' && <Clock className="h-5 w-5 text-yellow-600" />}
                    {payment.state === 'CANCELLED' && <XCircle className="h-5 w-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {payment.state === 'COMPLETED' ? 'Payment Collected' : 
                       payment.state === 'OTP_SENT' ? 'Payment Initiated' : 
                       'Payment Cancelled'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'} • 
                      {formatTimestampWithTime(payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                    <div className="text-sm text-gray-500">{payment.method}</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!isLineWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <DashboardNavigation
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        navItems={navItems}
        title="PharmaLynk Collections"
        subtitle="Line Worker Dashboard"
        notificationCount={notificationCount}
        user={user}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content based on active navigation */}
        <div className="space-y-6">
          {activeNav === 'overview' && <Overview />}
          {activeNav === 'retailers' && <RetailersComponent />}
          {activeNav === 'payments' && <PaymentsComponent />}
          {activeNav === 'history' && <HistoryComponent />}
        </div>
      </main>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={handlePaymentDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Collect payment from {selectedRetailer?.name}
            </DialogDescription>
          </DialogHeader>
          
          {!showOtpSection ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Retailer</Label>
                  <div className="font-medium">{selectedRetailer?.name}</div>
                </div>
                <div>
                  <Label>Outstanding Amount</Label>
                  <div className="font-medium">{formatCurrency(selectedRetailer?.currentOutstanding || 0)}</div>
                </div>
                <div>
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    value={paymentForm.totalPaid}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, totalPaid: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    max={selectedRetailer?.currentOutstanding}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
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

              {/* Payment History */}
              {retailerPaymentHistory.length > 0 && (
                <div className="space-y-2">
                  <Label>Recent Payments</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {retailerPaymentHistory.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                        <span>{formatTimestamp(payment.createdAt)}</span>
                        <span className="font-medium">{formatCurrency(payment.totalPaid)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={handlePaymentSubmit} disabled={otpSending}>
                  {otpSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-semibold mb-2">OTP Verification</h3>
                <p className="text-gray-600 mb-4">
                  An OTP has been sent to {selectedRetailer?.phone}. Please enter the OTP to verify the payment.
                </p>
              </div>

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

              <div className="flex flex-col space-y-2">
                <Button onClick={handleVerifyOtp} disabled={otpCode.length !== 6}>
                  Verify OTP
                </Button>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Didn't receive OTP?</span>
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    disabled={resendDisabled || otpSending}
                    className="p-0 h-auto"
                  >
                    {otpSending ? (
                      'Sending...'
                    ) : resendDisabled ? (
                      `Resend in ${resendTimer}s`
                    ) : (
                      'Resend OTP'
                    )}
                  </Button>
                </div>
              </div>

              {currentPayment && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Payment Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Amount:</div>
                    <div className="font-medium">{formatCurrency(currentPayment.totalPaid)}</div>
                    <div>Method:</div>
                    <div className="font-medium">{currentPayment.method}</div>
                    <div>Status:</div>
                    <div className="font-medium">{currentPayment.state}</div>
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