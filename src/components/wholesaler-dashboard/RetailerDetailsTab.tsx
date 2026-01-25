import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import {
    Loader2,
    RefreshCw,
    AlertCircle,
    Store,
    CreditCard,
    DollarSign,
    User as UserIcon,
    MapPin
} from 'lucide-react';
import { Area, Retailer, User, Payment } from '@/types';
import { formatCurrency, formatTimestampWithTime, toDate } from '@/lib/timestamp-utils';

// --- Internal Component: RetailerDetailCard ---
// Extracting this allows each card to manage its own "visible payments" state independently
interface RetailerDetailCardProps {
    retailer: Retailer;
    retailerPayments: Payment[]; // PRE-FILTERED payments for this retailer
    areas: Area[];
    lineWorkers: User[];
    onAssignRetailer: (retailer: Retailer, currentWorkerId: string) => void;
}

const RetailerDetailCard = ({
    retailer,
    retailerPayments,
    areas,
    lineWorkers,
    onAssignRetailer
}: RetailerDetailCardProps) => {
    // State for payment pagination within this card
    const [visiblePaymentsCount, setVisiblePaymentsCount] = useState(10);

    const visiblePayments = retailerPayments.slice(0, visiblePaymentsCount);

    // Helpers
    const getLineWorkerName = (id: string | null | undefined) => {
        if (!id) return 'Unassigned';
        const worker = lineWorkers.find(w => w.id === id);
        return worker ? worker.displayName || worker.email : 'Unknown';
    };

    const getAssignedWorkersForArea = (areaId: string) => {
        return lineWorkers.filter(worker =>
            worker.active !== false &&
            worker.assignedAreas?.includes(areaId)
        );
    };

    // Assignments
    const directlyAssignedWorker = retailer.assignedLineWorkerId
        ? lineWorkers.find(worker => worker.id === retailer.assignedLineWorkerId)
        : null;

    const areaAssignedWorkers = !directlyAssignedWorker && retailer.areaId
        ? getAssignedWorkersForArea(retailer.areaId)
        : [];

    const isDirectAssignment = !!directlyAssignedWorker;

    return (
        <Card className="overflow-hidden">
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
                            {areaAssignedWorkers.length > 0 && !isDirectAssignment && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Via Area {areaAssignedWorkers.length > 1 ? '(Shared)' : ''}
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
                                    <span className={directlyAssignedWorker || areaAssignedWorkers.length > 0 ? "font-medium text-green-700" : ""}>
                                        {directlyAssignedWorker
                                            ? directlyAssignedWorker.displayName || 'Unknown'
                                            : areaAssignedWorkers.length > 0
                                                ? areaAssignedWorkers.map(w => w.displayName || 'Unknown').join(', ')
                                                : 'Unassigned'
                                        }
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
                                onClick={() => onAssignRetailer(retailer, retailer.assignedLineWorkerId || '')}
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
                                        {visiblePayments.map(payment => (
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
                                {visiblePayments.length < retailerPayments.length && (
                                    <div className="flex justify-center p-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setVisiblePaymentsCount(prev => prev + 10)}
                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                        >
                                            Load More ({retailerPayments.length - visiblePayments.length} remaining)
                                        </Button>
                                    </div>
                                )}
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
};


interface RetailerDetailsTabProps {
    // Data
    areas: Area[];
    retailers: Retailer[];
    payments: Payment[];
    lineWorkers: User[];

    // State from parent
    selectedArea: string;
    setSelectedArea: (value: string) => void;
    selectedRetailer: string;
    setSelectedRetailer: (value: string) => void;
    // Filter date specific to this tab
    filterDate: { from: Date; to: Date } | null;
    setFilterDate: (date: { from: Date; to: Date } | null) => void;

    // Loading & Error
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;

    // Actions
    onAssignRetailer: (retailer: Retailer, currentWorkerId: string) => void;

    // Helper for clearing filters (optional, mimicking original behavior)
    onClearFilters: () => void;
}

export function RetailerDetailsTab({
    areas,
    retailers,
    payments,
    lineWorkers,
    selectedArea,
    setSelectedArea,
    selectedRetailer,
    setSelectedRetailer,
    filterDate,
    setFilterDate,
    isLoading,
    error,
    onRefresh,
    onAssignRetailer,
    onClearFilters
}: RetailerDetailsTabProps) {

    // Pagination for Retailers List
    const [visibleRetailersCount, setVisibleRetailersCount] = useState(10);

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleRetailersCount(10);
    }, [selectedArea, selectedRetailer, filterDate]);

    // Memoize filtered retailers
    const filteredRetailers = useMemo(() => {
        return retailers.filter(retailer => {
            if (selectedArea !== "all" && retailer.areaId !== selectedArea) return false;
            if (selectedRetailer !== "all" && retailer.id !== selectedRetailer) return false;
            return true;
        });
    }, [retailers, selectedArea, selectedRetailer]);

    // Memoize filtered payments (logic specific to this tab)
    const filteredPayments = useMemo(() => {
        const filteredRetailerIds = filteredRetailers.map(r => r.id);

        return payments.filter(payment => {
            // 1. Must belong to filtered retailers
            if (!filteredRetailerIds.includes(payment.retailerId)) return false;

            // 2. Date filter (specific to Retailer Details tab)
            if (filterDate?.from) {
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
    }, [payments, filteredRetailers, filterDate]);

    // Get visible retailers for rendering
    const visibleRetailers = filteredRetailers.slice(0, visibleRetailersCount);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:pt-8 sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Retailer Details & Logs</h2>
                    <p className="text-gray-600">Complete detailed logs of all retailers and their payments</p>
                </div>
                <Button
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                </Button>
            </div>

            {isLoading && (
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
                                <div className="text-2xl font-bold text-gray-900">{filteredRetailers.length}</div>
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
                                <div className="text-2xl font-bold text-gray-900">{filteredPayments.length}</div>
                                <p className="text-xs text-gray-500">
                                    {filteredPayments.filter(p => p.state === 'COMPLETED').length} completed
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
                                    {formatCurrency(filteredPayments.filter(p => p.state === 'COMPLETED').reduce((sum, pay) => sum + pay.totalPaid, 0))}
                                </div>
                                <p className="text-xs text-gray-500">
                                    From completed payments only
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Retailers with Detailed Logs */}
                    <div className="space-y-6">
                        {visibleRetailers.map(retailer => {
                            const retailerPayments = filteredPayments.filter(pay => pay.retailerId === retailer.id);

                            return (
                                <RetailerDetailCard
                                    key={retailer.id}
                                    retailer={retailer}
                                    retailerPayments={retailerPayments}
                                    areas={areas}
                                    lineWorkers={lineWorkers}
                                    onAssignRetailer={onAssignRetailer}
                                />
                            );
                        })}

                        {/* Load More Button for Retailers List */}
                        {visibleRetailers.length < filteredRetailers.length && (
                            <div className="flex justify-center pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setVisibleRetailersCount(prev => prev + 10)}
                                    className="min-w-[200px]"
                                >
                                    Load More ({filteredRetailers.length - visibleRetailers.length} remaining)
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!error && filteredRetailers.length === 0 && (
                <div className="text-center py-12">
                    <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No retailers found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                    <Button
                        variant="outline"
                        onClick={onClearFilters}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    );
}
