'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useAuth, useLineWorker } from '@/contexts/AuthContext';
import { 
  retailerService, 
  paymentService,
  areaService,
  Timestamp
} from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { Retailer, Payment, Area } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { exportToCSV, exportToJSON, preparePaymentDataForExport, formatDateForExport, formatCurrencyForExport } from '@/lib/export-utils';
import { CollectPaymentForm } from './CollectPaymentForm';
import { 
  Store, 
  DollarSign, 
  Phone, 
  MapPin, 
  Plus, 
  LogOut,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  History,
  LayoutDashboard,
  TrendingUp,
  Bell,
  RefreshCw,
  Eye,
  Share,
  Download
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';

export function LineWorkerDashboard() {
  const { user, logout } = useAuth();
  const isLineWorker = useLineWorker();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [retailerPaymentHistory, setRetailerPaymentHistory] = useState<Payment[]>([]);
  const [showRetailerDetails, setShowRetailerDetails] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

  const handleDateRangeChange = (value: string, newDateRange: { startDate: Date; endDate: Date }) => {
    setSelectedDateRangeOption(value);
    setDateRange(newDateRange);
  };

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'History', icon: History },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  // Helper function to get the current tenant ID
  const getCurrentTenantId = (): string | null => {
    return user?.tenantId && user.tenantId !== 'system' ? user.tenantId : null;
  };

  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isLineWorker && user?.uid && currentTenantId) {
      // Check if user has the required assigned data
      if (!user.assignedAreas || user.assignedAreas.length === 0) {
        setError('No areas assigned to your account. Please contact your administrator.');
        mainLoadingState.setLoading(false);
        return;
      }
      
      // Reset loading state and start fetching data
      mainLoadingState.setLoading(true);
      setDataFetchProgress(0);
      fetchLineWorkerData();
      
      // Start real-time notifications
      realtimeNotificationService.startListening(
        user.uid,
        'LINE_WORKER',
        currentTenantId,
        (newNotifications) => {
          setNotifications(newNotifications);
          setNotificationCount(newNotifications.filter(n => !n.read).length);
        }
      );
    }

    // Cleanup on unmount
    return () => {
      if (user?.uid) {
        realtimeNotificationService.stopListening(user.uid);
      }
    };
  }, [isLineWorker, user]);

  // Notification service integration
  useEffect(() => {
    // Set up notification listener
    const handleNotificationsUpdate = (newNotifications: NotificationItem[]) => {
      setNotifications(newNotifications);
      setNotificationCount(newNotifications.filter(n => !n.read).length);
    };

    notificationService.addListener(handleNotificationsUpdate);
    
    // Initialize with current notifications
    const currentNotifications = notificationService.getNotifications();
    setNotifications(currentNotifications);
    setNotificationCount(notificationService.getUnreadCount());

    return () => {
      notificationService.removeListener(handleNotificationsUpdate);
    };
  }, []);

  // Check for milestones and generate notifications
  useEffect(() => {
    if (payments.length > 0 && retailers.length > 0) {
      checkForMilestones();
    }
  }, [payments, retailers]);

  const checkForMilestones = () => {
    const completedPayments = payments.filter(p => p.state === 'COMPLETED');
    const totalCollected = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
    
    // Check for payment milestones
    if (completedPayments.length === 10) {
      notificationService.addLineWorkerMilestone(
        'PAYMENTS',
        10,
        '🎉 Congratulations! You\'ve completed 10 payments!'
      );
    }
    
    if (completedPayments.length === 50) {
      notificationService.addLineWorkerMilestone(
        'PAYMENTS',
        50,
        '🎉 Amazing! You\'ve completed 50 payments!'
      );
    }
    
    // Check for amount milestones
    if (totalCollected >= 10000 && totalCollected < 11000) {
      notificationService.addLineWorkerMilestone(
        'AMOUNT',
        10000,
        '🎉 Fantastic! You\'ve collected ₹10,000+ in total!'
      );
    }
    
    if (totalCollected >= 50000 && totalCollected < 51000) {
      notificationService.addLineWorkerMilestone(
        'AMOUNT',
        50000,
        '🎉 Outstanding! You\'ve collected ₹50,000+ in total!'
      );
    }
    
    // Check for high-value collections (single payment > 5000)
    const recentHighValuePayments = completedPayments.filter(p => 
      p.totalPaid > 5000 && 
      new Date().getTime() - p.createdAt.toDate().getTime() < 24 * 60 * 60 * 1000
    );
    
    recentHighValuePayments.forEach(payment => {
      if (payment.retailerName) {
        notificationService.addLineWorkerHighValueCollection(
          payment.retailerName,
          payment.totalPaid,
          payment.id
        );
      } else {
        // Fallback to dynamic lookup for older payments without retailerName
        const retailer = retailers.find(r => r.id === payment.retailerId);
        if (retailer) {
          notificationService.addLineWorkerHighValueCollection(
            retailer.name,
            payment.totalPaid,
            payment.id
          );
        }
      }
    });
  };

  const fetchLineWorkerData = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;
    
    setError(null);
    setDataFetchProgress(20);
    
    try {
      console.log('Fetching line worker data for user:', user?.uid);
      console.log('User assigned areas:', user?.assignedAreas);
      console.log('User assigned zips:', user?.assignedZips);
      
      // Clean up any stuck payments first
      setDataFetchProgress(40);
      try {
        await paymentService.cleanupStuckPayments(currentTenantId);
        console.log('✅ Cleaned up stuck payments');
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up stuck payments:', cleanupError);
      }
      
      // Get all retailers first
      setDataFetchProgress(60);
      const allRetailers = await retailerService.getAll(currentTenantId);
      const allAreas = await areaService.getAll(currentTenantId);
      const paymentsData = await paymentService.getPaymentsByLineWorker(currentTenantId, user!.uid);

      console.log('Total retailers found:', allRetailers.length);
      console.log('Payments found:', paymentsData.length);
      
      // Log each retailer's assignment details for debugging
      allRetailers.forEach(retailer => {
        console.log(`Retailer "${retailer.name}" - assignedLineWorkerId: ${retailer.assignedLineWorkerId}, areaId: ${retailer.areaId}`);
      });

      // Filter retailers by assigned areas OR direct assignments
      setDataFetchProgress(80);
      const assignedRetailers = allRetailers.filter(retailer => {
        // First check if retailer is directly assigned to this line worker
        if (retailer.assignedLineWorkerId === user?.uid) {
          console.log(`✅ Retailer "${retailer.name}" matched by direct assignment to line worker ${user!.uid}`);
          return true;
        }
        
        // If retailer is directly assigned to someone else, exclude it from area-based assignments
        if (retailer.assignedLineWorkerId && retailer.assignedLineWorkerId !== user?.uid) {
          console.log(`❌ Retailer "${retailer.name}" excluded - directly assigned to another line worker: ${retailer.assignedLineWorkerId}`);
          return false;
        }
        
        // If no areas assigned, can't see any area-based retailers
        if (!user?.assignedAreas || user.assignedAreas.length === 0) {
          console.log(`❌ Retailer "${retailer.name}" excluded - no assigned areas for user and no direct assignment`);
          return false;
        }
        
        // Check if retailer is in assigned areas (by areaId)
        if (retailer.areaId && user!.assignedAreas.includes(retailer.areaId)) {
          console.log(`✅ Retailer "${retailer.name}" matched by areaId: ${retailer.areaId}`);
          return true;
        }
        
        // Check if retailer has zipcodes that match assigned zips
        if (retailer.zipcodes && retailer.zipcodes.length > 0 && user!.assignedZips && user!.assignedZips.length > 0) {
          const matchingZips = retailer.zipcodes.filter(zip => user!.assignedZips!.includes(zip));
          if (matchingZips.length > 0) {
            console.log(`✅ Retailer "${retailer.name}" matched by zips: ${matchingZips.join(', ')}`);
            return true;
          }
        }
        
        console.log(`❌ Retailer "${retailer.name}" not matched - areaId: ${retailer.areaId}, zips: ${retailer.zipcodes?.join(', ') || 'none'}, directAssignment: ${retailer.assignedLineWorkerId}`);
        return false;
      });

      console.log('Assigned retailers after filtering:', assignedRetailers.length);
      
      setRetailers(assignedRetailers);
      setPayments(paymentsData);
      setAreas(allAreas);
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);
      
      console.log('✅ Line worker data loaded successfully');
    } catch (err: any) {
      console.error('Error fetching line worker data:', err);
      setError(err.message || 'Failed to fetch line worker data');
      mainLoadingState.setLoading(false);
    }
  };

  const refreshData = async () => {
    mainLoadingState.setRefreshing(true);
    try {
      await fetchLineWorkerData();
    } finally {
      mainLoadingState.setRefreshing(false);
    }
  };

  const handleCollectPayment = async (paymentData: any): Promise<void> => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId || !user?.uid) return;

    try {
      const payment = {
        retailerId: paymentData.retailerId,
        retailerName: retailers.find(r => r.id === paymentData.retailerId)?.name || 'Unknown',
        lineWorkerId: user.uid,
        totalPaid: paymentData.amount,
        method: paymentData.paymentMethod,
        invoiceAllocations: [], // No invoice allocations in new system
        timeline: {
          initiatedAt: Timestamp.now(),
          otpSentAt: Timestamp.now(),
        }
      };

      const createdPaymentId = await paymentService.initiatePayment(currentTenantId, {
        retailerId: payment.retailerId,
        retailerName: payment.retailerName,
        lineWorkerId: payment.lineWorkerId,
        totalPaid: payment.totalPaid,
        method: payment.method,
        invoiceAllocations: payment.invoiceAllocations
      });
      console.log('✅ Payment created successfully:', createdPaymentId);
      
      // Refresh data to show new payment
      await fetchLineWorkerData();
      
      return;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  };

  const handleViewRetailerDetails = async (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    
    // Fetch payment history for this retailer
    const currentTenantId = getCurrentTenantId();
    if (currentTenantId) {
      try {
        const retailerPayments = await paymentService.getPaymentsByRetailer(currentTenantId, retailer.id);
        setRetailerPaymentHistory(retailerPayments);
      } catch (error) {
        console.error('Error fetching retailer payment history:', error);
        setRetailerPaymentHistory([]);
      }
    }
    
    setShowRetailerDetails(true);
  };

  // Generate receipt content
  const generateReceiptContent = (payment: Payment) => {
    const retailer = retailers.find(r => r.id === payment.retailerId);
    const lineWorkerName = user?.displayName || user?.email || 'Unknown Line Worker';
    
    return `
==============================
        PAYMENT RECEIPT
==============================

Receipt ID: ${payment.id}
Date: ${formatTimestampWithTime(payment.createdAt)}
Status: ${payment.state}

Payment Details:
- Amount: ${formatCurrency(payment.totalPaid)}
- Payment Method: ${payment.method}
- Transaction ID: ${payment.id}

Retailer Information:
- Name: ${retailer?.name || 'Unknown'}
- Phone: ${retailer?.phone || 'N/A'}
- Address: ${retailer?.address || 'N/A'}

Collected By:
- Line Worker: ${lineWorkerName}
- ID: ${user?.uid}

Payment Timeline:
- Initiated: ${payment.timeline?.initiatedAt ? formatTimestampWithTime(payment.timeline.initiatedAt) : 'N/A'}
- OTP Sent: ${payment.timeline?.otpSentAt ? formatTimestampWithTime(payment.timeline.otpSentAt) : 'N/A'}
- OTP Verified: ${payment.timeline?.verifiedAt ? formatTimestampWithTime(payment.timeline.verifiedAt) : 'N/A'}
- Completed: ${payment.timeline?.completedAt ? formatTimestampWithTime(payment.timeline.completedAt) : 'N/A'}

Thank you for your payment!
==============================
    `.trim();
  };

  // Download receipt
  const downloadReceipt = (payment: Payment) => {
    const content = generateReceiptContent(payment);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share receipt
  const shareReceipt = async (payment: Payment) => {
    const content = generateReceiptContent(payment);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: content,
        });
      } catch (error) {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(content);
        alert('Receipt copied to clipboard!');
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(content);
      alert('Receipt copied to clipboard!');
    }
  };

  // Export payments data
  const exportPayments = (format: 'csv' | 'json') => {
    const exportData = {
      headers: [
        'Payment ID',
        'Date',
        'Retailer',
        'Amount',
        'Method',
        'Status',
        'Completed Date'
      ],
      rows: filteredPayments.map(payment => [
        payment.id,
        formatTimestampWithTime(payment.createdAt),
        payment.retailerName || 'Unknown',
        formatCurrency(payment.totalPaid),
        payment.method,
        payment.state,
        payment.timeline?.completedAt ? formatTimestampWithTime(payment.timeline.completedAt) : ''
      ]),
      filename: `payments-${selectedDateRangeOption}-${new Date().toISOString().split('T')[0]}`
    };

    if (format === 'csv') {
      exportToCSV(exportData);
    } else {
      const jsonData = filteredPayments.map(payment => ({
        id: payment.id,
        date: payment.createdAt.toDate(),
        retailerName: payment.retailerName,
        amount: payment.totalPaid,
        method: payment.method,
        state: payment.state,
        timeline: payment.timeline
      }));
      exportToJSON(jsonData, exportData.filename);
    }
  };

  // Export retailers data
  const exportRetailers = (format: 'csv' | 'json') => {
    const exportData = {
      headers: [
        'Retailer ID',
        'Name',
        'Phone',
        'Email',
        'Address',
        'Status'
      ],
      rows: retailers.map(retailer => [
        retailer.id,
        retailer.name,
        retailer.phone,
        retailer.email || '',
        retailer.address || '',
        'Active'  // All retailers are considered active
      ]),
      filename: `retailers-${new Date().toISOString().split('T')[0]}`
    };

    if (format === 'csv') {
      exportToCSV(exportData);
    } else {
      const jsonData = retailers.map(retailer => ({
        id: retailer.id,
        name: retailer.name,
        phone: retailer.phone,
        email: retailer.email,
        address: retailer.address,
        active: true,  // All retailers are considered active
        createdAt: retailer.createdAt.toDate()
      }));
      exportToJSON(jsonData, exportData.filename);
    }
  };

  // Calculate statistics
  const completedPayments = payments.filter(p => p.state === 'COMPLETED');
  const totalCollected = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
  const todayPayments = filterPaymentsByDateRange(completedPayments);
  const todayCollected = todayPayments.reduce((sum, p) => sum + p.totalPaid, 0);

  // Filter payments based on selected tab
  const filteredPayments = payments.filter(payment => {
    const paymentDate = payment.createdAt.toDate();
    const isInDateRange = paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    
    if (paymentTab === 'completed') {
      return payment.state === 'COMPLETED' && isInDateRange;
    } else if (paymentTab === 'pending') {
      return (payment.state === 'INITIATED' || payment.state === 'OTP_SENT') && isInDateRange;
    }
    return isInDateRange;
  });

  // Retailer cards component
  const RetailerCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {retailers.map((retailer) => (
        <Card key={retailer.id} className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{retailer.name}</CardTitle>
              <Button
                size="sm"
                onClick={() => handleCollectPayment({ retailerId: retailer.id, amount: 0, paymentMethod: 'CASH' })}
                className="h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                Collect
              </Button>
            </div>
            <CardDescription className="text-sm">
              {retailer.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{retailer.address}</div>}
              {retailer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{retailer.phone}</div>}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewRetailerDetails(retailer)}
                className="h-8 px-3"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Details
              </Button>
              <Badge variant="secondary">
                {retailer.zipcodes?.length || 0} areas
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Payment history table component
  const PaymentHistoryTable = () => (
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
          {filteredPayments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
              <TableCell>{payment.retailerName}</TableCell>
              <TableCell>{formatCurrency(payment.totalPaid)}</TableCell>
              <TableCell>{payment.method}</TableCell>
              <TableCell>
                <Badge className={
                  payment.state === 'COMPLETED' 
                    ? 'bg-green-100 text-green-800' 
                    : payment.state === 'INITIATED' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                }>
                  {payment.state}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Handle viewing payment details
                    }}
                  >
                    View
                  </Button>
                  {payment.state === 'COMPLETED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(payment)}
                        className="h-7 px-2 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareReceipt(payment)}
                        className="h-7 px-2 text-xs"
                      >
                        <Share className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <StatusBarColor theme="blue" />
      
      {/* Main Content */}
      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <DashboardNavigation
          navItems={navItems}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          title="Line Worker Dashboard"
          user={user ? { displayName: user.displayName, email: user.email } : undefined}
          onLogout={logout}
          notificationCount={notificationCount}
          notifications={notifications}
        />

        {/* Main Dashboard Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Line Worker Dashboard</h1>
                <p className="text-gray-600">Manage your assigned retailers and collect payments</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={mainLoadingState.loadingState.isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${mainLoadingState.loadingState.isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading Overlay */}
            <LoadingOverlay 
              isLoading={mainLoadingState.loadingState.isLoading} 
              progress={dataFetchProgress}
              message="Loading line worker data..."
            />

            {/* Dashboard Content */}
            {!mainLoadingState.loadingState.isLoading && (
              <>
                {/* Overview Stats */}
                {activeNav === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Total Retailers</CardTitle>
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Store className="h-4 w-4 text-blue-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
                          <p className="text-xs text-gray-500">Assigned to you</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Total Collected</CardTitle>
                          <div className="bg-green-100 p-2 rounded-full">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCollected)}</div>
                          <p className="text-xs text-gray-500">All time</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Today's Collection</CardTitle>
                          <div className="bg-purple-100 p-2 rounded-full">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(todayCollected)}</div>
                          <p className="text-xs text-gray-500">{todayPayments.length} payments</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                          <div className="bg-orange-100 p-2 rounded-full">
                            <CheckCircle className="h-4 w-4 text-orange-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">
                            {payments.length > 0 ? ((completedPayments.length / payments.length) * 100).toFixed(1) : 0}%
                          </div>
                          <p className="text-xs text-gray-500">Payment success rate</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks you can perform</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button
                            onClick={() => setShowPaymentDialog(true)}
                            className="h-20 flex-col"
                          >
                            <Plus className="h-6 w-6 mb-2" />
                            Collect Payment
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setActiveNav('retailers')}
                            className="h-20 flex-col"
                          >
                            <Store className="h-6 w-6 mb-2" />
                            View Retailers
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setActiveNav('history')}
                            className="h-20 flex-col"
                          >
                            <History className="h-6 w-6 mb-2" />
                            Payment History
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Your latest payment collections</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {completedPayments
                            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
                            .slice(0, 5)
                            .map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium">{payment.retailerName}</div>
                                  <div className="text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-green-600">{formatCurrency(payment.totalPaid)}</div>
                                  <div className="text-sm text-gray-500">{payment.method}</div>
                                </div>
                              </div>
                            ))}
                          {completedPayments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              No payment activity yet
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Retailers View */}
                {activeNav === 'retailers' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Your Assigned Retailers</h2>
                      <div className="flex space-x-2">
                        <Button onClick={() => setShowPaymentDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Collect Payment
                        </Button>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportRetailers('csv')}
                            disabled={retailers.length === 0}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportRetailers('json')}
                            disabled={retailers.length === 0}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export JSON
                          </Button>
                        </div>
                      </div>
                    </div>
                    <RetailerCards />
                  </div>
                )}

                {/* Payments View */}
                {activeNav === 'payments' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Payment Collections</h2>
                      <div className="flex space-x-2">
                        <Button onClick={() => setShowPaymentDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          New Collection
                        </Button>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportPayments('csv')}
                            disabled={filteredPayments.length === 0}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportPayments('json')}
                            disabled={filteredPayments.length === 0}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export JSON
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                      <TabsList>
                        <TabsTrigger value="completed">Completed ({completedPayments.length})</TabsTrigger>
                        <TabsTrigger value="pending">Pending ({payments.filter(p => p.state === 'INITIATED' || p.state === 'OTP_SENT').length})</TabsTrigger>
                        <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value={paymentTab} className="space-y-4">
                        <DateRangeFilter
                          value={selectedDateRangeOption}
                          onValueChange={handleDateRangeChange}
                        />
                        <PaymentHistoryTable />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* History View */}
                {activeNav === 'history' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Complete Payment History</h2>
                    <DateRangeFilter
                      value={selectedDateRangeOption}
                      onValueChange={handleDateRangeChange}
                    />
                    <PaymentHistoryTable />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Collection Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Enter payment details to initiate collection from retailer
            </DialogDescription>
          </DialogHeader>
          <CollectPaymentForm
            retailers={retailers}
            onCollectPayment={handleCollectPayment}
            onCancel={() => setShowPaymentDialog(false)}
            collectingPayment={false}
          />
        </DialogContent>
      </Dialog>

      {/* Retailer Details Dialog */}
      <Dialog open={showRetailerDetails} onOpenChange={setShowRetailerDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Retailer Details - {selectedRetailer?.name}</DialogTitle>
            <DialogDescription>
              Complete information and payment history for this retailer
            </DialogDescription>
          </DialogHeader>
          {selectedRetailer && (
            <div className="space-y-6">
              {/* Retailer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Name</Label>
                      <p className="text-gray-900">{selectedRetailer.name}</p>
                    </div>
                    {selectedRetailer.phone && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Phone</Label>
                        <p className="text-gray-900">{selectedRetailer.phone}</p>
                      </div>
                    )}
                    {selectedRetailer.email && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Email</Label>
                        <p className="text-gray-900">{selectedRetailer.email}</p>
                      </div>
                    )}
                    {selectedRetailer.address && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Address</Label>
                        <p className="text-gray-900">{selectedRetailer.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Area Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Assigned Areas</Label>
                      <p className="text-gray-900">
                        {selectedRetailer.zipcodes && selectedRetailer.zipcodes.length > 0 
                          ? selectedRetailer.zipcodes.join(', ') 
                          : 'No specific areas assigned'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Area ID</Label>
                      <p className="text-gray-900">{selectedRetailer.areaId || 'Not assigned'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <CardDescription>
                    All payments made by this retailer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Line Worker</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retailerPaymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                            <TableCell>{formatCurrency(payment.totalPaid)}</TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>
                              <Badge className={
                                payment.state === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }>
                                {payment.state}
                              </Badge>
                            </TableCell>
                            <TableCell>{payment.lineWorkerId}</TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                {payment.state === 'COMPLETED' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadReceipt(payment)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Receipt
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => shareReceipt(payment)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Share className="h-3 w-3 mr-1" />
                                      Share
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {retailerPaymentHistory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No payment history found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRetailerDetails(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowRetailerDetails(false);
                    setShowPaymentDialog(true);
                  }}
                >
                  Collect Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}