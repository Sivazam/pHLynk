'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Building2, 
  TrendingUp,
  IndianRupee,
  User,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  amount: number
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

export default function ReportPreview() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const dataParam = urlParams.get('data')
    
    if (dataParam) {
      try {
        const decodedData = JSON.parse(atob(dataParam))
        setReportData(decodedData)
      } catch (error) {
        console.error('Error parsing report data:', error)
      }
    }
    setLoading(false)
  }, [])

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

  const downloadCSV = () => {
    if (!reportData) return

    const blob = new Blob([reportData.csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const fileName = `payment-report-${new Date().toISOString().split('T')[0]}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Report Not Found</h1>
          <p className="text-muted-foreground mb-6">Unable to load the report data.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Report</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Detailed payment history and analysis
            </p>
          </div>
        </div>
        <Button onClick={downloadCSV} size="lg">
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
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
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method}</Badge>
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

      {/* Report Footer */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Report generated on {new Date().toLocaleString('en-IN')}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}