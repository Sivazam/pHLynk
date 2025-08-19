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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { useAuth, useWholesalerAdmin } from '@/contexts/AuthContext';
import { 
  areaService, 
  retailerService, 
  invoiceService, 
  userService,
  paymentService,
  DashboardService
} from '@/services/firestore';
import { Area, Retailer, Invoice, User, Payment, DashboardStats } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp, formatTimestampWithTime, formatCurrency, toDate } from '@/lib/timestamp-utils';
import { CreateAreaForm } from '@/components/ui/create-area-form';
import { CreateRetailerForm } from '@/components/ui/create-retailer-form';
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
  User,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Shield
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
  const [areas, setAreas] = useState<Area[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [lineWorkers, setLineWorkers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  // Filter States
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedLineWorker, setSelectedLineWorker] = useState<string>("all");
  const [selectedRetailer, setSelectedRetailer] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveWorkers, setShowInactiveWorkers] = useState<boolean>(false);
  
  // Real-time updates
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'areas', label: 'Areas', icon: MapPin },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'workers', label: 'Line Workers', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  useEffect(() => {
    if (isWholesalerAdmin && user?.tenantId) {
      fetchDashboardData();
      // Set up real-time updates every 30 seconds
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isWholesalerAdmin, user, activeNav, dateRange, selectedLineWorker, selectedRetailer]);

  const fetchDashboardData = async () => {
    if (!user?.tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch base data
      const [areasData, retailersData, invoicesData, lineWorkersData, stats] = await Promise.all([
        areaService.getActiveAreas(user.tenantId),
        retailerService.getAll(user.tenantId),
        invoiceService.getAll(user.tenantId),
        userService.getAllUsersByRole(user.tenantId, 'LINE_WORKER'),
        DashboardService.getWholesalerDashboardStats(user.tenantId)
      ]);

      // Fetch payments with filters
      let paymentsData = await paymentService.getAll(user.tenantId);
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
      setPayments(paymentsQuery);
      setDashboardStats(stats);
      
      // Generate activity logs
      const logs = generateActivityLogs(paymentsQuery, invoicesData, retailersData, lineWorkersData);
      setActivityLogs(logs);
      
      // Generate detailed notifications
      const notificationList = generateNotifications(paymentsQuery, invoicesData, retailersData, lineWorkersData);
      console.log('Generated notifications:', notificationList.length, notificationList);
      setNotifications(notificationList);
      setNotificationCount(notificationList.filter(n => !n.read).length);
      
      setLastUpdate(new Date());
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
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

    // If no notifications, create a sample one for testing
    if (notifications.length === 0) {
      console.log('No notifications generated, creating sample notification');
      notifications.push({
        id: 'sample_notification',
        type: 'info',
        title: 'System ready',
        message: 'Notification system is active and monitoring payment activities',
        timestamp: now,
        read: false
      });
    }

    console.log('Final notifications count:', notifications.length);
    
    // Sort by timestamp (newest first) and limit to 20
    const sortedNotifications = notifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
    
    console.log('Sorted notifications:', sortedNotifications);
    
    return sortedNotifications;
  };

const generateActivityLogs = (payments: Payment[], invoices: Invoice[], retailers: Retailer[], workers: User[]): ActivityLog[] => {
    const logs: ActivityLog[] = [];
    
    // Payment activities
    payments.forEach(payment => {
      const worker = workers.find(w => w.id === payment.lineWorkerId);
      const retailer = retailers.find(r => r.id === payment.retailerId);
      
      if (payment.state === 'COMPLETED') {
        logs.push({
          id: `payment_${payment.id}`,
          type: 'PAYMENT',
          action: 'COLLECTED',
          description: `Payment collected from ${retailer?.name || 'Unknown'}`,
          amount: payment.totalPaid,
          actorName: worker?.displayName || 'Unknown',
          actorType: 'LINE_WORKER',
          targetName: retailer?.name || 'Unknown',
          targetType: 'RETAILER',
          timestamp: payment.createdAt,
          metadata: {
            paymentId: payment.id,
            method: payment.method
          }
        });
      }
    });
    
    // Invoice activities
    invoices.slice(0, 10).forEach(invoice => {
      const retailer = retailers.find(r => r.id === invoice.retailerId);
      logs.push({
        id: `invoice_${invoice.id}`,
        type: 'INVOICE',
        action: 'CREATED',
        description: `Invoice created for ${retailer?.name || 'Unknown'}`,
        amount: invoice.totalAmount,
        actorName: user?.displayName || 'System',
        actorType: 'WHOLESALER_ADMIN',
        targetName: retailer?.name || 'Unknown',
        targetType: 'RETAILER',
        timestamp: invoice.createdAt,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber
        }
      });
    });
    
    // Sort by timestamp (newest first)
    return logs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()).slice(0, 20);
  };

  const getLineWorkerName = (workerId: string) => {
    const worker = lineWorkers.find(w => w.id === workerId);
    return worker?.displayName || 'Unknown';
  };

  const getRetailerName = (retailerId: string) => {
    const retailer = retailers.find(r => r.id === retailerId);
    return retailer?.name || 'Unknown';
  };

  const handleCreateArea = async (data: { name: string; zipcodes: string[] }) => {
    if (!user?.tenantId) return;
    
    try {
      await areaService.createArea(user.tenantId, data);
      await fetchDashboardData();
      setShowCreateArea(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create area');
    }
  };

  const handleCreateRetailer = async (data: { name: string; phone: string; address?: string; areaId?: string; zipcodes: string[] }) => {
    if (!user?.tenantId) return;
    
    try {
      await retailerService.createRetailer(user.tenantId, data);
      await fetchDashboardData();
      setShowCreateRetailer(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create retailer');
    }
  };

  const handleCreateInvoice = async (data: { retailerId: string; issueDate: Date; dueDate?: Date; lineItems: any[] }) => {
    if (!user?.tenantId) return;
    
    try {
      await invoiceService.createInvoice(user.tenantId, data);
      await fetchDashboardData();
      setShowCreateInvoice(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    }
  };

  const handleCreateLineWorker = async (data: { email: string; password: string; displayName?: string; phone?: string; assignedAreas?: string[] }) => {
    if (!user?.tenantId) return;
    
    try {
      const assignedZips = data.assignedAreas 
        ? areas
            .filter(area => data.assignedAreas!.includes(area.id))
            .flatMap(area => area.zipcodes)
        : [];
      
      await userService.createUserWithAuth(user.tenantId, {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        phone: data.phone,
        roles: ['LINE_WORKER'],
        assignedAreas: data.assignedAreas,
        assignedZips: assignedZips
      });
      await fetchDashboardData();
      setShowCreateLineWorker(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create line worker');
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!user?.tenantId) return;
    
    try {
      await areaService.deleteArea(user.tenantId, areaId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete area');
    }
  };

  const handleDeleteRetailer = async (retailerId: string) => {
    if (!user?.tenantId) return;
    
    try {
      await retailerService.deleteRetailer(user.tenantId, retailerId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete retailer');
    }
  };

  const handleDeleteLineWorker = async (workerId: string) => {
    if (!user?.tenantId) return;
    
    try {
      await userService.update(workerId, { active: false }, user.tenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete line worker');
    }
  };

  const handleEditLineWorker = (worker: User) => {
    setEditingLineWorker(worker);
    setEditingSelectedAreas(worker.assignedAreas || []);
    setEditingActiveStatus(worker.active);
    setShowEditLineWorkerDialog(true);
  };

  const handleUpdateLineWorker = async (data: { active: boolean; displayName?: string; phone?: string }) => {
    if (!user?.tenantId || !editingLineWorker) return;
    
    try {
      const assignedZips = editingSelectedAreas.length > 0
        ? areas
            .filter(area => editingSelectedAreas.includes(area.id))
            .flatMap(area => area.zipcodes)
        : [];
      
      await userService.update(editingLineWorker.id, {
        displayName: data.displayName || editingLineWorker.displayName,
        phone: data.phone || editingLineWorker.phone,
        active: data.active,
        assignedAreas: editingSelectedAreas,
        assignedZips: assignedZips
      });
      
      await fetchDashboardData();
      setShowEditLineWorkerDialog(false);
      setEditingLineWorker(null);
      setEditingSelectedAreas([]);
      setEditingActiveStatus(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update line worker');
    }
  };

  const handleToggleLineWorkerStatus = async (workerId: string, currentStatus: boolean) => {
    if (!user?.tenantId) return;
    
    try {
      await userService.update(workerId, { active: !currentStatus }, user.tenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update line worker status');
    }
  };

  const handleToggleArea = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (area) {
      setEditingArea(area);
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
      <StatsCards />
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest activities in your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityLogs.slice(0, 5).map((log) => (
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
            ))}
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

      <Card>
        <CardHeader>
          <CardTitle>All Areas</CardTitle>
          <CardDescription>Manage your service areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {areas.map((area) => (
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
            ))}
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
                  if (!user?.tenantId) return;
                  
                  try {
                    await areaService.update(editingArea.id, {
                      name: data.name,
                      zipcodes: data.zipcodes
                    }, user.tenantId);
                    await fetchDashboardData();
                    setEditingArea(null);
                  } catch (err: any) {
                    setError(err.message || 'Failed to update area');
                  }
                }}
                initialData={{
                  name: editingArea.name,
                  zipcodes: editingArea.zipcodes
                }}
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

      <Card>
        <CardHeader>
          <CardTitle>All Retailers</CardTitle>
          <CardDescription>Manage your retailer network</CardDescription>
        </CardHeader>
        <CardContent>
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
                  if (!user?.tenantId) return;
                  
                  try {
                    await retailerService.update(editingRetailer.id, {
                      name: data.name,
                      phone: data.phone,
                      address: data.address,
                      areaId: data.areaId,
                      zipcodes: data.zipcodes
                    }, user.tenantId);
                    await fetchDashboardData();
                    setEditingRetailer(null);
                  } catch (err: any) {
                    setError(err.message || 'Failed to update retailer');
                  }
                }}
                areas={areas}
                initialData={{
                  name: editingRetailer.name,
                  phone: editingRetailer.phone,
                  address: editingRetailer.address || '',
                  areaId: editingRetailer.areaId || "none",
                  zipcodes: editingRetailer.zipcodes || []
                }}
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
            <div className="space-y-4">
              <p className="text-gray-500">Invoice creation form will be implemented here.</p>
              <Button onClick={() => setShowCreateInvoice(false)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Manage all invoices in your system</CardDescription>
        </CardHeader>
        <CardContent>
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
                    handleCreateLineWorker({
                      email,
                      password,
                      displayName: displayName || undefined,
                      phone: phone || undefined,
                      assignedAreas: assignedAreas.length > 0 ? assignedAreas : undefined
                    });
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

      <Card>
        <CardHeader>
          <CardTitle>All Line Workers</CardTitle>
          <CardDescription>Manage your line workers and their assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lineWorkers
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
                      onClick={() => handleEditLineWorker(worker)}
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
              ))}
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
              {retailers.map((retailer) => (
                <SelectItem key={retailer.id} value={retailer.id}>
                  {retailer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
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
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Analytics Component
  const AnalyticsComponent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-600">Comprehensive analytics and insights</p>
      </div>

      <WholesalerAnalytics 
        retailers={retailers}
        payments={payments}
        lineWorkers={lineWorkers}
        invoices={invoices}
        areas={areas}
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
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-area-${area.id}`}
                      value={area.id}
                      defaultChecked={editingSelectedAreas.includes(area.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingSelectedAreas([...editingSelectedAreas, area.id]);
                        } else {
                          setEditingSelectedAreas(editingSelectedAreas.filter(id => id !== area.id));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`edit-area-${area.id}`} className="text-sm">{area.name}</label>
                  </div>
                ))}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
          {activeNav === 'areas' && <Areas />}
          {activeNav === 'retailers' && <Retailers />}
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
                  if (!user?.tenantId) return;
                  
                  try {
                    await areaService.update(editingArea.id, {
                      name: data.name,
                      zipcodes: data.zipcodes
                    }, user.tenantId);
                    await fetchDashboardData();
                    setEditingArea(null);
                  } catch (err: any) {
                    setError(err.message || 'Failed to update area');
                  }
                }}
                initialData={{
                  name: editingArea.name,
                  zipcodes: editingArea.zipcodes
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Retailer Dialog */}
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
                  if (!user?.tenantId) return;
                  
                  try {
                    await retailerService.update(editingRetailer.id, {
                      name: data.name,
                      phone: data.phone,
                      address: data.address,
                      areaId: data.areaId,
                      zipcodes: data.zipcodes
                    }, user.tenantId);
                    await fetchDashboardData();
                    setEditingRetailer(null);
                  } catch (err: any) {
                    setError(err.message || 'Failed to update retailer');
                  }
                }}
                areas={areas}
                initialData={{
                  name: editingRetailer.name,
                  phone: editingRetailer.phone,
                  address: editingRetailer.address || '',
                  areaId: editingRetailer.areaId || "none",
                  zipcodes: editingRetailer.zipcodes || []
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        {ViewInvoiceDialog()}
        
        {/* View Payment Dialog */}
        {ViewPaymentDialog()}
        
        {/* Edit Line Worker Dialog */}
        {EditLineWorkerDialog()}
      </main>
    </div>
  );
}