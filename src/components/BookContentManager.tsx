import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpenIcon, PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from './icons';

interface Chapter {
    id: string;
    number: number;
    name: string;
    subtopics?: string[];
}

interface BookContentManagerProps {
    bookName: string;
    initialChapters?: Chapter[];
}

const BookContentManager: React.FC<BookContentManagerProps> = ({ bookName, initialChapters = [] }) => {
    const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
    const [isAddingChapter, setIsAddingChapter] = useState(false);
    const [editingChapter, setEditingChapter] = useState<string | null>(null);
    const [newChapter, setNewChapter] = useState({ number: '', name: '' });
    const navigate = useNavigate();
    const { bookId } = useParams();

    const handleAddChapter = () => {
        if (!newChapter.number.trim() || !newChapter.name.trim()) {
            alert('Please fill in both chapter number and name');
            return;
        }

        const chapterNumber = parseInt(newChapter.number);
        if (isNaN(chapterNumber) || chapterNumber <= 0) {
            alert('Please enter a valid chapter number');
            return;
        }

        // Check if chapter number already exists
        if (chapters.some(ch => ch.number === chapterNumber)) {
            alert('A chapter with this number already exists');
            return;
        }

        const chapter: Chapter = {
            id: `chapter-${Date.now()}`,
            number: chapterNumber,
            name: newChapter.name.trim(),
            subtopics: []
        };

        setChapters(prev => [...prev, chapter].sort((a, b) => a.number - b.number));
        setNewChapter({ number: '', name: '' });
        setIsAddingChapter(false);
    };

    const handleEditChapter = (chapterId: string, updatedName: string) => {
        setChapters(prev => prev.map(ch => 
            ch.id === chapterId ? { ...ch, name: updatedName } : ch
        ));
        setEditingChapter(null);
    };

    const handleDeleteChapter = (chapterId: string) => {
        const chapter = chapters.find(ch => ch.id === chapterId);
        if (chapter && window.confirm(`Are you sure you want to delete Chapter ${chapter.number}: ${chapter.name}?`)) {
            setChapters(prev => prev.filter(ch => ch.id !== chapterId));
        }
    };

    const handleChapterClick = (chapter: Chapter) => {
        // Navigate to chapter content (to be implemented)
        navigate(`/book/${bookId}/chapter/${chapter.id}`);
    };

    return (
        <div className="theme-bg min-h-screen theme-transition">
            {/* Header */}
            <header className="theme-surface sticky top-0 z-10 px-4 py-3 sm:px-6 theme-transition backdrop-blur-sm bg-opacity-80">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 theme-accent rounded-lg flex items-center justify-center">
                            <BookOpenIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg sm:text-xl font-bold theme-text">{bookName}</h1>
                    </div>
                    <button
                        onClick={() => setIsAddingChapter(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add Chapter
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Book Info */}
                <div className="theme-surface rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-bold theme-text mb-2">{bookName}</h2>
                    <p className="theme-text-secondary">
                        {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Add Chapter Form */}
                {isAddingChapter && (
                    <div className="theme-surface rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold theme-text mb-4">Add New Chapter</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">
                                    Chapter Number
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newChapter.number}
                                    onChange={(e) => setNewChapter(prev => ({ ...prev, number: e.target.value }))}
                                    className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 1"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium theme-text mb-2">
                                    Chapter Name
                                </label>
                                <input
                                    type="text"
                                    value={newChapter.name}
                                    onChange={(e) => setNewChapter(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Introduction to Data Structures"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setIsAddingChapter(false);
                                    setNewChapter({ number: '', name: '' });
                                }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddChapter}
                                className="btn-primary"
                            >
                                Add Chapter
                            </button>
                        </div>
                    </div>
                )}

                {/* Chapters List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold theme-text">Chapters</h3>
                    {chapters.length === 0 ? (
                        <div className="theme-surface rounded-lg p-8 text-center">
                            <BookOpenIcon className="w-12 h-12 theme-text-secondary mx-auto mb-4" />
                            <p className="theme-text-secondary text-lg">No chapters yet</p>
                            <p className="theme-text-secondary text-sm mt-2">Click "Add Chapter" to get started</p>
                        </div>
                    ) : (
                        chapters.map((chapter) => (
                            <div
                                key={chapter.id}
                                className="theme-surface rounded-lg p-4 hover:theme-surface2 theme-transition group"
                            >
                                <div className="flex justify-between items-start">
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => handleChapterClick(chapter)}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 theme-accent rounded-lg flex items-center justify-center">
                                                <span className="text-white font-semibold">
                                                    {chapter.number}
                                                </span>
                                            </div>
                                            {editingChapter === chapter.id ? (
                                                <input
                                                    type="text"
                                                    defaultValue={chapter.name}
                                                    className="flex-1 px-3 py-1 theme-surface2 theme-text rounded border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    onBlur={(e) => handleEditChapter(chapter.id, e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleEditChapter(chapter.id, e.currentTarget.value);
                                                        }
                                                    }}
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <h4 className="text-lg font-semibold theme-text group-hover:theme-accent-text theme-transition">
                                                    {chapter.name}
                                                </h4>
                                            )}
                                        </div>
                                        <p className="theme-text-secondary text-sm ml-13">
                                            {chapter.subtopics?.length || 0} subtopic{(chapter.subtopics?.length || 0) !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 theme-transition">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingChapter(chapter.id);
                                            }}
                                            className="p-2 hover:theme-surface3 rounded-lg theme-transition"
                                            title="Edit chapter"
                                        >
                                            <PencilIcon className="w-4 h-4 theme-text-secondary" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChapter(chapter.id);
                                            }}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg theme-transition"
                                            title="Delete chapter"
                                        >
                                            <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default BookContentManager;
