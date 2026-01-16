'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { PWANotificationManager } from '@/components/PWANotificationManager';
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
import { enhancedNotificationService } from '@/services/enhanced-notification-service';
import { Retailer, Payment, Area } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { exportToCSV, exportToJSON, preparePaymentDataForExport, formatDateForExport, formatCurrencyForExport } from '@/lib/export-utils';
import { CollectPaymentForm } from './CollectPaymentForm';
import { cleanPhoneNumber } from '@/lib/utils';
// NOTE: OTP functionality removed - payments are now created directly in COMPLETED state
import { LogoutConfirmation } from '@/components/LogoutConfirmation';
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
  Share,
  Download,
  Search,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBlockingScreen } from '@/components/ui/OfflineBlockingScreen';

export function LineWorkerDashboard() {
  const isOnline = useOnlineStatus();
  const { user, logout } = useAuth();
  // ...
  // ...
  if (!isOnline) {
    return <OfflineBlockingScreen />;
  }

  const isLineWorker = useLineWorker();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'area' | 'phone'>('name');
  const [expandedRetailerId, setExpandedRetailerId] = useState<string | null>(null);
  const [showAllPaymentsRetailerId, setShowAllPaymentsRetailerId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [preSelectedRetailerForPayment, setPreSelectedRetailerForPayment] = useState<Retailer | null>(null);

  // Logout confirmation state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [retailerPaymentHistory, setRetailerPaymentHistory] = useState<Payment[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<any>(null);
  const [lastPaymentAmount, setLastPaymentAmount] = useState<number>(0); // ✅ Store amount separately for success dialog
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null); // ✅ Store payment ID for receipt
  const [showReceiptInSuccess, setShowReceiptInSuccess] = useState(false); // ✅ Toggle receipt view in success dialog
  const [wholesalerUpiInfo, setWholesalerUpiInfo] = useState<{ primaryUpiId?: string; primaryQrCodeUrl?: string }>({});
  const [paymentTab, setPaymentTab] = useState('completed');
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState('today');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { startDate: startOfDay, endDate: endOfDay };
  });
  const [paymentUnsubscribe, setPaymentUnsubscribe] = useState<(() => void) | null>(null);

  // NOTE: OTP functionality removed - payments are now created directly in COMPLETED state
  // These state variables are kept for backward compatibility but are no longer used
  const [showOTPEnterDialog, setShowOTPEnterDialog] = useState(false);
  const [selectedPaymentForOTP, setSelectedPaymentForOTP] = useState<Payment | null>(null);
  const [selectedRetailerForOTP, setSelectedRetailerForOTP] = useState<Retailer | null>(null);

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

  // Helper function to get retailer name (handles both legacy and new profile formats)
  const getRetailerName = (retailer: any) => {
    return retailer.profile?.realName || retailer.name || 'Unknown Retailer';
  };

  // Helper function to get retailer phone (handles both legacy and new profile formats)
  const getRetailerPhone = (retailer: any) => {
    return cleanPhoneNumber(retailer.profile?.phone || retailer.phone) || 'N/A';
  };

  // Helper function to get retailer address (handles both legacy and new profile formats)
  const getRetailerAddress = (retailer: any) => {
    return retailer.profile?.address || retailer.address || 'N/A';
  };

  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRetailers(retailers);
      return;
    }

    const filtered = retailers.filter(retailer => {
      const searchLower = searchTerm.toLowerCase();

      switch (searchType) {
        case 'name':
          return getRetailerName(retailer).toLowerCase().includes(searchLower);
        case 'area':
          // Search by area name
          const area = areas.find(a => a.id === retailer.areaId);
          return area?.name.toLowerCase().includes(searchLower) || false;
        case 'phone':
          return retailer.phone?.toLowerCase().includes(searchLower) || false;
        default:
          return false;
      }
    });

    setFilteredRetailers(filtered);
  }, [searchTerm, searchType, retailers, areas]);

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

  // Enhanced notification callback with proper count updates
  const handleNotificationUpdate = useCallback((newNotifications: any[]) => {
    console.log('🔔 LineWorker: Updating notifications', {
      total: newNotifications.length,
      unread: newNotifications.filter(n => !n.read).length
    });

    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    enhancedNotificationService.markAsRead(notificationId);
    // Update local state to reflect the change immediately
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setNotificationCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    enhancedNotificationService.markAllAsRead();
    // Update local state immediately
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotificationCount(0);
  }, []);

  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isLineWorker && user?.uid && currentTenantId) {
      // NOTE: Don't block data fetching even if no areas assigned
      // Line workers may still have directly assigned retailers (via assignedLineWorkerId)
      // The visibility logic in fetchLineWorkerData() will handle the filtering correctly

      // Reset loading state and start fetching data
      mainLoadingState.setLoading(true);
      setDataFetchProgress(0);
      fetchLineWorkerData();

      // Initialize enhanced notification service
      enhancedNotificationService.initialize('LINE_WORKER', currentTenantId);

      // Start enhanced real-time notifications
      enhancedNotificationService.startRealtimeListening(
        user.uid,
        handleNotificationUpdate
      );
    }

    // Cleanup on unmount
    return () => {
      if (user?.uid) {
        enhancedNotificationService.stopRealtimeListening(user.uid);
      }

      // Clean up payment listener
      if (paymentUnsubscribe) {
        paymentUnsubscribe();
        setPaymentUnsubscribe(null);
      }
    };
  }, [isLineWorker, user, handleNotificationUpdate]);

  // Enhanced notification initialization is handled in the main useEffect above

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

    recentHighValuePayments.forEach(async (payment) => {
      const retailerName = payment.retailerName || getRetailerName(retailers.find(r => r.id === payment.retailerId));

      // Use enhanced service for high-value payments (includes FCM)
      await enhancedNotificationService.sendPaymentCompletedNotification(
        user?.displayName || 'Line Worker',
        retailerName,
        payment.totalPaid,
        payment.id,
        'line_worker'
      );

      // Also add the regular notification
      notificationService.addLineWorkerHighValueCollection(
        retailerName,
        payment.totalPaid,
        payment.id
      );
    });
  };

  const fetchLineWorkerData = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId || !user?.uid) return;

    setError(null);
    setDataFetchProgress(20);

    try {
      // CRITICAL FIX: Fetch fresh user data from Firestore instead of using stale AuthContext data
      // This ensures line workers see updated assignedAreas when changed by wholesaler
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const freshUserData = userDoc.exists() ? userDoc.data() : null;
      const freshAssignedAreas = freshUserData?.assignedAreas || [];
      const freshAssignedZips = freshUserData?.assignedZips || [];

      console.log('Fetching line worker data for user:', user?.uid);
      console.log('Fresh assigned areas from Firestore:', freshAssignedAreas);
      console.log('Fresh assigned zips from Firestore:', freshAssignedZips);

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

      // Fetch tenant UPI info for payment collection
      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', currentTenantId));
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data();
          const upiIds = tenantData.upiIds || [];
          const qrCodes = tenantData.qrCodes || [];
          const primaryUpi = upiIds.find((u: any) => u.isPrimary);
          const primaryQr = qrCodes.find((q: any) => q.isPrimary);
          setWholesalerUpiInfo({
            primaryUpiId: primaryUpi?.upiId,
            primaryQrCodeUrl: primaryQr?.url
          });
          console.log('✅ Fetched wholesaler UPI info:', { upiId: primaryUpi?.upiId, hasQr: !!primaryQr?.url });
        }
      } catch (upiError) {
        console.warn('Warning: Could not fetch wholesaler UPI info:', upiError);
      }

      console.log('Total retailers found:', allRetailers.length);
      console.log('Payments found:', paymentsData.length);

      // Log each retailer's assignment details for debugging
      allRetailers.forEach(retailer => {
        console.log(`Retailer "${getRetailerName(retailer)}" - assignedLineWorkerId: ${retailer.assignedLineWorkerId}, areaId: ${retailer.areaId}`);
      });

      // Filter retailers by assigned areas OR direct assignments
      setDataFetchProgress(80);
      const assignedRetailers = allRetailers.filter(retailer => {
        // First check if retailer is directly assigned to this line worker
        if (retailer.assignedLineWorkerId === user?.uid) {
          console.log(`✅ Retailer "${getRetailerName(retailer)}" matched by direct assignment to line worker ${user!.uid}`);
          return true;
        }

        // If retailer is directly assigned to someone else, exclude it from area-based assignments
        if (retailer.assignedLineWorkerId && retailer.assignedLineWorkerId !== user?.uid) {
          console.log(`❌ Retailer "${getRetailerName(retailer)}" excluded - directly assigned to another line worker: ${retailer.assignedLineWorkerId}`);
          return false;
        }

        // If no areas assigned, can't see any area-based retailers
        if (freshAssignedAreas.length === 0) {
          console.log(`❌ Retailer "${getRetailerName(retailer)}" excluded - no assigned areas for user and no direct assignment`);
          return false;
        }

        // Check if retailer is in assigned areas (by areaId)
        // CRITICAL: Allow area-based visibility if:
        //   - retailer was never assigned (undefined) - can be assigned to anyone with area
        //   - retailer is NOT explicitly unassigned (null) - means removed from line worker intentionally
        const isExplicitlyUnassigned = retailer.assignedLineWorkerId === null;
        if (retailer.areaId && freshAssignedAreas.includes(retailer.areaId) && !isExplicitlyUnassigned) {
          console.log(`✅ Retailer "${getRetailerName(retailer)}" matched by areaId: ${retailer.areaId}`);
          return true;
        }

        // Check if retailer has zipcodes that match assigned zips
        // CRITICAL: Only allow zip-based visibility if retailer was NOT explicitly unassigned
        if (retailer.zipcodes && retailer.zipcodes.length > 0 && freshAssignedZips.length > 0 && !isExplicitlyUnassigned) {
          const matchingZips = retailer.zipcodes.filter(zip => freshAssignedZips.includes(zip));
          if (matchingZips.length > 0) {
            console.log(`✅ Retailer "${getRetailerName(retailer)}" matched by zips: ${matchingZips.join(', ')}`);
            return true;
          }
        }

        console.log(`❌ Retailer "${getRetailerName(retailer)}" not matched - areaId: ${retailer.areaId}, zips: ${retailer.zipcodes?.join(', ') || 'none'}, directAssignment: ${retailer.assignedLineWorkerId}`);
        return false;
      });

      console.log('Assigned retailers after filtering:', assignedRetailers.length);

      setRetailers(assignedRetailers);
      setFilteredRetailers(assignedRetailers);
      setPayments(paymentsData);
      setAreas(allAreas);
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);

      // Set up real-time payment listener for line worker's payments
      if (user?.uid && currentTenantId) {
        console.log('🔧 Setting up real-time payment listener for line worker:', user.uid);

        const paymentsRef = collection(db, 'payments');
        const paymentQuery = query(paymentsRef, where('lineWorkerId', '==', user.uid));

        const unsubscribeFunc = onSnapshot(paymentQuery, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const paymentData = change.doc.data();
            const paymentId = change.doc.id;

            console.log('🔄 Payment change detected:', {
              paymentId,
              type: change.type,
              state: paymentData.state,
              retailerId: paymentData.retailerId,
              timeline: paymentData.timeline,
              otpSentAt: paymentData.timeline?.otpSentAt?.toDate?.() ? paymentData.timeline.otpSentAt.toDate().toISOString() : 'NOT SET',
              createdAt: paymentData.createdAt?.toDate?.() ? paymentData.createdAt.toDate().toISOString() : 'NOT SET'
            });

            if (change.type === 'modified' || change.type === 'added') {
              // Update the payment in the payments array
              setPayments(prevPayments => {
                const existingIndex = prevPayments.findIndex(p => p.id === paymentId);
                const updatedPayment = {
                  id: paymentId,
                  ...paymentData
                } as Payment;

                if (existingIndex >= 0) {
                  // Update existing payment
                  const newPayments = [...prevPayments];
                  newPayments[existingIndex] = updatedPayment;
                  console.log('📝 Updated payment in state:', paymentId, 'New state:', paymentData.state);

                  // Special logging for OTP_SENT state changes
                  if (paymentData.state === 'OTP_SENT') {
                    console.log('🔐 OTP_SENT state detected!', {
                      paymentId,
                      otpSentAt: paymentData.timeline?.otpSentAt?.toDate?.() ? paymentData.timeline.otpSentAt.toDate().toISOString() : 'NOT SET',
                      fullTimeline: paymentData.timeline
                    });
                  }
                  return newPayments;
                } else {
                  // Add new payment
                  console.log('➕ Added new payment to state:', paymentId, 'State:', paymentData.state);
                  return [...prevPayments, updatedPayment];
                }
              });
            } else if (change.type === 'removed') {
              // Remove payment from array
              setPayments(prevPayments => prevPayments.filter(p => p.id !== paymentId));
              console.log('🗑️ Removed payment from state:', paymentId);
            }
          });
        }, (error) => {
          console.error('Error listening to payment changes:', error);
        });

        setPaymentUnsubscribe(() => unsubscribeFunc);
        console.log('✅ Real-time payment listener setup complete');
      }

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
    // Validate data
    if (!paymentData.retailerId || !paymentData.amount || !paymentData.paymentMethod) {
      throw new Error('Invalid payment data');
    }

    // Validate UTR for UPI payments
    if (paymentData.paymentMethod === 'UPI') {
      if (!paymentData.utr || paymentData.utr.length !== 4) {
        throw new Error('UTR must be exactly 4 digits for UPI payments');
      }
    }

    // Show confirmation dialog
    setPendingPaymentData(paymentData);
    setShowConfirmationDialog(true);
  };


  const handleCancelPayment = () => {
    setShowConfirmationDialog(false);
    setPendingPaymentData(null);
  };
  const handleConfirmPayment = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId || !user?.uid || !pendingPaymentData) return;

    setIsCollectingPayment(true);

    try {
      console.log('🚀 Starting completed payment creation process...');
      console.log('💳 Payment data:', {
        retailerId: pendingPaymentData.retailerId,
        retailerName: pendingPaymentData.retailerName,
        amount: pendingPaymentData.amount,
        method: pendingPaymentData.paymentMethod,
        utr: pendingPaymentData.utr,
        notes: pendingPaymentData.notes
      });

      // Call to new API to create completed payment
      const response = await fetch('/api/payments/create-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          retailerId: pendingPaymentData.retailerId,
          retailerName: getRetailerName(retailers.find(r => r.id === pendingPaymentData.retailerId)),
          lineWorkerId: user.uid,
          lineWorkerName: user?.displayName || 'Line Worker',
          totalPaid: pendingPaymentData.amount,
          method: pendingPaymentData.paymentMethod,
          utr: pendingPaymentData.utr,
          notes: pendingPaymentData.notes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const result = await response.json();
      console.log('✅ Payment created successfully:', result);

      // ✅ Store amount and payment ID before clearing pending data (for success dialog)
      setLastPaymentAmount(pendingPaymentData.amount);
      setLastPaymentId(result.paymentId); // Store payment ID for receipt

      // OPTIMISTIC UPDATE: Add new payment to state immediately
      const completionTime = new Date();
      const newPayment: Payment = {
        id: result.paymentId,
        retailerId: pendingPaymentData.retailerId,
        retailerName: getRetailerName(retailers.find(r => r.id === pendingPaymentData.retailerId) || { name: pendingPaymentData.retailerName } as any),
        lineWorkerId: user.uid,
        lineWorkerName: user?.displayName || 'Line Worker',
        totalPaid: pendingPaymentData.amount,
        method: pendingPaymentData.paymentMethod,
        state: 'COMPLETED',
        tenantId: getCurrentTenantId() || '',
        evidence: [],
        timeline: {
          initiatedAt: Timestamp.fromDate(completionTime),
          completedAt: Timestamp.fromDate(completionTime)
        },
        createdAt: Timestamp.fromDate(completionTime),
        updatedAt: Timestamp.fromDate(completionTime),
        notes: pendingPaymentData.notes,
        utr: pendingPaymentData.utr
      };

      setPayments(prev => [newPayment, ...prev]);
      console.log('⚡ Optimistic update complete');

      setPendingPaymentData(null);
      setShowConfirmationDialog(false);

      setTimeout(() => {
        setShowPaymentSuccess(true);
      }, 300);
    } catch (error) {
      console.error('❌ Error creating completed payment:', error);
      setShowConfirmationDialog(false);
      throw error;
    } finally {
      setIsCollectingPayment(false);
    }
  };


  // Function to open payment dialog with pre-selected retailer
  const handleOpenPaymentDialog = (retailer?: Retailer) => {
    if (retailer) {
      setPreSelectedRetailerForPayment(retailer);
    } else {
      setPreSelectedRetailerForPayment(null);
    }
    setShowPaymentDialog(true);
  };

  // Function to handle OTP verification success
  const handleOTPSuccess = async () => {
    console.log('🎉 OTP verification successful, closing dialog');

    // Close the OTP dialog
    setShowOTPEnterDialog(false);
    setSelectedPaymentForOTP(null);
    setSelectedRetailerForOTP(null);

    // Refresh data to show completed payment
    await fetchLineWorkerData();
  };

  // Function to handle OTP resend
  const handleResendOTP = async () => {
    if (!selectedPaymentForOTP || !selectedRetailerForOTP) return;

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: selectedPaymentForOTP.retailerId,
          paymentId: selectedPaymentForOTP.id,
          amount: selectedPaymentForOTP.totalPaid,
          lineWorkerName: user?.displayName || 'Line Worker'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle active OTP case specifically
        if (errorData.activeOTP && errorData.timeRemaining) {
          const minutes = Math.floor(errorData.timeRemaining / 60);
          const seconds = errorData.timeRemaining % 60;
          const timeString = minutes > 0
            ? `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`
            : `${seconds} second${seconds !== 1 ? 's' : ''}`;

          throw new Error(`Active OTP already exists. Please wait ${timeString} for the current OTP to expire.`);
        }

        throw new Error(errorData.error || 'Failed to resend OTP');
      }

      const otpResult = await response.json();
      console.log('✅ OTP resent successfully:', otpResult);

      // Show success message
      alert('OTP has been resent successfully!');
    } catch (error: any) {
      console.error('❌ Error resending OTP:', error);
      throw error;
    }
  };

  // Function to open OTP entry dialog for pending payments
  const handleEnterOTP = (payment: Payment) => {
    // Check if OTP is expired before opening dialog
    if (isOTPExpired(payment)) {
      // Show error message instead of opening dialog
      setError('This OTP has expired. Please initiate a new payment.');
      return;
    }

    const retailer = retailers.find(r => r.id === payment.retailerId);
    if (retailer) {
      setSelectedPaymentForOTP(payment);
      setSelectedRetailerForOTP(retailer);
      setShowOTPEnterDialog(true);
    }
  };

  // Function to check if OTP is expired
  const isOTPExpired = (payment: Payment): boolean => {
    if (payment.state !== 'OTP_SENT' && payment.state !== 'INITIATED') {
      return true; // Not in OTP state, consider as expired
    }

    // Use otpSentAt from timeline if available, otherwise fall back to createdAt
    const otpSentTime = payment.timeline?.otpSentAt?.toDate?.() || payment.createdAt?.toDate?.() || new Date();
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - otpSentTime.getTime()) / 1000);
    const otpDuration = 420; // 7 minutes in seconds

    // Debug logging
    console.log('🔧 LineWorkerDashboard OTP expiration check:', {
      paymentId: payment.id,
      paymentState: payment.state,
      otpSentAt: payment.timeline?.otpSentAt?.toDate?.() ? payment.timeline.otpSentAt.toDate().toISOString() : 'NOT SET',
      createdAt: payment.createdAt?.toDate?.() ? payment.createdAt.toDate().toISOString() : 'NOT SET',
      otpSentTime: otpSentTime.toISOString(),
      now: now.toISOString(),
      elapsedSeconds,
      otpDuration,
      isExpired: elapsedSeconds > otpDuration
    });

    // Special case: If OTP was just sent (within last 30 seconds) and shows as expired, 
    // it's likely a timing issue with the real-time update. Give it more time.
    if (elapsedSeconds < 30 && payment.state === 'OTP_SENT') {
      console.log('⚠️ OTP shows as expired but was just sent, giving more time:', {
        paymentId: payment.id,
        elapsedSeconds,
        paymentState: payment.state
      });
      return false; // Don't consider as expired if it was just sent
    }

    return elapsedSeconds > otpDuration;
  };

  // Function to get OTP time remaining
  const getOTPTimeRemaining = (payment: Payment): number => {
    if (payment.state !== 'OTP_SENT' && payment.state !== 'INITIATED') {
      return 0;
    }

    // Use otpSentAt from timeline if available, otherwise fall back to createdAt
    const otpSentTime = payment.timeline?.otpSentAt?.toDate?.() || payment.createdAt?.toDate?.() || new Date();
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - otpSentTime.getTime()) / 1000);
    const otpDuration = 420; // 7 minutes in seconds

    return Math.max(0, otpDuration - elapsedSeconds);
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
- Name: ${getRetailerName(retailer)}
- Phone: ${getRetailerPhone(retailer)}
- Address: ${getRetailerAddress(retailer)}

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
        getRetailerName(retailer),
        getRetailerPhone(retailer),
        retailer.email || '',
        getRetailerAddress(retailer),
        'Active'  // All retailers are considered active
      ]),
      filename: `retailers-${new Date().toISOString().split('T')[0]}`
    };

    if (format === 'csv') {
      exportToCSV(exportData);
    } else {
      const jsonData = retailers.map(retailer => ({
        id: retailer.id,
        name: getRetailerName(retailer),
        phone: getRetailerPhone(retailer),
        email: retailer.email,
        address: getRetailerAddress(retailer),
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

  // Check if retailer has completed payments today
  const hasCompletedPaymentToday = (retailerId: string) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    return payments.some(p =>
      p.retailerId === retailerId &&
      p.state === 'COMPLETED' &&
      p.createdAt.toDate() >= startOfDay &&
      p.createdAt.toDate() <= endOfDay
    );
  };

  // Get the last completed payment date for a retailer
  const getLastCompletedPaymentDate = (retailerId: string) => {
    const completedPayments = payments
      .filter(p => p.retailerId === retailerId && p.state === 'COMPLETED')
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    if (completedPayments.length > 0) {
      return formatTimestamp(completedPayments[0].createdAt);
    }
    return null;
  };

  // Get the last completed payment amount for a retailer
  const getLastCompletedPaymentAmount = (retailerId: string) => {
    const completedPayments = payments
      .filter(p => p.retailerId === retailerId && p.state === 'COMPLETED')
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    if (completedPayments.length > 0) {
      return completedPayments[0].totalPaid;
    }
    return 0;
  };

  // Sort retailers: those with completed payments today go to bottom
  const sortedFilteredRetailers = [...filteredRetailers].sort((a, b) => {
    const aCompletedToday = hasCompletedPaymentToday(a.id);
    const bCompletedToday = hasCompletedPaymentToday(b.id);

    // If both have same status, maintain original order
    if (aCompletedToday === bCompletedToday) {
      return 0;
    }

    // If a completed today and b didn't, a goes to bottom (return 1)
    if (aCompletedToday && !bCompletedToday) {
      return 1;
    }

    // If b completed today and a didn't, b goes to bottom (return -1)
    return -1;
  });

  // Retailer cards component
  const RetailerList = () => {
    const handleToggleExpand = (retailerId: string) => {
      if (expandedRetailerId === retailerId) {
        setExpandedRetailerId(null);
        setShowAllPaymentsRetailerId(null); // Reset show all payments when collapsing
      } else {
        setExpandedRetailerId(retailerId);
        setShowAllPaymentsRetailerId(null); // Reset show all payments when expanding a different retailer
        // Load payment history for this retailer
        handleViewRetailerDetails(retailers.find(r => r.id === retailerId)!);

        // Scroll to the expanded retailer card after a short delay to allow DOM update
        setTimeout(() => {
          const element = document.getElementById(`retailer-card-${retailerId}`);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        }, 100);
      }
    };

    const getAreaName = (areaId: string) => {
      const area = areas.find(a => a.id === areaId);
      return area?.name || 'Unknown Area';
    };

    const getRecentPayments = (retailerId: string) => {
      // If we have loaded detailed payment history for this retailer, use it
      if (expandedRetailerId === retailerId && retailerPaymentHistory.length > 0) {
        return retailerPaymentHistory
          .filter(p => p.state === 'COMPLETED')
          .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
          .slice(0, 3);
      }

      // Otherwise, fall back to the general payments array
      return payments
        .filter(p => p.retailerId === retailerId && p.state === 'COMPLETED')
        .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
        .slice(0, 3);
    };

    if (sortedFilteredRetailers.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">
                {searchTerm ? 'No retailers found matching your search.' : 'No retailers assigned to you.'}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedFilteredRetailers.map((retailer) => {
          const isExpanded = expandedRetailerId === retailer.id;
          const recentPayments = getRecentPayments(retailer.id);
          const hasCompletedToday = hasCompletedPaymentToday(retailer.id);
          const lastPaymentDate = getLastCompletedPaymentDate(retailer.id);
          const lastPaymentAmount = getLastCompletedPaymentAmount(retailer.id);

          return (
            <div key={retailer.id} id={`retailer-card-${retailer.id}`} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Retailer Card - Always Visible */}
              <Card className="border-0 rounded-none shadow-none h-full">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    {/* Left Column - Retailer Info */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{getRetailerName(retailer)}</h3>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            Active
                          </Badge>
                        </div>
                        {hasCompletedToday && lastPaymentDate && (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs w-fit">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Collected {formatCurrency(lastPaymentAmount)}
                            </Badge>
                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                              {lastPaymentDate}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        {getRetailerAddress(retailer) && getRetailerAddress(retailer) !== 'N/A' && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-xs">{getRetailerAddress(retailer)}</span>
                          </div>
                        )}
                        {getRetailerPhone(retailer) && getRetailerPhone(retailer) !== 'N/A' && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs">{getRetailerPhone(retailer)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs">{getAreaName(retailer.areaId || '')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Actions & Recent Payments */}
                    <div className="space-y-3">
                      {/* Collect Payment Button */}
                      <Button
                        size="sm"
                        onClick={() => handleOpenPaymentDialog(retailer)}
                        className="w-full h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm whitespace-nowrap text-xs"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Collect Payment
                      </Button>

                      {/* Recent Payments Collapsible Section */}
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (expandedRetailerId === retailer.id) {
                              setExpandedRetailerId(null);
                              setShowAllPaymentsRetailerId(null);
                            } else {
                              setExpandedRetailerId(retailer.id);
                              setShowAllPaymentsRetailerId(null);
                              handleViewRetailerDetails(retailers.find(r => r.id === retailer.id)!);
                            }
                          }}
                          className="w-full justify-between h-9 px-4 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-xs"
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Recent Payments
                          </span>
                          {expandedRetailerId === retailer.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>

                        {expandedRetailerId === retailer.id && (
                          <div className="mt-2 p-3 bg-gray-50 rounded border max-h-48 overflow-y-auto">
                            {recentPayments.length > 0 ? (
                              <div className="space-y-2">
                                {(showAllPaymentsRetailerId === retailer.id ? retailerPaymentHistory : recentPayments).map((payment) => (
                                  <div key={payment.id} className="bg-white p-2 rounded border border-gray-200">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-sm text-gray-900">{formatCurrency(payment.totalPaid)}</p>
                                        <p className="text-xs text-gray-500">{formatTimestampWithTime(payment.createdAt)}</p>
                                      </div>
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        {payment.method}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                                {/* Always show the toggle button if there are more than 3 payments total */}
                                {retailerPaymentHistory.length > 3 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowAllPaymentsRetailerId(showAllPaymentsRetailerId === retailer.id ? null : retailer.id);
                                    }}
                                    className="w-full text-xs"
                                  >
                                    {showAllPaymentsRetailerId === retailer.id ? 'Show Recent' : 'View All'}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-muted-foreground">
                                <CreditCard className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                                <p className="text-xs">No payments yet</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

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
                  {(payment.state === 'INITIATED' || payment.state === 'OTP_SENT') && (
                    <>
                      {isOTPExpired(payment) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="h-7 px-2 text-xs bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                        >
                          Expired
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEnterOTP(payment)}
                          className="h-7 px-2 text-xs bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                        >
                          Enter OTP
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLastPaymentId(payment.id);
                      setLastPaymentAmount(payment.totalPaid);
                      setShowReceiptInSuccess(true);
                      setShowPaymentSuccess(true);
                    }}
                  >
                    View
                  </Button>
                  {payment.state === 'COMPLETED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLastPaymentId(payment.id);
                          setLastPaymentAmount(payment.totalPaid);
                          setShowReceiptInSuccess(true);
                          setShowPaymentSuccess(true);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLastPaymentId(payment.id);
                          setLastPaymentAmount(payment.totalPaid);
                          setShowReceiptInSuccess(true);
                          setShowPaymentSuccess(true);
                        }}
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

      {/* Top Navigation */}
      <DashboardNavigation
        navItems={navItems}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        title="Line Worker Dashboard"
        subtitle="Line Worker"
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={() => setShowLogoutConfirmation(true)}
        notificationCount={notificationCount}
        notifications={notifications}
        onNotificationRead={markNotificationAsRead}
        onAllNotificationsRead={markAllNotificationsAsRead}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation
        open={showLogoutConfirmation}
        onOpenChange={setShowLogoutConfirmation}
        onConfirm={logout}
        userName={user?.displayName || user?.email}
      />

      {/* Main Content Area */}
      <div className="pt-20 lg:pt-0 pb-20 lg:pb-0"> {/* Add padding for fixed header and bottom nav */}
        <div className="p-4 sm:p-6">
          {/* Header removed - using DashboardNavigation instead */}          {/* Error Display */}
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
                  {/* Stats Cards - Bento style 2-column on mobile */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100">Total Retailers</CardTitle>
                        <div className="bg-white/20 p-2 rounded-lg">
                          <Store className="h-4 w-4 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold">{retailers.length}</div>
                        <p className="text-xs text-blue-100 mt-1">Assigned to you</p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-100">Today's Collection</CardTitle>
                        <div className="bg-white/20 p-2 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(todayCollected)}</div>
                        <p className="text-xs text-emerald-100 mt-1">{todayPayments.length} payments</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions card removed - replaced by floating FAB button */}
                  {/* Test Notifications */}
                  {/* <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-gray-900">Test Notifications</CardTitle>
                        <CardDescription className="text-gray-600">Test the enhanced notification system</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const result = await enhancedNotificationService.testNotification();
                              alert(`Test Results:\nIn-App: ${result.inApp ? '✅' : '❌'}\nFCM: ${result.fcm ? '✅' : '❌'}`);
                            }}
                            className="h-20 flex-col border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <Bell className="h-6 w-6 mb-2 text-gray-600" />
                            <span className="font-medium text-sm">Test Basic</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const success = await enhancedNotificationService.testHighValuePayment();
                              alert(`High-Value Payment Test: ${success ? '✅ Sent' : '❌ Failed'}`);
                            }}
                            className="h-20 flex-col border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <DollarSign className="h-6 w-6 mb-2 text-gray-600" />
                            <span className="font-medium text-sm">Test High-Value</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const success = await enhancedNotificationService.testOTPNotification();
                              alert(`OTP Test: ${success ? '✅ Sent' : '❌ Failed'}`);
                            }}
                            className="h-20 flex-col border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <AlertCircle className="h-6 w-6 mb-2 text-gray-600" />
                            <span className="font-medium text-sm">Test OTP</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card> */}

                  {/* Recent Activity */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
                      <CardDescription className="text-gray-600">Your latest payment collections</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {completedPayments
                          .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
                          .slice(0, 5)
                          .map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <div>
                                <div className="font-medium text-gray-900">{payment.retailerName}</div>
                                <div className="text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-green-600">{formatCurrency(payment.totalPaid)}</div>
                                <div className="text-sm text-gray-500">{payment.method}</div>
                              </div>
                            </div>
                          ))}
                        {completedPayments.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <div className="text-lg font-medium mb-2">No payment activity yet</div>
                            <div className="text-sm">Start collecting payments to see activity here</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* PWA Notification Manager */}
                  <PWANotificationManager userRole="LINE_WORKER" />
                </div>
              )}

              {/* Retailers View */}
              {activeNav === 'retailers' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Your Assigned Retailers</h2>
                      <p className="text-gray-600 text-sm">Search and view your assigned retailers</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Button onClick={() => handleOpenPaymentDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Collect Payment
                      </Button>
                      {/* <div className="flex space-x-1">
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
                        </div> */}
                    </div>
                  </div>

                  {/* Search Section */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search retailers..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                            {searchTerm && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="sm:w-48">
                          <Select value={searchType} onValueChange={(value: 'name' | 'area' | 'phone') => setSearchType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Search by Name</SelectItem>
                              <SelectItem value="area">Search by Area</SelectItem>
                              <SelectItem value="phone">Search by Phone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {searchTerm && (
                        <div className="mt-2 text-sm text-gray-600">
                          Showing {sortedFilteredRetailers.length} of {retailers.length} retailers
                          {sortedFilteredRetailers.length < filteredRetailers.length && (
                            <span className="ml-2 text-blue-600">
                              ({filteredRetailers.length - sortedFilteredRetailers.length} with completed payments moved to bottom)
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Retailers List */}
                  <RetailerList />
                </div>
              )}

              {/* Payments View */}
              {activeNav === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Payment Collections</h2>
                    <div className="flex space-x-2">
                      {/* <Button onClick={() => handleOpenPaymentDialog()}>
                          <Plus className="h-4 w-4 mr-2" />
                          New Collection
                        </Button> */}
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

      {/* Floating Action Button - Collect Payment */}
      <button
        onClick={() => handleOpenPaymentDialog()}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        aria-label="Collect Payment"
      >
        <Plus className="h-7 w-7" />
      </button>
      {/* Payment Collection Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          setPreSelectedRetailerForPayment(null); // Reset pre-selected retailer when dialog closes
        }
      }}>
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Enter payment details to initiate collection from retailer
            </DialogDescription>
          </DialogHeader>
          <CollectPaymentForm
            retailers={retailers}
            preSelectedRetailer={preSelectedRetailerForPayment}
            onCollectPayment={handleCollectPayment}
            onCancel={() => {
              setShowPaymentDialog(false);
              setPreSelectedRetailerForPayment(null);
            }}
            collectingPayment={isCollectingPayment}
            wholesalerUpiInfo={wholesalerUpiInfo}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={(open) => setShowConfirmationDialog(open)}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Confirm Payment Collection</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Please review the payment details before confirming
            </DialogDescription>
          </DialogHeader>
          {pendingPaymentData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Retailer:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {getRetailerName(retailers.find(r => r.id === pendingPaymentData.retailerId))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Amount:</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(pendingPaymentData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Payment Method:</span>
                  <span className="text-sm font-semibold text-gray-900">{pendingPaymentData.paymentMethod}</span>
                </div>
                {pendingPaymentData.paymentMethod === 'UPI' && pendingPaymentData.utr && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">UTR:</span>
                    <span className="text-sm font-semibold text-gray-900">****{pendingPaymentData.utr}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelPayment}
                  disabled={isCollectingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isCollectingPayment}
                >
                  {isCollectingPayment ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Confirm & Collect'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Success Dialog */}
      <Dialog open={showPaymentSuccess} onOpenChange={(open) => { if (!open) { setShowPaymentSuccess(false); setShowReceiptInSuccess(false); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-xl font-semibold text-center">Payment Completed Successfully!</DialogTitle>
          <div className="py-4 space-y-4">
            {!showReceiptInSuccess ? (
              // Success View
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <p className="text-gray-600">
                  Payment of {formatCurrency(lastPaymentAmount)} has been collected successfully.
                  SMS and notifications have been sent.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowReceiptInSuccess(true)}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Receipt
                  </Button>
                  {lastPaymentId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const payment = payments.find(p => p.id === lastPaymentId);
                        if (payment) shareReceipt(payment);
                      }}
                      className="w-full"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share Receipt
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setShowPaymentSuccess(false);
                      setShowReceiptInSuccess(false);
                    }}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              // Receipt View
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  {/* Receipt Header */}
                  <div className="text-center pb-4 border-b">
                    <div className="text-2xl font-bold text-blue-600">PharmaLync</div>
                    <div className="text-sm text-gray-500">Payment Receipt</div>
                  </div>

                  {/* Receipt Details */}
                  {(() => {
                    const payment = payments.find(p => p.id === lastPaymentId);
                    const retailer = retailers.find(r => r.id === payment?.retailerId);
                    if (!payment) return <div className="text-center text-gray-500">Loading receipt...</div>;
                    return (
                      <div className="space-y-3 py-4">
                        {/* Amount - Large & Prominent */}
                        <div className="text-center py-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-500">Amount Collected</div>
                          <div className="text-3xl font-bold text-green-600">
                            {formatCurrency(payment.totalPaid)}
                          </div>
                        </div>

                        {/* Receipt Info Grid */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1 border-b border-dashed">
                            <span className="text-gray-500">Receipt ID</span>
                            <span className="font-mono text-xs">{payment.id.slice(-8).toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-dashed">
                            <span className="text-gray-500">Date</span>
                            <span>{formatTimestampWithTime(payment.createdAt)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-dashed">
                            <span className="text-gray-500">Payment Method</span>
                            <span className="font-medium">{payment.method}</span>
                          </div>
                          {payment.utr && (
                            <div className="flex justify-between py-1 border-b border-dashed">
                              <span className="text-gray-500">UTR (Last 4)</span>
                              <span className="font-mono">****{payment.utr}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-1 border-b border-dashed">
                            <span className="text-gray-500">Status</span>
                            <span className="text-green-600 font-medium">✓ Completed</span>
                          </div>
                        </div>

                        {/* Retailer Info */}
                        <div className="pt-2">
                          <div className="text-xs text-gray-400 uppercase mb-1">Retailer</div>
                          <div className="font-medium">{getRetailerName(retailer)}</div>
                          <div className="text-sm text-gray-500">{getRetailerPhone(retailer)}</div>
                        </div>

                        {/* Collected By */}
                        <div className="pt-2">
                          <div className="text-xs text-gray-400 uppercase mb-1">Collected By</div>
                          <div className="font-medium">{user?.displayName || user?.email}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer */}
                  <div className="text-center pt-4 border-t text-xs text-gray-400">
                    Thank you for your payment!
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {lastPaymentId && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const payment = payments.find(p => p.id === lastPaymentId);
                          if (payment) downloadReceipt(payment);
                        }}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Receipt
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const payment = payments.find(p => p.id === lastPaymentId);
                          if (payment) shareReceipt(payment);
                        }}
                        className="w-full"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share Receipt
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => {
                      setShowPaymentSuccess(false);
                      setShowReceiptInSuccess(false);
                    }}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}