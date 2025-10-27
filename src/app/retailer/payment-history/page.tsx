'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, Filter, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Wholesaler {
  id: string
  name: string
  email: string
  phone: string
}

interface Payment {
  id: string
  amount: number
  method: 'CASH' | 'UPI' | 'BANK_TRANSFER'
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  date: string
  wholesaler: Wholesaler
  referenceNumber?: string
}

interface PaymentHistoryResponse {
  payments: Payment[]
  summary: {
    totalAmount: number
    completedAmount: number
    pendingAmount: number
    wholesalerBreakdown: {
      wholesalerId: string
      wholesalerName: string
      totalPaid: number
      paymentCount: number
    }[]
  }
}

export default function PaymentHistoryPage() {
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<PaymentHistoryResponse['summary'] | null>(null)
  const [selectedWholesaler, setSelectedWholesaler] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchWholesalers()
    fetchPaymentHistory()
  }, [])

  useEffect(() => {
    fetchPaymentHistory()
  }, [selectedWholesaler, dateRange])

  const fetchWholesalers = async () => {
    try {
      const response = await fetch('/api/retailer/wholesalers')
      if (response.ok) {
        const data = await response.json()
        setWholesalers(data.wholesalers)
      }
    } catch (error) {
      console.error('Error fetching wholesalers:', error)
    }
  }

  const fetchPaymentHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedWholesaler !== 'all') {
        params.append('wholesalerId', selectedWholesaler)
      }
      if (dateRange.from) {
        params.append('from', dateRange.from.toISOString())
      }
      if (dateRange.to) {
        params.append('to', dateRange.to.toISOString())
      }

      const response = await fetch(`/api/retailer/payment-history?${params}`)
      if (response.ok) {
        const data: PaymentHistoryResponse = await response.json()
        setPayments(data.payments)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'csv' | 'json') => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (selectedWholesaler !== 'all') {
        params.append('wholesalerId', selectedWholesaler)
      }
      if (dateRange.from) {
        params.append('from', dateRange.from.toISOString())
      }
      if (dateRange.to) {
        params.append('to', dateRange.to.toISOString())
      }
      params.append('format', format)

      const response = await fetch(`/api/retailer/payment-history/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payment-history.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    } finally {
      setExporting(false)
    }
  }

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'OTP_SENT':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'INITIATED':
        return 'bg-yellow-100 text-yellow-800'
      case 'OTP_VERIFIED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDisplayStatus = (status: Payment['status']) => {
    switch (status) {
      case 'OTP_SENT':
        return 'OTP_Received' // Retailer perspective: they receive OTP
      case 'COMPLETED':
        return 'Completed'
      case 'CANCELLED':
        return 'Cancelled'
      case 'INITIATED':
        return 'Initiated'
      case 'OTP_VERIFIED':
        return 'OTP_Verified'
      default:
        return status
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pt-20 sm:pt-24">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Payment History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and analyze your payment history across all wholesalers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => fetchPaymentHistory()}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportData('csv')}
            disabled={exporting}
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportData('json')}
            disabled={exporting}
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.completedAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(summary.pendingAmount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Wholesaler</Label>
            <Select value={selectedWholesaler} onValueChange={setSelectedWholesaler}>
              <SelectTrigger>
                <SelectValue placeholder="Select wholesaler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wholesalers</SelectItem>
                {wholesalers.map((wholesaler) => (
                  <SelectItem key={wholesaler.id} value={wholesaler.id}>
                    {wholesaler.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange.from && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) =>
                    setDateRange((prev) => ({ ...prev, from: date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange.to && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) =>
                    setDateRange((prev) => ({ ...prev, to: date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Wholesaler Breakdown */}
      {summary && summary.wholesalerBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown by Wholesaler</CardTitle>
            <CardDescription>
              Summary of payments made to each wholesaler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.wholesalerBreakdown.map((breakdown) => (
                <div
                  key={breakdown.wholesalerId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{breakdown.wholesalerName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {breakdown.paymentCount} payments
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(breakdown.totalPaid)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Detailed view of all your transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Wholesaler</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Method</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {format(new Date(payment.date), 'MMM dd, yyyy, HH:mm')}
                      </td>
                      <td className="p-2 font-medium">{payment.wholesaler.name}</td>
                      <td className="p-2 font-bold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{payment.method}</Badge>
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusColor(payment.status)}>
                          {getDisplayStatus(payment.status)}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {payment.referenceNumber || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}