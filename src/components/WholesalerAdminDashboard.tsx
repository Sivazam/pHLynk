'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { cleanPhoneNumber } from '@/lib/utils';
import { LoadingText } from '@/components/ui/LoadingText';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLoadingState } from '@/hooks/useLoadingState';

import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { PWANotificationManager } from '@/components/PWANotificationManager';

import { useAuth, useWholesalerAdmin, useSuperAdmin } from '@/contexts/AuthContext';
import {
  areaService,
  retailerService,
  userService,
  paymentService,
  DashboardService,
  tenantService
} from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { Area, Retailer, User, Payment, DashboardStats } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp, formatTimestampWithTime, formatCurrency, toDate } from '@/lib/timestamp-utils';
import { CompactDatePicker } from '@/components/ui/compact-date-picker';
import { CreateAreaForm } from '@/components/ui/create-area-form';
import { CreateRetailerForm } from '@/components/ui/create-retailer-form';
import { RetailerServiceAreaEdit } from '@/components/ui/retailer-service-area-edit';
import { BulkCreateRetailerModal } from '@/components/ui/bulk-create-retailer-modal';
import { WholesalerAnalytics } from '@/components/WholesalerAnalytics';
import { SuccessFeedback } from '@/components/SuccessFeedback';
import { Confetti } from '@/components/ui/Confetti';
import { useSuccessFeedback } from '@/hooks/useSuccessFeedback';
import { LogoutConfirmation } from '@/components/LogoutConfirmation';
import { DaySheet } from '@/components/DaySheet';
import { WholesalerProfileSettings } from '@/components/WholesalerProfileSettings';
import { PaymentVerificationModal } from '@/components/PaymentVerificationModal';
import {
  // Navigation
  LayoutDashboard,
  MapPin,
  Store,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  LogOut,
  Bell,
  Settings,

  // Actions
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Filter,
  Search,
  RefreshCw,

  // Icons
  DollarSign,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  User as UserIcon,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Shield,
  Loader2,
  Wrench,
  Calculator,
  Package,
  Heart
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';

// Activity Log Type
interface ActivityLog {
  id: string;
  type: 'PAYMENT' | 'RETAILER' | 'LINEWORKER' | 'AREA';
  action: string;
  description: string;
  amount?: number;
  actorName: string;
  actorType: 'LINE_WORKER' | 'WHOLESALER_ADMIN' | 'SYSTEM';
  targetName: string;
  targetType: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}


export function WholesalerAdminDashboard() {
  const { user, logout } = useAuth();
  const isWholesalerAdmin = useWholesalerAdmin();
  const isSuperAdminUser = useSuperAdmin();

  const [areas, setAreas] = useState<Area[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [lineWorkers, setLineWorkers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]); // Empty array - invoices have been removed from the application
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [activeNav, setActiveNav] = useState('overview');
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [showCreateRetailer, setShowCreateRetailer] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [showCreateLineWorker, setShowCreateLineWorker] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);
  const [editingLineWorker, setEditingLineWorker] = useState<User | null>(null);
  const [showEditLineWorkerDialog, setShowEditLineWorkerDialog] = useState(false);
  const [editingSelectedAreas, setEditingSelectedAreas] = useState<string[]>([]);
  const [editingActiveStatus, setEditingActiveStatus] = useState<boolean>(true);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  // Line worker creation state
  const [creatingLineWorker, setCreatingLineWorker] = useState(false);
  const [showLineWorkerSuccess, setShowLineWorkerSuccess] = useState(false);
  const [triggerLineWorkerConfetti, setTriggerLineWorkerConfetti] = useState(false);

  // Logout confirmation state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  // Simplified dialog state management
  const handleAreaDialogChange = useCallback((open: boolean) => {
    if (open) {
      setShowCreateArea(true);
    } else {
      setShowCreateArea(false);
    }
  }, []);

  const handleRetailerDialogChange = useCallback((open: boolean) => {
    if (open) {
      setShowCreateRetailer(true);
    } else {
      setShowCreateRetailer(false);
    }
  }, []);



  const handleLineWorkerDialogChange = useCallback((open: boolean) => {
    if (open) {
      setShowCreateLineWorker(true);
    } else {
      setShowCreateLineWorker(false);
    }
  }, []);

  // Filter States
  const [selectedLineWorker, setSelectedLineWorker] = useState<string>("all");
  const [selectedRetailer, setSelectedRetailer] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");

  const [showInactiveWorkers, setShowInactiveWorkers] = useState<boolean>(false);

  // Real-time updates
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
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

  // Success Feedback
  const {
    showSuccess,
    hideSuccess,
    feedback
  } = useSuccessFeedback();

  // Separate state for the filter date picker
  const [filterDate, setFilterDate] = useState<{ from: Date; to: Date } | null>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { from: startOfDay, to: endOfDay };
  });

  // Filter functions for retailer details - memoized to prevent unnecessary re-computations
  const getFilteredRetailers = useMemo(() => {
    return retailers.filter(retailer => {
      // Area filter
      if (selectedArea !== "all" && retailer.areaId !== selectedArea) {
        return false;
      }

      // Retailer filter
      if (selectedRetailer !== "all" && retailer.id !== selectedRetailer) {
        return false;
      }

      return true;
    });
  }, [retailers, selectedArea, selectedRetailer]);

  // Helper functions to filter data by date range
  const filterPaymentsByDateRange = (paymentsData: any[]) => {
    return paymentsData.filter(payment => {
      const paymentDate = payment.createdAt.toDate();
      return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    });
  };

  const handleDateRangeChange = (value: string, newDateRange: { startDate: Date; endDate: Date }) => {
    setSelectedDateRangeOption(value);
    setDateRange(newDateRange);
  };

  // Payment Verification State
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedPaymentForVerification, setSelectedPaymentForVerification] = useState<Payment | null>(null);
  const [isMarkingVerified, setIsMarkingVerified] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'UPI' | 'CASH' | 'BANK_TRANSFER'>('all');

  const handleOpenVerification = (payment: Payment) => {
    setSelectedPaymentForVerification(payment);
    setIsVerificationModalOpen(true);
  };

  const handleVerifyPayment = async (paymentId: string) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    setIsMarkingVerified(true);
    try {
      await paymentService.verifyPayment(paymentId, currentTenantId);

      // Update local state to reflect change immediately
      setPayments(prev => prev.map(p =>
        p.id === paymentId ? { ...p, verified: true, proofUrl: undefined, proofPath: undefined } : p
      ));

      // Find next pending payment if we are in review mode
      const pendingPayments = payments.filter(p =>
        p.id !== paymentId && // Exclude current
        !p.verified &&
        p.method === 'UPI' &&
        p.state !== 'CANCELLED'
      ).sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

      if (pendingPayments.length > 0) {
        // Auto-advance to next
        setSelectedPaymentForVerification(pendingPayments[0]);
      } else {
        // No more pending, close modal
        setIsVerificationModalOpen(false);
        setSelectedPaymentForVerification(null);
      }

      // Trigger success notification
      showSuccess('Payment has been verified and proof image cleared.');
    } catch (error) {
      console.error('Failed to verify payment:', error);
      setError('Failed to verify payment. Please try again.');
    } finally {
      setIsMarkingVerified(false);
    }
  };

  const handleSkipVerification = () => {
    if (!selectedPaymentForVerification) return;

    // Find next pending payment
    const pendingPayments = payments.filter(p =>
      !p.verified &&
      p.method === 'UPI' &&
      p.state !== 'CANCELLED' &&
      p.id !== selectedPaymentForVerification.id
    ).sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    if (pendingPayments.length > 0) {
      setSelectedPaymentForVerification(pendingPayments[0]);
    } else {
      setIsVerificationModalOpen(false);
      setSelectedPaymentForVerification(null);
    }
  };

  // Wrapper function for Select component that only takes the value parameter
  const handleSelectDateRangeChange = (value: string) => {
    // Find the corresponding date range option and call the main handler
    const dateRangeOptions = [
      {
        value: 'today', getDateRange: () => {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          return { startDate: startOfDay, endDate: endOfDay };
        }
      },
      {
        value: 'yesterday', getDateRange: () => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
          return { startDate: startOfDay, endDate: endOfDay };
        }
      },
      {
        value: 'thisWeek', getDateRange: () => {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
          const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);
          return { startDate: startOfWeek, endDate: endOfWeek };
        }
      },
      {
        value: 'lastWeek', getDateRange: () => {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const startOfLastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek - 7);
          const endOfLastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek - 1, 23, 59, 59, 999);
          return { startDate: startOfLastWeek, endDate: endOfLastWeek };
        }
      },
      {
        value: 'thisMonth', getDateRange: () => {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          return { startDate: startOfMonth, endDate: endOfMonth };
        }
      },
      {
        value: 'lastMonth', getDateRange: () => {
          const today = new Date();
          const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          return { startDate: startOfLastMonth, endDate: endOfLastMonth };
        }
      },
      {
        value: 'custom', getDateRange: () => {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          return { startDate: startOfDay, endDate: endOfDay };
        }
      }
    ];

    const selectedOption = dateRangeOptions.find(option => option.value === value);
    if (selectedOption) {
      const dateRange = selectedOption.getDateRange();
      handleDateRangeChange(value, dateRange);
    }
  };

  // Tenant management for super admin
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentTenantData, setCurrentTenantData] = useState<any>(null); // For regular wholesaler admin

  // Retailer assignment state
  const [showRetailerAssignment, setShowRetailerAssignment] = useState(false);
  const [assigningRetailer, setAssigningRetailer] = useState<Retailer | null>(null);
  const [selectedLineWorkerForAssignment, setSelectedLineWorkerForAssignment] = useState<string>('');

  // Confirmation dialog for reassign/unassign actions
  const [showAssignmentConfirmation, setShowAssignmentConfirmation] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    retailerId: string;
    retailerName: string;
    lineWorkerId: string | null;
    lineWorkerName: string;
    action: 'reassign' | 'unassign';
  } | null>(null);

  // Debug logging for notifications - DISABLED to prevent focus issues
  // useEffect(() => {
  //   console.log('🔔 Notification state updated:', {
  //     count: notificationCount,
  //     notifications: notifications.length,
  //     notificationList: notifications.map(n => ({ id: n.id, title: n.title, read: n.read }))
  //   });
  // }, [notificationCount, notifications]);

  // Initialize super admin state and fetch tenants
  useEffect(() => {
    setIsSuperAdmin(isSuperAdminUser);
    if (isSuperAdminUser) {
      fetchTenants();
    } else {
      // Fetch current tenant data for regular wholesaler admin
      fetchCurrentTenantData();
    }
  }, [isSuperAdminUser]);

  const fetchTenants = async () => {
    try {
      const tenantsData = await tenantService.getAllTenants();
      setTenants(tenantsData);
      if (tenantsData.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  // Fetch current tenant data for regular wholesaler admin
  const fetchCurrentTenantData = async () => {
    if (!isSuperAdmin && user?.tenantId && user.tenantId !== 'system') {
      try {
        const tenantData = await tenantService.getById(user.tenantId, 'system'); // Use 'system' as tenantId for tenant documents
        setCurrentTenantData(tenantData);
      } catch (error) {
        console.error('Error fetching current tenant data:', error);
      }
    }
  };

  // Helper function to get the current tenant ID
  const getCurrentTenantId = (): string | null => {
    if (isSuperAdmin && selectedTenant) {
      return selectedTenant;
    }
    return user?.tenantId && user.tenantId !== 'system' ? user.tenantId : null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all dialogs when component unmounts
      setShowCreateArea(false);
      setShowCreateRetailer(false);
      setShowCreateLineWorker(false);
      setEditingArea(null);
      setEditingRetailer(null);
      setEditingLineWorker(null);
      setViewingPayment(null);
      setShowEditLineWorkerDialog(false);
      setShowRetailerAssignment(false);
    };
  }, []);

  // Prevent multiple dialog openings


  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'areas', label: 'Areas', icon: MapPin },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'retailer-details', label: 'Retailer Details', icon: Eye },
    { id: 'workers', label: 'Line Workers', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Memoized notification callback to prevent unnecessary re-renders
  const handleNotificationUpdate = useCallback((newNotifications: NotificationItem[]) => {
    console.log('🔔 Received real-time notifications callback:', newNotifications.length, 'notifications');
    console.log('🔔 Real-time notification details:', newNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));

    // Use functional updates to avoid dependency on notifications state
    setNotifications(prevNotifications => {
      // Only update if notifications have actually changed
      if (prevNotifications.length === newNotifications.length &&
        JSON.stringify(prevNotifications) === JSON.stringify(newNotifications)) {
        console.log('🔔 Notifications unchanged, skipping state update');
        return prevNotifications;
      }
      return newNotifications;
    });

    // Update notification count using functional update
    setNotificationCount(prevCount => {
      const newCount = newNotifications.filter(n => !n.read).length;
      return newCount !== prevCount ? newCount : prevCount;
    });
  }, []); // Empty dependency array to prevent recreation

  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isWholesalerAdmin && user?.uid && currentTenantId) {
      console.log('🔔 Setting up wholesaler admin real-time notifications for user:', user.uid, 'tenant:', currentTenantId);

      // Reset loading state and start fetching data
      mainLoadingState.setLoading(true);
      setDataFetchProgress(0);
      fetchDashboardData();

      // Start real-time notifications - ensure it's always set up
      realtimeNotificationService.startListening(
        user.uid,
        'WHOLESALER_ADMIN',
        currentTenantId,
        handleNotificationUpdate
      );
    }

    // Cleanup on unmount
    return () => {
      if (user?.uid) {
        console.log('🔔 Cleaning up real-time notifications for user:', user.uid);
        realtimeNotificationService.stopListening(user.uid);
      }
    };
  }, [isWholesalerAdmin, user, selectedTenant]); // Restart when selected tenant changes

  // Separate effect for data fetching when filters change - only affect Overview tab
  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isWholesalerAdmin && user?.uid && currentTenantId) {
      fetchDashboardData();
    }
  }, [activeNav === 'overview' ? dateRange : null, selectedLineWorker, selectedRetailer, selectedTenant]); // Only fetch when dateRange changes AND we're on overview tab

  // Effect to reset date range to "Today" when switching to Overview tab
  useEffect(() => {
    if (activeNav === 'overview') {
      setSelectedDateRangeOption('today');
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      setDateRange({ startDate: startOfDay, endDate: endOfDay });
    }
  }, [activeNav]);

  // Effect to regenerate activity logs when retailers data changes (fixes "Unknown" retailer names delay)
  useEffect(() => {
    if (retailers.length > 0 && payments.length > 0) {
      console.log('🔄 Regenerating activity logs due to retailer data change');

      // Debug: Analyze retailer data structure
      const retailerAnalysis = retailers.map(r => ({
        id: r.id,
        name: r.name,
        profileRealName: r.profile?.realName,
        hasProfile: !!r.profile,
        profileType: typeof r.profile,
        profileKeys: r.profile ? Object.keys(r.profile) : [],
        nameSource: r.profile?.realName ? 'profile.realName' : (r.name ? 'name' : 'Unknown')
      }));

      console.log('📊 Retailer data analysis:', retailerAnalysis);

      // Check for payments with missing retailer names
      const paymentsWithMissingRetailers = payments.filter(p => {
        const retailer = retailers.find(r => r.id === p.retailerId);
        return !retailer || (!retailer.profile?.realName && !retailer.name);
      });

      if (paymentsWithMissingRetailers.length > 0) {
        console.warn('⚠️ Payments with missing retailer data:', paymentsWithMissingRetailers.map(p => ({
          paymentId: p.id,
          retailerId: p.retailerId,
          amount: p.totalPaid,
          state: p.state
        })));
      }

      const currentTenantId = getCurrentTenantId();
      if (currentTenantId) {
        // Use the current filter settings to determine activity logs data
        let activityLogsData = payments;

        const refreshedLogs = generateActivityLogs(activityLogsData, retailers, lineWorkers);
        setActivityLogs(prevLogs => {
          // Check if there are actual differences in retailer names
          const hasChanges = refreshedLogs.some((log, index) => {
            const prevLog = prevLogs[index];
            return prevLog && log.targetName !== prevLog.targetName;
          });

          if (hasChanges) {
            console.log('✅ Activity logs updated with corrected retailer names');
            console.log('🔄 Sample changes:', refreshedLogs.slice(0, 3).map(log => ({
              description: log.description,
              targetName: log.targetName
            })));
            return refreshedLogs;
          }
          return prevLogs; // Keep existing logs if no changes
        });
      }
    }
  }, [retailers]); // Only trigger when retailers change

  // Effect to sync notifications with notification service - DISABLED to prevent focus issues
  // The real-time notification service already handles notification updates
  // useEffect(() => {
  //   if (isWholesalerAdmin && user?.uid) {
  //     console.log('🔔 Setting up notification service sync for user:', user.uid);

  //     // Add a listener to the notification service to ensure we stay in sync
  //     const notificationListener = (newNotifications: NotificationItem[]) => {
  //       console.log('🔔 Notification service update received:', newNotifications.length, 'notifications');
  //       console.log('🔔 Notification details:', newNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));
  //       setNotifications(newNotifications);
  //       setNotificationCount(newNotifications.filter(n => !n.read).length);
  //     };

  //     notificationService.addListener(notificationListener);

  //     // Initial sync
  //     const currentNotifications = notificationService.getNotifications();
  //     console.log('🔔 Initial notification sync:', currentNotifications.length, 'notifications');
  //     console.log('🔔 Initial notification details:', currentNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));
  //     setNotifications(currentNotifications);
  //     setNotificationCount(currentNotifications.filter(n => !n.read).length);

  //     return () => {
  //       console.log('🔔 Cleaning up notification service listener for user:', user.uid);
  //       notificationService.removeListener(notificationListener);
  //     };
  //   }
  // }, [isWholesalerAdmin, user]);

  const fetchDashboardData = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) {
      setError('No tenant selected. Please select a tenant to continue.');
      return;
    }

    setError(null);
    setDataFetchProgress(20);

    try {
      // Fetch base data
      setDataFetchProgress(40);
      const [areasData, retailersData, lineWorkersData, stats] = await Promise.all([
        areaService.getActiveAreas(currentTenantId),
        retailerService.getAll(currentTenantId),
        userService.getAllUsersByRole(currentTenantId, 'LINE_WORKER'),
        DashboardService.getWholesalerDashboardStats(currentTenantId)
      ]);

      // Fetch payments with filters - only apply date range filter for Overview tab
      setDataFetchProgress(60);
      let paymentsData = await paymentService.getAll(currentTenantId);
      let paymentsQuery = paymentsData;
      if (selectedLineWorker && selectedLineWorker !== "all") {
        paymentsQuery = paymentsQuery.filter(p => p.lineWorkerId === selectedLineWorker);
      }
      if (selectedRetailer && selectedRetailer !== "all") {
        paymentsQuery = paymentsQuery.filter(p => p.retailerId === selectedRetailer);
      }
      // Date range filter removed from main query to allow DaySheet full access
      // if (activeNav === 'overview' && dateRange) {
      //   paymentsQuery = paymentsQuery.filter(p => {
      //     const paymentDate = p.createdAt.toDate();
      //     return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
      //   });
      // }

      setAreas(areasData);
      setRetailers(retailersData);
      setLineWorkers(lineWorkersData);
      console.log('📊 Fetched line workers:', lineWorkersData.map(w => ({
        id: w.id,
        displayName: w.displayName,
        assignedAreas: w.assignedAreas
      })));

      setPayments(paymentsQuery);
      setDashboardStats(stats);

      // Generate activity logs - use filtered data only for Overview tab
      let activityLogsData = paymentsQuery;

      // If on Overview tab, use the filtered data for activity logs
      // If on other tabs, use all data for activity logs
      if (activeNav === 'overview' && dateRange) {
        // Apply date filter specifically for logs
        activityLogsData = paymentsQuery.filter(p => {
          const paymentDate = p.createdAt.toDate();
          return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
        });
      } else if (activeNav === 'overview') {
        activityLogsData = paymentsQuery;
      }
      else {
        // For other tabs, use all payments data (unfiltered by date range)
        activityLogsData = paymentsData.filter(p => {
          if (selectedLineWorker && selectedLineWorker !== "all") {
            return p.lineWorkerId === selectedLineWorker;
          }
          if (selectedRetailer && selectedRetailer !== "all") {
            return p.retailerId === selectedRetailer;
          }
          return true;
        });
      }

      // Recompute retailer data for accuracy
      setDataFetchProgress(80);
      try {
        console.log('🔄 Recomputing retailer data for accuracy...');
        await Promise.all(retailersData.map(retailer =>
          retailerService.recomputeRetailerData(retailer.id, currentTenantId)
        ));
        // Refresh retailers after recomputation
        const updatedRetailers = await retailerService.getAll(currentTenantId);
        setRetailers(updatedRetailers);
        console.log('✅ Retailer data recomputed and updated');

        // Regenerate activity logs with updated retailer data to fix "Unknown" retailer names
        const refreshedLogs = generateActivityLogs(activityLogsData, updatedRetailers, lineWorkersData);
        setActivityLogs(refreshedLogs);
        console.log('✅ Activity logs regenerated with updated retailer names');
      } catch (error) {
        console.warn('Warning: Could not recompute retailer data:', error);
      }

      // Generate initial activity logs (will be refreshed after retailer data update)
      const logs = generateActivityLogs(activityLogsData, retailersData, lineWorkersData);
      setActivityLogs(logs);

      // Note: Notifications are now handled by real-time service only
      // Local notification generation removed to prevent conflicts

      setLastUpdate(new Date());
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    mainLoadingState.setRefreshing(true);
    try {
      await fetchDashboardData();

      // Also refresh notifications manually - only if they've changed
      const currentNotifications = notificationService.getNotifications();
      console.log('🔔 Manual notification refresh:', currentNotifications.length, 'notifications');
      console.log('🔔 Manual refresh notification details:', currentNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));

      // Only update if notifications have actually changed
      if (currentNotifications.length !== notifications.length ||
        JSON.stringify(currentNotifications) !== JSON.stringify(notifications)) {
        setNotifications(currentNotifications);
        setNotificationCount(currentNotifications.filter(n => !n.read).length);
      } else {
        console.log('🔔 Manual refresh: Notifications unchanged, skipping state update');
      }

    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      mainLoadingState.setRefreshing(false);
    }
  };

  const generateNotifications = (payments: Payment[], retailers: Retailer[], workers: User[]): NotificationItem[] => {
    const notifications: NotificationItem[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper function to get retailer name from the provided retailers array
    const getRetailerNameFromData = (retailerId: string, retailersArray: Retailer[]) => {
      const retailer = retailersArray.find(r => r.id === retailerId);
      if (retailer?.profile?.realName) {
        return retailer.profile.realName;
      }
      return retailer?.name || 'Unknown';
    };

    console.log('Generating notifications with:', {
      payments: payments.length,
      retailers: retailers.length,
      workers: workers.length,
      now: now.toISOString(),
      oneHourAgo: oneHourAgo.toISOString(),
      oneDayAgo: oneDayAgo.toISOString()
    });

    // 1. Individual completed payments (last 24 hours) - Success notifications
    const recentCompletedPayments = payments.filter(payment =>
      payment.state === 'COMPLETED' &&
      payment.timeline.completedAt &&
      toDate(payment.timeline.completedAt) >= oneDayAgo
    );

    console.log('Recent completed payments (24h):', recentCompletedPayments.length);

    recentCompletedPayments.forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailer = retailers.find(r => r.id === payment.retailerId);

      notifications.push({
        id: `payment_collected_${payment.id}`,
        type: 'success',
        title: 'Payment collected',
        message: `Payment collected from ${retailer?.name || 'retailer'}`,
        timestamp: toDate(payment.timeline.completedAt!),
        read: false,
        workerName: worker?.displayName || 'Unknown',
        amount: payment.totalPaid,
        collectionTime: formatTimestampWithTime(payment.timeline.completedAt!)
      });
    });

    // 2. Pending payments older than 1 hour - Warning notifications
    const pendingPayments = payments.filter(payment =>
      payment.state === 'INITIATED' &&
      toDate(payment.createdAt) <= oneHourAgo
    );

    console.log('Pending payments:', pendingPayments.length);

    pendingPayments.slice(0, 5).forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailerName = getRetailerNameFromData(payment.retailerId, retailers);
      const timeDiff = Math.floor((now.getTime() - toDate(payment.createdAt).getTime()) / (60 * 60 * 1000));

      notifications.push({
        id: `payment_pending_${payment.id}`,
        type: 'warning',
        title: 'Payment pending',
        message: `${worker?.displayName || 'Line worker'} has pending payment of ₹${payment.totalPaid.toLocaleString()} from ${retailerName} (${timeDiff}h ago)`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        initiatedAt: formatTimestampWithTime(payment.createdAt)
      });
    });

    // 3. Failed payments - Warning notifications
    const failedPayments = payments.filter(payment => payment.state === 'CANCELLED' || payment.state === 'EXPIRED');

    console.log('Failed payments:', failedPayments.length);

    failedPayments.slice(0, 3).forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailerName = getRetailerNameFromData(payment.retailerId, retailers);

      notifications.push({
        id: `payment_failed_${payment.id}`,
        type: 'warning',
        title: 'Payment failed',
        message: `Payment of ₹${payment.totalPaid.toLocaleString()} from ${retailerName} failed for ${worker?.displayName || 'line worker'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        initiatedAt: formatTimestampWithTime(payment.createdAt)
      });
    });

    // 4. High performing line workers (today) - Success notifications
    const todayCompletedPayments = payments.filter(payment =>
      payment.state === 'COMPLETED' &&
      payment.timeline.completedAt &&
      toDate(payment.timeline.completedAt) >= oneDayAgo
    );

    console.log('Today completed payments:', todayCompletedPayments.length);

    const workerPerformance = new Map<string, { count: number; amount: number; name: string }>();
    todayCompletedPayments.forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      if (worker) {
        const current = workerPerformance.get(worker.id) || { count: 0, amount: 0, name: worker.displayName };
        workerPerformance.set(worker.id, {
          count: current.count + 1,
          amount: current.amount + payment.totalPaid,
          name: current.name || worker.displayName || 'Unknown Worker'
        });
      }
    });

    // Top performers (more than 3 payments or more than 5000 collected)
    workerPerformance.forEach((performance, workerId) => {
      if (performance.count >= 3 || performance.amount >= 5000) {
        notifications.push({
          id: `top_performer_${workerId}`,
          type: 'success',
          title: 'Top performer',
          message: `${performance.name} collected ${performance.count} payments totaling ₹${performance.amount.toLocaleString()} today`,
          timestamp: now,
          read: false,
          amount: performance.amount,
          collectionCount: performance.count
        });
      }
    });

    // 6. Inactive line workers with recent activity - Info notifications
    const inactiveWorkersWithActivity = workers.filter(worker =>
      !worker.active &&
      payments.some(payment => payment.lineWorkerId === worker.id && toDate(payment.createdAt) >= oneDayAgo)
    );

    console.log('Inactive workers with activity:', inactiveWorkersWithActivity.length);

    inactiveWorkersWithActivity.slice(0, 3).forEach(worker => {
      const recentPayments = payments.filter(payment =>
        payment.lineWorkerId === worker.id &&
        toDate(payment.createdAt) >= oneDayAgo
      );

      notifications.push({
        id: `inactive_worker_activity_${worker.id}`,
        type: 'info',
        title: 'Inactive worker activity',
        message: `Inactive worker ${worker.displayName} has ${recentPayments.length} recent payment activities`,
        timestamp: now,
        read: false,
        activityCount: recentPayments.length
      });
    });

    return notifications;
  };

  const generateActivityLogs = (payments: Payment[], retailers: Retailer[], workers: User[]): ActivityLog[] => {
    const logs: ActivityLog[] = [];

    // Helper function to get retailer name from the provided retailers array
    const getRetailerNameFromData = (retailerId: string, retailersArray: Retailer[]) => {
      const retailer = retailersArray.find(r => r.id === retailerId);

      if (retailer?.profile?.realName) {
        return retailer.profile.realName;
      }
      return retailer?.name || 'Unknown';
    };

    // Payment activities - filter by date range only for Overview tab
    const recentPayments = payments.filter(p => {
      if (activeNav === 'overview') {
        const paymentDate = toDate(p.createdAt);
        return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
      }
      return true; // For other tabs, show all payments
    });

    recentPayments.forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailerName = getRetailerNameFromData(payment.retailerId, retailers);

      logs.push({
        id: `payment_${payment.id}`,
        type: 'PAYMENT',
        action: payment.state.toLowerCase(),
        description: `${payment.state} payment of ₹${payment.totalPaid.toLocaleString()} from ${retailerName}`,
        amount: payment.totalPaid,
        actorName: worker?.displayName || 'Unknown',
        actorType: 'LINE_WORKER',
        targetName: retailerName,
        targetType: 'RETAILER',
        timestamp: payment.createdAt
      });
    });

    // Sort by timestamp (newest first)
    return logs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  };

  // Helper function to check if an area is already assigned to another line worker
  const isAreaAssignedToOtherWorker = (areaId: string, currentWorkerId?: string): boolean => {
    return lineWorkers.some(worker =>
      worker.id !== currentWorkerId &&
      worker.assignedAreas?.includes(areaId)
    );
  };

  // Helper function to get assigned line worker for an area
  const getAssignedWorkerForArea = (areaId: string): User | null => {
    return lineWorkers.find(worker => worker.assignedAreas?.includes(areaId)) || null;
  };

  // Helper function to check if retailer is available for assignment
  const isRetailerAvailableForAssignment = (retailerId: string): boolean => {
    const retailer = retailers.find(r => r.id === retailerId);
    return !retailer?.assignedLineWorkerId;
  };

  // Handler to show confirmation dialog before reassign/unassign
  const handleConfirmAssignmentAction = (retailerId: string, lineWorkerId: string | null) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (!retailer) return;

    const currentAssignedWorker = retailer.assignedLineWorkerId
      ? lineWorkers.find(worker => worker.id === retailer.assignedLineWorkerId)
      : null;

    const newWorker = lineWorkerId
      ? lineWorkers.find(worker => worker.id === lineWorkerId)
      : null;

    setPendingAssignment({
      retailerId,
      retailerName: retailer.profile?.realName || retailer.name,
      lineWorkerId,
      lineWorkerName: lineWorkerId
        ? newWorker?.displayName || newWorker?.email || 'Unassigned'
        : (currentAssignedWorker?.displayName || currentAssignedWorker?.email || 'Unknown'),
      action: lineWorkerId ? 'reassign' : 'unassign'
    });

    setShowAssignmentConfirmation(true);
  };

  // Handler to execute the confirmed assignment action
  const executeConfirmedAssignment = async () => {
    if (!pendingAssignment) return;

    setShowAssignmentConfirmation(false);
    await handleAssignRetailer(pendingAssignment.retailerId, pendingAssignment.lineWorkerId);
    setPendingAssignment(null);
  };

  // Handler to cancel the pending assignment
  const cancelPendingAssignment = () => {
    setShowAssignmentConfirmation(false);
    setPendingAssignment(null);
  };

  // Handler for retailer assignment
  const handleAssignRetailer = async (retailerId: string, lineWorkerId: string | null) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    // Check if there's actually a change being made
    const retailer = retailers.find(r => r.id === retailerId);
    if (retailer && retailer.assignedLineWorkerId === lineWorkerId) {
      // No change needed, just close the dialog
      setShowRetailerAssignment(false);
      setAssigningRetailer(null);
      setSelectedLineWorkerForAssignment('');
      setError(null);
      return;
    }

    try {
      // Use the enhanced reassign API for better consistency and validation
      if (lineWorkerId) {
        // Reassign to a new line worker
        const response = await fetch('/api/wholesaler/reassign-retailer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retailerId,
            tenantId: currentTenantId,
            newLineWorkerId: lineWorkerId
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reassign retailer');
        }

        const result = await response.json();
        console.log('✅ Retailer reassigned successfully:', result);
      } else {
        // Unassign retailer
        await retailerService.assignLineWorker(currentTenantId, retailerId, null);
      }

      await fetchDashboardData();
      setShowRetailerAssignment(false);
      setAssigningRetailer(null);
      setSelectedLineWorkerForAssignment('');
      setError(null);
    } catch (err: any) {
      console.error('❌ Error assigning retailer:', err);
      setError(err.message || 'Failed to assign retailer');
    }
  };

  // Handler functions
  const handleCreateArea = async (data: { name: string; zipcodes: string[] }) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) {
      setError('No tenant selected. Please select a tenant to continue.');
      return;
    }

    try {
      await areaService.createArea(currentTenantId, {
        name: data.name,
        zipcodes: data.zipcodes
      });

      await fetchDashboardData();
      setShowCreateArea(false);
      showSuccess(`Area "${data.name}" created successfully with ${data.zipcodes.length} zipcodes!`);
    } catch (err: any) {
      setError(err.message || 'Failed to create area');
      throw err;
    }
  };

  const handleCreateRetailer = async (data: { name: string; phone: string; address?: string; areaId?: string; zipcodes: string[]; code?: string }) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) {
      setError('No tenant selected. Please select a tenant to continue.');
      return;
    }

    try {
      // Clean phone number to remove hidden Unicode characters
      const cleanedPhone = cleanPhoneNumber(data.phone);

      await retailerService.createRetailer(currentTenantId, {
        name: data.name,
        phone: cleanedPhone,
        address: data.address || '',
        areaId: data.areaId || '',
        zipcodes: data.zipcodes,
        code: data.code || undefined
      });

      // 🔄 CRITICAL: Automatically assign retailer to Line Worker if area has one
      if (data.areaId) {
        const assignedWorker = getAssignedWorkerForArea(data.areaId);
        if (assignedWorker) {
          console.log('🔄 Auto-assigning new retailer to Line Worker for area:', {
            retailerName: data.name,
            areaId: data.areaId,
            lineWorkerName: assignedWorker.displayName
          });

          try {
            // Need to get the newly created retailer ID first
            const updatedRetailers = await retailerService.getAll(currentTenantId);
            const newRetailer = updatedRetailers.find(r =>
              (r.profile ? r.profile.realName : r.name) === data.name &&
              (r.profile ? r.profile.phone : r.phone) === data.phone &&
              r.areaId === data.areaId
            );

            if (newRetailer) {
              await retailerService.assignLineWorker(currentTenantId, newRetailer.id, assignedWorker.id);
              console.log(`✅ Auto-assigned new retailer "${data.name}" to Line Worker "${assignedWorker.displayName}"`);
            }
          } catch (assignmentError) {
            console.error('❌ Error auto-assigning new retailer to Line Worker:', assignmentError);
            // Don't fail the retailer creation, just log the error
          }
        }
      }

      await fetchDashboardData();
      setShowCreateRetailer(false);
      showSuccess(`Retailer "${data.name}" created successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to create retailer');
      throw err;
    }
  };

  const handleAddExistingRetailer = async (retailer: Retailer, areaId?: string, zipcodes?: string[], code?: string) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) {
      setError('No tenant selected. Please select a tenant to continue.');
      return;
    }

    try {
      console.log('🔗 Adding existing retailer to tenant:', retailer.id, currentTenantId, { areaId, zipcodes, code });

      const response = await fetch('/api/retailer/add-to-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: retailer.id,
          tenantId: currentTenantId,
          areaId,
          zipcodes,
          code
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add retailer to account');
      }

      console.log('✅ Retailer added successfully:', data);

      // Check if retailer was already associated
      if (data.alreadyAssociated) {
        showSuccess(`Retailer "${retailer.profile?.realName || retailer.name}" is already in your account!`);
      } else {
        showSuccess(`Retailer "${retailer.profile?.realName || retailer.name}" added to your account successfully!`);
      }

      await fetchDashboardData();
      setShowCreateRetailer(false);
    } catch (err: any) {
      console.error('❌ Error adding existing retailer:', err);
      setError(err.message || 'Failed to add retailer to account');
      throw err;
    }
  };

  const handleCreateLineWorker = async (data: { email: string; password: string; displayName?: string; phone?: string; assignedAreas?: string[] }) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    setCreatingLineWorker(true);

    try {
      // VALIDATION: Check for area conflicts before creating line worker
      if (data.assignedAreas && data.assignedAreas.length > 0) {
        const areaConflicts = data.assignedAreas.filter(areaId =>
          isAreaAssignedToOtherWorker(areaId)
        );

        if (areaConflicts.length > 0) {
          const conflictAreas = areaConflicts.map(areaId => {
            const area = areas.find(a => a.id === areaId);
            return area?.name || areaId;
          }).join(', ');

          throw new Error(`Cannot create line worker: The following areas are already assigned to other line workers: ${conflictAreas}`);
        }
      }

      const userData: any = {
        email: data.email,
        password: data.password,
        displayName: data.displayName || data.email,
        phone: data.phone,
        roles: ['LINE_WORKER']
      };

      // Only include assignedAreas if it has values
      if (data.assignedAreas && data.assignedAreas.length > 0) {
        userData.assignedAreas = data.assignedAreas;
      }

      const createdLineWorkerId = await userService.createUserWithAuth(currentTenantId, userData);

      // 🔄 CRITICAL: Automatically assign retailers from the assigned areas to this Line Worker
      if (data.assignedAreas && data.assignedAreas.length > 0) {
        console.log('🔄 Auto-assigning retailers from areas to new Line Worker:', {
          lineWorkerEmail: data.email,
          assignedAreas: data.assignedAreas
        });

        try {
          // Find all retailers in these areas who are not already assigned
          const unassignedRetailersInAreas = retailers.filter(retailer =>
            data.assignedAreas!.includes(retailer.areaId || '') &&
            !retailer.assignedLineWorkerId
          );

          console.log(`🎯 Found ${unassignedRetailersInAreas.length} unassigned retailers in assigned areas`);

          // Assign each retailer to this new Line Worker
          for (const retailer of unassignedRetailersInAreas) {
            await retailerService.assignLineWorker(currentTenantId, retailer.id, createdLineWorkerId);
            console.log(`✅ Auto-assigned retailer "${retailer.profile?.realName || retailer.name}" to Line Worker`);
          }

          if (unassignedRetailersInAreas.length > 0) {
            console.log(`🎉 Successfully auto-assigned ${unassignedRetailersInAreas.length} retailers to new Line Worker`);
          }
        } catch (assignmentError) {
          console.error('❌ Error auto-assigning retailers to Line Worker:', assignmentError);
          // Don't fail the Line Worker creation, just log the error
        }
      }

      await fetchDashboardData();

      // Show success state and trigger confetti
      setShowLineWorkerSuccess(true);
      setTriggerLineWorkerConfetti(true);

      // Close dialog and reset after success
      setTimeout(() => {
        setShowCreateLineWorker(false);
        setShowLineWorkerSuccess(false);
        showSuccess(`Line worker "${data.displayName || data.email}" created successfully!`);
      }, 2000);
    } catch (err: any) {
      console.error('❌ Line Worker Creation Error:', err);

      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to create line worker';

      if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'A user with this email address already exists. Please use a different email.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid. Please check and try again.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please choose a stronger password (at least 6 characters).';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network connection failed. Please check your internet connection and try again.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
            break;
          case 'permission-denied':
            errorMessage = 'You do not have permission to create line workers. Please contact your administrator.';
            break;
          case 'unavailable':
            errorMessage = 'Service is temporarily unavailable. Please try again in a few minutes.';
            break;
          case 'deadline-exceeded':
            errorMessage = 'Request timed out. Please check your connection and try again.';
            break;
          default:
            errorMessage = `Failed to create line worker: ${err.message || 'Unknown error occurred'}`;
        }
      } else if (err.message) {
        // Handle custom error messages from our validation
        if (err.message.includes('already assigned to other line workers')) {
          errorMessage = err.message;
        } else if (err.message.includes('required fields')) {
          errorMessage = 'Please fill in all required fields correctly.';
        } else {
          errorMessage = `Failed to create line worker: ${err.message}`;
        }
      }

      setError(errorMessage);
      throw err;
    } finally {
      setCreatingLineWorker(false);
    }
  };

  const handleLineWorkerConfettiComplete = () => {
    setTriggerLineWorkerConfetti(false);
  };

  const handleToggleArea = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (area) {
      setEditingArea(area);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    if (confirm('Are you sure you want to delete this area? This will affect all retailers in this area.')) {
      try {
        await areaService.delete(areaId, currentTenantId);
        await fetchDashboardData();
      } catch (err: any) {
        setError(err.message || 'Failed to delete area');
      }
    }
  };

  const handleDeleteRetailer = async (retailerId: string) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    if (confirm('Are you sure you want to remove this retailer from your business? This will remove their association with you but preserve all transaction history and their account for other wholesalers.')) {
      try {
        await retailerService.delete(retailerId, currentTenantId);
        await fetchDashboardData();
      } catch (err: any) {
        setError(err.message || 'Failed to remove retailer');
      }
    }
  };

  const handleDeleteLineWorker = async (workerId: string) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    if (confirm('Are you sure you want to delete this line worker? This action cannot be undone.')) {
      try {
        await userService.delete(workerId, currentTenantId);
        await fetchDashboardData();
      } catch (err: any) {
        setError(err.message || 'Failed to delete line worker');
      }
    }
  };

  const handleToggleLineWorkerStatus = async (workerId: string, currentStatus: boolean) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;

    try {
      await userService.update(workerId, {
        active: !currentStatus
      }, currentTenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update line worker status');
    }
  };

  const handleUpdateLineWorker = async (data: { active?: boolean; displayName?: string; phone?: string }) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId || !editingLineWorker) return;

    // Check for area conflicts
    const areaConflicts = editingSelectedAreas.filter(areaId =>
      isAreaAssignedToOtherWorker(areaId, editingLineWorker.id)
    );

    if (areaConflicts.length > 0) {
      const conflictAreas = areaConflicts.map(areaId => {
        const area = areas.find(a => a.id === areaId);
        const worker = getAssignedWorkerForArea(areaId);
        return `${area?.name || 'Unknown'} (assigned to ${worker?.displayName || 'another worker'})`;
      }).join(', ');

      setError(`Cannot save: The following areas are already assigned to other workers: ${conflictAreas}`);
      return;
    }

    try {
      const updateData: any = {
        active: data.active,
        displayName: data.displayName,
        phone: data.phone
      };

      // Handle assignedAreas - include if has values, explicitly delete if empty
      if (editingSelectedAreas.length > 0) {
        updateData.assignedAreas = editingSelectedAreas;
      } else if (editingLineWorker.assignedAreas && editingLineWorker.assignedAreas.length > 0) {
        // If worker currently has areas but we're removing them all, delete the field
        updateData.assignedAreas = null; // This will remove the field from Firestore
      }

      console.log('🔧 Updating line worker:', {
        workerId: editingLineWorker.id,
        updateData,
        currentAssignedAreas: editingLineWorker.assignedAreas,
        newSelectedAreas: editingSelectedAreas
      });

      await userService.update(editingLineWorker.id, updateData, currentTenantId);

      // 🔄 CRITICAL: Automatically assign/unassign retailers based on area changes
      const oldAreas = editingLineWorker.assignedAreas || [];
      const newAreas = editingSelectedAreas;

      // Find newly added areas
      const addedAreas = newAreas.filter(area => !oldAreas.includes(area));
      // Find removed areas
      const removedAreas = oldAreas.filter(area => !newAreas.includes(area));

      console.log('🔄 Area changes detected:', {
        oldAreas,
        newAreas,
        addedAreas,
        removedAreas
      });

      try {
        // Assign retailers from newly added areas
        if (addedAreas.length > 0) {
          // CRITICAL: Only auto-assign retailers that were NEVER assigned (undefined)
          // Do NOT auto-assign retailers that were explicitly unassigned (null) - they were intentionally removed
          const unassignedRetailersInAddedAreas = retailers.filter(retailer =>
            addedAreas.includes(retailer.areaId || '') &&
            retailer.assignedLineWorkerId === undefined  // Only never-assigned, not explicitly unassigned (null)
          );

          console.log(`🎯 Found ${unassignedRetailersInAddedAreas.length} unassigned retailers in newly added areas`);

          for (const retailer of unassignedRetailersInAddedAreas) {
            await retailerService.assignLineWorker(currentTenantId, retailer.id, editingLineWorker.id);
            console.log(`✅ Auto-assigned retailer "${retailer.profile?.realName || retailer.name}" to Line Worker for new area`);
          }
        }

        // Unassign retailers from removed areas
        if (removedAreas.length > 0) {
          // Two cases to handle:
          // 1. Area-based assignment: retailer in removed area, no direct assignment
          // 2. Direct assignment: retailer directly assigned to this worker AND retailer in removed area
          const retailersToUnassign = retailers.filter(retailer => {
            const retailerInRemovedArea = removedAreas.includes(retailer.areaId || '');

            // Case 1: Area-based assignment (no direct assignment, retailer in removed area)
            const case1 = !retailer.assignedLineWorkerId && retailerInRemovedArea;

            // Case 2: Direct assignment to this worker, AND retailer in removed area
            // When a retailer was directly assigned but the area connection is broken, unassign them
            const case2 = retailer.assignedLineWorkerId === editingLineWorker.id && retailerInRemovedArea;

            return case1 || case2;
          });

          console.log(`🎯 Found ${retailersToUnassign.length} retailers to unassign from removed areas`);

          for (const retailer of retailersToUnassign) {
            await retailerService.assignLineWorker(currentTenantId, retailer.id, null);
            console.log(`✅ Auto-unassigned retailer "${retailer.profile?.realName || retailer.name}" from Line Worker for removed area`);
          }
        }

        if (addedAreas.length > 0 || removedAreas.length > 0) {
          console.log(`🎉 Successfully processed area-based retailer assignments`);
        }
      } catch (assignmentError) {
        console.error('❌ Error processing area-based retailer assignments:', assignmentError);
        // Don't fail the Line Worker update, just log the error
      }

      console.log('✅ Line worker updated, fetching fresh data...');
      await fetchDashboardData();


      // Show success dialog with area assignment details
      // (oldAreas, addedAreas, removedAreas already defined above)
      const addedAreasInfo = addedAreas.map(id => areas.find(a => a.id === id)?.name || id);
      const removedAreasInfo = removedAreas.map(id => areas.find(a => a.id === id)?.name || id);

      let successMessage = `${editingLineWorker.displayName || 'Line Worker'} updated successfully!`;
      const details: string[] = [];

      if (addedAreas.length > 0) {
        details.push(`✅ Assigned: ${addedAreasInfo.join(', ')}`);
      }
      if (removedAreas.length > 0) {
        details.push(`❌ Removed: ${removedAreasInfo.join(', ')}`);
      }
      if (details.length > 0) {
        successMessage += '\n' + details.join('\n');
      }

      showSuccess(successMessage);

      setShowEditLineWorkerDialog(false);
      setEditingLineWorker(null);
      setEditingSelectedAreas([]);
      setEditingActiveStatus(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update line worker');
    }
  };

  // Utility functions
  const getRetailerName = (retailerId: string) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (retailer?.profile?.realName) {
      return retailer.profile.realName;
    }
    return retailer?.name || 'Unknown';
  };

  const getLineWorkerName = (workerId: string) => {
    return lineWorkers.find(w => w.id === workerId)?.displayName || 'Unknown';
  };

  // Stats Cards Component
  const StatsCards = () => {
    // Calculate filtered data for the selected date range
    const filteredPayments = filterPaymentsByDateRange(payments);
    const filteredCompletedPayments = filteredPayments.filter(p => p.state === 'COMPLETED');
    const filteredRevenue = filteredCompletedPayments.reduce((sum, p) => sum + p.totalPaid, 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <div className="bg-blue-100 p-2 rounded-full">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredRevenue)}
            </div>
            <p className="text-xs text-gray-500">
              Revenue (filtered)
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Payments</CardTitle>
            <div className="bg-purple-100 p-2 rounded-full">
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {filteredCompletedPayments.length}
            </div>
            <p className="text-xs text-gray-500">
              Payments completed (filtered)
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Collections</CardTitle>
            <div className="bg-teal-100 p-2 rounded-full">
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(dashboardStats?.todayCollections || 0)}
            </div>
            <p className="text-xs text-gray-500">
              Collections today
            </p>
          </CardContent>
        </Card>



      </div>

    );
  };

  // Overview Component - Render function to prevent remounting
  const renderOverview = () => (
    <div className="space-y-6 sm:pt-6 pt-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex space-x-2">
          <DateRangeFilter value={selectedDateRangeOption} onValueChange={handleDateRangeChange} />
          <DaySheet
            payments={payments}
            lineWorkers={lineWorkers}
            areas={areas}
            retailers={retailers}
            wholesalerBusinessName={isSuperAdmin && selectedTenant ?
              tenants.find(t => t.id === selectedTenant)?.name || 'Unknown Wholesaler' :
              currentTenantData?.name || user?.displayName || 'Wholesaler'
            }
            wholesalerAddress={isSuperAdmin && selectedTenant ?
              tenants.find(t => t.id === selectedTenant)?.address || 'Address not provided' :
              currentTenantData?.address || 'Address not provided'
            }
            tenantId={getCurrentTenantId() || ''}
          />
          {/* <LoadingButton
            isLoading={mainLoadingState.loadingState.isRefreshing}
            loadingText="Refreshing..."
            onClick={handleManualRefresh}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
          </LoadingButton> */}
        </div>
      </div>
      <StatsCards />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {activeNav === 'overview'
              ? 'Latest activities in your system (filtered by selected date range)'
              : 'Latest activities in your system (all time)'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mainLoadingState.loadingState.isRefreshing ? (
              <>
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48 animate-pulse" />
                      <Skeleton className="h-3 w-32 animate-pulse" />
                    </div>
                    <Skeleton className="h-4 w-16 animate-pulse" />
                  </div>
                ))}
              </>
            ) : activityLogs.length > 0 ? (
              activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {log.type === 'PAYMENT' && <DollarSign className="h-5 w-5 text-blue-600" />}
                    {log.type === 'PAYMENT' && <CreditCard className="h-5 w-5 text-green-600" />}
                    {log.type === 'RETAILER' && <Store className="h-5 w-5 text-blue-600" />}
                    {log.type === 'LINEWORKER' && <Users className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{log.description}</div>
                    <div className="text-sm text-gray-500">
                      {log.actorName} • {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                  {log.amount && (
                    <div className="text-right">
                      <div className="font-medium text-green-600">{formatCurrency(log.amount)}</div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activities</h3>
                <p className="text-gray-500">There have been no payment activities in the last 7 days.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PWA Notification Manager */}
      <PWANotificationManager userRole="WHOLESALER_ADMIN" />

    </div>
  );

  // Areas Component
  const Areas = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Areas Management</h2>
          <p className="text-gray-600">Manage your service areas and zip codes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={mainLoadingState.loadingState.isRefreshing}
          >
            {mainLoadingState.loadingState.isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
          <Dialog key="area-dialog" open={showCreateArea} onOpenChange={handleAreaDialogChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Area
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Area</DialogTitle>
                <DialogDescription>
                  Add a new service area with zip codes
                </DialogDescription>
              </DialogHeader>
              <CreateAreaForm
                key="area-form"
                onSubmit={handleCreateArea}
                onCancel={() => setShowCreateArea(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Areas</CardTitle>
          <CardDescription>Manage your service areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mainLoadingState.loadingState.isRefreshing ? (
              <>
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 animate-pulse" />
                        <Skeleton className="h-3 w-24 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-16 animate-pulse" />
                      <Skeleton className="h-8 w-16 animate-pulse" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              areas.map((area) => (
                <div key={area.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{area.name}</div>
                      <div className="text-sm text-gray-500">
                        {area.zipcodes.length} zip codes
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:items-center space-x-2 flex-wrap gap-y-2 sm:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleArea(area.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteArea(area.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Area Dialog */}
      {editingArea && (
        <Dialog open={!!editingArea} onOpenChange={() => setEditingArea(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Area</DialogTitle>
              <DialogDescription>
                Update area information and zipcodes
              </DialogDescription>
            </DialogHeader>
            {editingArea && (
              <CreateAreaForm
                onSubmit={async (data) => {
                  const currentTenantId = getCurrentTenantId();
                  if (!currentTenantId) return;

                  try {
                    await areaService.update(editingArea.id, {
                      name: data.name,
                      zipcodes: data.zipcodes
                    }, currentTenantId);
                    await fetchDashboardData();
                    setEditingArea(null);
                  } catch (err: any) {
                    setError(err.message || 'Failed to update area');
                  }
                }}
                onCancel={() => setEditingArea(null)}
                initialData={editingArea}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  // Retailers Component
  const Retailers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retailers Management</h2>
          <p className="text-gray-600">Manage your retailer network</p>
        </div>
        <div className="flex gap-2">
          <LoadingButton
            isLoading={mainLoadingState.loadingState.isRefreshing}
            loadingText="Refreshing..."
            onClick={handleManualRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
          </LoadingButton>
          <Button variant="outline" onClick={() => setShowBulkCreate(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Create
          </Button>
          <Dialog key="retailer-dialog" open={showCreateRetailer} onOpenChange={handleRetailerDialogChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Retailer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Retailer</DialogTitle>
                <DialogDescription>
                  Add a new retailer to your network
                </DialogDescription>
              </DialogHeader>
              <CreateRetailerForm
                key="retailer-form"
                onSubmit={handleCreateRetailer}
                onAddExistingRetailer={handleAddExistingRetailer}
                areas={areas}
                existingRetailers={retailers}
                onCancel={() => setShowCreateRetailer(false)}
              />
            </DialogContent>
          </Dialog>

          <BulkCreateRetailerModal
            isOpen={showBulkCreate}
            onClose={() => setShowBulkCreate(false)}
            onSuccess={() => {
              setShowBulkCreate(false);
              fetchDashboardData();
              showSuccess('Bulk creation completed successfully');
            }}
            areas={areas}
            tenantId={getCurrentTenantId() || ''}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Retailers</CardTitle>
          <CardDescription>Manage your retailer network</CardDescription>
        </CardHeader>
        <CardContent>
          {mainLoadingState.loadingState.isRefreshing ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48 animate-pulse" />
                    <Skeleton className="h-3 w-32 animate-pulse" />
                  </div>
                  <Skeleton className="h-4 w-24 animate-pulse" />
                  <Skeleton className="h-4 w-20 animate-pulse" />
                  <Skeleton className="h-4 w-16 animate-pulse" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-16 animate-pulse" />
                    <Skeleton className="h-8 w-16 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retailers.map((retailer) => (
                    <TableRow key={retailer.id}>
                      <TableCell>
                        <div className="font-medium">
                          {retailer.profile?.realName || retailer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {retailer.profile?.address || retailer.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        {areas.find(a => a.id === retailer.areaId)?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {retailer.profile?.phone || retailer.phone}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingRetailer(retailer)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRetailer(retailer.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Retailer Dialog */}
      {editingRetailer && (
        <Dialog open={!!editingRetailer} onOpenChange={(open) => !open && setEditingRetailer(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Retailer Service Area</DialogTitle>
              <DialogDescription>
                Update the service area for this retailer
              </DialogDescription>
            </DialogHeader>
            {editingRetailer && (
              <RetailerServiceAreaEdit
                retailer={editingRetailer}
                onSubmit={async (data) => {
                  const currentTenantId = getCurrentTenantId();
                  if (!currentTenantId) return;

                  try {
                    console.log('🔧 Starting retailer update...');

                    // Update wholesaler assignment (area/zipcodes)
                    await retailerService.updateWholesalerAssignment(
                      editingRetailer.id,
                      currentTenantId,
                      data.areaId,
                      data.zipcodes
                    );
                    console.log('✅ Wholesaler assignment updated successfully');

                    // Update code if provided
                    // Update code if provided using upsertWholesalerData to ensure isolation
                    if (data.code !== undefined) {
                      await retailerService.upsertWholesalerData(
                        editingRetailer.id,
                        currentTenantId,
                        { code: data.code || '' } // Pass empty string if undefined/null to clear it
                      );
                      console.log('✅ Retailer code updated successfully (Wholesaler-Specific)');
                    }

                    // Add a small delay to ensure Firestore cache is updated
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Fetch the updated retailer with proper data merging
                    const updatedRetailer = await retailerService.getRetailerForTenant(editingRetailer.id, currentTenantId);

                    if (updatedRetailer) {
                      // Update only the specific retailer in the existing retailers array
                      setRetailers(prevRetailers =>
                        prevRetailers.map(r =>
                          r.id === editingRetailer.id ? updatedRetailer : r
                        )
                      );
                      console.log('🔄 Updated retailer in state with new area/zipcodes');

                      // Show success feedback with confetti
                      const areaName = areas.find(a => a.id === data.areaId)?.name || 'Updated area';
                      showSuccess(`Service area for "${editingRetailer.name}" updated to "${areaName}" successfully!`);
                      setTriggerLineWorkerConfetti(true);

                      // Close dialog after showing success
                      setTimeout(() => {
                        setEditingRetailer(null);
                        setTriggerLineWorkerConfetti(false);
                      }, 1500);
                    } else {
                      console.error('❌ Could not fetch updated retailer data');
                    }
                  } catch (err: any) {
                    console.error('❌ Error updating retailer service area:', err);
                    setError(err.message || 'Failed to update retailer service area');
                  }
                }}
                onCancel={() => setEditingRetailer(null)}
                areas={areas}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  // Line Workers Component
  const LineWorkers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Line Workers Management</h2>
          <p className="text-gray-600">Manage your line workers and their assignments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={mainLoadingState.loadingState.isRefreshing}
          >
            {mainLoadingState.loadingState.isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
          <Dialog key="line-worker-dialog" open={showCreateLineWorker} onOpenChange={handleLineWorkerDialogChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Line Worker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <Confetti trigger={triggerLineWorkerConfetti} onComplete={handleLineWorkerConfettiComplete} />
              <DialogHeader>
                <DialogTitle>Create New Line Worker</DialogTitle>
                <DialogDescription>
                  Add a new line worker to your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {showLineWorkerSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 mb-2">Line Worker Created Successfully!</h3>
                    <p className="text-gray-600">The new line worker has been created and is ready to use.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="workerEmail">Email</Label>
                      <Input
                        id="workerEmail"
                        type="email"
                        placeholder="Enter email address"
                        required
                        disabled={creatingLineWorker}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workerPassword">Password</Label>
                      <Input
                        id="workerPassword"
                        type="password"
                        placeholder="Enter password"
                        required
                        disabled={creatingLineWorker}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workerDisplayName">Display Name</Label>
                      <Input
                        id="workerDisplayName"
                        placeholder="Enter display name"
                        disabled={creatingLineWorker}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workerPhone">Phone</Label>
                      <Input
                        id="workerPhone"
                        type="tel"
                        placeholder="Enter phone number"
                        disabled={creatingLineWorker}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Areas</Label>
                      <p className="text-xs text-gray-500">Optional: Leave all unchecked to create worker without area assignments. Areas already assigned to other workers are disabled.</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {areas.map((area) => {
                          const isAssignedToOther = isAreaAssignedToOtherWorker(area.id);
                          const assignedWorker = getAssignedWorkerForArea(area.id);

                          return (
                            <div key={area.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`area-${area.id}`}
                                value={area.id}
                                className="rounded"
                                disabled={creatingLineWorker || isAssignedToOther}
                                style={{ opacity: isAssignedToOther ? 0.5 : 1 }}
                              />
                              <label
                                htmlFor={`area-${area.id}`}
                                className={`text-sm ${isAssignedToOther ? 'text-gray-400 line-through' : ''}`}
                                title={isAssignedToOther ? `Already assigned to: ${assignedWorker?.displayName || 'Unknown Worker'}` : ''}
                              >
                                {area.name}
                                {isAssignedToOther && (
                                  <span className="text-xs text-red-500 ml-2">
                                    (Assigned to {assignedWorker?.displayName || 'Unknown'})
                                  </span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      {areas.some(area => isAreaAssignedToOtherWorker(area.id)) && (
                        <p className="text-xs text-amber-600">
                          ⚠️ Some areas are already assigned to other line workers and cannot be selected.
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={async () => {
                          const email = (document.getElementById('workerEmail') as HTMLInputElement)?.value;
                          const password = (document.getElementById('workerPassword') as HTMLInputElement)?.value;
                          const displayName = (document.getElementById('workerDisplayName') as HTMLInputElement)?.value;
                          const phone = (document.getElementById('workerPhone') as HTMLInputElement)?.value;
                          const assignedAreas: string[] = [];

                          areas.forEach(area => {
                            const checkbox = document.getElementById(`area-${area.id}`) as HTMLInputElement;
                            if (checkbox?.checked) {
                              assignedAreas.push(area.id);
                            }
                          });

                          if (email && password) {
                            const createData: any = {
                              email,
                              password,
                              displayName: displayName || undefined,
                              phone: phone || undefined
                            };

                            // Only include assignedAreas if it has values
                            if (assignedAreas.length > 0) {
                              createData.assignedAreas = assignedAreas;
                            }

                            try {
                              await handleCreateLineWorker(createData);
                            } catch (error) {
                              // Show error to user
                              const errorMessage = error instanceof Error ? error.message : 'Failed to create line worker';
                              setError(errorMessage);
                              setTimeout(() => setError(null), 5000);
                            }
                          } else {
                            setError('Please fill in all required fields');
                            setTimeout(() => setError(null), 5000);
                          }
                        }}
                        disabled={creatingLineWorker}
                      >
                        {creatingLineWorker ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Line Worker'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateLineWorker(false)}
                        disabled={creatingLineWorker}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Line Workers</CardTitle>
          <CardDescription>Manage your line workers and their assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mainLoadingState.loadingState.isRefreshing ? (
              <>
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 animate-pulse" />
                        <Skeleton className="h-3 w-48 animate-pulse" />
                        <Skeleton className="h-3 w-36 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-6 w-16 animate-pulse" />
                      <Skeleton className="h-8 w-20 animate-pulse" />
                      <Skeleton className="h-8 w-16 animate-pulse" />
                      <Skeleton className="h-8 w-16 animate-pulse" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              lineWorkers
                .map((worker) => (
                  <div key={worker.id} className="flex flex-col p-4 border rounded-lg gap-4">
                    {/* Badge positioned at top-right corner */}
                    <div className="self-end sm:self-auto">
                      <Badge className={worker.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {worker.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{worker.displayName}</div>
                        <div className="text-sm text-gray-500">{worker.email}</div>
                        <div className="text-sm text-gray-500">{worker.phone}</div>
                      </div>
                    </div>

                    <div className="flex space-x-2 flex-wrap gap-y-2 sm:flex-nowrap sm:items-center">
                      <Button
                        variant={worker.active ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleLineWorkerStatus(worker.id, worker.active)}
                        className={worker.active ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex-1 sm:flex-none" : "hover:bg-green-50 hover:text-green-600 hover:border-green-200 flex-1 sm:flex-none"}
                      >
                        {worker.active ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingLineWorker(worker);
                          setEditingSelectedAreas(worker.assignedAreas || []);
                          setEditingActiveStatus(worker.active);
                          setShowEditLineWorkerDialog(true);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLineWorker(worker.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Transactions Component
  const Transactions = () => {
    // Filter payments based on selected criteria and sort by most recent first
    const filteredPayments = payments
      .filter(payment => {
        // Apply line worker filter
        if (selectedLineWorker !== "all" && payment.lineWorkerId !== selectedLineWorker) {
          return false;
        }

        // Apply retailer filter
        if (selectedRetailer !== "all" && payment.retailerId !== selectedRetailer) {
          return false;
        }

        // Apply payment method filter
        if (paymentMethodFilter !== 'all' && payment.method !== paymentMethodFilter) {
          return false;
        }

        // Apply date range filter
        const paymentDate = payment.createdAt.toDate();
        if (paymentDate < dateRange.startDate || paymentDate > dateRange.endDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    const completedPayments = filteredPayments.filter(payment => payment.state === 'COMPLETED');
    const pendingCancelledPayments = filteredPayments.filter(payment =>
      ['INITIATED', 'OTP_SENT', 'OTP_VERIFIED', 'CANCELLED', 'EXPIRED'].includes(payment.state)
    );

    // Get count of unverified UPI payments for the alert
    const pendingVerificationCount = payments.filter(p =>
      !p.verified &&
      p.method === 'UPI' &&
      p.state === 'COMPLETED'
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
            <p className="text-gray-600">View and manage all payment transactions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Method Filter */}
            <Select value={paymentMethodFilter} onValueChange={(val: any) => setPaymentMethodFilter(val)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLineWorker} onValueChange={setSelectedLineWorker}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {lineWorkers.filter(worker => worker.active).map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Retailer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Retailers</SelectItem>
                {retailers.map(retailer => (
                  <SelectItem key={retailer.id} value={retailer.id}>{retailer.profile?.realName || retailer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter
              value={selectedDateRangeOption}
              onValueChange={handleDateRangeChange}
            />
            <Button
              onClick={handleManualRefresh}
              disabled={mainLoadingState.loadingState.isRefreshing}
              size="sm"
            >
              {mainLoadingState.loadingState.isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Export filtered transactions as CSV
                const filteredPayments = payments.filter(p => {
                  let include = true;
                  // Filter by payment method
                  if (paymentMethodFilter !== 'all' && p.method !== paymentMethodFilter) include = false;
                  // Filter by line worker
                  if (selectedLineWorker !== 'all' && p.lineWorkerId !== selectedLineWorker) include = false;
                  // Filter by retailer
                  if (selectedRetailer !== 'all' && p.retailerId !== selectedRetailer) include = false;
                  // Filter by date range
                  const paymentDate = p.createdAt?.toDate?.() || new Date(0);
                  if (paymentDate < dateRange.startDate || paymentDate > dateRange.endDate) include = false;
                  return include;
                });

                // Generate CSV
                const headers = ['Date', 'Retailer', 'Amount', 'Method', 'Line Worker', 'UTR', 'Status'];
                const rows = filteredPayments.map(p => [
                  formatTimestamp(p.createdAt),
                  `"${p.retailerName || 'Unknown'}"`,
                  p.totalPaid.toString(),
                  p.method,
                  `"${p.lineWorkerName || 'Unknown'}"`,
                  p.utr || '',
                  p.verified ? 'Verified' : (p.proofUrl ? 'Pending Verification' : 'N/A')
                ]);

                const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const fileName = `Transactions_${formatTimestamp(dateRange.startDate)}_to_${formatTimestamp(dateRange.endDate)}.csv`;

                // Trigger download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {pendingVerificationCount > 0 && (
          <Alert className="bg-blue-50 border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <AlertTitle className="text-blue-800 font-semibold text-base">Payment Proofs Pending Review</AlertTitle>
                <AlertDescription className="text-blue-600">
                  You have <strong>{pendingVerificationCount}</strong> unverified UPI payments waiting for approval.
                </AlertDescription>
              </div>
            </div>
            <Button
              onClick={() => {
                // Find first unverified UPI payment
                const firstPending = payments.filter(p => !p.verified && p.method === 'UPI' && p.state === 'COMPLETED')
                  .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
                if (firstPending) handleOpenVerification(firstPending);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm whitespace-nowrap w-full md:w-auto"
            >
              Review Pending Proofs
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>All payment records in your system</CardDescription>
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
                <div className="overflow-x-auto">
                  {mainLoadingState.loadingState.isRefreshing ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-24 animate-pulse" />
                          <Skeleton className="h-4 w-32 animate-pulse" />
                          <Skeleton className="h-4 w-28 animate-pulse" />
                          <Skeleton className="h-4 w-16 animate-pulse" />
                          <Skeleton className="h-4 w-20 animate-pulse" />
                          <Skeleton className="h-6 w-16 animate-pulse" />
                          <Skeleton className="h-8 w-16 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : completedPayments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Retailer</TableHead>
                          <TableHead>Line Worker</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedPayments.map((payment) => {
                          const retailerExists = retailers.some(r => r.id === payment.retailerId);
                          return (
                            <TableRow key={payment.id} className={!payment.verified && payment.method === 'UPI' ? "bg-blue-50/50" : ""}>
                              <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{payment.retailerName}</span>
                                  {!retailerExists && (
                                    <Badge variant="destructive" className="mt-1 text-xs">Deleted</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{payment.lineWorkerName}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(payment.totalPaid)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{payment.method}</Badge>
                                  {payment.method === 'UPI' && (
                                    payment.verified ? (
                                      <span className="flex items-center text-xs text-green-600 font-medium">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="flex items-center text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        Needs Review
                                      </span>
                                    )
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800">
                                  {payment.state}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  {/* Verification Action */}
                                  {payment.method === 'UPI' && !payment.verified && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenVerification(payment)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                                    >
                                      Verify
                                    </Button>
                                  )}

                                  {/* View Proof Button (if verified but maybe has URL? No, URL is deleted. Just UTR) */}
                                  {payment.method === 'UPI' && payment.verified && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-gray-500 cursor-default hover:bg-transparent"
                                      disabled
                                    >
                                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                      Verified
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No completed payments found matching your filters.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                <div className="overflow-x-auto">
                  {mainLoadingState.loadingState.isRefreshing ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-24 animate-pulse" />
                          <Skeleton className="h-4 w-32 animate-pulse" />
                          <Skeleton className="h-4 w-28 animate-pulse" />
                          <Skeleton className="h-4 w-16 animate-pulse" />
                          <Skeleton className="h-4 w-20 animate-pulse" />
                          <Skeleton className="h-6 w-16 animate-pulse" />
                          <Skeleton className="h-8 w-16 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : pendingCancelledPayments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Retailer</TableHead>
                          <TableHead>Line Worker</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingCancelledPayments.map((payment) => {
                          const retailerExists = retailers.some(r => r.id === payment.retailerId);
                          return (
                            <TableRow key={payment.id}>
                              <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{payment.retailerName}</span>
                                  {!retailerExists && (
                                    <Badge variant="destructive" className="mt-1 text-xs">Deleted</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getLineWorkerName(payment.lineWorkerId)}</TableCell>
                              <TableCell>
                                <div className="text-right">
                                  <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{payment.method}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  payment.state === 'INITIATED' ? 'bg-yellow-100 text-yellow-800' :

                                    'bg-red-100 text-red-800'
                                }>
                                  {payment.state}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => setViewingPayment(payment)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No pending or cancelled payments</h3>
                      <p className="text-gray-500">There are no pending or cancelled payments in the system.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs >
          </CardContent >
        </Card >
      </div >
    );
  };

  // Analytics Component
  const AnalyticsComponent = () => (
    <div className="space-y-6">
      {/* Row 1: Heading and Description */}
      <div className="flex flex-col  pt-16 sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Comprehensive analytics and insights</p>
        </div>
      </div>

      {/* Row 2: Refresh Button */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={handleManualRefresh}
          disabled={mainLoadingState.loadingState.isRefreshing}
        >
          {mainLoadingState.loadingState.isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Row 3: Dropdown and Export */}
      <div className="flex flex-col sm:flex-row sm:justify-start sm:items-center gap-4">
        <Select value={selectedDateRangeOption} onValueChange={handleSelectDateRangeChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="thisWeek">This Week</SelectItem>
            <SelectItem value="lastWeek">Last Week</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <WholesalerAnalytics
        retailers={retailers}
        payments={payments.filter(p => {
          // Filter by selected date range
          const paymentDate = p.createdAt?.toDate?.() || new Date(0);
          return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
        })}
        lineWorkers={lineWorkers}
        areas={areas}
        onRefresh={handleManualRefresh}
        refreshLoading={mainLoadingState.loadingState.isRefreshing}
        tenantId={getCurrentTenantId() || undefined}
      />
    </div>
  );


  // View Payment Dialog Component
  const ViewPaymentDialog = () => (
    <Dialog open={!!viewingPayment} onOpenChange={(open) => !open && setViewingPayment(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            View detailed information about this payment
          </DialogDescription>
        </DialogHeader>
        {viewingPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment ID</Label>
                <div className="font-medium">{viewingPayment.id}</div>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={
                  viewingPayment.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    viewingPayment.state === 'INITIATED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                }>
                  {viewingPayment.state}
                </Badge>
              </div>
              <div>
                <Label>Date</Label>
                <div className="font-medium">{formatTimestampWithTime(viewingPayment.createdAt)}</div>
              </div>
              <div>
                <Label>Method</Label>
                <div className="font-medium">{viewingPayment.method}</div>
              </div>
              <div>
                <Label>Amount Paid</Label>
                <div className="font-medium">{formatCurrency(viewingPayment.totalPaid)}</div>
              </div>
              <div>
                <Label>Retailer</Label>
                <div className="font-medium">{getRetailerName(viewingPayment.retailerId)}</div>
              </div>
              <div>
                <Label>Line Worker</Label>
                <div className="font-medium">{getLineWorkerName(viewingPayment.lineWorkerId)}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Edit Line Worker Dialog Component
  const EditLineWorkerDialog = () => (
    <Dialog open={showEditLineWorkerDialog} onOpenChange={setShowEditLineWorkerDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Line Worker</DialogTitle>
          <DialogDescription>
            Update line worker information and status
          </DialogDescription>
        </DialogHeader>
        {editingLineWorker && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">Display Name</Label>
              <Input
                id="editDisplayName"
                defaultValue={editingLineWorker.displayName}
                placeholder="Enter display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                type="tel"
                defaultValue={editingLineWorker.phone}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editActive">Status</Label>
              <Switch
                id="editActive"
                checked={editingActiveStatus}
                onCheckedChange={setEditingActiveStatus}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Areas</Label>
              <p className="text-xs text-gray-500">Uncheck areas to remove assignment. Areas can be unassigned from all workers.</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {areas.map((area) => {
                  const isAssignedToOther = isAreaAssignedToOtherWorker(area.id, editingLineWorker?.id);
                  const assignedWorker = getAssignedWorkerForArea(area.id);
                  const isCurrentlyAssigned = editingSelectedAreas.includes(area.id);

                  return (
                    <div key={area.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-area-${area.id}`}
                        value={area.id}
                        defaultChecked={isCurrentlyAssigned}
                        disabled={isAssignedToOther && !isCurrentlyAssigned}
                        onChange={(e) => {
                          console.log('🔄 Area checkbox changed:', {
                            areaId: area.id,
                            areaName: area.name,
                            checked: e.target.checked,
                            currentSelectedAreas: editingSelectedAreas,
                            isAssignedToOther,
                            isCurrentlyAssigned
                          });

                          if (e.target.checked) {
                            const newSelectedAreas = [...editingSelectedAreas, area.id];
                            console.log('✅ Adding area to selection:', newSelectedAreas);
                            setEditingSelectedAreas(newSelectedAreas);
                          } else {
                            const newSelectedAreas = editingSelectedAreas.filter(id => id !== area.id);
                            console.log('❌ Removing area from selection:', newSelectedAreas);
                            setEditingSelectedAreas(newSelectedAreas);
                          }
                        }}
                        className={`rounded ${isAssignedToOther && !isCurrentlyAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <label
                        htmlFor={`edit-area-${area.id}`}
                        className={`text-sm ${isAssignedToOther && !isCurrentlyAssigned ? 'text-gray-400' : ''}`}
                      >
                        {area.name}
                        {isAssignedToOther && !isCurrentlyAssigned && (
                          <span className="text-xs text-red-500 ml-2">
                            (Assigned to {assignedWorker?.displayName || 'another worker'})
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => {
                const displayName = (document.getElementById('editDisplayName') as HTMLInputElement)?.value;
                const phone = (document.getElementById('editPhone') as HTMLInputElement)?.value;

                handleUpdateLineWorker({
                  active: editingActiveStatus,
                  displayName: displayName || undefined,
                  phone: phone || undefined
                });
              }}>
                Update Line Worker
              </Button>
              <Button variant="outline" onClick={() => {
                setShowEditLineWorkerDialog(false);
                setEditingLineWorker(null);
                setEditingSelectedAreas([]);
                setEditingActiveStatus(true);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const RetailerAssignmentDialog = () => {
    const currentAssignedWorker = assigningRetailer?.assignedLineWorkerId
      ? lineWorkers.find(worker => worker.id === assigningRetailer.assignedLineWorkerId)
      : null;

    return (
      <Dialog open={showRetailerAssignment} onOpenChange={setShowRetailerAssignment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentAssignedWorker ? 'Reassign Retailer' : 'Assign Retailer'}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              {assigningRetailer ? (
                <>
                  <div>{assigningRetailer.profile ? assigningRetailer.profile.realName : assigningRetailer.name}</div>
                  {currentAssignedWorker && (
                    <div className="text-sm text-gray-600">
                      Currently assigned to: <strong>{currentAssignedWorker.displayName || currentAssignedWorker.email}</strong>
                    </div>
                  )}
                </>
              ) : 'Select a retailer to assign'}
            </DialogDescription>
          </DialogHeader>
          {assigningRetailer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lineWorkerSelect">
                  {currentAssignedWorker ? 'Select New Line Worker' : 'Select Line Worker'}
                </Label>
                <Select value={selectedLineWorkerForAssignment} onValueChange={setSelectedLineWorkerForAssignment}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentAssignedWorker ? "Choose a new line worker or unassign" : "Choose a line worker"} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentAssignedWorker && (
                      <SelectItem value="unassign">Unassign (Remove Assignment)</SelectItem>
                    )}
                    {lineWorkers
                      .filter(worker => worker.active && worker.id !== currentAssignedWorker?.id)
                      .map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.displayName || worker.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleConfirmAssignmentAction(assigningRetailer.id, selectedLineWorkerForAssignment === "unassign" ? null : selectedLineWorkerForAssignment || null)}
                  disabled={!selectedLineWorkerForAssignment && !currentAssignedWorker}
                >
                  {selectedLineWorkerForAssignment === "unassign" ? 'Unassign' :
                    selectedLineWorkerForAssignment ? 'Assign' :
                      currentAssignedWorker ? 'Keep Current Assignment' : 'Assign'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowRetailerAssignment(false);
                  setAssigningRetailer(null);
                  setSelectedLineWorkerForAssignment('');
                  setError(null);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // Main component return - no global loading state

  if (!isWholesalerAdmin) {
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

  const getFilteredPayments = () => {
    const filteredRetailerIds = getFilteredRetailers.map(r => r.id);
    return payments.filter(payment => {
      // Only include payments from filtered retailers
      if (!filteredRetailerIds.includes(payment.retailerId)) {
        return false;
      }

      // Date range filter - only apply for Overview tab
      if (activeNav === 'overview' && dateRange) {
        const paymentDate = toDate(payment.createdAt);
        if (paymentDate < dateRange.startDate || paymentDate > dateRange.endDate) {
          return false;
        }
      }

      // Date filter for Retailer Details tab
      if (activeNav === 'retailer-details' && filterDate?.from) {
        const paymentDate = toDate(payment.createdAt);
        const fromDate = new Date(filterDate.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDateVal = filterDate.to ? new Date(filterDate.to) : new Date(fromDate);
        toDateVal.setHours(23, 59, 59, 999);

        if (paymentDate < fromDate || paymentDate > toDateVal) {
          return false;
        }
      }

      return true;
    });
  };

  // Retailer Details Component - Complete detailed logs of retailers
  const RetailerDetails = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:pt-8  sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retailer Details & Logs</h2>
          <p className="text-gray-600">Complete detailed logs of all retailers and their payments</p>
        </div>
        <Button
          onClick={handleManualRefresh}
          disabled={mainLoadingState.loadingState.isRefreshing}
        >
          {mainLoadingState.loadingState.isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {mainLoadingState.loadingState.isRefreshing && (
        <Card>
          <CardHeader>
            <CardTitle>Retailer Details Loading</CardTitle>
            <CardDescription>Please wait while we fetch the retailer data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 animate-pulse" />
                    <Skeleton className="h-3 w-48 animate-pulse" />
                    <Skeleton className="h-3 w-36 animate-pulse" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-16 animate-pulse" />
                    <Skeleton className="h-8 w-16 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <>
          {/* Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="filterArea">Filter by Area</Label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {areas.map(area => (
                        <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterRetailer">Filter by Retailer</Label>
                  <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select retailer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Retailers</SelectItem>
                      {retailers.map(retailer => (
                        <SelectItem key={retailer.id} value={retailer.id}>{retailer.profile?.realName || retailer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateRange">Filter Date</Label>
                  <ModernDateRangePicker
                    startDate={filterDate?.from || undefined}
                    endDate={filterDate?.to || undefined}
                    onChange={({ startDate, endDate }) => setFilterDate({ from: startDate, to: endDate })}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Retailers</CardTitle>
                <Store className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{getFilteredRetailers.length}</div>
                <p className="text-xs text-gray-500">
                  Total retailers in system
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{getFilteredPayments().length}</div>
                <p className="text-xs text-gray-500">
                  {getFilteredPayments().filter(p => p.state === 'COMPLETED').length} completed
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Collected</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getFilteredPayments().filter(p => p.state === 'COMPLETED').reduce((sum, pay) => sum + pay.totalPaid, 0))}
                </div>
                <p className="text-xs text-gray-500">
                  From completed payments only
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Retailers with Detailed Logs */}
          <div className="space-y-6">
            {getFilteredRetailers.map(retailer => {
              const retailerPayments = getFilteredPayments().filter(pay => pay.retailerId === retailer.id);

              // Determine effective line worker assignment:
              // 1. Direct assignment takes priority
              // 2. If no direct assignment, check area-based assignment
              const directlyAssignedWorker = retailer.assignedLineWorkerId
                ? lineWorkers.find(worker => worker.id === retailer.assignedLineWorkerId)
                : null;

              const areaAssignedWorker = !directlyAssignedWorker && retailer.areaId
                ? getAssignedWorkerForArea(retailer.areaId)
                : null;

              const assignedLineWorker = directlyAssignedWorker || areaAssignedWorker;
              const isDirectAssignment = !!directlyAssignedWorker;

              return (
                <Card key={retailer.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {retailer.profile?.realName || retailer.name}
                          {isDirectAssignment && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Directly Assigned
                            </span>
                          )}
                          {areaAssignedWorker && !isDirectAssignment && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <MapPin className="h-3 w-3 mr-1" />
                              Via Area
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span>
                              <a href={`tel:${retailer.profile?.phone || retailer.phone}`} className="text-blue-600 hover:underline">📞 {retailer.profile?.phone || retailer.phone}</a>
                            </span>
                            <span>📍 {areas.find(a => a.id === retailer.areaId)?.name || 'Unassigned'}</span>
                            <span>🏷️ {retailer.zipcodes.join(', ')}</span>
                            <span className="flex items-center gap-1">
                              👤
                              <span className={assignedLineWorker ? "font-medium text-green-700" : ""}>
                                {assignedLineWorker?.displayName || 'Unassigned'}
                              </span>
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="mt-2">
                          <Button
                            variant={retailer.assignedLineWorkerId ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setAssigningRetailer(retailer);
                              setSelectedLineWorkerForAssignment(retailer.assignedLineWorkerId || '');
                              setShowRetailerAssignment(true);
                            }}
                            className="text-xs"
                          >
                            <UserIcon className="h-3 w-3 mr-1" />
                            {retailer.assignedLineWorkerId ? 'Reassign' : 'Assign'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-xl font-bold text-green-600">{retailerPayments.length}</div>
                        <div className="text-xs text-gray-600">Payments</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="text-lg font-bold text-orange-600">
                          {formatCurrency(retailerPayments.filter(p => p.state === 'COMPLETED').reduce((sum, pay) => sum + pay.totalPaid, 0))}
                        </div>
                        <div className="text-xs text-gray-600">Paid</div>
                      </div>
                    </div>

                    {/* Payment Status Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
                      <div className="text-center p-1 bg-green-50 rounded">
                        <div className="font-medium text-green-700">
                          {retailerPayments.filter(p => p.state === 'COMPLETED').length}
                        </div>
                        <div className="text-green-600">Completed</div>
                      </div>
                      <div className="text-center p-1 bg-yellow-50 rounded">
                        <div className="font-medium text-yellow-700">
                          {retailerPayments.filter(p => p.state === 'INITIATED').length}
                        </div>
                        <div className="text-yellow-600">Initiated</div>
                      </div>
                      <div className="text-center p-1 bg-red-50 rounded">
                        <div className="font-medium text-red-700">
                          {retailerPayments.filter(p => p.state === 'CANCELLED').length}
                        </div>
                        <div className="text-red-600">Failed</div>
                      </div>
                    </div>

                    {/* Payments Tab */}
                    <Tabs defaultValue="payments" className="w-full">
                      <TabsList className="grid w-full grid-cols-1 h-8">
                        <TabsTrigger value="payments" className="text-xs">Payments ({retailerPayments.length})</TabsTrigger>
                      </TabsList>

                      <TabsContent value="payments" className="space-y-4 mt-4">
                        {retailerPayments.length > 0 ? (
                          <div className="overflow-x-auto border rounded-lg">
                            <Table>
                              <TableHeader className="bg-gray-50">
                                <TableRow>
                                  <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Payment ID</TableHead>
                                  <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Date</TableHead>
                                  <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</TableHead>
                                  <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Method</TableHead>
                                  <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Status</TableHead>
                                  <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Line Worker</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-gray-200">
                                {retailerPayments.map(payment => (
                                  <TableRow key={payment.id} className="hover:bg-gray-50">
                                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{payment.id.substring(0, 8)}</TableCell>
                                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</TableCell>
                                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.totalPaid)}</TableCell>
                                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{payment.method}</TableCell>
                                    <TableCell className="px-4 py-2 whitespace-nowrap">
                                      <Badge className={
                                        payment.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                          payment.state === 'INITIATED' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                      }>
                                        {payment.state}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{getLineWorkerName(payment.lineWorkerId)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                            <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            No payments found for this retailer
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!error && getFilteredRetailers.length === 0 && (
        <div className="text-center py-12">
          <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No retailers found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedArea("all");
              setSelectedRetailer("all");
              const today = new Date();
              const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
              setDateRange({ startDate: startOfDay, endDate: endOfDay });
              setSelectedDateRangeOption('today');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );

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
          subtitle="Wholesaler Dashboard"
          notificationCount={notificationCount}
          notifications={notifications}
          user={user ? { displayName: user.displayName, email: user.email } : undefined}
          onLogout={() => setShowLogoutConfirmation(true)}
        />

        {/* Logout Confirmation Modal */}
        <LogoutConfirmation
          open={showLogoutConfirmation}
          onOpenChange={setShowLogoutConfirmation}
          onConfirm={logout}
          userName={user?.displayName || user?.email}
        />

        {/* Tenant Selector for Super Admin */}
        {isSuperAdmin && (
          <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Working with Tenant:</label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTenant && (
                <p className="text-sm text-red-600">Please select a tenant to continue</p>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 pt-20 lg:pt-0 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4 sm:mb-6">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {activeNav === 'overview' && renderOverview()}
            {activeNav === 'areas' && <Areas />}
            {activeNav === 'retailers' && <Retailers />}
            {activeNav === 'retailer-details' && <RetailerDetails />}
            {activeNav === 'workers' && <LineWorkers />}
            {activeNav === 'transactions' && <Transactions />}
            {activeNav === 'analytics' && <AnalyticsComponent />}
            {activeNav === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
                <WholesalerProfileSettings
                  tenantId={getCurrentTenantId() || ''}
                  onProfileUpdated={() => fetchDashboardData()}
                />
              </div>
            )}

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



          {/* Payment Verification Modal */}
          <PaymentVerificationModal
            payment={selectedPaymentForVerification}
            isOpen={isVerificationModalOpen}
            onClose={() => {
              setIsVerificationModalOpen(false);
              setSelectedPaymentForVerification(null);
            }}
            onVerify={handleVerifyPayment}
            onSkip={handleSkipVerification}
            isVerifying={isMarkingVerified}
          />

          {/* Dialog Components */}
          {ViewPaymentDialog()}

          {/* Edit Line Worker Dialog */}
          {EditLineWorkerDialog()}

          {/* Retailer Assignment Dialog */}

          {/* Assignment Confirmation Dialog */}
          <AlertDialog open={showAssignmentConfirmation} onOpenChange={setShowAssignmentConfirmation}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pendingAssignment?.action === 'unassign' ? 'Unassign Retailer' : 'Reassign Retailer'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingAssignment?.action === 'unassign' ? (
                    <>
                      Are you sure you want to unassign <strong>{pendingAssignment?.retailerName}</strong> from <strong>{pendingAssignment?.lineWorkerName}</strong>?
                      <br /><br />
                      <span className="text-sm text-amber-600">
                        This retailer will no longer be visible to this line worker unless assigned to an area they manage.
                      </span>
                    </>
                  ) : (
                    <>
                      Are you sure you want to reassign <strong>{pendingAssignment?.retailerName}</strong> from <strong>{pendingAssignment?.lineWorkerName}</strong> to a different line worker?
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelPendingAssignment}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={executeConfirmedAssignment}>
                  {pendingAssignment?.action === 'unassign' ? 'Unassign' : 'Reassign'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Success Feedback */}
          <SuccessFeedback
            show={feedback.show}
            message={feedback.message}
            onClose={hideSuccess}
          />

        </main>


      </div>

    </>


  );


};

export default WholesalerAdminDashboard;