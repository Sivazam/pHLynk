'use client';

import React, { useState, useCallback } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface LightweightDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function LightweightDatePicker({
  value,
  onChange,
  label = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
}: LightweightDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [inputValue, setInputValue] = useState(value ? format(value, 'MM/dd/yyyy') : '');

  const handleDateSelect = useCallback((date: Date) => {
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    
    const formattedDate = format(date, 'MM/dd/yyyy');
    setInputValue(formattedDate);
    setOpen(false);
    onChange?.(date);
  }, [minDate, maxDate, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Try to parse the input as a date
    if (value.length === 10) { // MM/dd/yyyy format
      const parts = value.split('/');
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

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, []);

  const isDateDisabled = useCallback((date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }, [minDate, maxDate]);

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="MM/dd/yyyy"
            disabled={disabled}
            className="h-10 pr-10"
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div 
                className="p-3"
                onClick={(e) => {
                  // Prevent clicks inside the calendar from closing the popover
                  e.stopPropagation();
                }}
              >
                {/* Month/Year Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeMonth('prev');
                    }}
                    className="h-8 w-8 p-0"
                  >
                    {"<"}
                  </Button>
                  <div className="font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeMonth('next');
                    }}
                    className="h-8 w-8 p-0"
                  >
                    {">"}
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {weekDays.map(day => (
                    <div key={day} className="font-medium text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                  {days.map((date, index) => (
                    <div key={index} className="aspect-square">
                      {date ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDateSelect(date);
                          }}
                          disabled={isDateDisabled(date)}
                          className={cn(
                            "w-full h-full rounded text-sm transition-colors",
                            isSameDay(date, value || new Date(0)) && "bg-blue-500 text-white",
                            !isSameDay(date, value || new Date(0)) && !isDateDisabled(date) && "hover:bg-gray-100",
                            isDateDisabled(date) && "text-gray-300 cursor-not-allowed",
                            isSameMonth(date, currentMonth) || "text-gray-400"
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
                <div className="flex justify-between mt-4 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateSelect(new Date());
                    }}
                    disabled={isDateDisabled(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}