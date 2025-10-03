"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface EnhancedDatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function EnhancedDatePicker({
  date,
  onSelect,
  className,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
}: EnhancedDatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(date || new Date())
  const [open, setOpen] = React.useState(false)

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    if (onSelect) {
      onSelect(newDate)
    }
    setOpen(false)
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const monthYear = format(currentMonth, "MMMM yyyy")

  // Generate month options for the select dropdown
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(currentMonth.getFullYear(), i, 1)
    return {
      value: i.toString(),
      label: format(monthDate, "MMMM"),
      date: monthDate
    }
  })

  // Generate year options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => {
    const year = currentYear - 25 + i
    return {
      value: year.toString(),
      label: year.toString()
    }
  })

  const handleMonthSelect = (monthValue: string) => {
    const monthIndex = parseInt(monthValue)
    setCurrentMonth(prev => new Date(prev.getFullYear(), monthIndex, 1))
  }

  const handleYearSelect = (yearValue: string) => {
    const year = parseInt(yearValue)
    setCurrentMonth(prev => new Date(year, prev.getMonth(), 1))
  }

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-2">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
                className="h-8 w-8 p-0"
              >
                {"<"}
              </Button>
              
              <div className="flex items-center space-x-2">
                <Select
                  value={currentMonth.getMonth().toString()}
                  onValueChange={handleMonthSelect}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={currentMonth.getFullYear().toString()}
                  onValueChange={handleYearSelect}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('next')}
                className="h-8 w-8 p-0"
              >
                {">"}
              </Button>
            </div>

            {/* Calendar */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={isDateDisabled}
              initialFocus
              className="rounded-md border"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}