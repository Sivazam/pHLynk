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
    const [isOpen, setIsOpen] = React.useState(false);

    // Internal state to handle the selection process
    const [date, setDate] = React.useState<DateRange | undefined>(() => {
        return (startDate && endDate) ? { from: startDate, to: endDate } :
            startDate ? { from: startDate, to: startDate } : undefined;
    });

    // Sync internal state with props when props change (and we are not in the middle of picking?)
    // To be safe, we sync whenever props change, assuming parent is source of truth.
    React.useEffect(() => {
        if (startDate && endDate) {
            setDate({ from: startDate, to: endDate });
        }
    }, [startDate, endDate]);

    const handleSelect = (newDate: DateRange | undefined) => {
        setDate(newDate);

        if (newDate?.from && newDate?.to) {
            // Range is complete (or single day selected twice)
            const adjustedStart = new Date(newDate.from);
            adjustedStart.setHours(0, 0, 0, 0);

            const adjustedEnd = new Date(newDate.to);
            adjustedEnd.setHours(23, 59, 59, 999);

            onChange({ startDate: adjustedStart, endDate: adjustedEnd });
            setIsOpen(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // If closing and we have a partial selection (from but no to), commit it as single day
            if (date?.from && !date.to) {
                const adjustedStart = new Date(date.from);
                adjustedStart.setHours(0, 0, 0, 0);
                const adjustedEnd = new Date(date.from);
                adjustedEnd.setHours(23, 59, 59, 999);

                // Update internal state to match
                setDate({ from: date.from, to: date.from });
                onChange({ startDate: adjustedStart, endDate: adjustedEnd });
            } else if (!date) {
                // If cleared (though we don't allow clearing usually), maybe revert to props?
                // For now, if undefined, we assume no change or let it be.
            }
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
                        onSelect={handleSelect}
                        numberOfMonths={1}
                        disabled={(date) => date > new Date()} // Prevent future dates
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
