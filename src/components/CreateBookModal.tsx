import React, { useState } from 'react';
import UnifiedBookAdapter from '../services/UnifiedBookAdapter';

interface CreateBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bookData: BookData) => Promise<void>;
}

export interface BookData {
    name: string;
    image?: string;
    creatorName: string;
    university: string;
    semester: string;
    subjectCode: string;
}

const CreateBookModal: React.FC<CreateBookModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<BookData>({
        name: '',
        image: '',
        creatorName: '',
        university: '',
        semester: '',
        subjectCode: ''
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [isCreatingBook, setIsCreatingBook] = useState(false);
    const fileInputRef = React.createRef<HTMLInputElement>();

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setIsImageUploading(true);
            
            try {
                // Import the asset manager service
                const { SupabaseAssetService } = await import('../services/SupabaseAssetService');
                
                // Upload cover image to cloud storage
                const uploadResult = await SupabaseAssetService.uploadAsset(file, {
                    assetType: 'image'
                });

                if (uploadResult.success && uploadResult.url) {
                    setFormData(prev => ({ ...prev, image: uploadResult.url! }));
                    console.log(`✅ Cover image uploaded to cloud: ${file.name}`);
                } else {
                    throw new Error(uploadResult.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Cover image cloud upload failed, falling back to base64:', error);
                // Fallback to base64 storage
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFormData(prev => ({ ...prev, image: e.target?.result as string }));
                };
                reader.readAsDataURL(file);
            } finally {
                setIsImageUploading(false);
            }
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.creatorName.trim() || !formData.university.trim()) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Check if image is still uploading
        if (isImageUploading) {
            alert('Please wait for the image upload to complete before creating the book.');
            return;
        }
        
        setIsCreatingBook(true);
        
        try {
            // Wait a brief moment to ensure any async image processing is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await onSave(formData);
            
            // Show success message
            alert('📚 Book created successfully!');
            
            // Reset form
            setFormData({
                name: '',
                image: '',
                creatorName: '',
                university: '',
                semester: '',
                subjectCode: ''
            });
            setImageFile(null);
            onClose();
        } catch (error) {
            console.error('Error creating book:', error);
            alert('Failed to create book. Please try again.');
        } finally {
            setIsCreatingBook(false);
        }
    };

    const handleInputChange = (field: keyof BookData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="theme-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col relative">
                
                {/* Loading Overlay */}
                {isCreatingBook && (
                    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 rounded-lg">
                        <div className="text-white text-center">
                            <div className="animate-spin text-4xl mb-4">📚</div>
                            <div className="text-lg font-semibold mb-2">Creating your book...</div>
                            <div className="text-sm opacity-75">Please wait while we set up everything</div>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-between items-center p-6 border-b theme-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-xl font-semibold theme-text">Create New Book</h2>
                            <p className="text-sm theme-text-secondary">Fill in the details to create your book</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                    >
                        Close
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Book Name */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Book Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
                            placeholder="Enter book name"
                            required
                        />
                    </div>

                        {/* Book Image */}
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Book Cover Image (Optional)
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-20 theme-surface2 rounded-lg flex items-center justify-center border theme-border overflow-hidden">
                                    {isImageUploading ? (
                                        <div className="animate-spin text-blue-500">
                                            📤
                                        </div>
                                    ) : formData.image ? (
                                        <img 
                                            src={formData.image} 
                                            alt="Book cover" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-gray-400 text-xs text-center">
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={isImageUploading}
                                />
                                <button
                                    type="button"
                                    onClick={triggerFileUpload}
                                    disabled={isImageUploading}
                                    className={`btn-secondary cursor-pointer ${isImageUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isImageUploading ? 'Uploading...' : 'Choose Image'}
                                </button>
                            </div>
                            <p className="text-xs theme-text-secondary mt-1">
                                {isImageUploading ? 'Uploading image to cloud...' : 'You can add or change the cover image later'}
                            </p>
                        </div>
                        {/* Creator Name */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Creator's Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.creatorName}
                                onChange={(e) => handleInputChange('creatorName', e.target.value)}
                                className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
                                placeholder="Enter your name"
                                required
                            />
                        </div>
                    </div>

                    {/* University */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            University <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.university}
                                onChange={(e) => handleInputChange('university', e.target.value)}
                                className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
                                placeholder="Enter university name"
                                required
                            />
                        </div>
                    </div>

                    {/* Semester */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Semester
                        </label>
                        <select
                            value={formData.semester}
                            onChange={(e) => handleInputChange('semester', e.target.value)}
                            className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
                        >
                            <option value="">Select Semester</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subject Code */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Subject Code
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.subjectCode}
                                onChange={(e) => handleInputChange('subjectCode', e.target.value)}
                                className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
                                placeholder="e.g., CS-101, MATH-201"
                            />
                        </div>
                    </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isCreatingBook || isImageUploading}
                                className={`flex-1 px-4 py-2 theme-surface2 theme-text rounded-lg border theme-border hover:theme-surface3 theme-transition ${(isCreatingBook || isImageUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingBook || isImageUploading}
                                className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 theme-transition font-medium flex items-center justify-center gap-2 ${(isCreatingBook || isImageUploading) ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {isCreatingBook ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Creating...
                                    </>
                                ) : isImageUploading ? (
                                    <>
                                        <div className="animate-spin">📤</div>
                                        Wait for Upload
                                    </>
                                ) : (
                                    'Create Book'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateBookModal;
