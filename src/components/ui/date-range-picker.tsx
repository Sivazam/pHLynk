"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format, startOfDay, endOfDay, subDays, subMonths, subYears } from "date-fns"
import { DateRange } from "react-day-picker"

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

export interface DateRangePickerProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    align?: "start" | "center" | "end"
}

export function DateRangePicker({
    className,
    date,
    setDate,
    align = "start",
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    // Presets for quick selection
    const presets = [
        {
            label: "Today",
            getValue: () => ({
                from: startOfDay(new Date()),
                to: endOfDay(new Date()),
            }),
        },
        {
            label: "Yesterday",
            getValue: () => ({
                from: startOfDay(subDays(new Date(), 1)),
                to: endOfDay(subDays(new Date(), 1)),
            }),
        },
        {
            label: "Last 7 Days",
            getValue: () => ({
                from: startOfDay(subDays(new Date(), 6)),
                to: endOfDay(new Date()),
            }),
        },
        {
            label: "Last 30 Days",
            getValue: () => ({
                from: startOfDay(subDays(new Date(), 29)),
                to: endOfDay(new Date()),
            }),
        },
        {
            label: "This Month",
            getValue: () => {
                const now = new Date()
                return {
                    from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
                    to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
                }
            },
        },
        {
            label: "Last Month",
            getValue: () => {
                const now = new Date()
                const lastMonth = subMonths(now, 1)
                return {
                    from: startOfDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)),
                    to: endOfDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)),
                }
            },
        },
    ]

    const handlePresetChange = (value: string) => {
        const preset = presets.find((p) => p.label === value)
        if (preset) {
            setDate(preset.getValue())
            // Optional: keep open or close? Usually closing is better UX for presets
            // setIsOpen(false) 
        }
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
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
                <PopoverContent className="w-auto p-0" align={align}>
                    <div className="p-3 border-b space-y-2">
                        <Select onValueChange={handlePresetChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a preset..." />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                {presets.map((preset) => (
                                    <SelectItem key={preset.label} value={preset.label}>
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
