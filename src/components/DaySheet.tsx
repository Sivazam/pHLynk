'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { 
  Download, 
  Calendar, 
  Users, 
  MapPin, 
  Store, 
  Filter,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  X,
  Building2
} from 'lucide-react';
import { formatTimestamp, formatTimestampWithTime, formatCurrency, toDate } from '@/lib/timestamp-utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Payment, User, Area, Retailer } from '@/types';

interface DaySheetProps {
  payments: Payment[];
  lineWorkers: User[];
  areas: Area[];
  retailers: Retailer[];
  wholesalerBusinessName: string;
  wholesalerAddress?: string;
  tenantId: string;
}

interface DaySheetData {
  paymentId: string;
  date: Date;
  time: string;
  lineWorkerName: string;
  lineWorkerArea: string;
  retailerName: string;
  retailerAddress: string;
  retailerArea: string;
  amount: number;
  paymentMethod: string;
}

export function DaySheet({
  payments,
  lineWorkers,
  areas,
  retailers,
  wholesalerBusinessName,
  wholesalerAddress,
  tenantId
}: DaySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLineWorker, setSelectedLineWorker] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedRetailer, setSelectedRetailer] = useState<string>('all');
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState('today');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { startDate: startOfDay, endDate: endOfDay };
  });

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

  // Get area name by ID
  const getAreaName = (areaId: string): string => {
    const area = areas.find(a => a.id === areaId);
    return area?.name || 'Unknown Area';
  };

  // Get line worker name by ID
  const getLineWorkerName = (lineWorkerId: string): string => {
    const worker = lineWorkers.find(w => w.id === lineWorkerId);
    return worker?.displayName || 'Unknown Line Worker';
  };

  // Get line worker assigned areas
  const getLineWorkerAreas = (lineWorkerId: string): string[] => {
    const worker = lineWorkers.find(w => w.id === lineWorkerId);
    return worker?.assignedAreas || [];
  };

  // Get retailer name by ID
  const getRetailerName = (retailerId: string): string => {
    const retailer = retailers.find(r => r.id === retailerId);
    return retailer?.name || 'Unknown Retailer';
  };

  // Get retailer details by ID
  const getRetailerDetails = (retailerId: string) => {
    const retailer = retailers.find(r => r.id === retailerId);
    return retailer || { name: 'Unknown Retailer', address: 'Not provided', areaId: '' };
  };

  // Filter and process data
  const filteredData = useMemo(() => {
    let filtered = filterPaymentsByDateRange(payments);

    // Filter by line worker
    if (selectedLineWorker !== 'all') {
      filtered = filtered.filter(payment => payment.lineWorkerId === selectedLineWorker);
    }

    // Filter by area
    if (selectedArea !== 'all') {
      filtered = filtered.filter(payment => {
        const retailer = retailers.find(r => r.id === payment.retailerId);
        return retailer?.areaId === selectedArea;
      });
    }

    // Filter by retailer
    if (selectedRetailer !== 'all') {
      filtered = filtered.filter(payment => payment.retailerId === selectedRetailer);
    }

    // Process data for display
    return filtered.map(payment => {
      const retailer = getRetailerDetails(payment.retailerId);
      const lineWorkerName = getLineWorkerName(payment.lineWorkerId);
      const lineWorkerAreas = getLineWorkerAreas(payment.lineWorkerId);
      const lineWorkerAreaNames = lineWorkerAreas.map(areaId => getAreaName(areaId || '')).join(', ');

      return {
        paymentId: payment.id,
        date: payment.createdAt.toDate(),
        time: formatTimestampWithTime(payment.createdAt),
        lineWorkerName,
        lineWorkerArea: lineWorkerAreaNames || 'No assigned area',
        retailerName: retailer.name,
        retailerAddress: retailer.address,
        retailerArea: getAreaName(retailer.areaId || ''),
        amount: payment.totalPaid,
        paymentMethod: payment.method
      } as DaySheetData;
    });
  }, [payments, selectedLineWorker, selectedArea, selectedRetailer, dateRange, lineWorkers, areas, retailers]);

  // Calculate totals
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalCollections = filteredData.length;

  // Generate Excel file
  const generateExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Get line worker details for the header
    const getLineWorkerDetails = () => {
      if (selectedLineWorker === 'all') {
        // Get all unique line workers from filtered data
        const uniqueWorkers = [...new Set(filteredData.map(item => item.lineWorkerName))];
        return uniqueWorkers.map(name => {
          const worker = lineWorkers.find(lw => lw.displayName === name);
          return {
            name: name,
            phone: worker?.phone || 'No phone'
          };
        });
      } else {
        const worker = lineWorkers.find(lw => lw.id === selectedLineWorker);
        return [{
          name: worker?.displayName || 'Unknown',
          phone: worker?.phone || 'No phone'
        }];
      }
    };

    // Create header data for the main sheet
    const headerData = [
      ['', '', '', '', '', '', '', '', '', ''], // Empty row for spacing
      ['', '', '', '', '', '', '', '', '', ''], // Empty row for spacing
      [wholesalerBusinessName.toUpperCase(), '', '', '', '', '', '', '', '', ''], // Business name
      [wholesalerAddress || 'Address not provided', '', '', '', '', '', '', '', '', ''], // Actual address
      ['', '', '', '', '', '', '', '', '', ''], // Empty row for spacing
      ['', '', '', '', '', '', '', '', '', ''], // Empty row for spacing
      ['DAY SHEET REPORT', '', '', '', '', '', '', '', '', ''], // Report title
      ['Date Range:', `${formatTimestamp(dateRange.startDate)} - ${formatTimestamp(dateRange.endDate)}`, '', '', '', '', '', '', '', ''],
      ['Generated on:', formatTimestampWithTime(new Date()), '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''], // Empty row for spacing
      ['', '', '', '', '', '', '', '', '', ''], // Empty row for spacing for line worker table
    ];

    // Add line worker details table
    const lineWorkerData = getLineWorkerDetails();
    const lineWorkerTable = [
      ['LINE WORKER DETAILS', '', '', '', '', '', '', '', '', ''],
      ['Name', 'Contact Number', '', '', '', '', '', '', '', ''],
      ...lineWorkerData.map(worker => [worker.name, worker.phone, '', '', '', '', '', '', '', '']),
      ['', '', '', '', '', '', '', '', '', ''], // Empty row after line worker table
      ['', '', '', '', '', '', '', '', '', ''], // Empty row before column headers
    ];

    // Column headers
    const columnHeaders = [
      'Payment ID',
      'Date',
      'Time',
      'Line Worker Name',
      'Assigned Areas',
      'Retailer Name',
      'Retailer Address',
      'Retailer Area',
      'Amount',
      'Payment Method'
    ];

    // Prepare data for Excel
    const excelData = filteredData.map(item => ({
      'Payment ID': item.paymentId,
      'Date': formatTimestamp(item.date),
      'Time': item.time,
      'Line Worker Name': item.lineWorkerName,
      'Assigned Areas': item.lineWorkerArea,
      'Retailer Name': item.retailerName,
      'Retailer Address': item.retailerAddress || 'Not provided',
      'Retailer Area': item.retailerArea,
      'Amount': item.amount,
      'Payment Method': item.paymentMethod
    }));

    // Convert to worksheet format
    const wsData = [
      ...headerData,
      ...lineWorkerTable,
      columnHeaders,
      ...excelData.map(row => [
        row['Payment ID'],
        row['Date'],
        row['Time'],
        row['Line Worker Name'],
        row['Assigned Areas'],
        row['Retailer Name'],
        row['Retailer Address'],
        row['Retailer Area'],
        row['Amount'],
        row['Payment Method']
      ]),
      ['', '', '', '', '', '', '', '', '', ''], // Empty row before totals
      ['', '', '', '', '', '', '', '', '', ''], // Empty row before totals
      ['', '', '', '', '', '', '', 'TOTAL COLLECTIONS:', totalCollections, ''],
      ['', '', '', '', '', '', '', 'TOTAL AMOUNT:', totalAmount, ''],
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Payment ID
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 20 }, // Line Worker Name
      { wch: 25 }, // Assigned Areas
      { wch: 20 }, // Retailer Name
      { wch: 30 }, // Retailer Address
      { wch: 20 }, // Retailer Area
      { wch: 12 }, // Amount
      { wch: 15 }  // Payment Method
    ];
    ws['!cols'] = colWidths;

    // Apply styling to header rows
    // Make business name bold and larger
    if (ws['A3']) {
      ws['A3'].s = { font: { bold: true, sz: 16 } };
    }
    
    // Make address normal
    if (ws['A4']) {
      ws['A4'].s = { font: { sz: 12 } };
    }
    
    // Make report title bold
    if (ws['A7']) {
      ws['A7'].s = { font: { bold: true, sz: 14 } };
    }
    
    // Style line worker table
    const lineWorkerStartRow = headerData.length + 1;
    
    // Line worker details header with blue background and white text
    if (ws[`A${lineWorkerStartRow}`]) {
      ws[`A${lineWorkerStartRow}`].s = { 
        font: { bold: true, color: { rgb: "FFFFFF" } }, 
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center" }
      };
    }
    
    // Line worker column headers with blue background and white text
    const headerRow = lineWorkerStartRow + 1;
    if (ws[`A${headerRow}`]) {
      ws[`A${headerRow}`].s = { 
        font: { bold: true, color: { rgb: "FFFFFF" } }, 
        fill: { fgColor: { rgb: "4472C4" } }
      };
    }
    if (ws[`B${headerRow}`]) {
      ws[`B${headerRow}`].s = { 
        font: { bold: true, color: { rgb: "FFFFFF" } }, 
        fill: { fgColor: { rgb: "4472C4" } }
      };
    }
    
    // Add borders to line worker data cells
    for (let i = 0; i < lineWorkerData.length; i++) {
      const dataRow = headerRow + 1 + i;
      // Name cell
      if (ws[`A${dataRow}`]) {
        ws[`A${dataRow}`].s = { 
          border: { 
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }
      // Phone cell
      if (ws[`B${dataRow}`]) {
        ws[`B${dataRow}`].s = { 
          border: { 
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }
    }
    
    // Make column headers bold
    const columnHeaderRow = headerData.length + lineWorkerTable.length;
    for (let i = 0; i < columnHeaders.length; i++) {
      const cellAddress = XLSX.utils.encode_cell({ r: columnHeaderRow, c: i });
      if (ws[cellAddress]) {
        ws[cellAddress].s = { font: { bold: true } };
      }
    }

    // Make totals bold
    const totalRow1 = wsData.length - 2;
    const totalRow2 = wsData.length - 1;
    
    if (ws[`H${totalRow1 + 1}`]) {
      ws[`H${totalRow1 + 1}`].s = { font: { bold: true } };
    }
    if (ws[`I${totalRow1 + 1}`]) {
      ws[`I${totalRow1 + 1}`].s = { font: { bold: true } };
    }
    if (ws[`H${totalRow2 + 1}`]) {
      ws[`H${totalRow2 + 1}`].s = { font: { bold: true } };
    }
    if (ws[`I${totalRow2 + 1}`]) {
      ws[`I${totalRow2 + 1}`].s = { font: { bold: true } };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Day Sheet');

    // Add summary sheet with more detailed information
    const summaryData = [
      ['SUMMARY REPORT', ''],
      ['', ''],
      ['BUSINESS INFORMATION', ''],
      ['Wholesaler Business Name', wholesalerBusinessName],
      ['Wholesaler Address', wholesalerAddress || 'Not provided'],
      ['Report Period', `${formatTimestamp(dateRange.startDate)} - ${formatTimestamp(dateRange.endDate)}`],
      ['Generated On', formatTimestampWithTime(new Date())],
      ['', ''],
      ['COLLECTION SUMMARY', ''],
      ['Total Collections', totalCollections],
      ['Total Amount Collected', totalAmount],
      ['Average Collection', totalCollections > 0 ? totalAmount / totalCollections : 0],
      ['', ''],
      ['FILTERS APPLIED', ''],
      ['Line Worker', selectedLineWorker === 'all' ? 'All Line Workers' : getLineWorkerName(selectedLineWorker)],
      ['Area', selectedArea === 'all' ? 'All Areas' : getAreaName(selectedArea)],
      ['Retailer', selectedRetailer === 'all' ? 'All Retailers' : getRetailerName(selectedRetailer)],
      ['', ''],
      ['LINE WORKER DETAILS', ''],
      ...(
        selectedLineWorker === 'all' 
          ? [...new Set(filteredData.map(item => item.lineWorkerName))].map(name => {
              const worker = lineWorkers.find(lw => lw.displayName === name);
              return [name, worker?.phone || 'No phone'];
            })
          : (() => {
              const worker = lineWorkers.find(lw => lw.id === selectedLineWorker);
              return [[worker?.displayName || 'Unknown', worker?.phone || 'No phone']];
            })()
      ),
      ['', ''],
      ['BREAKDOWN BY LINE WORKER', ''],
      ...Object.entries(
        filteredData.reduce((acc, item) => {
          acc[item.lineWorkerName] = (acc[item.lineWorkerName] || 0) + item.amount;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, amount]) => [name, amount]),
      ['', ''],
      ['BREAKDOWN BY PAYMENT METHOD', ''],
      ...Object.entries(
        filteredData.reduce((acc, item) => {
          acc[item.paymentMethod] = (acc[item.paymentMethod] || 0) + item.amount;
          return acc;
        }, {} as Record<string, number>)
      ).map(([method, amount]) => [method, amount])
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
    
    // Apply styling to summary headers
    if (summaryWs['A1']) summaryWs['A1'].s = { font: { bold: true, sz: 14 } };
    if (summaryWs['A4']) summaryWs['A4'].s = { font: { bold: true } };
    if (summaryWs['A9']) summaryWs['A9'].s = { font: { bold: true } };
    if (summaryWs['A14']) summaryWs['A14'].s = { font: { bold: true } };
    if (summaryWs['A19']) summaryWs['A19'].s = { font: { bold: true } };
    if (summaryWs['A24']) summaryWs['A24'].s = { font: { bold: true } };
    if (summaryWs['A29']) summaryWs['A29'].s = { font: { bold: true } };

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate file name
    const fileName = `DaySheet_${wholesalerBusinessName.replace(/\s+/g, '_')}_${formatTimestamp(dateRange.startDate)}.xlsx`;

    // Save file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, fileName);
  };

  // Get unique line workers for filter
  const uniqueLineWorkers = useMemo(() => {
    const workerIds = [...new Set(payments.map(p => p.lineWorkerId))];
    return workerIds.map(id => ({
      id,
      name: getLineWorkerName(id)
    }));
  }, [payments, lineWorkers]);

  // Get unique areas for filter
  const uniqueAreas = useMemo(() => {
    const areaIds = [...new Set(payments.map(p => {
      const retailer = retailers.find(r => r.id === p.retailerId);
      return retailer?.areaId;
    }).filter((id): id is string => Boolean(id)))];
    return areaIds.map(id => ({
      id,
      name: getAreaName(id)
    }));
  }, [payments, retailers, areas]);

  // Get unique retailers for filter
  const uniqueRetailers = useMemo(() => {
    const retailerIds = [...new Set(payments.map(p => p.retailerId))];
    return retailerIds.map(id => ({
      id,
      name: getRetailerName(id)
    }));
  }, [payments, retailers]);

  return (
    <React.Fragment>
      <Button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2"
        variant="outline"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span>Day Sheet</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Day Sheet - {wholesalerBusinessName}</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

              <div className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Line Worker</span>
              </label>
              <Select value={selectedLineWorker} onValueChange={setSelectedLineWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="All line workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Line Workers</SelectItem>
                  {uniqueLineWorkers.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Area</span>
              </label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {uniqueAreas.map(area => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Store className="h-4 w-4" />
                <span>Retailer</span>
              </label>
              <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
                <SelectTrigger>
                  <SelectValue placeholder="All retailers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Retailers</SelectItem>
                  {uniqueRetailers.map(retailer => (
                    <SelectItem key={retailer.id} value={retailer.id}>
                      {retailer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Date Range</span>
              </label>
              <DateRangeFilter
                value={selectedDateRangeOption}
                onValueChange={handleDateRangeChange}
              />
            </div>
          </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCollections}</div>
                <p className="text-xs text-muted-foreground">
                  Payment transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <div className="h-4 w-4 text-green-600">₹</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Collected amount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Collection</CardTitle>
                <div className="h-4 w-4 text-blue-600">₹</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalCollections > 0 ? totalAmount / totalCollections : 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Collection Details</CardTitle>
                <CardDescription>
                  {filteredData.length} transactions found
                </CardDescription>
              </div>
              <Button onClick={generateExcel} className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Time</TableHead>
                      <TableHead className="whitespace-nowrap">Line Worker</TableHead>
                      <TableHead className="whitespace-nowrap">Assigned Areas</TableHead>
                      <TableHead className="whitespace-nowrap">Retailer</TableHead>
                      <TableHead className="whitespace-nowrap">Retailer Area</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No collections found for the selected criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, index) => (
                        <TableRow key={`${item.paymentId}-${index}`}>
                          <TableCell>{formatTimestamp(item.date)}</TableCell>
                          <TableCell>{item.time}</TableCell>
                          <TableCell className="font-medium">{item.lineWorkerName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.lineWorkerArea}</TableCell>
                          <TableCell className="font-medium">{item.retailerName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.retailerArea}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.paymentMethod}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                  </div>
                </div>

                {/* Tablet View */}
                <div className="hidden md:block lg:hidden">
                  <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Line Worker</TableHead>
                      <TableHead className="whitespace-nowrap">Retailer</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No collections found for the selected criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, index) => (
                        <TableRow key={`${item.paymentId}-${index}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{formatTimestamp(item.date)}</div>
                              <div className="text-xs text-gray-500">{item.time}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{item.lineWorkerName}</TableCell>
                          <TableCell className="font-medium">{item.retailerName}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.paymentMethod}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                {filteredData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No collections found for the selected criteria
                  </div>
                ) : (
                  filteredData.map((item, index) => (
                    <Card key={`${item.paymentId}-${index}`} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{formatCurrency(item.amount)}</div>
                            <div className="text-sm text-gray-600">{item.paymentMethod}</div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{formatTimestamp(item.date)}</div>
                            <div>{item.time}</div>
                          </div>
                        </div>
                        
                        <div className="border-t pt-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Line Worker:</span>
                            <span className="text-sm">{item.lineWorkerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Retailer:</span>
                            <span className="text-sm">{item.retailerName}</span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div><strong>Worker Areas:</strong> {item.lineWorkerArea}</div>
                            <div><strong>Retailer Area:</strong> {item.retailerArea}</div>
                            {item.retailerAddress && (
                              <div><strong>Address:</strong> {item.retailerAddress}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

                {/* Footer Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <strong>Summary:</strong> {totalCollections} collections totaling {formatCurrency(totalAmount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Generated on {formatTimestampWithTime(new Date())}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}