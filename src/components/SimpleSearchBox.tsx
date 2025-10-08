'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

interface SimpleSearchBoxProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  debounceMs?: number;
}

export function SimpleSearchBox({ 
  placeholder = "Search...", 
  value = '',
  onChange,
  className = "",
  debounceMs = 300
}: SimpleSearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal value with prop value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Handle input change with debouncing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      onChange?.(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);

  // Handle focus events
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  }, []);

  // Preserve focus and selection during re-renders
  useEffect(() => {
    if (isFocused && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
      
      // Restore selection if we had it stored
      if (selectionStart !== null && selectionEnd !== null) {
        try {
          inputRef.current.setSelectionRange(selectionStart, selectionEnd);
        } catch (e) {
          // Ignore selection range errors (can happen if element is not focused)
        }
      }
    }
  }, [isFocused, selectionStart, selectionEnd, internalValue]); // Also run when internalValue changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}