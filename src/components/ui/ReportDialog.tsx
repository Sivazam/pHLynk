'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Calendar, Building2, Loader2, CheckCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Wholesaler {
  id: string
  name: string
  email: string
}

interface ReportDialogProps {
  retailerId: string
}

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_1_year', label: 'Last 1 Year' },
]

export default function ReportDialog({ retailerId }: ReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([])
  const [selectedWholesaler, setSelectedWholesaler] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('today')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      fetchWholesalers()
    }
  }, [open])

  const fetchWholesalers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/wholesalers?retailerId=${retailerId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data && data.data.wholesalers) {
        const wholesalersList = data.data.wholesalers || []
        setWholesalers(wholesalersList)
        
        if (wholesalersList.length === 0) {
          setError('No wholesalers found for this retailer')
        }
      } else {
        setError('Invalid response format from server')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch wholesalers. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    setError(null)
    try {
      console.log('🔄 Generating report with params:', {
        retailerId,
        wholesalerId: selectedWholesaler,
        dateRange: selectedDateRange
      })

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId,
          wholesalerId: selectedWholesaler,
          dateRange: selectedDateRange,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 Generated report data:', data)

      if (data.success && data.data) {
        setGeneratedReport(data.data)
        console.log('✅ Report generated successfully')
      } else {
        throw new Error(data.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('❌ Error generating report:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = () => {
    if (!generatedReport?.csvContent) return

    const blob = new Blob([generatedReport.csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const filename = `payment-report-${selectedDateRange}-${new Date().toISOString().split('T')[0]}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const viewReport = () => {
    if (!generatedReport) return
    
    // Open report in new tab
    const reportData = btoa(JSON.stringify(generatedReport))
    const newWindow = window.open(`/retailer/report-preview?data=${reportData}`, '_blank')
    if (!newWindow) {
      // Fallback: navigate in same tab
      router.push(`/retailer/report-preview?data=${reportData}`)
      setOpen(false)
    }
  }

  const resetReport = () => {
    setGeneratedReport(null)
    setError(null)
  }

  const closeDialog = () => {
    setOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      resetReport()
    }, 300)
  }

  const getDateRangeDescription = (range: string) => {
    const today = new Date()
    switch (range) {
      case 'today':
        return today.toLocaleDateString('en-IN')
      case 'last_7_days':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        return `${weekAgo.toLocaleDateString('en-IN')} - ${today.toLocaleDateString('en-IN')}`
      case 'this_month':
        return `${today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1)
        return `${lastMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
      case 'last_6_months':
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6)
        return `${sixMonthsAgo.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} - ${today.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
      case 'last_1_year':
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth())
        return `${oneYearAgo.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} - ${today.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
      default:
        return ''
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50 md:bottom-6 md:right-6 border-2 border-white"
            style={{ zIndex: 9999 }}
          >
            <FileText className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {generatedReport ? 'Payment Report Generated' : 'Generate Payment Report'}
            </DialogTitle>
            <DialogDescription>
              {generatedReport 
                ? 'Your payment report has been generated successfully. You can view or download it below.'
                : 'Create a detailed report of your payments to wholesalers'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetReport}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Generated Report Display */}
          {generatedReport && !error && (
            <div className="space-y-6">
              {/* Report Summary */}
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Report Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Period:</span>
                      <span className="font-medium">{dateRanges.find(r => r.value === selectedDateRange)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wholesaler:</span>
                      <span className="font-medium">
                        {selectedWholesaler === 'all' ? 'All Wholesalers' : wholesalers.find(w => w.id === selectedWholesaler)?.name || 'Selected'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Payments:</span>
                      <span className="font-medium">{generatedReport.summary?.totalPayments || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">₹{(generatedReport.summary?.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="font-medium">CSV with Details</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={viewReport}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Report
                </Button>
                <Button 
                  onClick={downloadReport}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>

              {/* Generate New Report */}
              <div className="pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={resetReport}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Another Report
                </Button>
              </div>
            </div>
          )}

          {/* Report Generation Form */}
          {!generatedReport && !error && (
            <div className="space-y-6">
              {/* Wholesaler Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Wholesaler</Label>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading wholesalers...</span>
                  </div>
                ) : wholesalers.length === 0 ? (
                  <div className="text-center py-4">
                    <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No wholesalers found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You haven't made any payments yet
                    </p>
                  </div>
                ) : (
                  <RadioGroup value={selectedWholesaler} onValueChange={setSelectedWholesaler}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">All Wholesalers</span>
                          <Badge variant="secondary">All</Badge>
                        </div>
                      </Label>
                    </div>
                    {wholesalers.map((wholesaler) => (
                      <div key={wholesaler.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value={wholesaler.id} id={wholesaler.id} />
                        <Label htmlFor={wholesaler.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{wholesaler.name}</span>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {/* Date Range Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Date Range</Label>
                <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getDateRangeDescription(selectedDateRange)}
                </p>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={generateReport} 
                disabled={loading || wholesalers.length === 0 || generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}