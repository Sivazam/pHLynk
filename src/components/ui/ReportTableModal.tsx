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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Payment Report Details
              </DialogTitle>
              <DialogDescription>
                Complete payment history and analysis for the selected period
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.totalPayments}</div>
                <p className="text-xs text-muted-foreground">
                  Transactions in period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reportData.summary.totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Total transaction value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Period</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{getDateRangeLabel(reportData.summary.dateRange.label)}</div>
                <p className="text-xs text-muted-foreground">
                  {new Date(reportData.summary.dateRange.start).toLocaleDateString('en-IN')} - {new Date(reportData.summary.dateRange.end).toLocaleDateString('en-IN')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Complete list of payments in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found in the selected period
                </div>
              ) : (
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Wholesaler</TableHead>
                        <TableHead>Line Worker</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.payments.map((payment) => (
                        <TableRow key={payment.paymentId}>
                          <TableCell className="font-mono text-sm">
                            {payment.paymentId.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(payment.createdAt).toLocaleTimeString('en-IN')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{payment.wholesalerName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{payment.lineWorkerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.totalPaid || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.method || 'CASH'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {payment.state}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Report generated on {new Date().toLocaleString('en-IN')}
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadCSV} size="lg">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}