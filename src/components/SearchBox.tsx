'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchBox({ 
  placeholder = "Search...", 
  value, 
  onChange,
  className = "" 
}: SearchBoxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={handleChange}
        className="pl-10"
      />
    </div>
  );
}