'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CompactDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function CompactDatePicker({
  value,
  onChange,
  label = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
}: CompactDatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [inputValue, setInputValue] = useState(value ? format(value, 'MM/dd/yyyy') : '');
  const calendarRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    
    const formattedDate = format(date, 'MM/dd/yyyy');
    setInputValue(formattedDate);
    setShowCalendar(false);
    onChange?.(date);
  }, [minDate, maxDate, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Try to parse the input as a date
    if (val.length === 10) { // MM/dd/yyyy format
      const parts = val.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            if ((!minDate || date >= minDate) && (!maxDate || date <= maxDate)) {
              onChange?.(date);
            }
          }
        }
      }
    }
  }, [minDate, maxDate, onChange]);

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  }, []);

  const getCalendarDays = useCallback(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = monthStart.getDay();
    
    // Add empty cells for days before the first day of the month
    const calendarDays: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add the days of the month
    calendarDays.push(...days);
    
    return calendarDays;
  }, [currentMonth]);

  const isDateDisabled = useCallback((date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }, [minDate, maxDate]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calendarDays = getCalendarDays();

  return (
    <div className={cn("relative", className)}>
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="MM/dd/yyyy"
            disabled={disabled}
            className="h-9 pr-8 text-sm"
            onFocus={() => !disabled && setShowCalendar(true)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            disabled={disabled}
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon className="h-3 w-3" />
          </Button>
        </div>
        
        {showCalendar && (
          <div 
            ref={calendarRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2"
          >
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-2 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeMonth('prev')}
                className="h-6 w-6 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="text-xs font-medium text-gray-700">
                {format(currentMonth, 'MMM yyyy')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeMonth('next')}
                className="h-6 w-6 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {weekDays.map(day => (
                <div key={day} className="font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
              {calendarDays.map((date, index) => (
                <div key={index} className="aspect-square">
                  {date ? (
                    <button
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      disabled={isDateDisabled(date)}
                      className={cn(
                        "w-full h-full rounded text-xs transition-colors",
                        isSameDay(date, value || new Date(0)) && "bg-blue-500 text-white",
                        !isSameDay(date, value || new Date(0)) && !isDateDisabled(date) && "hover:bg-gray-100",
                        isDateDisabled(date) && "text-gray-300 cursor-not-allowed",
                        !isSameMonth(date, currentMonth) && "text-gray-400",
                        isToday(date) && !isSameDay(date, value || new Date(0)) && "font-medium border border-blue-200"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between mt-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                disabled={isDateDisabled(new Date())}
                className="text-xs h-6 px-2"
              >
                Today
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCalendar(false)}
                className="text-xs h-6 px-2"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}