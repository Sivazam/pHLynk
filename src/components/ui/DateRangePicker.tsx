'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-day-picker/dist/style.css';

interface DateRangePickerProps {
    value?: { startDate: Date; endDate: Date };
    onChange?: (range: { startDate: Date; endDate: Date }) => void;
    className?: string;
    placeholder?: string;
}

export function DateRangePicker({
    value,
    onChange,
    className = '',
    placeholder = 'Select date range'
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState<DateRange | undefined>(() => {
        if (value) {
            return { from: value.startDate, to: value.endDate };
        }
        // Default to today
        const today = new Date();
        return { from: startOfDay(today), to: endOfDay(today) };
    });
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Sync external value changes
    useEffect(() => {
        if (value) {
            setRange({ from: value.startDate, to: value.endDate });
        }
    }, [value?.startDate?.getTime(), value?.endDate?.getTime()]);

    const handleRangeSelect = (selectedRange: DateRange | undefined) => {
        setRange(selectedRange);

        // Auto-close and trigger onChange when both dates are selected
        if (selectedRange?.from && selectedRange?.to) {
            onChange?.({
                startDate: startOfDay(selectedRange.from),
                endDate: endOfDay(selectedRange.to)
            });
            // Small delay for visual feedback
            setTimeout(() => setIsOpen(false), 200);
        }
    };

    const handleQuickSelect = (days: number | 'today' | 'thisMonth') => {
        const today = new Date();
        let from: Date;
        let to: Date = endOfDay(today);

        if (days === 'today') {
            from = startOfDay(today);
        } else if (days === 'thisMonth') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
            from = new Date(today);
            from.setDate(today.getDate() - days + 1);
            from = startOfDay(from);
        }

        const newRange = { from, to };
        setRange(newRange);
        onChange?.({ startDate: from, endDate: to });
        setTimeout(() => setIsOpen(false), 200);
    };

    const displayValue = range?.from
        ? range.to
            ? `${format(range.from, 'dd MMM yyyy')} - ${format(range.to, 'dd MMM yyyy')}`
            : format(range.from, 'dd MMM yyyy')
        : placeholder;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto min-w-[220px] text-left"
            >
                <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm truncate">{displayValue}</span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-in fade-in-0 zoom-in-95 duration-200">
                    {/* Quick Select Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickSelect('today')}
                            className="text-xs"
                        >
                            Today
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickSelect(7)}
                            className="text-xs"
                        >
                            Last 7 days
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickSelect(30)}
                            className="text-xs"
                        >
                            Last 30 days
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickSelect('thisMonth')}
                            className="text-xs"
                        >
                            This Month
                        </Button>
                    </div>

                    {/* Calendar */}
                    <DayPicker
                        mode="range"
                        selected={range}
                        onSelect={handleRangeSelect}
                        numberOfMonths={2}
                        showOutsideDays
                        disabled={{ after: new Date() }}
                        className="rdp-custom"
                        classNames={{
                            months: 'flex gap-4 flex-col sm:flex-row',
                            month: 'space-y-4',
                            caption: 'flex justify-center pt-1 relative items-center',
                            caption_label: 'text-sm font-semibold text-gray-900',
                            nav: 'space-x-1 flex items-center',
                            nav_button: 'h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded-full inline-flex items-center justify-center',
                            nav_button_previous: 'absolute left-1',
                            nav_button_next: 'absolute right-1',
                            table: 'w-full border-collapse space-y-1',
                            head_row: 'flex',
                            head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
                            row: 'flex w-full mt-2',
                            cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
                            day: 'h-9 w-9 p-0 font-normal hover:bg-blue-50 rounded-full inline-flex items-center justify-center transition-colors',
                            day_range_start: 'rounded-full bg-blue-600 text-white hover:bg-blue-700',
                            day_range_end: 'rounded-full bg-blue-600 text-white hover:bg-blue-700',
                            day_selected: 'bg-blue-600 text-white hover:bg-blue-700',
                            day_today: 'border border-blue-600 text-blue-600 font-semibold',
                            day_outside: 'text-gray-400 opacity-50',
                            day_disabled: 'text-gray-400 opacity-50 cursor-not-allowed',
                            day_range_middle: 'bg-blue-50 text-blue-900 rounded-none',
                            day_hidden: 'invisible',
                        }}
                    />

                    {/* Footer with selected range */}
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {range?.from && range?.to && (
                                <>
                                    <span className="font-medium">{format(range.from, 'dd MMM yyyy')}</span>
                                    <span className="mx-2">→</span>
                                    <span className="font-medium">{format(range.to, 'dd MMM yyyy')}</span>
                                </>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-500"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
