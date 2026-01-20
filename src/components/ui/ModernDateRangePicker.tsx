'use client';

import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import dayjs, { Dayjs } from 'dayjs';

// Create a custom theme to match the app's style more closely if needed
const theme = createTheme({
    palette: {
        primary: {
            main: '#2563eb', // blue-600
        },
    },
    typography: {
        fontFamily: 'inherit',
    },
    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: '0.5rem',
                    height: '40px',
                    backgroundColor: 'white',
                },
                input: {
                    padding: '8px 14px',
                    fontSize: '0.875rem',
                }
            }
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    top: '-7px', // Adjust label position for smaller height
                    fontSize: '0.875rem',
                    // shrink: {
                    //     top: '0px',
                    // }
                }
            }
        }
    }
});

interface ModernDateRangePickerProps {
    startDate: Date;
    endDate: Date;
    onChange: (range: { startDate: Date; endDate: Date }) => void;
    className?: string;
}

export function ModernDateRangePicker({
    startDate,
    endDate,
    onChange,
    className = ''
}: ModernDateRangePickerProps) {

    const handleStartDateChange = (newValue: any) => {
        if (newValue) {
            const newStartDate = newValue.toDate();
            // Ensure start date is set to beginning of day
            newStartDate.setHours(0, 0, 0, 0);

            let newEndDate = endDate;
            // If start date is after end date, update end date to match start date
            if (newStartDate > endDate) {
                newEndDate = new Date(newStartDate);
                newEndDate.setHours(23, 59, 59, 999);
            }

            onChange({ startDate: newStartDate, endDate: newEndDate });
        }
    };

    const handleEndDateChange = (newValue: any) => {
        if (newValue) {
            const newEndDate = newValue.toDate();
            // Ensure end date is set to end of day
            newEndDate.setHours(23, 59, 59, 999);

            let newStartDate = startDate;
            // If end date is before start date, update start date to match end date
            if (newEndDate < startDate) {
                newStartDate = new Date(newEndDate);
                newStartDate.setHours(0, 0, 0, 0);
            }

            onChange({ startDate: newStartDate, endDate: newEndDate });
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className={`flex items-center gap-2 ${className}`}>
                    <div className="w-40">
                        <DatePicker
                            label="Start Date"
                            value={dayjs(startDate)}
                            onChange={handleStartDateChange}
                            maxDate={dayjs()} // Cannot select future dates
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                    </div>
                    <span className="text-gray-500">-</span>
                    <div className="w-40">
                        <DatePicker
                            label="End Date"
                            value={dayjs(endDate)}
                            onChange={handleEndDateChange}
                            maxDate={dayjs()} // Cannot select future dates
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                    </div>
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
