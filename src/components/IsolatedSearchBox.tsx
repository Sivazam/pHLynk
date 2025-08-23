'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface IsolatedSearchBoxProps {
  placeholder?: string;
  initialValue?: string;
  onSearchChange?: (value: string) => void;
  className?: string;
  debounceMs?: number;
}

export function IsolatedSearchBox({ 
  placeholder = "Search...", 
  initialValue = '',
  onSearchChange,
  className = "",
  debounceMs = 300
}: IsolatedSearchBoxProps) {
  // Internal state - completely isolated from parent
  const [internalValue, setInternalValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input changes with debouncing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(newValue);
    }, debounceMs);
  };

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Keep focus aggressively - this prevents focus loss during parent re-renders
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Check if input was focused before this render
    const wasFocused = document.activeElement === input;
    
    if (wasFocused) {
      // Use multiple strategies to maintain focus
      const restoreFocus = () => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      };

      // Try immediately
      restoreFocus();
      
      // Try after microtask
      Promise.resolve().then(restoreFocus);
      
      // Try after animation frame
      requestAnimationFrame(restoreFocus);
      
      // Try after a short delay (for aggressive cases)
      setTimeout(restoreFocus, 10);
    }
  });

  // Sync with initialValue if it changes from parent
  useEffect(() => {
    if (initialValue !== internalValue && initialValue !== undefined) {
      setInternalValue(initialValue);
    }
  }, [initialValue]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        className="pl-10"
        // Prevent default behaviors that might cause focus loss
        autoComplete="off"
        spellCheck={false}
        // Add event handlers to prevent event bubbling
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        onKeyUp={(e) => {
          e.stopPropagation();
        }}
        onFocus={(e) => {
          e.stopPropagation();
        }}
        onBlur={(e) => {
          e.stopPropagation();
        }}
      />
    </div>
  );
}