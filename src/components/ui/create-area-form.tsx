'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Confetti } from '@/components/ui/Confetti';
import { X, Plus, Loader2, CheckCircle } from 'lucide-react';

interface CreateAreaFormProps {
  onSubmit: (data: { name: string; zipcodes: string[] }) => Promise<void>;
  onCancel?: () => void;
  initialData?: { name: string; zipcodes: string[] };
}

export function CreateAreaForm({ onSubmit, onCancel, initialData }: CreateAreaFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [zipcodes, setZipcodes] = useState<string[]>(initialData?.zipcodes || []);
  const [newZipcode, setNewZipcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && zipcodes.length > 0) {
      setIsSubmitting(true);
      try {
        await onSubmit({
          name: name.trim(),
          zipcodes: zipcodes.filter(z => z.trim())
        });
        // Show success state and trigger confetti
        setShowSuccess(true);
        setTriggerConfetti(true);
        
        // Reset form after success
        setTimeout(() => {
          setName('');
          setZipcodes([]);
          setNewZipcode('');
          setShowSuccess(false);
          if (onCancel) onCancel();
        }, 2000);
      } catch (error) {
        console.error('Error submitting form:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleConfettiComplete = () => {
    setTriggerConfetti(false);
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
    <>
      <Confetti trigger={triggerConfetti} onComplete={handleConfettiComplete} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {showSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              {initialData ? 'Area Updated Successfully!' : 'Area Created Successfully!'}
            </h3>
            <p className="text-gray-600">
              {initialData ? 'The area has been updated.' : 'The new area has been created and is ready to use.'}
            </p>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="areaName">Area Name</Label>
              <Input
                id="areaName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter area name"
                required
                disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                  <Button type="button" onClick={addZipcode} variant="outline" disabled={isSubmitting}>
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
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting || !name.trim() || zipcodes.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {initialData ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  initialData ? 'Update Area' : 'Create Area'
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </>
  );
}