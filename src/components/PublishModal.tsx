import React, { useState } from 'react';
import { PaperAirplaneIcon, CloseIcon, BookOpenIcon } from './icons';

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    completedBooks: Array<{
        id: string;
        name: string;
        image?: string;
        completionPercentage: number;
        totalSteps: number;
        completedSteps: number;
    }>;
    onPublish: (bookIds: string[]) => void;
}

// Check mark icon
const CheckIcon2 = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
);

const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, completedBooks, onPublish }) => {
    const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

    const toggleBookSelection = (bookId: string) => {
        const newSelection = new Set(selectedBooks);
        if (newSelection.has(bookId)) {
            newSelection.delete(bookId);
        } else {
            newSelection.add(bookId);
        }
        setSelectedBooks(newSelection);
    };

    const handlePublish = () => {
        if (selectedBooks.size === 0) {
            alert('Please select at least one book to publish');
            return;
        }

        onPublish(Array.from(selectedBooks));
        setSelectedBooks(new Set());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="theme-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b theme-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600 rounded-lg">
                            <PaperAirplaneIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold theme-text">Publish to Bookstore</h2>
                            <p className="text-sm theme-text-secondary">Select completed books to publish</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {completedBooks.length === 0 ? (
                        <div className="text-center py-12">
                            <BookOpenIcon className="w-16 h-16 theme-text-secondary mx-auto mb-4" />
                            <h3 className="text-lg font-medium theme-text mb-2">No Completed Books</h3>
                            <p className="theme-text-secondary mb-4">
                                Complete your books to publish them to the bookstore.
                            </p>
                            <p className="text-sm theme-text-secondary italic">
                                Note: Book completion tracking will be implemented in future updates.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4">
                                <p className="theme-text-secondary text-sm">
                                    {completedBooks.length} book(s) ready for publishing
                                </p>
                            </div>

                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {completedBooks.map((book) => (
                                    <div
                                        key={book.id}
                                        className={`p-4 border rounded-lg cursor-pointer theme-transition ${
                                            selectedBooks.has(book.id)
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                : 'theme-border hover:theme-surface2'
                                        }`}
                                        onClick={() => toggleBookSelection(book.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                    selectedBooks.has(book.id)
                                                        ? 'bg-green-600 border-green-600'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {selectedBooks.has(book.id) && (
                                                        <CheckIcon2 className="w-4 h-4 text-white" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="w-12 h-16 theme-surface2 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {book.image ? (
                                                    <img 
                                                        src={book.image} 
                                                        alt={book.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <BookOpenIcon className="w-6 h-6 theme-text-secondary" />
                                                )}
                                            </div>

                                            <div className="flex-grow">
                                                <h3 className="font-medium theme-text">{book.name}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-green-500 rounded-full transition-all"
                                                                style={{ width: `${book.completionPercentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm theme-text-secondary">
                                                            {book.completionPercentage}%
                                                        </span>
                                                    </div>
                                                    <span className="text-sm theme-text-secondary">
                                                        {book.completedSteps}/{book.totalSteps} steps
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-6 border-t theme-border mt-6">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 theme-surface2 theme-text rounded-lg border theme-border hover:theme-surface3 theme-transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={selectedBooks.size === 0}
                                    className={`flex-1 px-4 py-2 rounded-lg theme-transition font-medium flex items-center justify-center gap-2 ${
                                        selectedBooks.size > 0
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'theme-surface2 theme-text-secondary cursor-not-allowed'
                                    }`}
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                    Publish {selectedBooks.size > 0 ? `(${selectedBooks.size})` : ''}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublishModal;
