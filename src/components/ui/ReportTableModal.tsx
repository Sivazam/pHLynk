'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  FileText, 
  Calendar, 
  Building2, 
  TrendingUp,
  IndianRupee,
  User,
  CheckCircle,
  X
} from 'lucide-react'

interface Payment {
  paymentId: string
  createdAt: string
  completedAt: string
  retailer: {
    name: string
    phone: string
  }
  wholesalerName: string
  lineWorkerName: string
  totalPaid: number
  method: string
  state: string
}

interface ReportData {
  payments: Payment[]
  summary: {
    totalAmount: number
    totalPayments: number
    dateRange: {
      start: string
      end: string
      label: string
    }
  }
  csvContent: string
}

interface ReportTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportData: ReportData | null
}

export function ReportTableModal({ open, onOpenChange, reportData }: ReportTableModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDateRangeLabel = (label: string) => {
    const labels: { [key: string]: string } = {
      'today': 'Today',
      'last_7_days': 'Last 7 Days',
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'last_6_months': 'Last 6 Months',
      'last_1_year': 'Last 1 Year',
    }
    return labels[label] || label
  }

  const downloadCSV = () => {
    if (!reportData) return

    const blob = new Blob([reportData.csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    // Generate dynamic filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileName = `payment-report-${timestamp}-${randomSuffix}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!reportData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] lg:w-[85vw] max-h-[90vh] overflow-hidden mx-auto">
        <DialogHeader className="pb-4 px-4 sm:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FileText className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">Payment Report Details</span>
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Complete payment history and analysis for the selected period
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-8rem)] overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6 pb-6">
              {/* Report Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate">Total Payments</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{reportData.summary.totalPayments}</div>
                    <p className="text-xs text-muted-foreground">
                      Transactions in period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate">Total Amount</CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{formatCurrency(reportData.summary.totalAmount)}</div>
                    <p className="text-xs text-muted-foreground">
                      Total transaction value
                    </p>
                  </CardContent>
                </Card>

                <Card className="sm:col-span-2 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate">Period</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-base sm:text-lg font-bold truncate">{getDateRangeLabel(reportData.summary.dateRange.label)}</div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reportData.summary.dateRange.start).toLocaleDateString('en-IN')} - {new Date(reportData.summary.dateRange.end).toLocaleDateString('en-IN')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payments Table */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Payment Details</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Complete list of payments in the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {reportData.payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground px-4">
                      No payments found in the selected period
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Mobile Card View - Always visible for mobile-first approach */}
                      <div className="sm:hidden space-y-3 px-4 pb-4">
                        {reportData.payments.map((payment) => (
                          <Card key={payment.paymentId} className="p-4 border shadow-sm">
                            <div className="space-y-3">
                              {/* Header with amount and status */}
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-base text-primary truncate">{payment.wholesalerName}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right ml-3">
                                  <p className="font-bold text-lg text-primary">{formatCurrency(payment.totalPaid || 0)}</p>
                                  <Badge variant="default" className="bg-green-100 text-green-800 text-xs mt-1">
                                    {payment.state}
                                  </Badge>
                                </div>
                              </div>

                              {/* Payment details */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Payment ID</p>
                                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                    {payment.paymentId.substring(0, 8)}...
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Method</p>
                                  <Badge variant="outline" className="text-xs">
                                    {payment.method || 'CASH'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Line worker info */}
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">Line Worker:</span>
                                <span className="font-medium truncate">{payment.lineWorkerName}</span>
                              </div>

                              {/* Time info */}
                              <div className="text-xs text-muted-foreground border-t pt-2">
                                {new Date(payment.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table View - Improved responsive design */}
                      <div className="hidden sm:block">
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                          <div className="inline-block min-w-full align-middle">
                            <div className="overflow-hidden border rounded-lg">
                              <Table>
                                <TableHeader className="bg-muted/30">
                                  <TableRow>
                                    <TableHead className="px-4 py-3 text-left">
                                      <span className="text-xs font-semibold">Payment ID</span>
                                    </TableHead>
                                    <TableHead className="px-4 py-3 text-left">
                                      <span className="text-xs font-semibold">Date</span>
                                    </TableHead>
                                    <TableHead className="px-4 py-3 text-left">
                                      <span className="text-xs font-semibold">Wholesaler</span>
                                    </TableHead>
                                    <TableHead className="px-4 py-3 text-left hidden lg:table-cell">
                                      <span className="text-xs font-semibold">Line Worker</span>
                                    </TableHead>
                                    <TableHead className="px-4 py-3 text-right">
                                      <span className="text-xs font-semibold">Amount</span>
                                    </TableHead>
                                    <TableHead className="px-4 py-3 text-center hidden md:table-cell">
                                      <span className="text-xs font-semibold">Method</span>
                                    </TableHead>
                                    <TableHead className="px-4 py-3 text-center">
                                      <span className="text-xs font-semibold">Status</span>
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {reportData.payments.map((payment) => (
                                    <TableRow key={payment.paymentId} className="hover:bg-muted/50">
                                      <TableCell className="px-4 py-3">
                                        <span className="font-mono text-xs">
                                          {payment.paymentId.substring(0, 8)}...
                                        </span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                        <div>
                                          <div className="font-medium text-sm">
                                            {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                                          </div>
                                          <div className="text-xs text-muted-foreground lg:hidden">
                                            {new Date(payment.createdAt).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2 max-w-[120px] lg:max-w-none">
                                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <span className="truncate text-sm">{payment.wholesalerName}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 hidden lg:table-cell">
                                        <div className="flex items-center gap-2 max-w-[120px]">
                                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <span className="truncate text-sm">{payment.lineWorkerName}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right">
                                        <span className="font-semibold text-sm">
                                          {formatCurrency(payment.totalPaid || 0)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-center hidden md:table-cell">
                                        <Badge variant="outline" className="text-xs">
                                          {payment.method || 'CASH'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-center">
                                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                          {payment.state}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Total Summary */}
                      <div className="border-t pt-4 mt-4 px-4 sm:px-6">
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-muted-foreground">Total Payments:</span>
                              <span className="font-bold text-lg">{reportData.summary.totalPayments}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-muted-foreground">Total Amount:</span>
                              <span className="font-bold text-lg text-primary">{formatCurrency(reportData.summary.totalAmount)}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-muted/50">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                              <span className="text-xs text-muted-foreground text-center sm:text-left">
                                Report generated on {new Date().toLocaleString('en-IN')}
                              </span>
                              <Button onClick={downloadCSV} size="sm" className="w-full sm:w-auto">
                                <Download className="mr-2 h-4 w-4" />
                                Download CSV
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}