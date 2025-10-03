'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';

export interface DateRangeOption {
  value: string;
  label: string;
  getDateRange: () => { startDate: Date; endDate: Date };
}

export const dateRangeOptions: DateRangeOption[] = [
  {
    value: 'today',
    label: 'Today',
    getDateRange: () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      return { startDate: startOfDay, endDate: endOfDay };
    }
  },
  {
    value: 'last7days',
    label: 'Last 7 Days',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  },
  {
    value: 'last1month',
    label: 'Last 1 Month',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  },
  {
    value: 'last3months',
    label: 'Last 3 Months',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  },
  {
    value: 'last6months',
    label: 'Last 6 Months',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  },
  {
    value: 'lastyear',
    label: 'Last Year',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  }
];

interface DateRangeFilterProps {
  value?: string;
  onValueChange?: (value: string, dateRange: { startDate: Date; endDate: Date }) => void;
  className?: string;
}

export function DateRangeFilter({ value = 'today', onValueChange, className }: DateRangeFilterProps) {
  const handleValueChange = (newValue: string) => {
    const selectedOption = dateRangeOptions.find(option => option.value === newValue);
    if (selectedOption && onValueChange) {
      const dateRange = selectedOption.getDateRange();
      onValueChange(newValue, dateRange);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          {dateRangeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}