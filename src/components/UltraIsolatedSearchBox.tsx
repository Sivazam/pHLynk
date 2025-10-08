'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

interface UltraIsolatedSearchBoxProps {
  placeholder?: string;
  initialValue?: string;
  onSearchChange?: (value: string) => void;
  className?: string;
  debounceMs?: number;
}

export function UltraIsolatedSearchBox({ 
  placeholder = "Search...", 
  initialValue = '',
  onSearchChange,
  className = "",
  debounceMs = 500
}: UltraIsolatedSearchBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownValueRef = useRef(initialValue);
  const isFocusedRef = useRef(false);
  const selectionRangeRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  
  // Store the current value independently
  const [internalValue, setInternalValue] = useState(initialValue);

  // Create a completely isolated input element that manages itself
  const createIsolatedInput = useCallback(() => {
    if (!containerRef.current) return;

    // Clear existing content
    containerRef.current.innerHTML = '';

    // Create search icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none';
    iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = lastKnownValueRef.current;
    input.className = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10';
    input.autocomplete = 'off';
    input.spellcheck = false;

    // Handle input events directly
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;
      lastKnownValueRef.current = newValue;
      
      // Update React state for consistency
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

    const handleFocus = () => {
      isFocusedRef.current = true;
      // Store selection range
      if (inputRef.current) {
        selectionRangeRef.current = {
          start: inputRef.current.selectionStart,
          end: inputRef.current.selectionEnd
        };
      }
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.stopPropagation();
    };

    // Add event listeners
    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);
    input.addEventListener('keyup', handleKeyUp);

    // Add elements to container
    containerRef.current.appendChild(iconContainer);
    containerRef.current.appendChild(input);

    // Store reference
    inputRef.current = input;

    // Restore focus if it was focused
    if (isFocusedRef.current) {
      setTimeout(() => {
        input.focus();
        // Restore selection range
        if (selectionRangeRef.current.start !== null && selectionRangeRef.current.end !== null) {
          input.setSelectionRange(selectionRangeRef.current.start, selectionRangeRef.current.end);
        }
      }, 0);
    }

    // Cleanup function
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('keydown', handleKeyDown);
      input.removeEventListener('keyup', handleKeyUp);
    };
  }, [placeholder, onSearchChange, debounceMs]);

  // Create the isolated input on mount and when dependencies change
  useEffect(() => {
    const cleanup = createIsolatedInput();
    return cleanup;
  }, [createIsolatedInput]);

  // Aggressively maintain focus and value
  useEffect(() => {
    const maintainFocus = () => {
      if (isFocusedRef.current && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
        
        // Restore selection range
        if (selectionRangeRef.current.start !== null && selectionRangeRef.current.end !== null) {
          try {
            inputRef.current.setSelectionRange(selectionRangeRef.current.start, selectionRangeRef.current.end);
          } catch (e) {
            // Ignore selection range errors
          }
        }
      }

      // Ensure value is correct
      if (inputRef.current && inputRef.current.value !== lastKnownValueRef.current) {
        inputRef.current.value = lastKnownValueRef.current;
      }
    };

    // Multiple strategies to maintain focus
    maintainFocus();
    requestAnimationFrame(maintainFocus);
    setTimeout(maintainFocus, 50);
    setTimeout(maintainFocus, 100);
    setTimeout(maintainFocus, 200);

    // Set up interval for continuous focus maintenance - reduced frequency
    const intervalId = setInterval(maintainFocus, 2000); // Increased from 1 second to 2 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Sync with initialValue if it changes
  useEffect(() => {
    if (initialValue !== lastKnownValueRef.current && initialValue !== undefined) {
      lastKnownValueRef.current = initialValue;
      setInternalValue(initialValue);
      if (inputRef.current) {
        inputRef.current.value = initialValue;
      }
    }
  }, [initialValue]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative ${className}`}
      style={{ minHeight: '40px' }} // Ensure minimum height for the input
    />
  );
}