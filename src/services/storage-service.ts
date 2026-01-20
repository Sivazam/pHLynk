import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logger } from '@/lib/logger';

export class StorageService {
    /**
     * Uploads a payment proof image to Firebase Storage
     * @param file The file to upload
     * @param path The storage path (e.g., 'payments/{tenantId}/{paymentId}')
     * @returns Object containing the download URL and the full storage path
     */
    async uploadPaymentProof(file: File, path: string): Promise<{ url: string; fullPath: string }> {
        try {
            // Create a reference to the storage location
            const storageRef = ref(storage, path);

            // Upload the file
            const snapshot = await uploadBytes(storageRef, file, {
                contentType: file.type,
                customMetadata: {
                    uploadedAt: new Date().toISOString(),
                    type: 'payment_proof'
                }
            });

            // Get the download URL
            const url = await getDownloadURL(snapshot.ref);

            logger.success(`Uploaded payment proof to ${path}`, { context: 'StorageService' });

            return {
                url,
                fullPath: snapshot.metadata.fullPath
            };
        } catch (error) {
            logger.error('Error uploading payment proof', error, { context: 'StorageService' });
            throw error;
        }
    }

    /**
     * Deletes a file from Firebase Storage
     * @param path The full storage path of the file to delete
     */
    async deleteFile(path: string): Promise<void> {
        if (!path) {
            logger.warn('Attempted to delete file with empty path', { context: 'StorageService' });
            return;
        }

        try {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
            logger.success(`Deleted file at ${path}`, { context: 'StorageService' });
        } catch (error: any) {
            // Check if error is 'object-not-found' - if so, consider it successfully deleted (idempotent)
            if (error.code === 'storage/object-not-found') {
                logger.warn(`File not found at ${path}, skipping delete`, { context: 'StorageService' });
                return;
            }

            logger.error(`Error deleting file at ${path}`, error, { context: 'StorageService' });
            throw error;
        }
    }
}

export const storageService = new StorageService();
