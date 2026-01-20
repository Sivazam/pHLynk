"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ModernDateRangePickerProps {
    startDate?: Date;
    endDate?: Date;
    onChange: (range: { startDate: Date; endDate: Date }) => void;
    className?: string;
}

export function ModernDateRangePicker({
    startDate,
    endDate,
    onChange,
    className,
}: ModernDateRangePickerProps) {
    // Convert separate dates to DateRange object
    const date: DateRange | undefined = (startDate && endDate) ? {
        from: startDate,
        to: endDate,
    } : startDate ? {
        from: startDate,
        to: startDate
    } : undefined;

    const setDate = (newDate: DateRange | undefined) => {
        if (newDate?.from) {
            // Apply selection immediately, or wait for 'to'? 
            // Usually we wait for 'to' but we can update start if 'to' is missing.
            // If 'to' is missing, endDate defaults to fromDate (single day range) or kept as is?
            // User wants "from and to". Standard behavior:
            // 1. Click -> sets from
            // 2. Click -> sets to

            const newStart = newDate.from;
            const newEnd = newDate.to || newDate.from; // Default to start if end not picked yet

            // Ensure distinct dates or same dates are handled.
            // Adjust time to start/end of day logic is usually handled by parent or here.
            // Existing logic expected 00:00:00 and 23:59:59.

            const adjustedStart = new Date(newStart);
            adjustedStart.setHours(0, 0, 0, 0);

            const adjustedEnd = new Date(newEnd);
            adjustedEnd.setHours(23, 59, 59, 999);

            onChange({ startDate: adjustedStart, endDate: adjustedEnd });
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal bg-white",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        disabled={(date) => date > new Date()} // Prevent future dates
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
