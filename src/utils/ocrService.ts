import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker with matching version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface OCRResult {
    success: boolean;
    text: string;
    error?: string;
    confidence?: number;
}

export interface OCRProgress {
    status: string;
    progress: number;
}

/**
 * Comprehensive OCR Service using Tesseract.js
 * Supports images, PDFs (converted to images), and various file formats
 */
export class OCRService {
    private worker: any = null;
    private isInitialized = false;

    /**
     * Initialize OCR worker with optimized settings
     */
    async initialize(language: string = 'eng', progressCallback?: (progress: OCRProgress) => void): Promise<void> {
        if (this.isInitialized && this.worker) {
            return;
        }

        try {
            this.worker = await createWorker(language, 1, {
                logger: (m: any) => {
                    if (progressCallback) {
                        progressCallback({
                            status: m.status || 'Processing',
                            progress: m.progress || 0
                        });
                    }
                    console.log('OCR Progress:', m);
                }
            });

            // Optimize OCR settings for educational content
            await this.worker.setParameters({
                tessedit_pageseg_mode: '1', // Auto page segmentation with OSD
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:?!()[]{}"\'-+=/\\@#$%^&*<>|`~', // Common educational characters
                preserve_interword_spaces: '1', // Preserve spacing
            });

            this.isInitialized = true;
            console.log('✅ OCR Service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize OCR service:', error);
            throw new Error('OCR service initialization failed');
        }
    }

    /**
     * Extract text from image file
     */
    async extractTextFromImage(imageFile: File, progressCallback?: (progress: OCRProgress) => void): Promise<OCRResult> {
        try {
            if (!this.isInitialized) {
                await this.initialize('eng', progressCallback);
            }

            if (progressCallback) {
                progressCallback({ status: 'Starting OCR...', progress: 0 });
            }

            const { data } = await this.worker.recognize(imageFile, {
                rotateAuto: true, // Auto-rotate if needed
            });

            if (progressCallback) {
                progressCallback({ status: 'OCR Complete', progress: 100 });
            }

            return {
                success: true,
                text: data.text.trim(),
                confidence: data.confidence
            };

        } catch (error) {
            console.error('OCR extraction failed:', error);
            return {
                success: false,
                text: '',
                error: error instanceof Error ? error.message : 'OCR processing failed'
            };
        }
    }

    /**
     * Extract text from base64 image
     */
    async extractTextFromBase64(base64Data: string, progressCallback?: (progress: OCRProgress) => void): Promise<OCRResult> {
        try {
            if (!this.isInitialized) {
                await this.initialize('eng', progressCallback);
            }

            if (progressCallback) {
                progressCallback({ status: 'Processing base64 image...', progress: 0 });
            }

            const { data } = await this.worker.recognize(base64Data, {
                rotateAuto: true,
            });

            if (progressCallback) {
                progressCallback({ status: 'OCR Complete', progress: 100 });
            }

            return {
                success: true,
                text: data.text.trim(),
                confidence: data.confidence
            };

        } catch (error) {
            console.error('Base64 OCR extraction failed:', error);
            return {
                success: false,
                text: '',
                error: error instanceof Error ? error.message : 'Base64 OCR processing failed'
            };
        }
    }

    /**
     * Extract text from PDF by converting pages to images
     */
    async extractTextFromPDF(pdfFile: File, progressCallback?: (progress: OCRProgress) => void): Promise<OCRResult> {
        try {
            await this.initialize();
            
            if (progressCallback) {
                progressCallback({ status: 'Loading PDF...', progress: 0.1 });
            }

            // Convert file to array buffer
            const arrayBuffer = await pdfFile.arrayBuffer();
            
            if (progressCallback) {
                progressCallback({ status: 'Processing PDF pages...', progress: 0.2 });
            }

            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;
            
            let allText = '';
            
            // Process each page
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                if (progressCallback) {
                    progressCallback({ 
                        status: `Processing page ${pageNum} of ${numPages}...`, 
                        progress: 0.2 + (0.6 * (pageNum - 1) / numPages) 
                    });
                }

                const page = await pdf.getPage(pageNum);
                
                // Get page viewport
                const viewport = page.getViewport({ scale: 2.0 });
                
                // Create canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render page to canvas
                const renderContext = {
                    canvasContext: context!,
                    viewport: viewport,
                    canvas: canvas
                };
                
                await page.render(renderContext).promise;
                
                // Convert canvas to blob
                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((blob) => resolve(blob!), 'image/png');
                });
                
                // Create file from blob
                const imageFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
                
                // Extract text from this page using OCR
                const pageResult = await this.extractTextFromImage(imageFile);
                
                if (pageResult.success) {
                    allText += `\n\n--- Page ${pageNum} ---\n${pageResult.text}`;
                }
            }

            if (progressCallback) {
                progressCallback({ status: 'Finalizing...', progress: 0.9 });
            }

            const result = {
                success: allText.trim().length > 0,
                text: allText.trim(),
                confidence: 0.8
            };

            if (progressCallback) {
                progressCallback({ status: 'Complete!', progress: 1.0 });
            }

            return result;

        } catch (error) {
            console.error('PDF OCR extraction failed:', error);
            return {
                success: false,
                text: '',
                error: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Process multiple images and combine results
     */
    async extractTextFromMultipleImages(imageFiles: File[], progressCallback?: (progress: OCRProgress) => void): Promise<OCRResult> {
        try {
            if (!this.isInitialized) {
                await this.initialize('eng', progressCallback);
            }

            const results: string[] = [];
            const totalFiles = imageFiles.length;

            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                
                if (progressCallback) {
                    progressCallback({ 
                        status: `Processing image ${i + 1} of ${totalFiles}...`, 
                        progress: (i / totalFiles) * 100 
                    });
                }

                const result = await this.extractTextFromImage(file);
                if (result.success && result.text.trim()) {
                    results.push(`--- Image ${i + 1} ---\n${result.text}`);
                }
            }

            if (progressCallback) {
                progressCallback({ status: 'All images processed', progress: 100 });
            }

            return {
                success: true,
                text: results.join('\n\n'),
                confidence: results.length > 0 ? 1 : 0
            };

        } catch (error) {
            return {
                success: false,
                text: '',
                error: error instanceof Error ? error.message : 'Multiple image processing failed'
            };
        }
    }

    /**
     * Smart file type detection and processing
     */
    async extractTextFromFile(file: File, progressCallback?: (progress: OCRProgress) => void): Promise<OCRResult> {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        try {
            // Image files
            if (fileType.startsWith('image/') || 
                fileName.endsWith('.jpg') || 
                fileName.endsWith('.jpeg') || 
                fileName.endsWith('.png') || 
                fileName.endsWith('.bmp') || 
                fileName.endsWith('.webp')) {
                
                return await this.extractTextFromImage(file, progressCallback);
            }

            // PDF files
            if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                return await this.extractTextFromPDF(file, progressCallback);
            }

            // Unsupported file type
            return {
                success: false,
                text: '',
                error: `Unsupported file type: ${fileType}. Please upload an image file (JPG, PNG, BMP, WebP).`
            };

        } catch (error) {
            return {
                success: false,
                text: '',
                error: error instanceof Error ? error.message : 'File processing failed'
            };
        }
    }

    /**
     * Clean up and terminate worker
     */
    async terminate(): Promise<void> {
        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
                this.isInitialized = false;
                console.log('✅ OCR Service terminated successfully');
            } catch (error) {
                console.error('Error terminating OCR worker:', error);
            }
        }
    }

    /**
     * Get supported file types
     */
    static getSupportedFileTypes(): string[] {
        return [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/bmp',
            'image/webp',
            'application/pdf'
        ];
    }

    /**
     * Check if file type is supported
     */
    static isFileTypeSupported(file: File): boolean {
        const supportedTypes = OCRService.getSupportedFileTypes();
        return supportedTypes.includes(file.type.toLowerCase()) ||
               Boolean(file.name.toLowerCase().match(/\.(jpg|jpeg|png|bmp|webp|pdf)$/));
    }
}

// Singleton instance for app-wide use
export const ocrService = new OCRService();

// Export utility functions
export const extractTextFromFile = async (
    file: File, 
    progressCallback?: (progress: OCRProgress) => void
): Promise<OCRResult> => {
    return await ocrService.extractTextFromFile(file, progressCallback);
};

export const extractTextFromMultipleFiles = async (
    files: File[], 
    progressCallback?: (progress: OCRProgress) => void
): Promise<OCRResult> => {
    return await ocrService.extractTextFromMultipleImages(files, progressCallback);
};
