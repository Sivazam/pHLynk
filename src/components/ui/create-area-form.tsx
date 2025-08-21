'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface CreateAreaFormProps {
  onSubmit: (data: { name: string; zipcodes: string[] }) => void;
  onCancel?: () => void;
  initialData?: { name: string; zipcodes: string[] };
}

export function CreateAreaForm({ onSubmit, onCancel, initialData }: CreateAreaFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [zipcodes, setZipcodes] = useState<string[]>(initialData?.zipcodes || []);
  const [newZipcode, setNewZipcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && zipcodes.length > 0) {
      onSubmit({
        name: name.trim(),
        zipcodes: zipcodes.filter(z => z.trim())
      });
    }
  };

  const addZipcode = () => {
    if (newZipcode.trim() && !zipcodes.includes(newZipcode.trim())) {
      setZipcodes([...zipcodes, newZipcode.trim()]);
      setNewZipcode('');
    }
  };

  const removeZipcode = (zipcode: string) => {
    setZipcodes(zipcodes.filter(z => z !== zipcode));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addZipcode();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="areaName">Area Name</Label>
        <Input
          id="areaName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter area name"
          required
        />
      </div>

      <div>
        <Label htmlFor="zipcodes">Zipcodes</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id="zipcodes"
              value={newZipcode}
              onChange={(e) => setNewZipcode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter zipcode"
            />
            <Button type="button" onClick={addZipcode} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {zipcodes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {zipcodes.map((zipcode) => (
                <Badge key={zipcode} variant="secondary" className="flex items-center gap-1">
                  {zipcode}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeZipcode(zipcode)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">
          {initialData ? 'Update Area' : 'Create Area'}
        </Button>
      </div>
    </form>
  );
}