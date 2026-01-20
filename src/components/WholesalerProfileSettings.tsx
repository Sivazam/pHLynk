'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    FileText,
    Save,
    Plus,
    Trash2,
    Star,
    StarOff,
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle,
    QrCode,
    CreditCard,
    AlertTriangle,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';

interface UpiEntry {
    id: string;
    upiId: string;
    isPrimary: boolean;
}

interface QrCodeEntry {
    id: string;
    url: string;
    fileName: string;
    isPrimary: boolean;
    isLocal?: boolean; // True if this is a local preview not yet uploaded
    localFile?: File;  // The file to upload when saving
}

interface TenantProfile {
    name: string;
    ownerName: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
    gstNumber?: string;
    upiIds: UpiEntry[];
    qrCodes: QrCodeEntry[];
}

interface WholesalerProfileSettingsProps {
    tenantId: string;
    onProfileUpdated?: () => void;
}

export function WholesalerProfileSettings({ tenantId, onProfileUpdated }: WholesalerProfileSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Original profile data (for comparison)
    const [originalProfile, setOriginalProfile] = useState<TenantProfile | null>(null);

    // Profile data
    const [profile, setProfile] = useState<TenantProfile>({
        name: '',
        ownerName: '',
        address: '',
        contactEmail: '',
        contactPhone: '',
        gstNumber: '',
        upiIds: [],
        qrCodes: []
    });

    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    // New UPI input
    const [newUpiId, setNewUpiId] = useState('');

    // Check if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        if (!originalProfile) return false;

        // Check basic fields
        if (profile.name !== originalProfile.name) return true;
        if (profile.ownerName !== originalProfile.ownerName) return true;
        if (profile.address !== originalProfile.address) return true;
        if (profile.contactPhone !== originalProfile.contactPhone) return true;
        if ((profile.gstNumber || '') !== (originalProfile.gstNumber || '')) return true;

        // Check UPI IDs
        if (JSON.stringify(profile.upiIds) !== JSON.stringify(originalProfile.upiIds)) return true;

        // Check QR codes (ignore local preview details for comparison)
        const currentQrs = profile.qrCodes.map(q => ({ id: q.id, url: q.url, isPrimary: q.isPrimary, isLocal: q.isLocal }));
        const originalQrs = originalProfile.qrCodes.map(q => ({ id: q.id, url: q.url, isPrimary: q.isPrimary, isLocal: q.isLocal }));
        if (JSON.stringify(currentQrs) !== JSON.stringify(originalQrs)) return true;

        return false;
    }, [profile, originalProfile]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Load tenant data
    useEffect(() => {
        loadTenantData();
    }, [tenantId]);

    const loadTenantData = async () => {
        try {
            setLoading(true);
            setError(null);

            const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
            if (tenantDoc.exists()) {
                const data = tenantDoc.data();
                const loadedProfile: TenantProfile = {
                    name: data.name || '',
                    ownerName: data.ownerName || '',
                    address: data.address || '',
                    contactEmail: data.contactEmail || '',
                    contactPhone: data.contactPhone || '',
                    gstNumber: data.gstNumber || '',
                    upiIds: data.upiIds || [],
                    qrCodes: (data.qrCodes || []).map((qr: any) => ({ ...qr, isLocal: false }))
                };
                setProfile(loadedProfile);
                setOriginalProfile(JSON.parse(JSON.stringify(loadedProfile)));
            } else {
                setError('Tenant data not found');
            }
        } catch (err) {
            console.error('Error loading tenant data:', err);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    // Save profile changes - uploads QR codes at save time
    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            // Upload any pending local QR codes to Firebase Storage
            const uploadedQrCodes: QrCodeEntry[] = [];
            for (const qr of profile.qrCodes) {
                if (qr.isLocal && qr.localFile) {
                    // Upload to Firebase Storage
                    const fileName = `qr_${Date.now()}_${qr.localFile.name}`;
                    const storageRef = ref(storage, `tenants/${tenantId}/qr-codes/${fileName}`);
                    await uploadBytes(storageRef, qr.localFile);
                    const downloadUrl = await getDownloadURL(storageRef);

                    uploadedQrCodes.push({
                        id: qr.id,
                        url: downloadUrl,
                        fileName: fileName,
                        isPrimary: qr.isPrimary
                    });
                } else if (!qr.isLocal) {
                    // Keep existing uploaded QR codes
                    uploadedQrCodes.push({
                        id: qr.id,
                        url: qr.url,
                        fileName: qr.fileName,
                        isPrimary: qr.isPrimary
                    });
                }
            }

            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, {
                name: profile.name,
                ownerName: profile.ownerName,
                address: profile.address,
                contactPhone: profile.contactPhone,
                gstNumber: profile.gstNumber || null,
                upiIds: profile.upiIds,
                qrCodes: uploadedQrCodes,
                updatedAt: serverTimestamp()
            });

            // Update profile state with uploaded URLs
            const newProfile = {
                ...profile,
                qrCodes: uploadedQrCodes.map(qr => ({ ...qr, isLocal: false }))
            };
            setProfile(newProfile);
            setOriginalProfile(JSON.parse(JSON.stringify(newProfile)));

            // Revoke local blob URLs to free memory
            profile.qrCodes.forEach(qr => {
                if (qr.isLocal && qr.url.startsWith('blob:')) {
                    URL.revokeObjectURL(qr.url);
                }
            });

            setSuccess('Profile updated successfully!');
            onProfileUpdated?.();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Add UPI ID
    const handleAddUpi = () => {
        if (!newUpiId.trim()) return;

        const newEntry: UpiEntry = {
            id: `upi_${Date.now()}`,
            upiId: newUpiId.trim(),
            isPrimary: profile.upiIds.length === 0 // First one is primary
        };

        setProfile(prev => ({
            ...prev,
            upiIds: [...prev.upiIds, newEntry]
        }));
        setNewUpiId('');
    };

    // Remove UPI ID
    const handleRemoveUpi = (id: string) => {
        setProfile(prev => {
            const newUpiIds = prev.upiIds.filter(upi => upi.id !== id);
            // If we removed the primary, make the first one primary
            if (newUpiIds.length > 0 && !newUpiIds.some(u => u.isPrimary)) {
                newUpiIds[0].isPrimary = true;
            }
            return { ...prev, upiIds: newUpiIds };
        });
    };

    // Set UPI as primary
    const handleSetPrimaryUpi = (id: string) => {
        setProfile(prev => ({
            ...prev,
            upiIds: prev.upiIds.map(upi => ({
                ...upi,
                isPrimary: upi.id === id
            }))
        }));
    };

    // Add QR Code - creates local preview, defers upload to save time
    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        // Create local preview URL (no upload yet)
        const localUrl = URL.createObjectURL(file);

        const newQrEntry: QrCodeEntry = {
            id: `qr_${Date.now()}`,
            url: localUrl,
            fileName: file.name,
            isPrimary: profile.qrCodes.length === 0, // First one is primary
            isLocal: true,
            localFile: file
        };

        setProfile(prev => ({
            ...prev,
            qrCodes: [...prev.qrCodes, newQrEntry]
        }));

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove QR Code
    const handleRemoveQr = async (qrEntry: QrCodeEntry) => {
        try {
            // If it was already uploaded, delete from Firebase Storage
            if (!qrEntry.isLocal && qrEntry.fileName) {
                const storageRef = ref(storage, `tenants/${tenantId}/qr-codes/${qrEntry.fileName}`);
                try {
                    await deleteObject(storageRef);
                } catch (e) {
                    // File might not exist, continue anyway
                    console.warn('Could not delete QR from storage:', e);
                }
            }

            // If it's a local blob URL, revoke it
            if (qrEntry.isLocal && qrEntry.url.startsWith('blob:')) {
                URL.revokeObjectURL(qrEntry.url);
            }

            setProfile(prev => {
                const newQrCodes = prev.qrCodes.filter(qr => qr.id !== qrEntry.id);
                // If we removed the primary, make the first one primary
                if (newQrCodes.length > 0 && !newQrCodes.some(q => q.isPrimary)) {
                    newQrCodes[0].isPrimary = true;
                }
                return { ...prev, qrCodes: newQrCodes };
            });
        } catch (err) {
            console.error('Error removing QR code:', err);
            setError('Failed to remove QR code');
        }
    };

    // Set QR as primary
    const handleSetPrimaryQr = (id: string) => {
        setProfile(prev => ({
            ...prev,
            qrCodes: prev.qrCodes.map(qr => ({
                ...qr,
                isPrimary: qr.id === id
            }))
        }));
    };

    // Change Password Handler
    const handleChangePassword = async () => {
        setPasswordError(null);
        setPasswordSuccess(null);

        // Validations
        if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
            setPasswordError('All password fields are required');
            return;
        }

        if (passwordForm.new.length < 6) {
            setPasswordError('New password must be at least 6 characters long');
            return;
        }

        if (passwordForm.new !== passwordForm.confirm) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordForm.current === passwordForm.new) {
            setPasswordError('New password cannot be the same as the current password');
            return;
        }

        try {
            setPasswordLoading(true);
            const user = auth.currentUser;

            if (!user || !user.email) {
                throw new Error('No authenticated user found');
            }

            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, passwordForm.current);
            await reauthenticateWithCredential(user, credential);


            // Update password
            await updatePassword(user, passwordForm.new);

            setPasswordSuccess('Password updated successfully! Logging you out...');
            setPasswordForm({ current: '', new: '', confirm: '' });

            // Logout and Redirect
            setTimeout(async () => {
                await auth.signOut();
                window.location.href = `/login?email=${encodeURIComponent(user.email || '')}&message=${encodeURIComponent('Password changed successfully. Please login again.')}`;
            }, 1500);

        } catch (err: any) {
            console.error('Error changing password:', err);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setPasswordError('Incorrect current password');
            } else if (err.code === 'auth/requires-recent-login') {
                setPasswordError('Please log out and log in again to change your password');
            } else {
                setPasswordError('Failed to update password: ' + (err.message || 'Unknown error'));
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
                <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                        You have unsaved changes. Click "Save All Changes" to save your updates.
                    </AlertDescription>
                </Alert>
            )}

            {/* Status Messages */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            {/* Business Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Business Profile
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="bg-white"
                        >
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Manage your business information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                value={profile.name}
                                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter business name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ownerName">Owner Name</Label>
                            <Input
                                id="ownerName"
                                value={profile.ownerName}
                                onChange={(e) => setProfile(prev => ({ ...prev, ownerName: e.target.value }))}
                                placeholder="Enter owner name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                Email (Read-only)
                            </Label>
                            <Input
                                id="email"
                                value={profile.contactEmail}
                                disabled
                                className="bg-gray-100"
                            />
                            <p className="text-xs text-gray-500">Email cannot be changed as it's your login credential</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                Phone
                            </Label>
                            <Input
                                id="phone"
                                value={profile.contactPhone}
                                onChange={(e) => setProfile(prev => ({ ...prev, contactPhone: e.target.value }))}
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Business Address
                        </Label>
                        <Textarea
                            id="address"
                            value={profile.address}
                            onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Enter business address"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="gstNumber" className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            GST Number
                        </Label>
                        <Input
                            id="gstNumber"
                            value={profile.gstNumber || ''}
                            onChange={(e) => setProfile(prev => ({ ...prev, gstNumber: e.target.value }))}
                            placeholder="Enter GST number (optional)"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* UPI Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        UPI Payment Settings
                    </CardTitle>
                    <CardDescription>
                        Add your UPI IDs for payment collection. Only the primary UPI ID will be shown to line workers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add UPI */}
                    <div className="flex gap-2">
                        <Input
                            value={newUpiId}
                            onChange={(e) => setNewUpiId(e.target.value)}
                            placeholder="Enter UPI ID (e.g., business@upi)"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUpi()}
                        />
                        <Button onClick={handleAddUpi} disabled={!newUpiId.trim()}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    {/* UPI List */}
                    {profile.upiIds.length > 0 ? (
                        <div className="space-y-2">
                            {profile.upiIds.map((upi) => (
                                <div
                                    key={upi.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${upi.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {upi.isPrimary && (
                                            <Badge className="bg-blue-600">Primary</Badge>
                                        )}
                                        <span className="font-mono">{upi.upiId}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!upi.isPrimary && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetPrimaryUpi(upi.id)}
                                                title="Set as primary"
                                            >
                                                <Star className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveUpi(upi.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                            No UPI IDs added yet. Add your first UPI ID above.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* QR Code Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        QR Code Images
                    </CardTitle>
                    <CardDescription>
                        Upload QR code images for UPI payments. Only the primary QR code will be shown to line workers.
                        <br />
                        <span className="text-amber-600 font-medium">Note: QR codes are saved when you click "Save All Changes".</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Upload QR */}
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleQrUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Select QR Code Image
                        </Button>
                    </div>

                    {/* QR List */}
                    {profile.qrCodes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profile.qrCodes.map((qr) => (
                                <div
                                    key={qr.id}
                                    className={`relative p-2 rounded-lg border ${qr.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                                        }`}
                                >
                                    <div className="absolute top-2 left-2 flex gap-1">
                                        {qr.isPrimary && (
                                            <Badge className="bg-blue-600">Primary</Badge>
                                        )}
                                        {qr.isLocal && (
                                            <Badge className="bg-amber-500">Not saved</Badge>
                                        )}
                                    </div>
                                    <img
                                        src={qr.url}
                                        alt="QR Code"
                                        className="w-full aspect-square object-contain rounded"
                                    />
                                    <div className="flex justify-center gap-2 mt-2">
                                        {!qr.isPrimary && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSetPrimaryQr(qr.id)}
                                            >
                                                <Star className="h-4 w-4 mr-1" />
                                                Set Primary
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveQr(qr)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                            No QR codes uploaded yet. Upload your first QR code image above.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Security Settings Dialog */}
            <Dialog
                open={isPasswordModalOpen}
                onOpenChange={(open) => {
                    // Only allow closing if NOT loading
                    if (!passwordLoading && !open) setIsPasswordModalOpen(false);
                }}
            >
                <DialogContent
                    className="sm:max-w-md"
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Change Password
                        </DialogTitle>
                        <DialogDescription>
                            Enter your current password to set a new one.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {passwordError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{passwordError}</AlertDescription>
                            </Alert>
                        )}
                        {passwordSuccess && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">{passwordSuccess}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showPassword.current ? 'text' : 'password'}
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                                    placeholder="Enter current password"
                                    disabled={passwordLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                                    disabled={passwordLoading}
                                >
                                    {showPassword.current ? (
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword.new ? 'text' : 'password'}
                                    value={passwordForm.new}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                                    placeholder="Enter new password"
                                    disabled={passwordLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                                    disabled={passwordLoading}
                                >
                                    {showPassword.new ? (
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword.confirm ? 'text' : 'password'}
                                    value={passwordForm.confirm}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                                    placeholder="Confirm new password"
                                    disabled={passwordLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    disabled={passwordLoading}
                                >
                                    {showPassword.confirm ? (
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsPasswordModalOpen(false);
                                setPasswordForm({ current: '', new: '', confirm: '' });
                                setPasswordError(null);
                            }}
                            disabled={passwordLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangePassword}
                            disabled={passwordLoading}
                        >
                            {passwordLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Save Button */}
            <div className="flex justify-end gap-4 items-center">
                {hasUnsavedChanges && (
                    <span className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Unsaved changes
                    </span>
                )}
                <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    size="lg"
                    className={hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save All Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
