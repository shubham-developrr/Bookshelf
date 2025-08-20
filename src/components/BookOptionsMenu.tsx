import React, { useState, useRef, useEffect } from 'react';
import { DotsVerticalIcon, PencilIcon } from './icons';

// Trash icon component
const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
);

interface BookOptionsMenuProps {
    bookId: string;
    bookName: string;
    onEdit: (bookId: string) => void;
    onDelete: (bookId: string) => void;
}

const BookOptionsMenu: React.FC<BookOptionsMenuProps> = ({ bookId, bookName, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleEdit = () => {
        onEdit(bookId);
        setIsOpen(false);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${bookName}"? This action cannot be undone.`)) {
            onDelete(bookId);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 hover:theme-surface2 rounded-lg theme-transition 
                    sm:opacity-0 sm:group-hover:opacity-100 
                    opacity-100 bg-black/30 backdrop-blur-sm border border-white/20 
                    hover:bg-black/50 transition-all duration-200"
                title="More options"
            >
                <DotsVerticalIcon className="w-4 h-4 text-white" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 theme-surface rounded-lg shadow-lg border theme-border z-50">
                    <div className="py-2">
                        <button
                            onClick={handleEdit}
                            className="w-full px-4 py-2 text-left flex items-center gap-3 hover:theme-surface2 theme-transition theme-text"
                        >
                            <PencilIcon className="w-4 h-4" />
                            Edit Details
                        </button>
                        <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 theme-transition text-red-600 dark:text-red-400"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Delete Book
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookOptionsMenu;
