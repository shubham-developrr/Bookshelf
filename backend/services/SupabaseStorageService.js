import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class SupabaseStorageService {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            console.warn('Supabase credentials not provided. File upload functionality will be disabled.');
            this.supabase = null;
            return;
        }
        
        this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        
        // Default storage bucket names
        this.buckets = {
            bookCovers: 'book-covers',
            documents: 'documents',
            media: 'media',
            userAssets: 'user-assets'
        };
    }
    
    isConfigured() {
        return this.supabase !== null;
    }
    
    /**
     * Upload a file to Supabase Storage
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} fileName - Name for the file
     * @param {string} bucketName - Storage bucket name
     * @param {string} mimeType - File MIME type
     * @param {Object} options - Additional options
     */
    async uploadFile(fileBuffer, fileName, bucketName, mimeType, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Supabase storage is not configured');
        }
        
        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .upload(fileName, fileBuffer, {
                    contentType: mimeType,
                    upsert: options.upsert || false,
                    ...options
                });
            
            if (error) {
                throw new Error(`Upload failed: ${error.message}`);
            }
            
            // Get public URL for the uploaded file
            const { data: publicData } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
            
            return {
                path: data.path,
                fullPath: data.fullPath,
                id: data.id,
                publicUrl: publicData.publicUrl
            };
        } catch (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }
    }
    
    /**
     * Delete a file from Supabase Storage
     * @param {string} filePath - Path to the file in storage
     * @param {string} bucketName - Storage bucket name
     */
    async deleteFile(filePath, bucketName) {
        if (!this.isConfigured()) {
            throw new Error('Supabase storage is not configured');
        }
        
        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .remove([filePath]);
            
            if (error) {
                throw new Error(`Delete failed: ${error.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Supabase delete error:', error);
            throw error;
        }
    }
    
    /**
     * Get signed URL for private file access
     * @param {string} filePath - Path to the file
     * @param {string} bucketName - Storage bucket name
     * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
     */
    async getSignedUrl(filePath, bucketName, expiresIn = 3600) {
        if (!this.isConfigured()) {
            throw new Error('Supabase storage is not configured');
        }
        
        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, expiresIn);
            
            if (error) {
                throw new Error(`Signed URL generation failed: ${error.message}`);
            }
            
            return data.signedUrl;
        } catch (error) {
            console.error('Supabase signed URL error:', error);
            throw error;
        }
    }
    
    /**
     * List files in a storage bucket
     * @param {string} bucketName - Storage bucket name
     * @param {string} folderPath - Optional folder path
     * @param {Object} options - List options
     */
    async listFiles(bucketName, folderPath = '', options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Supabase storage is not configured');
        }
        
        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .list(folderPath, {
                    limit: options.limit || 100,
                    offset: options.offset || 0,
                    sortBy: options.sortBy || { column: 'name', order: 'asc' }
                });
            
            if (error) {
                throw new Error(`List files failed: ${error.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Supabase list files error:', error);
            throw error;
        }
    }
    
    /**
     * Create storage buckets if they don't exist
     */
    async initializeBuckets() {
        if (!this.isConfigured()) {
            console.warn('Supabase not configured. Skipping bucket initialization.');
            return;
        }
        
        try {
            for (const [name, bucketName] of Object.entries(this.buckets)) {
                const { data, error } = await this.supabase.storage
                    .from(bucketName)
                    .list('', { limit: 1 });
                
                if (error && error.message.includes('not found')) {
                    console.log(`Creating bucket: ${bucketName}`);
                    const { error: createError } = await this.supabase.storage
                        .createBucket(bucketName, {
                            public: name === 'bookCovers' // Make book covers public
                        });
                    
                    if (createError) {
                        console.warn(`Failed to create bucket ${bucketName}:`, createError.message);
                    } else {
                        console.log(`Successfully created bucket: ${bucketName}`);
                    }
                }
            }
        } catch (error) {
            console.warn('Bucket initialization error:', error.message);
        }
    }
    
    /**
     * Generate unique filename with timestamp
     * @param {string} originalName - Original filename
     * @param {string} prefix - Optional prefix
     */
    generateUniqueFilename(originalName, prefix = '') {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = originalName.split('.').pop();
        const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
        
        return `${prefix}${prefix ? '_' : ''}${baseName}_${timestamp}_${randomStr}.${extension}`;
    }
}

// Create and export singleton instance
const supabaseStorage = new SupabaseStorageService();

export default supabaseStorage;