'use client';

import * as React from 'react';
import { TextField } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';

interface MuiDatePickerProps {
  value?: Date;
  onChange?: (date: Date | null) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function MuiDatePickerComponent({
  value,
  onChange,
  label = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
}: MuiDatePickerProps) {
  const handleChange = (date: Date | null) => {
    if (onChange) {
      onChange(date);
    }
  };

  return (
    <div className={className}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <MuiDatePicker
          label={label}
          value={value || null}
          onChange={handleChange}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          slots={{
            textField: (params) => (
              <TextField
                {...params}
                fullWidth
                size="small"
                variant="outlined"
                className="bg-white"
              />
            ),
          }}
          slotProps={{
            textField: {
              error: false,
              helperText: '',
            },
            actionBar: {
              actions: ['today', 'accept'],
            },
          }}
          closeOnSelect={true}
          disableFuture={false}
          disablePast={false}
        />
      </LocalizationProvider>
    </div>
  );
}