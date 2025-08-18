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
import { useAuth, useSuperAdmin } from '@/contexts/AuthContext';
import { tenantService, userService } from '@/services/firestore';
import { Tenant, CreateTenantForm } from '@/types';
import { formatTimestamp } from '@/lib/timestamp-utils';
import { 
  Building2, 
  Users, 
  FileText, 
  DollarSign, 
  Plus, 
  Settings, 
  LogOut,
  Loader2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const isSuperAdmin = useSuperAdmin();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [isSuperAdmin]);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const tenantsData = await tenantService.getAllTenants();
      setTenants(tenantsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (data: CreateTenantForm) => {
    try {
      // Create the tenant first
      const tenantId = await tenantService.createTenant({
        name: data.name,
        plan: data.plan
      });
      
      // Create the admin user with authentication
      await userService.createUserWithAuth(tenantId, {
        email: data.adminEmail,
        password: data.adminPassword,
        displayName: data.adminName,
        phone: data.adminPhone,
        roles: ['WHOLESALER_ADMIN']
      });
      
      await fetchTenants();
      setShowCreateTenant(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant and admin user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isSuperAdmin) {
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
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">PharmaLynk Collections</h1>
                <p className="text-sm text-gray-500">Super Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Welcome, {user?.displayName || user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  Super Admin
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
              <CardTitle className="text-sm font-medium text-gray-600">Total Tenants</CardTitle>
              <div className="bg-blue-100 p-2 rounded-full">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
              <p className="text-xs text-gray-500">
                {tenants.filter(t => t.status === 'ACTIVE').length} active
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Tenants</CardTitle>
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => t.status === 'ACTIVE').length}
              </div>
              <p className="text-xs text-gray-500">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Suspended</CardTitle>
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => t.status === 'SUSPENDED').length}
              </div>
              <p className="text-xs text-gray-500">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <div className="bg-yellow-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">₹45,231</div>
              <p className="text-xs text-gray-500">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Tenant Management</h2>
          <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>
                  Set up a new wholesaler tenant on the platform
                </DialogDescription>
              </DialogHeader>
              <CreateTenantForm onSubmit={handleCreateTenant} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tenants</CardTitle>
            <CardDescription>
              Manage all wholesaler tenants on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.plan}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.subscriptionStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(tenant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log('View tenant details:', tenant);
                            alert(`Viewing details for ${tenant.name}`);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            console.log('View tenant users:', tenant);
                            alert(`Viewing users for ${tenant.name}`);
                          }}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Users
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Create Tenant Form Component
function CreateTenantForm({ onSubmit }: { onSubmit: (data: CreateTenantForm) => void }) {
  const [formData, setFormData] = useState<CreateTenantForm>({
    name: '',
    plan: 'BASIC',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    adminName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tenant Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan">Plan</Label>
        <select
          id="plan"
          value={formData.plan}
          onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="BASIC">Basic</option>
          <option value="PRO">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminName">Admin Name</Label>
        <Input
          id="adminName"
          value={formData.adminName}
          onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input
          id="adminEmail"
          type="email"
          value={formData.adminEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPhone">Admin Phone</Label>
        <Input
          id="adminPhone"
          value={formData.adminPhone}
          onChange={(e) => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPassword">Admin Password</Label>
        <Input
          id="adminPassword"
          type="password"
          value={formData.adminPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
          required
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Create Tenant
        </Button>
        <Button type="button" variant="outline" onClick={() => onSubmit(formData)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}