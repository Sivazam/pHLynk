'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardNavigation, NavItem } from '@/components/DashboardNavigation';
import { retailerService, paymentService, otpService, invoiceService } from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { RetailerAuthService } from '@/services/retailer-auth';
import { Retailer, Payment, Invoice } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { getActiveOTPsForRetailer, getCompletedPaymentsForRetailer, removeCompletedPayment } from '@/lib/otp-store';
import { Skeleton } from '@/components/ui/skeleton';
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
  Volume2,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export function RetailerDashboard() {
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [retailerUser, setRetailerUser] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
  const [shownOTPpopups, setShownOTPpopups] = useState<Set<string>>(new Set());
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'History', icon: History },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  useEffect(() => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (storedRetailerId) {
      fetchRetailerData(storedRetailerId);
      
      // Start real-time notifications
      realtimeNotificationService.startListening(
        storedRetailerId,
        'RETAILER',
        'retailer', // Retailers use their own ID as tenant ID
        (newNotifications) => {
          setNotifications(newNotifications);
          setNotificationCount(newNotifications.filter(n => !n.read).length);
        }
      );
    }

    // Cleanup on unmount
    return () => {
      const storedRetailerId = localStorage.getItem('retailerId');
      if (storedRetailerId) {
        realtimeNotificationService.stopListening(storedRetailerId);
      }
    };
  }, []);

  const fetchRetailerData = async (retailerId: string) => {
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
      console.log('📋 Retailer user data fields:', Object.keys(retailerUserData || {}));
      console.log('🏠 Address from retailer user data:', retailerUserData.address);
      
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
          console.log('📋 Retailer document fields:', Object.keys(retailerDoc.data() || {}));
          console.log('🏠 Address from retailer document:', retailerDoc.data()?.address);
          console.log('🏠 retailerData.address after spread:', retailerData.address);
          console.log('🏠 typeof retailerData.address:', typeof retailerData.address);
          console.log('🏠 retailerData.address length:', retailerData.address?.length);
          
          // If retailer document doesn't have address, try to get from user data
          if (!retailerData.address && retailerUserData.address) {
            retailerData.address = retailerUserData.address;
            console.log('🏠 Using address from retailer user data:', retailerData.address);
          }
          
          // Final address value
          console.log('🏠 Final retailerData.address:', retailerData.address);
        } else {
          console.log('⚠️ Retailer document not found in retailers collection, using user data');
          // Fallback to user data
          retailerData = {
            id: retailerUserData.retailerId,
            name: retailerUserData.name,
            phone: retailerUserData.phone,
            email: retailerUserData.email || '',
            tenantId: retailerUserData.tenantId,
            address: retailerUserData.address || 'Address not specified',
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
          address: retailerUserData.address || 'Address not specified',
          currentOutstanding: 0,
          areaId: '',
          zipcodes: []
        };
      }
      
      // Get payment history using the tenantId and retailerId from user data
      const paymentsData = await paymentService.getPaymentsByRetailer(retailerUserData.tenantId, retailerUserData.retailerId);
      
      // Get invoice data to calculate proper outstanding amount
      let totalInvoiceAmount = 0;
      let invoicesData: Invoice[] = [];
      try {
        invoicesData = await invoiceService.getInvoicesByRetailer(retailerUserData.tenantId, retailerUserData.retailerId);
        totalInvoiceAmount = invoicesData.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        console.log('Total invoice amount:', totalInvoiceAmount);
        console.log('Invoices found:', invoicesData.length);
      } catch (error) {
        console.warn('Could not fetch invoice data:', error);
      }
      
      console.log('Payments data fetched:', paymentsData);
      console.log('Payments details:', paymentsData.map(p => ({ 
        id: p.id, 
        state: p.state, 
        totalPaid: p.totalPaid,
        method: p.method 
      })));
      
      // Calculate total paid from completed payments
      const completedPayments = paymentsData.filter(p => p.state === 'COMPLETED');
      const totalPaid = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
      
      // Calculate current outstanding: Total Invoice Amount - Total Paid
      const currentOutstanding = Math.max(0, totalInvoiceAmount - totalPaid);
      
      console.log('Completed payments:', completedPayments.length);
      console.log('Total paid amount:', totalPaid);
      console.log('Total invoice amount:', totalInvoiceAmount);
      console.log('Calculated outstanding amount:', currentOutstanding);
      console.log('Outstanding from retailer document:', retailerData.currentOutstanding);
      
      // Use the calculated outstanding amount (more accurate than retailer document)
      retailerData.currentOutstanding = currentOutstanding;
      
      // Calculate notification count
      const activeOTPCount = activeOTPs.length;
      const outstandingCount = currentOutstanding > 0 ? 1 : 0;
      setNotificationCount(activeOTPCount + outstandingCount);
      
      // Final debugging before setting state
      console.log('🏠 FINAL retailerData.address before setState:', retailerData.address);
      console.log('🏠 FINAL retailerData object:', retailerData);
      
      setRetailer(retailerData as any);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setRetailerUser(retailerUserData);
      
      console.log('Final retailer data:', retailerData);
      console.log('Payments loaded:', paymentsData.length);
      console.log('Final outstanding amount:', currentOutstanding);
      
    } catch (err: any) {
      console.error('Error fetching retailer data:', err);
      setError(err.message || 'Failed to fetch retailer data');
    }
  };

  const checkActiveOTPs = async () => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (!storedRetailerId) return;
    
    // Get OTPs from in-memory store
    const activeOTPsForRetailer = getActiveOTPsForRetailer(storedRetailerId);
    const completedPaymentsForRetailer = getCompletedPaymentsForRetailer(storedRetailerId);
    
    // If no OTPs found in memory, try to fetch from Firestore
    let firestoreOTPs: any[] = [];
    if (activeOTPsForRetailer.length === 0) {
      try {
        const firestoreOTPData = await otpService.getActiveOTPsForRetailer(storedRetailerId);
        firestoreOTPs = firestoreOTPData.map(otp => ({
          code: otp.code,
          amount: otp.amount,
          paymentId: otp.paymentId,
          lineWorkerName: otp.lineWorkerName,
          expiresAt: otp.expiresAt.toDate(),
          createdAt: otp.createdAt.toDate()
        }));
        console.log('📱 Fetched OTPs from Firestore:', firestoreOTPs.length);
      } catch (error) {
        console.error('❌ Error fetching OTPs from Firestore:', error);
      }
    }
    
    // Combine in-memory and Firestore OTPs, removing duplicates
    const allOTPs = [...activeOTPsForRetailer, ...firestoreOTPs];
    const uniqueOTPs = allOTPs.filter((otp, index, self) => 
      index === self.findIndex(o => o.paymentId === otp.paymentId)
    );
    
    // Filter out expired OTPs (older than 3 minutes)
    const now = new Date();
    const validOTPs = uniqueOTPs.filter(otp => {
      const timeSinceCreation = now.getTime() - otp.createdAt.getTime();
      return timeSinceCreation < 180000; // 3 minutes in milliseconds
    });
    
    // Log expired OTPs that were removed
    const expiredOTPs = uniqueOTPs.filter(otp => {
      const timeSinceCreation = now.getTime() - otp.createdAt.getTime();
      return timeSinceCreation >= 180000; // 3 minutes in milliseconds
    });
    
    if (expiredOTPs.length > 0) {
      console.log('🕐 Expired OTPs removed:', expiredOTPs.map(otp => otp.paymentId));
    }
    
    // Check if there are new OTPs
    const newOTPs = validOTPs.filter(otp => 
      !activeOTPs.some(existingOtp => existingOtp.paymentId === otp.paymentId)
    );
    
    // Check if there are new completed payments
    const newCompleted = completedPaymentsForRetailer.filter(payment => 
      !completedPayments.some(existingPayment => existingPayment.paymentId === payment.paymentId)
    );
    
    if (newOTPs.length > 0) {
      console.log('🔔 New OTP detected for retailer:', newOTPs);
      setActiveOTPs(validOTPs);
      
      // Check if any of the new OTPs haven't been shown as popup yet
      const unshownOTPs = newOTPs.filter(otp => !shownOTPpopups.has(otp.paymentId));
      
      if (unshownOTPs.length > 0) {
        setShowOTPPopup(true);
        
        // Mark these OTPs as shown
        const newShownPopups = new Set(shownOTPpopups);
        unshownOTPs.forEach(otp => newShownPopups.add(otp.paymentId));
        setShownOTPpopups(newShownPopups);
      }
      
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
      setActiveOTPs(validOTPs);
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

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4" />;
      case 'PARTIALLY_PAID':
        return <Clock className="h-4 w-4" />;
      case 'OVERDUE':
        return <XCircle className="h-4 w-4" />;
      case 'DRAFT':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const calculateInvoiceStatus = (invoice: Invoice, payments: Payment[]): string => {
    const totalPaid = payments
      .filter(p => p.state === 'COMPLETED')
      .reduce((sum, p) => sum + p.totalPaid, 0);
    
    if (totalPaid >= invoice.totalAmount) {
      return 'PAID';
    } else if (totalPaid > 0) {
      return 'PARTIALLY_PAID';
    } else if (new Date() > new Date(invoice.dueDate.toDate())) {
      return 'OVERDUE';
    } else {
      return 'PENDING';
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

  const handleManualRefresh = async () => {
    const storedRetailerId = localStorage.getItem('retailerId');
    if (!storedRetailerId) return;
    
    setRefreshLoading(true);
    try {
      // Refresh main data
      await fetchRetailerData(storedRetailerId);
      // Check for active OTPs
      await checkActiveOTPs();
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setRefreshLoading(false);
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (diff <= 0) return 'Expired';
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeRemainingFromCreation = (createdAt: Date) => {
    const now = new Date();
    const diff = (createdAt.getTime() + 180000) - now.getTime(); // 3 minutes from creation
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (diff <= 0) return 'Expired';
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Overview Component
  const Overview = () => (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="text-gray-600">Your business summary and outstanding amounts</p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={refreshLoading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      {/* Retailer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Store className="h-5 w-5" />
            <span>Your Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Business Name</Label>
              <div className="text-lg font-semibold">{retailer?.name}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Phone Number</Label>
              <div className="text-lg font-semibold">{retailer?.phone}</div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-500">Address</Label>
              <div className="text-lg font-semibold">{retailer?.address}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding Amount</CardTitle>
            <div className="bg-red-100 p-2 rounded-full">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(retailer?.currentOutstanding || 0)}
            </div>
            <p className="text-xs text-gray-500">Total unpaid amount</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
            <div className="bg-blue-100 p-2 rounded-full">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
            <p className="text-xs text-gray-500">Invoice documents</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {payments.filter(p => p.state === 'COMPLETED').length}
            </div>
            <p className="text-xs text-gray-500">Completed payments</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active OTPs</CardTitle>
            <div className="bg-purple-100 p-2 rounded-full">
              <Smartphone className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeOTPs.length}</div>
            <p className="text-xs text-gray-500">Pending verifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Active OTPs */}
      {activeOTPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Active OTP Requests</span>
            </CardTitle>
            <CardDescription>Payment verification requests waiting for your confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOTPs.map((otp) => (
                <div key={otp.paymentId} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Volume2 className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium">Payment Request</div>
                      <div className="text-sm text-gray-500">
                        From: {otp.lineWorkerName} • Amount: {formatCurrency(otp.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires in: {formatTimeRemainingFromCreation(otp.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-600">OTP: {otp.code}</div>
                    <div className="text-xs text-gray-500">Share with line worker</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Invoices Component
  const InvoicesComponent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
          <p className="text-gray-600">View and manage your invoices</p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={refreshLoading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{invoices.length}</div>
                <div className="text-sm text-gray-500">Total Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => calculateInvoiceStatus(inv, payments) === 'PAID').length}
                </div>
                <div className="text-sm text-gray-500">Paid Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => calculateInvoiceStatus(inv, payments) === 'PARTIALLY_PAID').length}
                </div>
                <div className="text-sm text-gray-500">Partial Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => calculateInvoiceStatus(inv, payments) === 'OVERDUE').length}
                </div>
                <div className="text-sm text-gray-500">Overdue Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Your complete invoice history with payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = calculateInvoiceStatus(invoice, payments);
                  const paidAmount = payments
                    .filter(p => p.state === 'COMPLETED')
                    .reduce((sum, p) => sum + p.totalPaid, 0);
                  const balance = invoice.totalAmount - paidAmount;
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatTimestamp(invoice.issueDate)}</TableCell>
                      <TableCell>{formatTimestamp(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(paidAmount)}</TableCell>
                      <TableCell className="text-right">
                        <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {formatCurrency(balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getInvoiceStatusColor(status)}>
                          <div className="flex items-center space-x-1">
                            {getInvoiceStatusIcon(status)}
                            <span>{status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Payments Component
  const PaymentsComponent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
          <p className="text-gray-600">All your payment transactions</p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={refreshLoading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>Your complete payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Line Worker</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                    <TableCell>{retailerUser?.name || 'Unknown'}</TableCell>
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
  const HistoryComponent = () => {
    // Combine invoice and payment activities
    const activities = [
      ...invoices.map(invoice => ({
        id: `invoice_${invoice.id}`,
        type: 'invoice',
        title: 'Invoice Generated',
        description: `Invoice #${invoice.invoiceNumber} for ${formatCurrency(invoice.totalAmount)}`,
        timestamp: invoice.issueDate.toDate(),
        amount: invoice.totalAmount,
        status: calculateInvoiceStatus(invoice, payments),
        icon: FileText,
        color: 'text-blue-600'
      })),
      ...payments.map(payment => ({
        id: `payment_${payment.id}`,
        type: 'payment',
        title: payment.state === 'COMPLETED' ? 'Payment Completed' : 'Payment Initiated',
        description: `${payment.method} payment of ${formatCurrency(payment.totalPaid)}`,
        timestamp: payment.createdAt.toDate(),
        amount: payment.totalPaid,
        status: payment.state,
        icon: payment.state === 'COMPLETED' ? CheckCircle : Clock,
        color: payment.state === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activity History</h2>
            <p className="text-gray-600">Your recent invoice and payment activities</p>
          </div>
          <Button 
            onClick={handleManualRefresh} 
            disabled={refreshLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </Button>
        </div>

        {/* Activity Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{invoices.length}</div>
                  <div className="text-sm text-gray-500">Total Invoices</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {payments.filter(p => p.state === 'COMPLETED').length}
                  </div>
                  <div className="text-sm text-gray-500">Completed Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(payments.filter(p => p.state === 'COMPLETED').reduce((sum, p) => sum + p.totalPaid, 0))}
                  </div>
                  <div className="text-sm text-gray-500">Total Paid</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Timeline of your invoice and payment activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 20).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'invoice' ? 'bg-blue-100' : 
                    activity.status === 'COMPLETED' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <activity.icon className={`h-5 w-5 ${activity.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-gray-500">
                        {formatTimestampWithTime(activity.timestamp)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="text-sm font-medium">
                        Amount: {formatCurrency(activity.amount)}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          activity.type === 'invoice' ? getInvoiceStatusColor(activity.status) :
                          getPaymentStatusColor(activity.status)
                        }
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Main component return - no global loading state

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <DashboardNavigation
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        navItems={navItems}
        title="PharmaLynk Collections"
        subtitle="Retailer Dashboard"
        notificationCount={notificationCount}
        user={retailerUser ? { displayName: retailerUser.name, email: retailerUser.email } : undefined}
        onLogout={handleLogout}
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
          {activeNav === 'invoices' && <InvoicesComponent />}
          {activeNav === 'payments' && <PaymentsComponent />}
          {activeNav === 'history' && <HistoryComponent />}
        </div>
      </main>

      {/* OTP Popup */}
      {showOTPPopup && newPayment && (
        <Dialog open={showOTPPopup} onOpenChange={setShowOTPPopup}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>New Payment Request</span>
              </DialogTitle>
              <DialogDescription>
                A line worker has initiated a payment that requires your verification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Amount:</div>
                  <div className="font-medium">{formatCurrency(newPayment.totalPaid)}</div>
                  <div>Line Worker:</div>
                  <div className="font-medium">{activeOTPs[0]?.lineWorkerName || 'Unknown'}</div>
                  <div>Method:</div>
                  <div className="font-medium">{newPayment.method}</div>
                  <div>OTP Code:</div>
                  <div className="font-medium text-blue-600">{activeOTPs[0]?.code}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Please share this OTP code with the line worker to complete the payment verification.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => setShowOTPPopup(false)}>
                  I Understand
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Settlement Popup */}
      {showSettlementPopup && newCompletedPayment && (
        <Dialog open={showSettlementPopup} onOpenChange={setShowSettlementPopup}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Payment Completed</span>
              </DialogTitle>
              <DialogDescription>
                A payment has been successfully completed for your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Amount Paid:</div>
                  <div className="font-medium">{formatCurrency(newCompletedPayment.amount)}</div>
                  <div>Line Worker:</div>
                  <div className="font-medium">{newCompletedPayment.lineWorkerName}</div>
                  <div>Completed At:</div>
                  <div className="font-medium">{formatTimestampWithTime(newCompletedPayment.completedAt)}</div>
                  <div>Remaining Outstanding:</div>
                  <div className="font-medium">{formatCurrency(newCompletedPayment.remainingOutstanding)}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Thank you for your payment! Your outstanding balance has been updated.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => handleAcknowledgeSettlement(newCompletedPayment.paymentId)}>
                  Acknowledge
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}