import React, { useState, useEffect } from 'react';
import { CloseIcon, BookOpenIcon, UserIcon, AcademicCapIcon, TagIcon } from './icons';

interface EditBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bookData: BookData) => void;
    initialData: BookData | null;
}

export interface BookData {
    name: string;
    image?: string;
    creatorName: string;
    university: string;
    semester: string;
    subjectCode: string;
}

const EditBookModal: React.FC<EditBookModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<BookData>({
        name: '',
        image: '',
        creatorName: '',
        university: '',
        semester: '',
        subjectCode: ''
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = React.createRef<HTMLInputElement>();

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            
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
            }
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.creatorName.trim() || !formData.university.trim()) {
            alert('Please fill in all required fields');
            return;
        }
        
        onSave(formData);
        onClose();
    };

    const handleInputChange = (field: keyof BookData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="theme-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b theme-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 theme-accent rounded-lg">
                            <BookOpenIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold theme-text">Edit Book Details</h2>
                            <p className="text-sm theme-text-secondary">Update your book information</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                    >
                        <CloseIcon />
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
                                    {formData.image ? (
                                        <img 
                                            src={formData.image} 
                                            alt="Book cover" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <BookOpenIcon className="w-8 h-8 theme-text-secondary" />
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={triggerFileUpload}
                                    className="btn-secondary cursor-pointer"
                                >
                                    Choose Image
                                </button>
                            </div>
                            <p className="text-xs theme-text-secondary mt-1">You can add or change the cover image later</p>
                        </div>

                        {/* Creator Name */}
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Creator's Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary" />
                                <input
                                    type="text"
                                    value={formData.creatorName}
                                    onChange={(e) => handleInputChange('creatorName', e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
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
                                <AcademicCapIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary" />
                                <input
                                    type="text"
                                    value={formData.university}
                                    onChange={(e) => handleInputChange('university', e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
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
                                <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary" />
                                <input
                                    type="text"
                                    value={formData.subjectCode}
                                    onChange={(e) => handleInputChange('subjectCode', e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition"
                                    placeholder="e.g., CS-101, MATH-201"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 theme-surface2 theme-text rounded-lg border theme-border hover:theme-surface3 theme-transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 theme-transition font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditBookModal;
