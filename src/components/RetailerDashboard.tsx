'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardNavigation, NavItem } from '@/components/DashboardNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { retailerService, paymentService, invoiceService } from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { RetailerAuthService } from '@/services/retailer-auth';
import { Retailer, Payment, Invoice } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { getActiveOTPsForRetailer, getCompletedPaymentsForRetailer, removeCompletedPayment } from '@/lib/otp-store';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/logger';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLoadingState } from '@/hooks/useLoadingState';
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
  RefreshCw,
  Heart
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';

export function RetailerDashboard() {
  const { user } = useAuth();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [retailerUser, setRetailerUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
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
  const [paymentTab, setPaymentTab] = useState('completed');
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState('today');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { startDate: startOfDay, endDate: endOfDay };
  });
  
  // Standardized loading state management
  const mainLoadingState = useLoadingState();
  const [dataFetchProgress, setDataFetchProgress] = useState(0);

  // Helper functions to filter data by date range
  const filterPaymentsByDateRange = (paymentsData: Payment[]) => {
    return paymentsData.filter(payment => {
      const paymentDate = payment.createdAt.toDate();
      return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    });
  };

  const filterInvoicesByDateRange = (invoicesData: Invoice[]) => {
    return invoicesData.filter(invoice => {
      const invoiceDate = invoice.issueDate.toDate();
      return invoiceDate >= dateRange.startDate && invoiceDate <= dateRange.endDate;
    });
  };

  const calculateOutstandingForDateRange = (invoicesData: Invoice[], paymentsData: Payment[]) => {
    const filteredInvoices = filterInvoicesByDateRange(invoicesData);
    const filteredPayments = filterPaymentsByDateRange(paymentsData).filter(p => p.state === 'COMPLETED');
    
    const totalInvoiceAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const totalPaid = filteredPayments.reduce((sum, payment) => sum + payment.totalPaid, 0);
    
    return Math.max(0, totalInvoiceAmount - totalPaid);
  };

  const handleDateRangeChange = (value: string, newDateRange: { startDate: Date; endDate: Date }) => {
    setSelectedDateRangeOption(value);
    setDateRange(newDateRange);
  };

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'History', icon: History },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  // Helper functions to get additional data
  const [wholesalerNames, setWholesalerNames] = useState<Record<string, string>>({});
  const [lineWorkerNames, setLineWorkerNames] = useState<Record<string, string>>({});

  // Get wholesaler/tenant name by tenantId
  const getWholesalerName = async (tenantId: string): Promise<string> => {
    if (wholesalerNames[tenantId]) {
      return wholesalerNames[tenantId];
    }
    
    try {
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (tenantDoc.exists()) {
        const tenantData = tenantDoc.data();
        const name = tenantData.name || 'Unknown Wholesaler';
        setWholesalerNames(prev => ({ ...prev, [tenantId]: name }));
        return name;
      }
    } catch (error) {
      logger.error('Error fetching wholesaler name', error, { context: 'RetailerDashboard' });
    }
    
    return 'Unknown Wholesaler';
  };

  // Get line worker name by userId
  const getLineWorkerName = async (lineWorkerId: string): Promise<string> => {
    if (lineWorkerNames[lineWorkerId]) {
      return lineWorkerNames[lineWorkerId];
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', lineWorkerId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const name = userData.displayName || userData.email || 'Unknown Line Worker';
        setLineWorkerNames(prev => ({ ...prev, [lineWorkerId]: name }));
        return name;
      }
    } catch (error) {
      logger.error('Error fetching line worker name', error, { context: 'RetailerDashboard' });
    }
    
    return 'Unknown Line Worker';
  };

  // Calculate remaining days from due date
  const calculateRemainingDays = (dueDate: any): number => {
    if (!dueDate) return 0;
    
    const due = dueDate.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    due.setHours(0, 0, 0, 0); // Set to start of day
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Load all necessary data
  const loadAdditionalData = async () => {
    if (!tenantId || !invoices.length && !payments.length) return;
    
    // Get unique tenantIds and lineWorkerIds
    const uniqueTenantIds = new Set<string>();
    const uniqueLineWorkerIds = new Set<string>();
    
    // Add tenantId from invoices
    if (tenantId) {
      uniqueTenantIds.add(tenantId);
    }
    
    // Add lineWorkerIds from payments
    payments.forEach(payment => {
      if (payment.lineWorkerId) {
        uniqueLineWorkerIds.add(payment.lineWorkerId);
      }
    });
    
    // Fetch wholesaler names
    for (const tenantId of uniqueTenantIds) {
      await getWholesalerName(tenantId);
    }
    
    // Fetch line worker names
    for (const lineWorkerId of uniqueLineWorkerIds) {
      await getLineWorkerName(lineWorkerId);
    }
  };

  useEffect(() => {
    // Get retailerId from AuthContext user or fallback to localStorage for backward compatibility
    let retailerId = user?.retailerId;
    if (!retailerId) {
      const storedRetailerId = localStorage.getItem('retailerId');
      retailerId = storedRetailerId;
    }
    
    if (retailerId) {
      // Reset loading state and start fetching data
      mainLoadingState.setLoading(true);
      setDataFetchProgress(0);
      fetchRetailerData(retailerId);
      
      // Start real-time notifications
      realtimeNotificationService.startListening(
        retailerId,
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
      let retailerId = user?.retailerId;
      if (!retailerId) {
        const storedRetailerId = localStorage.getItem('retailerId');
        retailerId = storedRetailerId;
      }
      
      if (retailerId) {
        realtimeNotificationService.stopListening(retailerId);
      }
    };
  }, [user]); // Add user as dependency

  // Load additional data when payments or invoices change
  useEffect(() => {
    if (payments.length > 0 || invoices.length > 0) {
      loadAdditionalData();
    }
  }, [payments, invoices]);

  const fetchRetailerData = async (retailerId: string) => {
    setError(null);
    setDataFetchProgress(20);
    
    try {
      logger.debug('Fetching retailer data for retailerId', { retailerId }, { context: 'RetailerDashboard' });
      
      // Get retailer user account - this contains all the data we need
      setDataFetchProgress(40);
      const retailerUserData = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
      if (!retailerUserData) {
        setError('Retailer user account not found');
        mainLoadingState.setLoading(false);
        return;
      }
      
      logger.debug('Retailer user data found', retailerUserData, { context: 'RetailerDashboard' });
      logger.debug('Tenant ID from user data', retailerUserData.tenantId, { context: 'RetailerDashboard' });
      logger.debug('Retailer user data fields', Object.keys(retailerUserData || {}), { context: 'RetailerDashboard' });
      logger.debug('Address from retailer user data', retailerUserData.address, { context: 'RetailerDashboard' });
      
      // Try to get retailer details from retailers collection first
      setDataFetchProgress(60);
      let retailerData;
      try {
        const retailerRef = doc(db, 'retailers', retailerId);
        const retailerDoc = await getDoc(retailerRef);
        
        if (retailerDoc.exists()) {
          retailerData = {
            id: retailerId,
            ...retailerDoc.data()
          };
          logger.debug('Retailer data found in retailers collection', retailerData, { context: 'RetailerDashboard' });
          logger.debug('Retailer document fields', Object.keys(retailerDoc.data() || {}), { context: 'RetailerDashboard' });
          logger.debug('Address from retailer document', retailerDoc.data()?.address, { context: 'RetailerDashboard' });
          logger.debug('retailerData.address after spread', retailerData.address, { context: 'RetailerDashboard' });
          logger.debug('typeof retailerData.address', typeof retailerData.address, { context: 'RetailerDashboard' });
          logger.debug('retailerData.address length', retailerData.address?.length, { context: 'RetailerDashboard' });
          
          // If retailer document doesn't have address, try to get from user data
          if (!retailerData.address && retailerUserData.address) {
            retailerData.address = retailerUserData.address;
            logger.debug('Using address from retailer user data', retailerData.address, { context: 'RetailerDashboard' });
          }
          
          // Final address value
          logger.debug('Final retailerData.address', retailerData.address, { context: 'RetailerDashboard' });
        } else {
          logger.warn('Retailer document not found in retailers collection, using user data', { context: 'RetailerDashboard' });
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
        logger.error('Error accessing retailers collection, using user data', error, { context: 'RetailerDashboard' });
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
      setDataFetchProgress(80);
      const paymentsData = await paymentService.getPaymentsByRetailer(retailerUserData.tenantId, retailerUserData.retailerId);
      
      // Get invoice data to calculate proper outstanding amount
      let totalInvoiceAmount = 0;
      let invoicesData: Invoice[] = [];
      try {
        invoicesData = await invoiceService.getInvoicesByRetailer(retailerUserData.tenantId, retailerUserData.retailerId);
        totalInvoiceAmount = invoicesData.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        logger.debug('Total invoice amount', totalInvoiceAmount, { context: 'RetailerDashboard' });
        logger.debug('Invoices found', invoicesData.length, { context: 'RetailerDashboard' });
      } catch (error) {
        logger.warn('Could not fetch invoice data', error, { context: 'RetailerDashboard' });
      }
      
      logger.debug('Payments data fetched', paymentsData, { context: 'RetailerDashboard' });
      logger.debug('Payments details', paymentsData.map(p => ({ 
        id: p.id, 
        state: p.state, 
        totalPaid: p.totalPaid,
        method: p.method 
      })), { context: 'RetailerDashboard' });
      
      // Calculate total paid from completed payments
      const completedPayments = paymentsData.filter(p => p.state === 'COMPLETED');
      const totalPaid = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
      
      // Calculate current outstanding: Total Invoice Amount - Total Paid
      const currentOutstanding = Math.max(0, totalInvoiceAmount - totalPaid);
      
      logger.debug('Completed payments', completedPayments.length, { context: 'RetailerDashboard' });
      logger.debug('Total paid amount', totalPaid, { context: 'RetailerDashboard' });
      logger.debug('Total invoice amount', totalInvoiceAmount, { context: 'RetailerDashboard' });
      logger.debug('Calculated outstanding amount', currentOutstanding, { context: 'RetailerDashboard' });
      logger.debug('Outstanding from retailer document', retailerData.currentOutstanding, { context: 'RetailerDashboard' });
      
      // Use the calculated outstanding amount (more accurate than retailer document)
      retailerData.currentOutstanding = currentOutstanding;
      
      // Calculate notification count
      const activeOTPCount = activeOTPs.length;
      const outstandingCount = currentOutstanding > 0 ? 1 : 0;
      setNotificationCount(activeOTPCount + outstandingCount);
      
      // Final debugging before setting state
      logger.debug('FINAL retailerData.address before setState', retailerData.address, { context: 'RetailerDashboard' });
      logger.debug('FINAL retailerData object', retailerData, { context: 'RetailerDashboard' });
      
      setRetailer(retailerData as any);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setRetailerUser(retailerUserData);
      setTenantId(retailerUserData.tenantId);
      
      // Load additional data (wholesaler and line worker names)
      loadAdditionalData();
      
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);
      
      logger.debug('Final retailer data', retailerData, { context: 'RetailerDashboard' });
      logger.debug('Payments loaded', paymentsData.length, { context: 'RetailerDashboard' });
      logger.debug('Final outstanding amount', currentOutstanding, { context: 'RetailerDashboard' });
      
    } catch (err: any) {
      logger.error('Error fetching retailer data', err, { context: 'RetailerDashboard' });
      setError(err.message || 'Failed to fetch retailer data');
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);
    }
  };

  const checkActiveOTPs = async () => {
    let retailerId = user?.retailerId;
    if (!retailerId) {
      const storedRetailerId = localStorage.getItem('retailerId');
      retailerId = storedRetailerId;
    }
    
    if (!retailerId) return;
    
    // Get OTPs from in-memory store (for real-time updates)
    const activeOTPsForRetailer = getActiveOTPsForRetailer(retailerId);
    const completedPaymentsForRetailer = getCompletedPaymentsForRetailer(retailerId);
    
    // Get OTPs from retailer document (primary source)
    let retailerOTPs: any[] = [];
    if (tenantId) {
      try {
        const retailerOTPData = await retailerService.getActiveOTPsFromRetailer(retailerId, tenantId);
        retailerOTPs = retailerOTPData.map(otp => ({
          code: otp.code,
          amount: otp.amount,
          paymentId: otp.paymentId,
          lineWorkerName: otp.lineWorkerName,
          expiresAt: otp.expiresAt.toDate(),
          createdAt: otp.createdAt.toDate()
        }));
        logger.debug('Fetched OTPs from retailer document', retailerOTPs.length, { context: 'RetailerDashboard' });
      } catch (error) {
        logger.error('Error fetching OTPs from retailer document', error, { context: 'RetailerDashboard' });
      }
    } else {
      logger.warn('Tenant ID not available, cannot fetch OTPs from retailer document', { context: 'RetailerDashboard' });
    }
    
    // Combine in-memory and retailer document OTPs, removing duplicates
    const allOTPs = [...activeOTPsForRetailer, ...retailerOTPs];
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
      logger.debug('Expired OTPs removed', expiredOTPs.map(otp => otp.paymentId), { context: 'RetailerDashboard' });
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
      logger.debug('New OTP detected for retailer', newOTPs, { context: 'RetailerDashboard' });
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
        retailerId: retailerId,
        retailerName: retailer?.name || '',
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
      logger.debug('New completed payment detected for retailer', newCompleted, { context: 'RetailerDashboard' });
      setCompletedPayments(completedPaymentsForRetailer);
      setShowSettlementPopup(true);
      
      // Set the latest completed payment for notification
      const latestCompleted = newCompleted[newCompleted.length - 1];
      setNewCompletedPayment(latestCompleted);
      
      // Refresh retailer data to update outstanding amount
      let retailerId = user?.retailerId;
      if (!retailerId) {
        const storedRetailerId = localStorage.getItem('retailerId');
        retailerId = storedRetailerId;
      }
      
      if (retailerId) {
        fetchRetailerData(retailerId);
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
    } else if (invoice.dueDate && new Date() > new Date(invoice.dueDate.toDate())) {
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
    let retailerId = user?.retailerId;
    if (!retailerId) {
      const storedRetailerId = localStorage.getItem('retailerId');
      retailerId = storedRetailerId;
    }
    
    if (retailerId) {
      const updatedCompletedPayments = getCompletedPaymentsForRetailer(retailerId);
      setCompletedPayments(updatedCompletedPayments);
    }
  };

  const handleLogout = () => {
    // Clear retailer ID from localStorage
    localStorage.removeItem('retailerId');
    // Redirect to home page
    window.location.href = '/';
  };

  const handleManualRefresh = async () => {
    let retailerId = user?.retailerId;
    if (!retailerId) {
      const storedRetailerId = localStorage.getItem('retailerId');
      retailerId = storedRetailerId;
    }
    
    if (!retailerId) return;
    
    mainLoadingState.setRefreshing(true);
    try {
      // Refresh main data
      await fetchRetailerData(retailerId);
      // Check for active OTPs
      await checkActiveOTPs();
    } catch (error) {
      logger.error('Error during manual refresh', error, { context: 'RetailerDashboard' });
    } finally {
      mainLoadingState.setRefreshing(false);
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
  const Overview = () => {
    // Calculate filtered data for the selected date range
    const filteredPayments = filterPaymentsByDateRange(payments);
    const filteredInvoices = filterInvoicesByDateRange(invoices);
    const filteredCompletedPayments = filteredPayments.filter(p => p.state === 'COMPLETED');
    const filteredOutstandingAmount = calculateOutstandingForDateRange(invoices, payments);

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header with date filter and refresh button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Overview</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Your business summary and outstanding amounts
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <DateRangeFilter 
              value={selectedDateRangeOption} 
              onValueChange={handleDateRangeChange} 
              className="w-full sm:w-auto"
            />
            <LoadingButton 
              isLoading={mainLoadingState.loadingState.isRefreshing}
              loadingText="Refreshing..."
              onClick={handleManualRefresh} 
              variant="outline"
              className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </LoadingButton>
          </div>
        </div>

        {/* Retailer Info Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Store className="h-5 w-5" />
              <span>Your Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Business Name</Label>
                <div className="text-base sm:text-lg font-semibold truncate">{retailer?.name}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Phone Number</Label>
                <div className="text-base sm:text-lg font-semibold">{retailer?.phone}</div>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium text-gray-500">Address</Label>
                <div className="text-base sm:text-lg font-semibold break-words">{retailer?.address}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding Amount</CardTitle>
              <div className="bg-red-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                {formatCurrency(filteredOutstandingAmount)}
              </div>
              <p className="text-xs text-gray-500">Total unpaid amount (filtered)</p>
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
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
              <p className="text-xs text-gray-500">Invoice documents (filtered)</p>
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
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {filteredCompletedPayments.length}
              </div>
              <p className="text-xs text-gray-500">Completed payments (filtered)</p>
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
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{activeOTPs.length}</div>
              <p className="text-xs text-gray-500">Pending verifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Active OTPs */}
        {activeOTPs.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Smartphone className="h-5 w-5" />
                <span>Active OTP Requests</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Payment verification requests waiting for your confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeOTPs.map((otp) => (
                  <div key={otp.paymentId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg bg-yellow-50">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Volume2 className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">Payment Request</div>
                        <div className="text-sm text-gray-500 truncate">
                          From: {otp.lineWorkerName} • Amount: {formatCurrency(otp.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires in: {formatTimeRemainingFromCreation(otp.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
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
  };

  // Invoices Component
  const InvoicesComponent = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Invoice Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            View and manage your invoices
          </p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={mainLoadingState.loadingState.isRefreshing}
          variant="outline"
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          size="sm"
        >
          {mainLoadingState.loadingState.isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold truncate">{invoices.length}</div>
                <div className="text-sm text-gray-500">Total Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold truncate">
                  {invoices.filter(inv => calculateInvoiceStatus(inv, payments) === 'PAID').length}
                </div>
                <div className="text-sm text-gray-500">Paid Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold truncate">
                  {invoices.filter(inv => calculateInvoiceStatus(inv, payments) === 'PARTIALLY_PAID').length}
                </div>
                <div className="text-sm text-gray-500">Partial Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold truncate">
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
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">All Invoices</CardTitle>
          <CardDescription className="text-sm">
            Your complete invoice history with payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Invoice #</TableHead>
                  <TableHead className="text-xs sm:text-sm">Issue Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Due Date</TableHead>
                  <TableHead className="text-xs sm:text-sm text-right">Total Amount</TableHead>
                  <TableHead className="text-xs sm:text-sm">Wholesaler Name</TableHead>
                  <TableHead className="text-xs sm:text-sm text-right">Remaining Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = calculateInvoiceStatus(invoice, payments);
                  const remainingDays = calculateRemainingDays(invoice.dueDate);
                  const wholesalerName = wholesalerNames[tenantId || ''] || 'Loading...';
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatTimestamp(invoice.issueDate)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatTimestamp(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{wholesalerName}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        <span className={remainingDays < 0 ? 'text-red-600 font-medium' : remainingDays <= 3 ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                          {remainingDays < 0 ? `${remainingDays} days` : `${remainingDays} days`}
                        </span>
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
  const PaymentsComponent = () => {
    // Filter payments based on status and sort by most recent first
    const completedPayments = payments
      .filter(payment => payment.state === 'COMPLETED')
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    const pendingCancelledPayments = payments
      .filter(payment => 
        ['INITIATED', 'OTP_SENT', 'OTP_VERIFIED', 'CANCELLED', 'EXPIRED'].includes(payment.state)
      )
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
            <p className="text-gray-600">All your payment transactions</p>
          </div>
          <Button 
            onClick={handleManualRefresh} 
            disabled={mainLoadingState.loadingState.isRefreshing}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {mainLoadingState.loadingState.isRefreshing ? (
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
            <Tabs value={paymentTab} onValueChange={setPaymentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completed" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed ({completedPayments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending/Cancelled ({pendingCancelledPayments.length})</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="completed" className="space-y-4">
                {completedPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Line Worker Name</TableHead>
                          <TableHead>Wholesaler Name</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                            <TableCell>{lineWorkerNames[payment.lineWorkerId] || 'Loading...'}</TableCell>
                            <TableCell>{wholesalerNames[payment.tenantId] || 'Loading...'}</TableCell>
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
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No completed payments</h3>
                    <p className="text-gray-500">You don't have any completed payments yet.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="pending" className="space-y-4">
                {pendingCancelledPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Line Worker Name</TableHead>
                          <TableHead>Wholesaler Name</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingCancelledPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                            <TableCell>{lineWorkerNames[payment.lineWorkerId] || 'Loading...'}</TableCell>
                            <TableCell>{wholesalerNames[payment.tenantId] || 'Loading...'}</TableCell>
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
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending or cancelled payments</h3>
                    <p className="text-gray-500">You don't have any pending or cancelled payments.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

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
        collectedBy: undefined, // Invoice activities don't have collectedBy info
        icon: FileText,
        color: 'text-blue-600'
      })),
      ...payments.map(payment => {
        const lineWorkerName = lineWorkerNames[payment.lineWorkerId] || 'Loading...';
        const wholesalerName = wholesalerNames[payment.tenantId] || 'Loading...';
        const collectedBy = `Payment collected by  ${wholesalerName}'s LineMan - ${lineWorkerName}`;
        
        return {
          id: `payment_${payment.id}`,
          type: 'payment',
          title: payment.state === 'COMPLETED' ? 'Payment Completed' : 'Payment Initiated',
          description: `${payment.method} payment of ${formatCurrency(payment.totalPaid)}`,
          timestamp: payment.createdAt.toDate(),
          amount: payment.totalPaid,
          status: payment.state,
          collectedBy: collectedBy,
          icon: payment.state === 'COMPLETED' ? CheckCircle : Clock,
          color: payment.state === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'
        };
      })
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
            disabled={mainLoadingState.loadingState.isRefreshing}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {mainLoadingState.loadingState.isRefreshing ? (
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
                    {/* Show collected by information for payment activities */}
                    {activity.type === 'payment' && activity.collectedBy && (
                      <div className="text-sm text-blue-600 mt-1">
                        {activity.collectedBy}
                      </div>
                    )}
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
    <>
      <StatusBarColor theme="white" />
      
      {/* Loading Overlay */}
      <LoadingOverlay 
        isLoading={mainLoadingState.loadingState.isLoading}
        message="Loading dashboard data..."
        progress={dataFetchProgress}
        variant="fullscreen"
      />
      
      <div className="min-h-screen bg-gray-50 flex flex-col dashboard-screen">
        {/* Navigation */}
        <DashboardNavigation
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          navItems={navItems}
          title="PharmaLync"
          subtitle="Retailer Dashboard"
                notificationCount={notificationCount}
                user={retailerUser ? { displayName: retailerUser.name, email: retailerUser.email } : undefined}
                onLogout={handleLogout}
              />

              {/* Main Content */}
              <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
                {error && (
                  <Alert variant="destructive" className="mb-4 sm:mb-6">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Content based on active navigation */}
                <div className="space-y-4 sm:space-y-6">
                  {activeNav === 'overview' && <Overview />}
                  {activeNav === 'invoices' && <InvoicesComponent />}
                  {activeNav === 'payments' && <PaymentsComponent />}
                  {activeNav === 'history' && <HistoryComponent />}

                <div >
                  <div className="px-4 pb-20 pt-2 text-left">

                            {/* Tagline */}
                            <h2
                              className="fw-bold lh-sm"
                              style={{
                                fontSize: "2.2rem",
                                lineHeight: "1.2",
                                color: "rgba(75, 75, 75, 1)",
                                fontWeight: 700,
                              }}
                            >
                              Payment <br />
                              Collection Made<br />
                              More Secure{" "}
                              <Heart
                                className="inline-block"
                                size={30}
                                fill="red"
                                color="red"
                              />
                            </h2>
                
                            {/* Divider line */}
                            <hr
                              style={{
                                borderTop: "1px solid rgba(75, 75, 75, 1)",
                                margin: "18px 0",
                              }}
                            />
                
                            {/* App name */}
                            <p
                              style={{
                                fontSize: "1rem",
                                color: "rgba(75, 75, 75, 1)",
                                fontWeight: 500,
                              }}
                            >
                              PharmaLync
                            </p>
                  </div>
                        </div>

                </div>
              </main>

              {/* OTP Popup */}
              {showOTPPopup && newPayment && (
                <Dialog open={showOTPPopup} onOpenChange={setShowOTPPopup}>
                  <DialogContent className="max-w-md mx-4">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
                        <Volume2 className="h-5 w-5" />
                        <span>New Payment Request</span>
                      </DialogTitle>
                      <DialogDescription className="text-sm">
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
          </>
  );
}