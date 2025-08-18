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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, useWholesalerAdmin } from '@/contexts/AuthContext';
import { 
  areaService, 
  retailerService, 
  invoiceService, 
  userService,
  DashboardService
} from '@/services/firestore';
import { Area, Retailer, Invoice, User, DashboardStats } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp } from '@/lib/timestamp-utils';
import { 
  MapPin, 
  Store, 
  FileText, 
  Users, 
  DollarSign, 
  Plus, 
  Settings, 
  LogOut,
  Loader2,
  TrendingUp,
  AlertCircle,
  Calendar,
  Phone,
  Edit,
  Trash2,
  Save,
  X,
  Eye
} from 'lucide-react';

export function WholesalerAdminDashboard() {
  const { user, logout } = useAuth();
  const isWholesalerAdmin = useWholesalerAdmin();
  const [areas, setAreas] = useState<Area[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [lineWorkers, setLineWorkers] = useState<User[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [showCreateRetailer, setShowCreateRetailer] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateLineWorker, setShowCreateLineWorker] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingLineWorker, setEditingLineWorker] = useState<User | null>(null);

  useEffect(() => {
    if (isWholesalerAdmin && user?.tenantId) {
      fetchDashboardData();
    }
  }, [isWholesalerAdmin, user]);

  const fetchDashboardData = async () => {
    if (!user?.tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [areasData, retailersData, invoicesData, lineWorkersData, stats] = await Promise.all([
        areaService.getActiveAreas(user.tenantId),
        retailerService.getAll(user.tenantId),
        invoiceService.getAll(user.tenantId),
        userService.getUsersByRole(user.tenantId, 'LINE_WORKER'),
        DashboardService.getWholesalerDashboardStats(user.tenantId)
      ]);

      setAreas(areasData);
      setRetailers(retailersData);
      setInvoices(invoicesData);
      setLineWorkers(lineWorkersData);
      setDashboardStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
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
      // Calculate assigned zips based on selected areas
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

  const handleEditLineWorker = async (data: { assignedAreas?: string[]; assignedZips?: string[] }) => {
    if (!user?.tenantId || !editingLineWorker) return;
    
    try {
      // Calculate assigned zips based on selected areas if provided
      const assignedZips = data.assignedAreas 
        ? areas
            .filter(area => data.assignedAreas!.includes(area.id))
            .flatMap(area => area.zipcodes)
        : data.assignedZips || editingLineWorker.assignedZips || [];
      
      await userService.update(editingLineWorker.id, {
        assignedAreas: data.assignedAreas,
        assignedZips: assignedZips
      }, user.tenantId);
      await fetchDashboardData();
      setEditingLineWorker(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update line worker');
    }
  };

  const handleDeleteLineWorker = async (workerId: string) => {
    if (!user?.tenantId) return;
    
    if (!confirm('Are you sure you want to delete this line worker?')) return;
    
    try {
      await userService.delete(workerId, user.tenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete line worker');
    }
  };

  const handleEditArea = async (data: { name: string; zipcodes: string[] }) => {
    if (!user?.tenantId || !editingArea) return;
    
    try {
      await areaService.update(editingArea.id, data, user.tenantId);
      await fetchDashboardData();
      setEditingArea(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update area');
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!user?.tenantId) return;
    
    if (!confirm('Are you sure you want to delete this area?')) return;
    
    try {
      await areaService.delete(areaId, user.tenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete area');
    }
  };

  const handleEditRetailer = async (data: { name: string; phone: string; address?: string; areaId?: string; zipcodes: string[] }) => {
    if (!user?.tenantId || !editingRetailer) return;
    
    try {
      await retailerService.update(editingRetailer.id, data, user.tenantId);
      await fetchDashboardData();
      setEditingRetailer(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update retailer');
    }
  };

  const handleDeleteRetailer = async (retailerId: string) => {
    if (!user?.tenantId) return;
    
    if (!confirm('Are you sure you want to delete this retailer?')) return;
    
    try {
      await retailerService.delete(retailerId, user.tenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete retailer');
    }
  };

  const handleEditInvoice = async (data: { retailerId: string; issueDate: Date; dueDate?: Date; lineItems: any[] }) => {
    if (!user?.tenantId || !editingInvoice) return;
    
    try {
      // Calculate totals
      const subtotal = data.lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
      const gstAmount = data.lineItems.reduce((sum, item) => {
        const gstPercent = item.gstPercent || 0;
        return sum + (item.qty * item.unitPrice * gstPercent / 100);
      }, 0);
      const totalAmount = subtotal + gstAmount;

      await invoiceService.update(editingInvoice.id, {
        retailerId: data.retailerId,
        issueDate: Timestamp.fromDate(data.issueDate),
        dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
        subtotal,
        gstAmount,
        totalAmount,
        lineItems: data.lineItems
      }, user.tenantId);
      await fetchDashboardData();
      setEditingInvoice(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!user?.tenantId) return;
    
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await invoiceService.delete(invoiceId, user.tenantId);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invoice');
    }
  };

  if (!isWholesalerAdmin) {
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
                <p className="text-sm text-gray-500">Wholesaler Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Welcome, {user?.displayName || user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  Wholesaler Admin
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
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
                <div className="bg-red-100 p-2 rounded-full">
                  <DollarSign className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{dashboardStats.totalOutstanding.toLocaleString()}
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
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{dashboardStats.todayCollections.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Retailers</CardTitle>
                <div className="bg-blue-100 p-2 rounded-full">
                  <Store className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
                <p className="text-xs text-gray-500">
                  {areas.length} service areas
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Line Workers</CardTitle>
                <div className="bg-yellow-100 p-2 rounded-full">
                  <Users className="h-4 w-4 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{lineWorkers.length}</div>
                <p className="text-xs text-gray-500">
                  Active collection staff
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
            <TabsTrigger value="retailers">Retailers</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="workers">Line Workers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Latest invoices created</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {invoices.slice(0, 5).map((invoice) => (
                      <div key={invoice.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">
                            {retailers.find(r => r.id === invoice.retailerId)?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{invoice.totalAmount}</p>
                          <Badge variant={invoice.status === 'PAID' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Outstanding</CardTitle>
                  <CardDescription>Retailers with highest outstanding</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {retailers
                      .sort((a, b) => b.currentOutstanding - a.currentOutstanding)
                      .slice(0, 5)
                      .map((retailer) => (
                        <div key={retailer.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{retailer.name}</p>
                            <p className="text-sm text-gray-600">{retailer.phone}</p>
                          </div>
                          <p className="font-medium text-red-600">
                            ₹{retailer.currentOutstanding.toLocaleString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="areas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Service Areas</h2>
              <Dialog open={showCreateArea} onOpenChange={setShowCreateArea}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Area
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Service Area</DialogTitle>
                    <DialogDescription>
                      Define a new service area with zipcodes
                    </DialogDescription>
                  </DialogHeader>
                  <CreateAreaForm onSubmit={handleCreateArea} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {areas.map((area) => (
                <Card key={area.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center">
                          <MapPin className="h-5 w-5 mr-2" />
                          {area.name}
                        </CardTitle>
                        <CardDescription>
                          {area.zipcodes.length} zipcodes
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingArea(area)}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArea(area.id)}
                          className="hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {area.zipcodes.slice(0, 6).map((zip) => (
                        <Badge key={zip} variant="outline" className="text-xs">
                          {zip}
                        </Badge>
                      ))}
                      {area.zipcodes.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{area.zipcodes.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="retailers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Retailers</h2>
              <Dialog open={showCreateRetailer} onOpenChange={setShowCreateRetailer}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Retailer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Retailer</DialogTitle>
                    <DialogDescription>
                      Onboard a new medical shop/retailer
                    </DialogDescription>
                  </DialogHeader>
                  <CreateRetailerForm 
                    onSubmit={handleCreateRetailer} 
                    areas={areas} 
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retailers.map((retailer) => (
                      <TableRow key={retailer.id}>
                        <TableCell className="font-medium">{retailer.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{retailer.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {areas.find(a => a.id === retailer.areaId)?.name || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            retailer.currentOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ₹{retailer.currentOutstanding.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                console.log('View retailer:', retailer);
                                alert(`Viewing details for ${retailer.name}`);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                console.log('View retailer invoices:', retailer);
                                alert(`Viewing invoices for ${retailer.name}`);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Invoices
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Invoices</h2>
              <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                    <DialogDescription>
                      Create an invoice for a retailer
                    </DialogDescription>
                  </DialogHeader>
                  <CreateInvoiceForm 
                    onSubmit={handleCreateInvoice} 
                    retailers={retailers} 
                  />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>Manage invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {retailers.find(r => r.id === invoice.retailerId)?.name}
                        </TableCell>
                        <TableCell>
                          {formatTimestamp(invoice.issueDate)}
                        </TableCell>
                        <TableCell>₹{invoice.totalAmount}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ₹{invoice.outstandingAmount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            invoice.status === 'PAID' ? 'default' : 
                            invoice.status === 'OPEN' ? 'secondary' : 'outline'
                          }>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              console.log('View invoice:', invoice);
                              alert(`Viewing details for invoice ${invoice.invoiceNumber}`);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Line Workers</h2>
              <Dialog open={showCreateLineWorker} onOpenChange={setShowCreateLineWorker}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Line Worker
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Line Worker</DialogTitle>
                    <DialogDescription>
                      Add a new line worker to your team
                    </DialogDescription>
                  </DialogHeader>
                  <CreateLineWorkerForm onSubmit={handleCreateLineWorker} areas={areas} onCancel={() => setShowCreateLineWorker(false)} />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lineWorkers.map((worker) => (
                <Card key={worker.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          {worker.displayName || worker.email}
                        </CardTitle>
                        <CardDescription>
                          {worker.phone || 'No phone'}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLineWorker(worker)}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLineWorker(worker.id)}
                          className="hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Assigned Areas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {worker.assignedAreas?.slice(0, 3).map((areaId) => (
                            <Badge key={areaId} variant="outline" className="text-xs">
                              {areas.find(a => a.id === areaId)?.name || areaId}
                            </Badge>
                          ))}
                          {(worker.assignedAreas?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(worker.assignedAreas?.length || 0) - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Assigned Zips:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {worker.assignedZips?.slice(0, 3).map((zip) => (
                            <Badge key={zip} variant="outline" className="text-xs">
                              {zip}
                            </Badge>
                          ))}
                          {(worker.assignedZips?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(worker.assignedZips?.length || 0) - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Line Worker Dialog */}
      {editingLineWorker && (
        <Dialog open={!!editingLineWorker} onOpenChange={() => setEditingLineWorker(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Line Worker</DialogTitle>
              <DialogDescription>
                Update line worker assignments
              </DialogDescription>
            </DialogHeader>
            <EditLineWorkerForm 
              worker={editingLineWorker} 
              areas={areas}
              onSubmit={handleEditLineWorker} 
              onCancel={() => setEditingLineWorker(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Area Dialog */}
      {editingArea && (
        <Dialog open={!!editingArea} onOpenChange={() => setEditingArea(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Service Area</DialogTitle>
              <DialogDescription>
                Update service area details
              </DialogDescription>
            </DialogHeader>
            <EditAreaForm 
              area={editingArea}
              onSubmit={handleEditArea} 
              onCancel={() => setEditingArea(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Form Components
function CreateAreaForm({ onSubmit }: { onSubmit: (data: { name: string; zipcodes: string[] }) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    zipcodes: [] as string[]
  });
  const [zipInput, setZipInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addZipcode = () => {
    if (zipInput.trim() && !formData.zipcodes.includes(zipInput.trim())) {
      setFormData(prev => ({
        ...prev,
        zipcodes: [...prev.zipcodes, zipInput.trim()]
      }));
      setZipInput('');
    }
  };

  const removeZipcode = (zip: string) => {
    setFormData(prev => ({
      ...prev,
      zipcodes: prev.zipcodes.filter(z => z !== zip)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Area Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Zipcodes</Label>
        <div className="flex space-x-2">
          <Input
            placeholder="Enter zipcode"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addZipcode())}
          />
          <Button type="button" onClick={addZipcode} className="hover:bg-blue-600 transition-colors">Add</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {formData.zipcodes.map((zip) => (
            <Badge key={zip} variant="secondary" className="cursor-pointer" onClick={() => removeZipcode(zip)}>
              {zip} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="hover:bg-blue-600 transition-colors">Create Area</Button>
        <Button type="button" variant="outline" onClick={() => onSubmit(formData)} className="hover:bg-gray-50 transition-colors">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CreateRetailerForm({ 
  onSubmit, 
  areas 
}: { 
  onSubmit: (data: { name: string; phone: string; address?: string; areaId?: string; zipcodes: string[] }) => void;
  areas: Area[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    areaId: '',
    zipcodes: [] as string[]
  });
  const [zipInput, setZipInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addZipcode = () => {
    if (zipInput.trim() && !formData.zipcodes.includes(zipInput.trim())) {
      setFormData(prev => ({
        ...prev,
        zipcodes: [...prev.zipcodes, zipInput.trim()]
      }));
      setZipInput('');
    }
  };

  const removeZipcode = (zip: string) => {
    setFormData(prev => ({
      ...prev,
      zipcodes: prev.zipcodes.filter(z => z !== zip)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Retailer Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Service Area</Label>
        <Select value={formData.areaId} onValueChange={(value) => setFormData(prev => ({ ...prev, areaId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Service Zipcodes</Label>
        <div className="flex space-x-2">
          <Input
            placeholder="Enter zipcode"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addZipcode())}
          />
          <Button type="button" onClick={addZipcode} className="hover:bg-blue-600 transition-colors">Add</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {formData.zipcodes.map((zip) => (
            <Badge key={zip} variant="secondary" className="cursor-pointer" onClick={() => removeZipcode(zip)}>
              {zip} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="hover:bg-blue-600 transition-colors">Add Retailer</Button>
        <Button type="button" variant="outline" onClick={() => onSubmit(formData)} className="hover:bg-gray-50 transition-colors">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CreateInvoiceForm({ 
  onSubmit, 
  retailers 
}: { 
  onSubmit: (data: { retailerId: string; issueDate: Date; dueDate?: Date; lineItems: any[] }) => void;
  retailers: Retailer[];
}) {
  const [formData, setFormData] = useState({
    retailerId: '',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    lineItems: [
      { name: '', qty: 1, unitPrice: 0, gstPercent: 18 }
    ] as any[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate retailer selection
    if (!formData.retailerId) {
      alert('Please select a retailer');
      return;
    }
    
    // Validate line items
    const validLineItems = formData.lineItems.filter(item => item.name && item.unitPrice > 0);
    if (validLineItems.length === 0) {
      alert('Please add at least one valid line item with name and price');
      return;
    }
    
    onSubmit({
      ...formData,
      lineItems: validLineItems
    });
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { name: '', qty: 1, unitPrice: 0, gstPercent: 18 }]
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    return formData.lineItems.reduce((totals, item) => {
      const subtotal = item.qty * item.unitPrice;
      const gstAmount = subtotal * (item.gstPercent || 0) / 100;
      return {
        subtotal: totals.subtotal + subtotal,
        gstAmount: totals.gstAmount + gstAmount,
        total: totals.total + subtotal + gstAmount
      };
    }, { subtotal: 0, gstAmount: 0, total: 0 });
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="retailer">Retailer</Label>
          <Select value={formData.retailerId} onValueChange={(value) => setFormData(prev => ({ ...prev, retailerId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select retailer" />
            </SelectTrigger>
            <SelectContent>
              {retailers.map((retailer) => (
                <SelectItem key={retailer.id} value={retailer.id}>
                  {retailer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input
            id="issueDate"
            type="date"
            value={formData.issueDate.toISOString().split('T')[0]}
            onChange={(e) => setFormData(prev => ({ ...prev, issueDate: new Date(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate?.toISOString().split('T')[0] || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: new Date(e.target.value) }))}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-lg font-semibold">Line Items</Label>
          <Button type="button" variant="outline" onClick={addLineItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {formData.lineItems.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Item {index + 1}</h4>
              {formData.lineItems.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                  placeholder="Item name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>GST %</Label>
                <Input
                  type="number"
                  value={item.gstPercent}
                  onChange={(e) => updateLineItem(index, 'gstPercent', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                />
              </div>
            </div>

            <div className="text-right text-sm text-gray-600">
              Subtotal: ₹{(item.qty * item.unitPrice).toFixed(2)}
              {item.gstPercent && (
                <span className="ml-4">
                  GST: ₹{(item.qty * item.unitPrice * item.gstPercent / 100).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST Amount:</span>
            <span>₹{totals.gstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total Amount:</span>
            <span>₹{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="hover:bg-blue-600 transition-colors">Create Invoice</Button>
        <Button type="button" variant="outline" onClick={() => onSubmit(formData)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Create Line Worker Form Component
function CreateLineWorkerForm({ onSubmit, areas, onCancel }: { onSubmit: (data: { email: string; password: string; displayName?: string; phone?: string; assignedAreas?: string[] }) => void; areas: Area[]; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    assignedAreas: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one area is selected
    if (formData.assignedAreas.length === 0) {
      alert('Please select at least one area for the line worker');
      return;
    }
    
    onSubmit(formData);
  };

  const toggleArea = (areaId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedAreas: prev.assignedAreas.includes(areaId)
        ? prev.assignedAreas.filter(id => id !== areaId)
        : [...prev.assignedAreas, areaId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Full Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
      </div>

        <div className="space-y-2">
        <Label>Assigned Areas</Label>
        {areas.length === 0 ? (
          <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
            No areas available. Please create areas first before assigning line workers.
          </div>
        ) : (
          <div className="space-y-2">
            {areas.map((area) => (
              <div key={area.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`area-${area.id}`}
                  checked={formData.assignedAreas.includes(area.id)}
                  onChange={() => toggleArea(area.id)}
                  className="rounded border-gray-300"
                />
                <label htmlFor={`area-${area.id}`} className="text-sm">
                  {area.name}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={areas.length === 0} className="hover:bg-blue-600 transition-colors">
          Create Line Worker
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="hover:bg-gray-50 transition-colors">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Edit Line Worker Form Component
function EditLineWorkerForm({ worker, areas, onSubmit, onCancel }: { 
  worker: User; 
  areas: Area[]; 
  onSubmit: (data: { assignedAreas?: string[]; assignedZips?: string[] }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    assignedAreas: worker.assignedAreas || [],
    assignedZips: worker.assignedZips || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleArea = (areaId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedAreas: prev.assignedAreas.includes(areaId)
        ? prev.assignedAreas.filter(id => id !== areaId)
        : [...prev.assignedAreas, areaId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Assigned Areas</Label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {areas.map((area) => (
            <div key={area.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`edit-area-${area.id}`}
                checked={formData.assignedAreas.includes(area.id)}
                onChange={() => toggleArea(area.id)}
                className="rounded border-gray-300"
              />
              <label htmlFor={`edit-area-${area.id}`} className="text-sm">
                {area.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="hover:bg-blue-600 transition-colors">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="hover:bg-gray-50 transition-colors">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Edit Area Form Component
function EditAreaForm({ area, onSubmit, onCancel }: { 
  area: Area; 
  onSubmit: (data: { name: string; zipcodes: string[] }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: area.name,
    zipcodes: area.zipcodes || []
  });
  const [zipInput, setZipInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addZipcode = () => {
    if (zipInput.trim() && !formData.zipcodes.includes(zipInput.trim())) {
      setFormData(prev => ({
        ...prev,
        zipcodes: [...prev.zipcodes, zipInput.trim()]
      }));
      setZipInput('');
    }
  };

  const removeZipcode = (zip: string) => {
    setFormData(prev => ({
      ...prev,
      zipcodes: prev.zipcodes.filter(z => z !== zip)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Area Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Zipcodes</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add zipcode"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addZipcode())}
          />
          <Button type="button" onClick={addZipcode} className="hover:bg-blue-600 transition-colors">Add</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {formData.zipcodes.map((zip) => (
            <Badge key={zip} variant="secondary" className="cursor-pointer" onClick={() => removeZipcode(zip)}>
              {zip} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="hover:bg-blue-600 transition-colors">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="hover:bg-gray-50 transition-colors">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}