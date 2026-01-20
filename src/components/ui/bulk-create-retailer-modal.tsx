'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertTriangle, AlertCircle, Loader2, X, Download } from 'lucide-react';
import { Area } from '@/types';
import { userService, retailerService } from '@/services/firestore';
import * as XLSX from 'xlsx';
import { cleanPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';

import { Checkbox } from '@/components/ui/checkbox';

interface BulkCreateRetailerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    areas: Area[];
    tenantId: string;
}

interface CSVRow {
    'Retailer Name': string;
    'Retailer Phone number': string | number;
    'Address'?: string;
    'Retailer code'?: string | number;
}

interface ProcessedRetailer {
    originalData: CSVRow;
    name: string;
    phone: string;
    address: string;
    code: string;
    status: 'VALID' | 'INVALID' | 'EXISTING' | 'DUPLICATE_IN_FILE';
    existingRetailerId?: string;
    error?: string;
}

export function BulkCreateRetailerModal({
    isOpen,
    onClose,
    onSuccess,
    areas,
    tenantId
}: BulkCreateRetailerModalProps) {
    const [step, setStep] = useState<'SELECT_AREA' | 'UPLOAD' | 'PREVIEW' | 'PROCESSING' | 'RESULT'>('SELECT_AREA');
    const [selectedAreaId, setSelectedAreaId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedRetailer[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ created: number; linked: number; failed: number }>({ created: 0, linked: 0, failed: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New state for Selection and Filtering
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [filter, setFilter] = useState<'ALL' | 'NEW' | 'EXISTING'>('ALL');

    const resetState = () => {
        setStep('SELECT_AREA');
        setSelectedAreaId('');
        setFile(null);
        setProcessedData([]);
        setProgress(0);
        setResults({ created: 0, linked: 0, failed: 0 });
        setSelectedIndices(new Set());
        setFilter('ALL');
    };

    const handleClose = () => {
        if (isProcessing) return;
        resetState();
        onClose();
    };

    const handleAreaSelect = (areaId: string) => {
        setSelectedAreaId(areaId);
        setStep('UPLOAD');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        await parseAndValidateFile(selectedFile);
    };

    const parseAndValidateFile = async (file: File) => {
        setIsProcessing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<CSVRow>(worksheet);

            if (jsonData.length === 0) {
                toast.error('The uploaded file is empty.');
                setFile(null);
                setIsProcessing(false);
                return;
            }

            const processed: ProcessedRetailer[] = [];
            const phoneSet = new Set<string>();
            const initialSelected = new Set<number>();

            // Use for loop with index to track initial selection
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                // Support multiple header formats (User provided vs Standard)
                const rawName = row['CustName'] || row['Retailer Name'];
                const rawPhone = row['smscell'] || row['Retailer Phone number'];
                const address = row['Add4'] || row['Address'] || '';
                const code = row['CustCode'] || row['Retailer code']?.toString() || '';

                // Basic formatting
                const name = rawName?.toString().trim() || '';
                let phone = '';
                if (rawPhone) {
                    phone = cleanPhoneNumber(rawPhone.toString());
                }

                let status: ProcessedRetailer['status'] = 'VALID';
                let error = '';

                // Validation
                if (!name) {
                    status = 'INVALID';
                    error = 'Missing Name';
                } else if (!phone || phone.length < 10) {
                    status = 'INVALID';
                    error = 'Invalid Phone';
                } else if (phoneSet.has(phone)) {
                    status = 'DUPLICATE_IN_FILE';
                    error = 'Duplicate in file';
                }

                // Check if existing
                let existingRetailerId;
                if (status === 'VALID') {
                    try {
                        // Check user exists (cross-tenant)
                        const existingUser = await userService.getUserByPhone(phone);
                        const existingRetailer = await retailerService.getRetailerByPhone(phone);

                        if (existingRetailer) {
                            status = 'EXISTING';
                            existingRetailerId = existingRetailer.id;
                        } else if (existingUser) {
                            if (existingUser.roles.includes('RETAILER')) {
                                status = 'EXISTING';
                                existingRetailerId = existingUser.id;
                            }
                        }
                    } catch (err) {
                        console.error('Error checking existence for', phone, err);
                    }
                }

                if (status === 'VALID' || status === 'EXISTING') {
                    phoneSet.add(phone);
                    // Select valid/existing items by default
                    initialSelected.add(i);
                }

                processed.push({
                    originalData: row,
                    name,
                    phone,
                    address,
                    code,
                    status,
                    error,
                    existingRetailerId
                });
            }

            setProcessedData(processed);
            setSelectedIndices(initialSelected);
            setStep('PREVIEW');
        } catch (error) {
            console.error('Error parsing CSV:', error);
            toast.error('Failed to parse CSV file. Please check the format.');
            setFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelection = (index: number) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const toggleSelectAll = (filteredData: ProcessedRetailer[]) => {
        // Check if all currently visible valid items are selected
        const visibleValidIndices = processedData
            .map((_, i) => i)
            .filter(i => {
                const item = processedData[i];
                const matchesFilter = filter === 'ALL' ||
                    (filter === 'NEW' && item.status === 'VALID') ||
                    (filter === 'EXISTING' && item.status === 'EXISTING');

                return matchesFilter && (item.status === 'VALID' || item.status === 'EXISTING');
            });

        const allSelected = visibleValidIndices.every(i => selectedIndices.has(i));

        const newSelected = new Set(selectedIndices);
        if (allSelected) {
            // Deselect all visible
            visibleValidIndices.forEach(i => newSelected.delete(i));
        } else {
            // Select all visible
            visibleValidIndices.forEach(i => newSelected.add(i));
        }
        setSelectedIndices(newSelected);
    };

    const getFilteredData = () => {
        return processedData.map((item, index) => ({ item, index })).filter(({ item }) => {
            if (filter === 'ALL') return true;
            if (filter === 'NEW') return item.status === 'VALID';
            if (filter === 'EXISTING') return item.status === 'EXISTING';
            return false;
        });
    };

    const handleProcessBatch = async () => {
        if (!selectedAreaId) return;
        const selectedArea = areas.find(a => a.id === selectedAreaId);
        if (!selectedArea) return;

        setIsProcessing(true);
        setStep('PROCESSING');

        let createdCount = 0;
        let linkedCount = 0;
        let failedCount = 0;

        // Start Only process selected items
        const itemsToProcess = processedData
            .filter((_, index) => selectedIndices.has(index));

        const total = itemsToProcess.length;

        for (let i = 0; i < total; i++) {
            const item = itemsToProcess[i];

            try {
                if (item.status === 'EXISTING' && item.existingRetailerId) {
                    // Link existing retailer
                    await retailerService.upsertWholesalerData(
                        item.existingRetailerId,
                        tenantId,
                        {
                            areaId: selectedArea.id,
                            zipcodes: selectedArea.zipcodes,
                            // Wholesaler-specific retailer code
                            // This ensures the code is only updated for this wholesaler's view
                            code: item.code ? item.code.toString() : undefined
                        }
                    );

                    // Note: We no longer update the top-level code directly to avoid affecting other wholesalers
                    // The getRetailerForTenant service method handles overlaying the wholesaler-specific code

                    linkedCount++;
                } else if (item.status === 'VALID') {
                    // Create new retailer
                    await retailerService.createRetailer(tenantId, {
                        name: item.name,
                        phone: item.phone,
                        address: item.address,
                        areaId: selectedArea.id,
                        zipcodes: selectedArea.zipcodes,
                        code: item.code
                    });
                    createdCount++;
                }
            } catch (err) {
                console.error('Error processing item', item, err);
                failedCount++;
            }

            setProgress(Math.round(((i + 1) / total) * 100));
        }

        setResults({ created: createdCount, linked: linkedCount, failed: failedCount });
        setIsProcessing(false);
        setStep('RESULT');
        if (onSuccess) onSuccess();
    };

    const downloadSampleCSV = () => {
        const headers = ['Retailer Name', 'Retailer Phone number', 'Address', 'Retailer code'];
        const sample = ['Sample Pharmacy', '9876543210', '123 Main St, City', 'PHARM001'];

        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'retailer_upload_template.csv');
    };

    const filteredItems = getFilteredData();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessing) handleClose(); }}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 gap-0" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>Bulk Create Retailers</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to link or create multiple retailers.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    {step === 'SELECT_AREA' && (
                        <div className="space-y-4 max-w-md mx-auto mt-8">
                            <Label>Select Service Area for these retailers</Label>
                            <Select value={selectedAreaId} onValueChange={handleAreaSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select service area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {areas.map(area => (
                                        <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="text-sm text-gray-500 mt-4">
                                <p>All retailers in this batch will be assigned to this area.</p>
                                <p>You can change this later for individual retailers.</p>
                            </div>
                        </div>
                    )}

                    {step === 'UPLOAD' && (
                        <div className="flex flex-col items-center justify-center space-y-4 h-full py-8">
                            <div className="w-full max-w-md p-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                <p className="text-sm font-medium text-gray-900">Click to upload CSV</p>
                                <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {isProcessing && <div className="flex items-center gap-2 text-sm text-blue-600"><Loader2 className="animate-spin w-4 h-4" /> Parsing file...</div>}
                            <Button variant="link" size="sm" onClick={downloadSampleCSV} className="gap-2">
                                <Download className="w-4 h-4" /> Download Template
                            </Button>
                        </div>
                    )}

                    {(step === 'PREVIEW' || step === 'PROCESSING') && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm">Review & Select</h3>
                                    <p className="text-xs text-muted-foreground">{selectedIndices.size} retailers selected</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge
                                        variant={filter === 'ALL' ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => setFilter('ALL')}
                                    >
                                        All ({processedData.length})
                                    </Badge>
                                    <Badge
                                        variant={filter === 'NEW' ? "default" : "outline"}
                                        className={`cursor-pointer ${filter === 'NEW' ? 'bg-green-600 hover:bg-green-700' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
                                        onClick={() => setFilter('NEW')}
                                    >
                                        New ({processedData.filter(d => d.status === 'VALID').length})
                                    </Badge>
                                    <Badge
                                        variant={filter === 'EXISTING' ? "default" : "outline"}
                                        className={`cursor-pointer ${filter === 'EXISTING' ? 'bg-blue-600 hover:bg-blue-700' : 'text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                                        onClick={() => setFilter('EXISTING')}
                                    >
                                        Existing ({processedData.filter(d => d.status === 'EXISTING').length})
                                    </Badge>
                                </div>
                            </div>

                            <div className="border rounded-md max-h-[400px] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={
                                                        filteredItems.length > 0 &&
                                                        filteredItems.every(({ index, item }) =>
                                                            (item.status !== 'VALID' && item.status !== 'EXISTING') ? true : selectedIndices.has(index)
                                                        )
                                                    }
                                                    onCheckedChange={() => toggleSelectAll(processedData)}
                                                    disabled={step === 'PROCESSING'}
                                                />
                                            </TableHead>
                                            <TableHead>Retailer Details</TableHead>
                                            <TableHead>Code & Address</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map(({ item, index }) => (
                                            <TableRow key={index} className={item.status === 'INVALID' || item.status === 'DUPLICATE_IN_FILE' ? 'bg-red-50/50' : ''}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedIndices.has(index)}
                                                        onCheckedChange={() => toggleSelection(index)}
                                                        disabled={step === 'PROCESSING' || (item.status !== 'VALID' && item.status !== 'EXISTING')}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.name || '-'}</span>
                                                        <span className="text-sm text-gray-500">{item.phone}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-sm">
                                                        <span className="font-medium text-gray-700">{item.code || '-'}</span>
                                                        <span className="text-gray-500 truncate max-w-[200px]" title={item.address}>{item.address}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.status === 'VALID' && <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">New</Badge>}
                                                    {item.status === 'EXISTING' && <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Existing</Badge>}
                                                    {item.status === 'INVALID' && <Badge variant="destructive" title={item.error} className="text-xs">{item.error || 'Invalid'}</Badge>}
                                                    {item.status === 'DUPLICATE_IN_FILE' && <Badge variant="destructive" className="text-xs">Duplicate</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                                    No retailers found in this category
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {step === 'PROCESSING' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Processing {selectedIndices.size} retailers...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} />
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'RESULT' && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                            <h3 className="text-xl font-semibold">Bulk Action Completed</h3>
                            <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4 text-center">
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{results.created}</div>
                                    <div className="text-xs text-green-800 uppercase tracking-wide">Created</div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{results.linked}</div>
                                    <div className="text-xs text-blue-800 uppercase tracking-wide">Linked</div>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                                    <div className="text-xs text-red-800 uppercase tracking-wide">Failed</div>
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm max-w-md text-center">
                                The process has completed. Selected retailers have been added or linked to your network.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-gray-50 flex justify-between items-center">
                    {step === 'SELECT_AREA' && (
                        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    )}
                    {step === 'UPLOAD' && (
                        <Button variant="ghost" onClick={() => setStep('SELECT_AREA')}>Back</Button>
                    )}
                    {step === 'PREVIEW' && (
                        <>
                            <Button variant="ghost" onClick={() => setStep('UPLOAD')}>Back</Button>
                            <Button onClick={handleProcessBatch} disabled={isProcessing || selectedIndices.size === 0}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null}
                                Confirm & Process ({selectedIndices.size})
                            </Button>
                        </>
                    )}
                    {step === 'PROCESSING' && (
                        <Button disabled className="w-full">Processing...</Button>
                    )}
                    {step === 'RESULT' && (
                        <Button onClick={handleClose} className="w-full">Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
