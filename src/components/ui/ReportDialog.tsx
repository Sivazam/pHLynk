'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Calendar, Building2, Loader2 } from 'lucide-react'
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
      if (response.ok) {
        const data = await response.json()
        setWholesalers(data.data.wholesalers || [])
      }
    } catch (error) {
      console.error('Error fetching wholesalers:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    try {
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

      if (response.ok) {
        const data = await response.json()
        
        // Navigate to report preview page with the report data
        const reportData = btoa(JSON.stringify(data.data))
        router.push(`/retailer/report-preview?data=${reportData}`)
        setOpen(false)
      } else {
        console.error('Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGenerating(false)
    }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 md:bottom-6 md:right-6"
        >
          <FileText className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Payment Report
          </DialogTitle>
          <DialogDescription>
            Create a detailed report of your payments to wholesalers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wholesaler Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Wholesaler</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
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
            
            {/* Date Range Description */}
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{getDateRangeDescription(selectedDateRange)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-800">Report Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span>Wholesaler:</span>
                  <span className="font-medium">
                    {selectedWholesaler === 'all' ? 'All Wholesalers' : wholesalers.find(w => w.id === selectedWholesaler)?.name || 'Selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span className="font-medium">{dateRanges.find(r => r.value === selectedDateRange)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="font-medium">CSV with Details</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={generateReport} 
              disabled={generating || loading}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}