import express from 'express';
import multer from 'multer';
import supabaseStorage from '../services/SupabaseStorageService.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Define allowed file types
        const allowedTypes = {
            images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
            documents: ['application/pdf', 'text/plain', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            videos: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
            audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
        };
        
        const allAllowedTypes = [
            ...allowedTypes.images,
            ...allowedTypes.documents,
            ...allowedTypes.videos,
            ...allowedTypes.audio
        ];
        
        if (allAllowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }
    }
});

// Upload book cover image
router.post('/book-cover', upload.single('cover'), async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { bookId } = req.body;
        if (!bookId) {
            return res.status(400).json({ message: 'Book ID is required' });
        }
        
        // Generate unique filename
        const fileName = supabaseStorage.generateUniqueFilename(
            req.file.originalname, 
            `book_${bookId}`
        );
        
        // Upload to Supabase
        const uploadResult = await supabaseStorage.uploadFile(
            req.file.buffer,
            fileName,
            supabaseStorage.buckets.bookCovers,
            req.file.mimetype,
            { upsert: false }
        );
        
        res.status(201).json({
            message: 'Book cover uploaded successfully',
            file: {
                filename: fileName,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                publicUrl: uploadResult.publicUrl,
                path: uploadResult.path
            }
        });
    } catch (error) {
        console.error('Book cover upload error:', error);
        res.status(500).json({ 
            message: 'Failed to upload book cover',
            error: error.message 
        });
    }
});

// Upload document (PDF, text files, etc.)
router.post('/document', upload.single('document'), async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { userId, bookId, category } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Generate unique filename with category prefix
        const prefix = category ? `${category}_` : '';
        const fileName = supabaseStorage.generateUniqueFilename(
            req.file.originalname, 
            `${prefix}user_${userId}`
        );
        
        // Upload to Supabase
        const uploadResult = await supabaseStorage.uploadFile(
            req.file.buffer,
            fileName,
            supabaseStorage.buckets.documents,
            req.file.mimetype
        );
        
        // Generate signed URL for private access
        const signedUrl = await supabaseStorage.getSignedUrl(
            uploadResult.path,
            supabaseStorage.buckets.documents,
            3600 * 24 // 24 hours
        );
        
        res.status(201).json({
            message: 'Document uploaded successfully',
            file: {
                filename: fileName,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                signedUrl: signedUrl,
                path: uploadResult.path,
                category: category || 'general'
            }
        });
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ 
            message: 'Failed to upload document',
            error: error.message 
        });
    }
});

// Upload media (images, videos, audio)
router.post('/media', upload.single('media'), async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { userId, bookId, chapterId, mediaType } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Generate unique filename
        const prefix = mediaType ? `${mediaType}_` : '';
        const fileName = supabaseStorage.generateUniqueFilename(
            req.file.originalname, 
            `${prefix}user_${userId}`
        );
        
        // Upload to Supabase
        const uploadResult = await supabaseStorage.uploadFile(
            req.file.buffer,
            fileName,
            supabaseStorage.buckets.media,
            req.file.mimetype
        );
        
        // For public media, use public URL; for private, use signed URL
        const isPublic = req.body.isPublic === 'true';
        let accessUrl = uploadResult.publicUrl;
        
        if (!isPublic) {
            accessUrl = await supabaseStorage.getSignedUrl(
                uploadResult.path,
                supabaseStorage.buckets.media,
                3600 * 24 // 24 hours
            );
        }
        
        res.status(201).json({
            message: 'Media uploaded successfully',
            file: {
                filename: fileName,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: accessUrl,
                path: uploadResult.path,
                mediaType: mediaType || 'general',
                isPublic
            }
        });
    } catch (error) {
        console.error('Media upload error:', error);
        res.status(500).json({ 
            message: 'Failed to upload media',
            error: error.message 
        });
    }
});

// Upload multiple files
router.post('/bulk', upload.array('files', 10), async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        const { userId, category } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        const uploadResults = [];
        const errors = [];
        
        // Process each file
        for (const file of req.files) {
            try {
                const fileName = supabaseStorage.generateUniqueFilename(
                    file.originalname, 
                    `bulk_${category || 'general'}_user_${userId}`
                );
                
                const uploadResult = await supabaseStorage.uploadFile(
                    file.buffer,
                    fileName,
                    supabaseStorage.buckets.userAssets,
                    file.mimetype
                );
                
                uploadResults.push({
                    filename: fileName,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                    url: uploadResult.publicUrl,
                    path: uploadResult.path
                });
            } catch (error) {
                errors.push({
                    filename: file.originalname,
                    error: error.message
                });
            }
        }
        
        res.status(201).json({
            message: `Uploaded ${uploadResults.length} files successfully`,
            files: uploadResults,
            errors: errors,
            summary: {
                successful: uploadResults.length,
                failed: errors.length,
                total: req.files.length
            }
        });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ 
            message: 'Failed to process bulk upload',
            error: error.message 
        });
    }
});

// Delete file
router.delete('/:bucketName/:fileName', async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        const { bucketName, fileName } = req.params;
        
        // Validate bucket name
        const validBuckets = Object.values(supabaseStorage.buckets);
        if (!validBuckets.includes(bucketName)) {
            return res.status(400).json({ message: 'Invalid bucket name' });
        }
        
        await supabaseStorage.deleteFile(fileName, bucketName);
        
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ 
            message: 'Failed to delete file',
            error: error.message 
        });
    }
});

// Get signed URL for private file access
router.post('/signed-url', async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        const { filePath, bucketName, expiresIn = 3600 } = req.body;
        
        if (!filePath || !bucketName) {
            return res.status(400).json({ 
                message: 'File path and bucket name are required' 
            });
        }
        
        // Validate bucket name
        const validBuckets = Object.values(supabaseStorage.buckets);
        if (!validBuckets.includes(bucketName)) {
            return res.status(400).json({ message: 'Invalid bucket name' });
        }
        
        const signedUrl = await supabaseStorage.getSignedUrl(
            filePath, 
            bucketName, 
            expiresIn
        );
        
        res.json({
            signedUrl,
            expiresIn,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        });
    } catch (error) {
        console.error('Signed URL generation error:', error);
        res.status(500).json({ 
            message: 'Failed to generate signed URL',
            error: error.message 
        });
    }
});

// List files in bucket
router.get('/list/:bucketName', async (req, res) => {
    try {
        if (!supabaseStorage.isConfigured()) {
            return res.status(503).json({ 
                message: 'File upload service is not configured' 
            });
        }
        
        const { bucketName } = req.params;
        const { folderPath = '', limit = 100, offset = 0 } = req.query;
        
        // Validate bucket name
        const validBuckets = Object.values(supabaseStorage.buckets);
        if (!validBuckets.includes(bucketName)) {
            return res.status(400).json({ message: 'Invalid bucket name' });
        }
        
        const files = await supabaseStorage.listFiles(bucketName, folderPath, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            files,
            bucketName,
            folderPath,
            count: files.length
        });
    } catch (error) {
        console.error('File listing error:', error);
        res.status(500).json({ 
            message: 'Failed to list files',
            error: error.message 
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    if (error.message && error.message.includes('File type')) {
        return res.status(400).json({ message: error.message });
    }
    
    next(error);
});

export default router;