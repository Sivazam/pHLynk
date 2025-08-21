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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { useAuth, useWholesalerAdmin, useSuperAdmin } from '@/contexts/AuthContext';
import { 
  areaService, 
  retailerService, 
  invoiceService, 
  userService,
  paymentService,
  DashboardService,
  tenantService
} from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { Area, Retailer, Invoice, User, Payment, DashboardStats } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp, formatTimestampWithTime, formatCurrency, toDate } from '@/lib/timestamp-utils';
import { CreateAreaForm } from '@/components/ui/create-area-form';
import { CreateRetailerForm } from '@/components/ui/create-retailer-form';
import { CreateInvoiceForm } from '@/components/CreateInvoiceForm';
import { WholesalerAnalytics } from '@/components/WholesalerAnalytics';
import { 
  // Navigation
  LayoutDashboard,
  MapPin,
  Store,
  FileText,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  LogOut,
  Bell,
  
  // Actions
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
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
  Loader2
} from 'lucide-react';

// Activity Log Type
interface ActivityLog {
  id: string;
  type: 'PAYMENT' | 'INVOICE' | 'RETAILER' | 'LINEWORKER' | 'AREA';
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [lineWorkers, setLineWorkers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [activeNav, setActiveNav] = useState('overview');
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [showCreateRetailer, setShowCreateRetailer] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateLineWorker, setShowCreateLineWorker] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);
  const [editingLineWorker, setEditingLineWorker] = useState<User | null>(null);
  const [showEditLineWorkerDialog, setShowEditLineWorkerDialog] = useState(false);
  const [editingSelectedAreas, setEditingSelectedAreas] = useState<string[]>([]);
  const [editingActiveStatus, setEditingActiveStatus] = useState<boolean>(true);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  
  // Invoice creation state
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  
  // Filter States
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedLineWorker, setSelectedLineWorker] = useState<string>("all");
  const [selectedRetailer, setSelectedRetailer] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveWorkers, setShowInactiveWorkers] = useState<boolean>(false);
  
  // Real-time updates
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshLoading, setRefreshLoading] = useState(false);
  
  // Tenant management for super admin
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Retailer assignment state
  const [showRetailerAssignment, setShowRetailerAssignment] = useState(false);
  const [assigningRetailer, setAssigningRetailer] = useState<Retailer | null>(null);
  const [selectedLineWorkerForAssignment, setSelectedLineWorkerForAssignment] = useState<string>('');

  // Debug logging for notifications
  useEffect(() => {
    console.log('🔔 Notification state updated:', {
      count: notificationCount,
      notifications: notifications.length,
      notificationList: notifications.map(n => ({ id: n.id, title: n.title, read: n.read }))
    });
  }, [notificationCount, notifications]);

  // Initialize super admin state and fetch tenants
  useEffect(() => {
    setIsSuperAdmin(isSuperAdminUser);
    if (isSuperAdminUser) {
      fetchTenants();
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

  // Helper function to get the current tenant ID
  const getCurrentTenantId = (): string | null => {
    if (isSuperAdmin && selectedTenant) {
      return selectedTenant;
    }
    return user?.tenantId && user.tenantId !== 'system' ? user.tenantId : null;
  };

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'areas', label: 'Areas', icon: MapPin },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'retailer-details', label: 'Retailer Details', icon: Eye },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'workers', label: 'Line Workers', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isWholesalerAdmin && user?.uid && currentTenantId) {
      console.log('🔔 Setting up wholesaler admin real-time notifications for user:', user.uid, 'tenant:', currentTenantId);
      fetchDashboardData();
      
      // Start real-time notifications - ensure it's always set up
      realtimeNotificationService.startListening(
        user.uid,
        'WHOLESALER_ADMIN',
        currentTenantId,
        (newNotifications) => {
          console.log('🔔 Received real-time notifications callback:', newNotifications.length, 'notifications');
          console.log('🔔 Real-time notification details:', newNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));
          setNotifications(newNotifications);
          setNotificationCount(newNotifications.filter(n => !n.read).length);
        }
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

  // Separate effect for data fetching when filters change
  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isWholesalerAdmin && user?.uid && currentTenantId) {
      fetchDashboardData();
    }
  }, [activeNav, dateRange, selectedLineWorker, selectedRetailer, selectedTenant]); // Also fetch when tenant changes

  // Effect to sync notifications with notification service
  useEffect(() => {
    if (isWholesalerAdmin && user?.uid) {
      console.log('🔔 Setting up notification service sync for user:', user.uid);
      
      // Add a listener to the notification service to ensure we stay in sync
      const notificationListener = (newNotifications: NotificationItem[]) => {
        console.log('🔔 Notification service update received:', newNotifications.length, 'notifications');
        console.log('🔔 Notification details:', newNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));
        setNotifications(newNotifications);
        setNotificationCount(newNotifications.filter(n => !n.read).length);
      };

      notificationService.addListener(notificationListener);

      // Initial sync
      const currentNotifications = notificationService.getNotifications();
      console.log('🔔 Initial notification sync:', currentNotifications.length, 'notifications');
      console.log('🔔 Initial notification details:', currentNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));
      setNotifications(currentNotifications);
      setNotificationCount(currentNotifications.filter(n => !n.read).length);

      return () => {
        console.log('🔔 Cleaning up notification service listener for user:', user.uid);
        notificationService.removeListener(notificationListener);
      };
    }
  }, [isWholesalerAdmin, user]);

  const fetchDashboardData = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) {
      setError('No tenant selected. Please select a tenant to continue.');
      return;
    }
    
    setError(null);
    
    try {
      // Fetch base data
      const [areasData, retailersData, invoicesData, lineWorkersData, stats] = await Promise.all([
        areaService.getActiveAreas(currentTenantId),
        retailerService.getAll(currentTenantId),
        invoiceService.getAll(currentTenantId),
        userService.getAllUsersByRole(currentTenantId, 'LINE_WORKER'),
        DashboardService.getWholesalerDashboardStats(currentTenantId)
      ]);

      // Fetch payments with filters
      let paymentsData = await paymentService.getAll(currentTenantId);
      let paymentsQuery = paymentsData;
      if (selectedLineWorker && selectedLineWorker !== "all") {
        paymentsQuery = paymentsQuery.filter(p => p.lineWorkerId === selectedLineWorker);
      }
      if (selectedRetailer && selectedRetailer !== "all") {
        paymentsQuery = paymentsQuery.filter(p => p.retailerId === selectedRetailer);
      }
      if (dateRange) {
        paymentsQuery = paymentsQuery.filter(p => {
          const paymentDate = p.createdAt.toDate();
          return paymentDate >= dateRange.from && paymentDate <= dateRange.to;
        });
      }

      setAreas(areasData);
      setRetailers(retailersData);
      setInvoices(invoicesData);
      setLineWorkers(lineWorkersData);
      console.log('📊 Fetched line workers:', lineWorkersData.map(w => ({
        id: w.id,
        displayName: w.displayName,
        assignedAreas: w.assignedAreas
      })));
      
      setPayments(paymentsQuery);
      setDashboardStats(stats);
      
      // Recompute retailer data for accuracy
      try {
        console.log('🔄 Recomputing retailer data for accuracy...');
        for (const retailer of retailersData) {
          await retailerService.recomputeRetailerData(retailer.id, currentTenantId);
        }
        // Refresh retailers after recomputation
        const updatedRetailers = await retailerService.getAll(currentTenantId);
        setRetailers(updatedRetailers);
        console.log('✅ Retailer data recomputed and updated');
      } catch (error) {
        console.warn('Warning: Could not recompute retailer data:', error);
      }
      
      // Generate activity logs
      const logs = generateActivityLogs(paymentsQuery, invoicesData, retailersData, lineWorkersData);
      setActivityLogs(logs);
      
      // Note: Notifications are now handled by real-time service only
      // Local notification generation removed to prevent conflicts
      
      setLastUpdate(new Date());
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    }
  };

  const handleManualRefresh = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;
    
    setRefreshLoading(true);
    try {
      await fetchDashboardData();
      
      // Also refresh notifications manually
      const currentNotifications = notificationService.getNotifications();
      console.log('🔔 Manual notification refresh:', currentNotifications.length, 'notifications');
      console.log('🔔 Manual refresh notification details:', currentNotifications.map(n => ({ id: n.id, title: n.title, read: n.read })));
      setNotifications(currentNotifications);
      setNotificationCount(currentNotifications.filter(n => !n.read).length);
      
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setRefreshLoading(false);
    }
  };

  // Test function to add a notification
  const addTestNotification = () => {
    console.log('🔔 Adding test notification');
    const testNotification = {
      type: 'success' as const,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      timestamp: new Date(),
      read: false
    };
    const notificationId = notificationService.addNotification(testNotification);
    console.log('🔔 Test notification added with ID:', notificationId);
  };

  const generateNotifications = (payments: Payment[], invoices: Invoice[], retailers: Retailer[], workers: User[]): NotificationItem[] => {
    const notifications: NotificationItem[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('Generating notifications with:', {
      payments: payments.length,
      invoices: invoices.length,
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
      const retailer = retailers.find(r => r.id === payment.retailerId);
      const timeDiff = Math.floor((now.getTime() - toDate(payment.createdAt).getTime()) / (60 * 60 * 1000));
      
      notifications.push({
        id: `payment_pending_${payment.id}`,
        type: 'warning',
        title: 'Payment pending',
        message: `${worker?.displayName || 'Line worker'} has pending payment of ₹${payment.totalPaid.toLocaleString()} from ${retailer?.name || 'retailer'} (${timeDiff}h ago)`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        initiatedAt: formatTimestampWithTime(payment.createdAt)
      });
    });

    // 3. Failed payments - Warning notifications
    const failedPayments = payments.filter(payment => payment.state === 'FAILED');

    console.log('Failed payments:', failedPayments.length);

    failedPayments.slice(0, 3).forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailer = retailers.find(r => r.id === payment.retailerId);
      
      notifications.push({
        id: `payment_failed_${payment.id}`,
        type: 'warning',
        title: 'Payment failed',
        message: `Payment of ₹${payment.totalPaid.toLocaleString()} from ${retailer?.name || 'retailer'} failed for ${worker?.displayName || 'line worker'}`,
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
          name: current.name
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

    // 5. Overdue invoices - Warning notifications
    const overdueInvoices = invoices.filter(invoice => {
      const dueDate = toDate(invoice.dueDate);
      return dueDate < now && invoice.status !== 'PAID';
    });

    console.log('Overdue invoices:', overdueInvoices.length);

    overdueInvoices.slice(0, 5).forEach(invoice => {
      const retailer = retailers.find(r => r.id === invoice.retailerId);
      const daysOverdue = Math.floor((now.getTime() - toDate(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000));
      
      notifications.push({
        id: `overdue_invoice_${invoice.id}`,
        type: 'warning',
        title: 'Overdue invoice',
        message: `Invoice #${invoice.invoiceNumber} for ${retailer?.name || 'retailer'} is ${daysOverdue} days overdue (₹${invoice.totalAmount.toLocaleString()})`,
        timestamp: toDate(invoice.dueDate),
        read: false,
        amount: invoice.totalAmount,
        dueDate: formatTimestamp(invoice.dueDate)
      });
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

  const generateActivityLogs = (payments: Payment[], invoices: Invoice[], retailers: Retailer[], workers: User[]): ActivityLog[] => {
    const logs: ActivityLog[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Payment activities
    const recentPayments = payments.filter(p => toDate(p.createdAt) >= sevenDaysAgo);
    
    recentPayments.forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailer = retailers.find(r => r.id === payment.retailerId);
      
      logs.push({
        id: `payment_${payment.id}`,
        type: 'PAYMENT',
        action: payment.state.toLowerCase(),
        description: `${payment.state} payment of ₹${payment.totalPaid.toLocaleString()} from ${retailer?.name || 'retailer'}`,
        amount: payment.totalPaid,
        actorName: worker?.displayName || 'Unknown',
        actorType: 'LINE_WORKER',
        targetName: retailer?.name || 'retailer',
        targetType: 'RETAILER',
        timestamp: payment.createdAt
      });
    });

    // Invoice activities
    const recentInvoices = invoices.filter(i => toDate(i.issueDate) >= sevenDaysAgo);
    
    recentInvoices.forEach(invoice => {
      const retailer = retailers.find(r => r.id === invoice.retailerId);
      
      // Use userInvoiceNumber if available, otherwise fall back to system invoiceNumber
      const displayInvoiceNumber = invoice.userInvoiceNumber || invoice.invoiceNumber;
      
      logs.push({
        id: `invoice_${invoice.id}`,
        type: 'INVOICE',
        action: 'created',
        description: `Invoice #${displayInvoiceNumber} created for ${retailer?.name || 'retailer'}`,
        amount: invoice.totalAmount,
        actorName: 'System',
        actorType: 'SYSTEM',
        targetName: retailer?.name || 'retailer',
        targetType: 'RETAILER',
        timestamp: invoice.issueDate
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
      await retailerService.assignLineWorker(currentTenantId, retailerId, lineWorkerId);
      await fetchDashboardData();
      setShowRetailerAssignment(false);
      setAssigningRetailer(null);
      setSelectedLineWorkerForAssignment('');
      setError(null);
    } catch (err: any) {
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
      await areaService.create({
        name: data.name,
        zipcodes: data.zipcodes,
        active: true
      }, currentTenantId);
      
      await fetchDashboardData();
      setShowCreateArea(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create area');
    }
  };

  const handleCreateRetailer = async (data: { name: string; phone: string; address: string; areaId: string; zipcodes: string[] }) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) {
      setError('No tenant selected. Please select a tenant to continue.');
      return;
    }
    
    try {
      await retailerService.create({
        name: data.name,
        phone: data.phone,
        address: data.address,
        areaId: data.areaId,
        zipcodes: data.zipcodes,
        active: true,
        currentOutstanding: 0,
        totalCollected: 0,
        totalBilled: 0
      }, currentTenantId);
      
      await fetchDashboardData();
      setShowCreateRetailer(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create retailer');
    }
  };

  const handleCreateLineWorker = async (data: { email: string; password: string; displayName?: string; phone?: string; assignedAreas?: string[] }) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;
    
    try {
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
      
      await userService.createUserWithAuth(currentTenantId, userData);
      
      await fetchDashboardData();
      setShowCreateLineWorker(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create line worker');
    }
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
    
    if (confirm('Are you sure you want to delete this retailer? This action cannot be undone.')) {
      try {
        await retailerService.delete(retailerId, currentTenantId);
        await fetchDashboardData();
      } catch (err: any) {
        setError(err.message || 'Failed to delete retailer');
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
      
      console.log('✅ Line worker updated, fetching fresh data...');
      await fetchDashboardData();
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
    return retailers.find(r => r.id === retailerId)?.name || 'Unknown';
  };

  const getLineWorkerName = (workerId: string) => {
    return lineWorkers.find(w => w.id === workerId)?.displayName || 'Unknown';
  };

  // Invoice Creation Helper Functions
  const generateSystemInvoiceId = (userInvoiceNumber: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `INV-${timestamp}-${random}-${userInvoiceNumber}`;
  };

  // New invoice creation handler
  const handleCreateInvoice = async (formData: any) => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;
    
    setCreatingInvoice(true);
    
    try {
      // Calculate totals
      const subtotal = formData.lineItems.reduce((sum: number, item: any) => sum + (item.qty * item.unitPrice), 0);
      const gstAmount = formData.lineItems.reduce((sum: number, item: any) => {
        const gstPercent = item.gstPercent || 0;
        return sum + (item.qty * item.unitPrice * gstPercent / 100);
      }, 0);
      const totalAmount = subtotal + gstAmount;
      
      // Generate system invoice ID
      const systemInvoiceId = generateSystemInvoiceId(formData.invoiceNumber);
      
      // Create invoice data
      const invoiceData = {
        retailerId: formData.retailerId,
        invoiceNumber: systemInvoiceId, // Use system ID as the primary invoice number
        userInvoiceNumber: formData.invoiceNumber, // Store user input separately
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        subtotal,
        gstAmount,
        totalAmount,
        outstandingAmount: totalAmount,
        status: 'PENDING' as const,
        lineItems: formData.lineItems.filter((item: any) => item.name.trim()),
        version: 1,
        attachments: []
      };
      
      // Create invoice
      const invoiceId = await invoiceService.createInvoice(user.tenantId, invoiceData);
      
      // Refresh data
      await fetchDashboardData();
      
      // Close dialog
      setShowCreateInvoice(false);
      
      // Show success message
      alert(`Invoice created successfully! System ID: ${systemInvoiceId}`);
      
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(`Failed to create invoice: ${error.message}`);
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Stats Cards Component
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          <div className="bg-blue-100 p-2 rounded-full">
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboardStats?.totalRevenue || 0)}
          </div>
          <p className="text-xs text-gray-500">
            +12.5% from last month
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
          <div className="bg-green-100 p-2 rounded-full">
            <AlertCircle className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboardStats?.totalOutstanding || 0)}
          </div>
          <p className="text-xs text-gray-500">
            {retailers.filter(r => r.currentOutstanding > 0).length} retailers with dues
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Active Retailers</CardTitle>
          <div className="bg-purple-100 p-2 rounded-full">
            <Store className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
          <p className="text-xs text-gray-500">
            Across {areas.length} areas
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Line Workers</CardTitle>
          <div className="bg-orange-100 p-2 rounded-full">
            <Users className="h-4 w-4 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {lineWorkers.filter(w => w.active).length}
          </div>
          <p className="text-xs text-gray-500">
            of {lineWorkers.length} total
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Overview Component
  const Overview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex space-x-2">
          {/* Test Notification Button - Temporary for debugging */}
          <Button
            variant="outline"
            size="sm"
            onClick={addTestNotification}
            className="text-xs"
          >
            Test Notification
          </Button>
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>
      <StatsCards />
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest activities in your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {refreshLoading ? (
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
                    {log.type === 'INVOICE' && <FileText className="h-5 w-5 text-blue-600" />}
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
                <p className="text-gray-500">There have been no payments or invoice activities in the last 7 days.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Areas Component
  const Areas = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Areas Management</h2>
          <p className="text-gray-600">Manage your service areas and zip codes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
          <Dialog open={showCreateArea} onOpenChange={setShowCreateArea}>
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
            {refreshLoading ? (
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
                <div key={area.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleArea(area.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteArea(area.id)}
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retailers Management</h2>
          <p className="text-gray-600">Manage your retailer network</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleManualRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Dialog open={showCreateRetailer} onOpenChange={setShowCreateRetailer}>
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
                onSubmit={handleCreateRetailer}
                areas={areas}
                onCancel={() => setShowCreateRetailer(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Retailers</CardTitle>
          <CardDescription>Manage your retailer network</CardDescription>
        </CardHeader>
        <CardContent>
          {refreshLoading ? (
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
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retailers.map((retailer) => (
                    <TableRow key={retailer.id}>
                      <TableCell>
                        <div className="font-medium">{retailer.name}</div>
                        <div className="text-sm text-gray-500">{retailer.address}</div>
                      </TableCell>
                      <TableCell>
                        {areas.find(a => a.id === retailer.areaId)?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>{retailer.phone}</TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(retailer.currentOutstanding)}</div>
                        </div>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Retailer</DialogTitle>
              <DialogDescription>
                Update retailer information
              </DialogDescription>
            </DialogHeader>
            {editingRetailer && (
              <CreateRetailerForm 
                onSubmit={async (data) => {
                  const currentTenantId = getCurrentTenantId();
                  if (!currentTenantId) return;
                  
                  try {
                    await retailerService.update(editingRetailer.id, {
                      name: data.name,
                      phone: data.phone,
                      address: data.address,
                      areaId: data.areaId,
                      zipcodes: data.zipcodes
                    }, currentTenantId);
                    await fetchDashboardData();
                    setEditingRetailer(null);
                  } catch (err: any) {
                    setError(err.message || 'Failed to update retailer');
                  }
                }}
                areas={areas}
                onCancel={() => setEditingRetailer(null)}
                initialData={editingRetailer}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  // Invoices Component
  const Invoices = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoices Management</h2>
          <p className="text-gray-600">Manage all invoices in your system</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
          <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Generate a new invoice for a retailer
                </DialogDescription>
              </DialogHeader>
              <CreateInvoiceForm 
                retailers={retailers}
                onCreateInvoice={handleCreateInvoice}
                onCancel={() => setShowCreateInvoice(false)}
                creatingInvoice={creatingInvoice}
                key="invoice-form" // Add key to prevent remounting
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Manage all invoices in your system</CardDescription>
        </CardHeader>
        <CardContent>
          {refreshLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-20 animate-pulse" />
                  <Skeleton className="h-4 w-32 animate-pulse" />
                  <Skeleton className="h-4 w-24 animate-pulse" />
                  <Skeleton className="h-4 w-24 animate-pulse" />
                  <Skeleton className="h-4 w-16 animate-pulse" />
                  <Skeleton className="h-6 w-16 animate-pulse" />
                  <Skeleton className="h-8 w-16 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                        {invoice.userInvoiceNumber && (
                          <div className="text-sm text-gray-500">User: {invoice.userInvoiceNumber}</div>
                        )}
                      </TableCell>
                      <TableCell>{getRetailerName(invoice.retailerId)}</TableCell>
                      <TableCell>{formatTimestamp(invoice.issueDate)}</TableCell>
                      <TableCell>{formatTimestamp(invoice.dueDate)}</TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(invoice.totalAmount)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setViewingInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Line Workers Component
  const LineWorkers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Line Workers Management</h2>
          <p className="text-gray-600">Manage your line workers and their assignments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
          <Dialog open={showCreateLineWorker} onOpenChange={setShowCreateLineWorker}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Line Worker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Line Worker</DialogTitle>
                <DialogDescription>
                  Add a new line worker to your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workerEmail">Email</Label>
                  <Input
                    id="workerEmail"
                    type="email"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workerPassword">Password</Label>
                  <Input
                    id="workerPassword"
                    type="password"
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workerDisplayName">Display Name</Label>
                  <Input
                    id="workerDisplayName"
                    placeholder="Enter display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workerPhone">Phone</Label>
                  <Input
                    id="workerPhone"
                    type="tel"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Areas</Label>
                  <p className="text-xs text-gray-500">Optional: Leave all unchecked to create worker without area assignments.</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {areas.map((area) => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`area-${area.id}`}
                          value={area.id}
                          className="rounded"
                        />
                        <label htmlFor={`area-${area.id}`} className="text-sm">{area.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => {
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
                      
                      handleCreateLineWorker(createData);
                    }
                  }}>
                    Create Line Worker
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateLineWorker(false)}>
                    Cancel
                  </Button>
                </div>
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
            {refreshLoading ? (
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
                  <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                    <div className="flex items-center space-x-4">
                      <Badge className={worker.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {worker.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant={worker.active ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleLineWorkerStatus(worker.id, worker.active)}
                        className={worker.active ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200" : "hover:bg-green-50 hover:text-green-600 hover:border-green-200"}
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
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLineWorker(worker.id)}
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
  const Transactions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-gray-600">View and manage all payment transactions</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedLineWorker} onValueChange={setSelectedLineWorker}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by worker" />
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by retailer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Retailers</SelectItem>
              {retailers.map(retailer => (
                <SelectItem key={retailer.id} value={retailer.id}>{retailer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleManualRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>All payment records in your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {refreshLoading ? (
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
            ) : (
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
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                      <TableCell>{getRetailerName(payment.retailerId)}</TableCell>
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
                          payment.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
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
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Analytics Component
  const AnalyticsComponent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Comprehensive analytics and insights</p>
        </div>
      </div>

      <WholesalerAnalytics 
        retailers={retailers}
        payments={payments}
        lineWorkers={lineWorkers}
        invoices={invoices}
        areas={areas}
        onRefresh={handleManualRefresh}
        refreshLoading={refreshLoading}
      />
    </div>
  );

  // View Invoice Dialog Component
  const ViewInvoiceDialog = () => (
    <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>
            View detailed information about this invoice
          </DialogDescription>
        </DialogHeader>
        {viewingInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number</Label>
                <div className="font-medium">{viewingInvoice.invoiceNumber}</div>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={
                  viewingInvoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                  viewingInvoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {viewingInvoice.status}
                </Badge>
              </div>
              <div>
                <Label>Issue Date</Label>
                <div className="font-medium">{formatTimestamp(viewingInvoice.issueDate)}</div>
              </div>
              <div>
                <Label>Due Date</Label>
                <div className="font-medium">{formatTimestamp(viewingInvoice.dueDate)}</div>
              </div>
              <div>
                <Label>Total Amount</Label>
                <div className="font-medium">{formatCurrency(viewingInvoice.totalAmount)}</div>
              </div>
              <div>
                <Label>Retailer</Label>
                <div className="font-medium">{getRetailerName(viewingInvoice.retailerId)}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
              <div>
                <Label>Notes</Label>
                <div className="font-medium">{viewingPayment.notes || 'No notes'}</div>
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
            <DialogDescription>
              {assigningRetailer ? (
                <div>
                  <p>{assigningRetailer.name}</p>
                  {currentAssignedWorker && (
                    <p className="text-sm text-gray-600 mt-1">
                      Currently assigned to: <strong>{currentAssignedWorker.displayName || currentAssignedWorker.email}</strong>
                    </p>
                  )}
                </div>
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
                  onClick={() => handleAssignRetailer(assigningRetailer.id, selectedLineWorkerForAssignment === "unassign" ? null : selectedLineWorkerForAssignment || null)}
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

  // Filter functions for retailer details
  const getFilteredRetailers = () => {
    return retailers.filter(retailer => {
      // Area filter
      if (selectedArea !== "all" && retailer.areaId !== selectedArea) {
        return false;
      }
      
      // Retailer filter
      if (selectedRetailer !== "all" && retailer.id !== selectedRetailer) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = retailer.name.toLowerCase().includes(searchLower);
        const matchesPhone = retailer.phone.toLowerCase().includes(searchLower);
        const matchesAddress = retailer.address?.toLowerCase().includes(searchLower);
        const matchesZipcodes = retailer.zipcodes.some(zip => zip.toLowerCase().includes(searchLower));
        
        if (!matchesName && !matchesPhone && !matchesAddress && !matchesZipcodes) {
          return false;
        }
      }
      
      return true;
    });
  };

  const getFilteredInvoices = () => {
    const filteredRetailerIds = getFilteredRetailers().map(r => r.id);
    return invoices.filter(invoice => {
      // Only include invoices from filtered retailers
      if (!filteredRetailerIds.includes(invoice.retailerId)) {
        return false;
      }
      
      // Date range filter
      if (dateRange) {
        const invoiceDate = toDate(invoice.issueDate);
        if (invoiceDate < dateRange.from || invoiceDate > dateRange.to) {
          return false;
        }
      }
      
      return true;
    });
  };

  const getFilteredPayments = () => {
    const filteredRetailerIds = getFilteredRetailers().map(r => r.id);
    return payments.filter(payment => {
      // Only include payments from filtered retailers
      if (!filteredRetailerIds.includes(payment.retailerId)) {
        return false;
      }
      
      // Date range filter
      if (dateRange) {
        const paymentDate = toDate(payment.createdAt);
        if (paymentDate < dateRange.from || paymentDate > dateRange.to) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Retailer Details Component - Complete detailed logs of retailers
  const RetailerDetails = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retailer Details & Logs</h2>
          <p className="text-gray-600">Complete detailed logs of all retailers including invoices and payments</p>
        </div>
        <Button
          onClick={handleManualRefresh}
          disabled={refreshLoading}
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {refreshLoading && (
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
                      <SelectItem key={retailer.id} value={retailer.id}>{retailer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="searchRetailer">Search Retailers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="searchRetailer"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dateRange">Date Range</Label>
                <DatePicker
                  selected={dateRange?.from}
                  onChange={(range) => setDateRange(range)}
                  selectsRange
                  placeholderText="Select date range"
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
              <div className="text-2xl font-bold text-gray-900">{getFilteredRetailers().length}</div>
              <p className="text-xs text-gray-500">
                {getFilteredRetailers().filter(r => r.currentOutstanding > 0).length} with outstanding balance
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{getFilteredInvoices().length}</div>
              <p className="text-xs text-gray-500">
                {getFilteredInvoices().filter(i => i.status === 'PAID').length} paid
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

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(getFilteredRetailers().reduce((sum, r) => sum + r.currentOutstanding, 0))}
              </div>
              <p className="text-xs text-gray-500">
                Across filtered retailers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Retailers with Detailed Logs */}
        <div className="space-y-6">
          {getFilteredRetailers().map(retailer => {
            const retailerInvoices = getFilteredInvoices().filter(inv => inv.retailerId === retailer.id);
            const retailerPayments = getFilteredPayments().filter(pay => pay.retailerId === retailer.id);
            // Check for direct assignment first, then fall back to area-based assignment
            const assignedLineWorker = retailer.assignedLineWorkerId 
              ? lineWorkers.find(worker => worker.id === retailer.assignedLineWorkerId)
              : lineWorkers.find(worker => 
                  worker.assignedAreas?.includes(retailer.areaId || '') ||
                  (worker.assignedZips && retailer.zipcodes.some(zip => worker.assignedZips?.includes(zip)))
                );

            return (
              <Card key={retailer.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {retailer.name}
                        {retailer.assignedLineWorkerId && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserIcon className="h-3 w-3 mr-1" />
                            Directly Assigned
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span>📞 {retailer.phone}</span>
                          <span>📍 {areas.find(a => a.id === retailer.areaId)?.name || 'Unassigned'}</span>
                          <span>🏷️ {retailer.zipcodes.join(', ')}</span>
                          <span className="flex items-center gap-1">
                            👤 
                            <span className={retailer.assignedLineWorkerId ? "font-medium text-green-700" : ""}>
                              {assignedLineWorker?.displayName || 'Unassigned'}
                            </span>
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(retailer.currentOutstanding)}
                      </div>
                      <div className="text-sm text-gray-500">Outstanding</div>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-600">{retailerInvoices.length}</div>
                      <div className="text-xs text-gray-600">Invoices</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xl font-bold text-green-600">{retailerPayments.length}</div>
                      <div className="text-xs text-gray-600">Payments</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(retailerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
                      </div>
                      <div className="text-xs text-gray-600">Billed</div>
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
                    <div className="text-center p-1 bg-blue-50 rounded">
                      <div className="font-medium text-blue-700">
                        {retailerPayments.filter(p => p.state === 'OTP_SENT').length}
                      </div>
                      <div className="text-blue-600">OTP Sent</div>
                    </div>
                    <div className="text-center p-1 bg-red-50 rounded">
                      <div className="font-medium text-red-700">
                        {retailerPayments.filter(p => p.state === 'FAILED').length}
                      </div>
                      <div className="text-red-600">Failed</div>
                    </div>
                  </div>

                  {/* Tabs for Invoices and Payments */}
                  <Tabs defaultValue="invoices" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="invoices" className="text-xs">Invoices ({retailerInvoices.length})</TabsTrigger>
                      <TabsTrigger value="payments" className="text-xs">Payments ({retailerPayments.length})</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="invoices" className="space-y-4 mt-4">
                      {retailerInvoices.length > 0 ? (
                        <div className="overflow-x-auto border rounded-lg">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice #</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Date</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Due Date</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Status</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700 uppercase tracking-wider">Outstanding</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-200">
                              {retailerInvoices.map(invoice => (
                                <TableRow key={invoice.id} className="hover:bg-gray-50">
                                  <TableCell className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {invoice.invoiceNumber}
                                    {invoice.userInvoiceNumber && (
                                      <div className="text-xs text-gray-500">User: {invoice.userInvoiceNumber}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(invoice.issueDate)}</TableCell>
                                  <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(invoice.dueDate)}</TableCell>
                                  <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.totalAmount)}</TableCell>
                                  <TableCell className="px-4 py-2 whitespace-nowrap">
                                    <Badge className={
                                      invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                      invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }>
                                      {invoice.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.outstandingAmount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          No invoices found for this retailer
                        </div>
                      )}
                    </TabsContent>
                    
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
      
      {!error && getFilteredRetailers().length === 0 && (
        <div className="text-center py-12">
          <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No retailers found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedArea("all");
              setSelectedRetailer("all");
              setSearchTerm('');
              setDateRange(null);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <DashboardNavigation
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        navItems={navItems}
        title="PharmaLynk Collections"
        subtitle="Wholesaler Admin Dashboard"
        notificationCount={notificationCount}
        notifications={notifications}
        user={user}
        onLogout={logout}
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
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-7xl mx-auto">
          {activeNav === 'overview' && <Overview />}
          {activeNav === 'areas' && <Areas />}
          {activeNav === 'retailers' && <Retailers />}
          {activeNav === 'retailer-details' && <RetailerDetails />}
          {activeNav === 'invoices' && <Invoices />}
          {activeNav === 'workers' && <LineWorkers />}
          {activeNav === 'transactions' && <Transactions />}
          {activeNav === 'analytics' && <AnalyticsComponent />}
        </div>

        {/* Edit Area Dialog */}
        <Dialog open={!!editingArea} onOpenChange={(open) => !open && setEditingArea(null)}>
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

        {/* Dialog Components */}
        {ViewInvoiceDialog()}
        {ViewPaymentDialog()}
        
        {/* Edit Line Worker Dialog */}
        {EditLineWorkerDialog()}
        
        {/* Retailer Assignment Dialog */}
        {RetailerAssignmentDialog()}
      </main>
    </div>
  );
};

export default WholesalerAdminDashboard;