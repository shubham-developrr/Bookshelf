import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PencilIcon, EyeIcon, BookOpenIcon, PlusIcon, TrashIcon } from './icons';
import { BookTabManager, BookTabContext } from '../utils/BookTabManager';
import 'katex/dist/katex.min.css';

interface Note {
    id: string;
    topic: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

interface NotesManagerProps {
    currentBook: string;
    currentChapter: string;
    tabId?: string; // Unique tab identifier for isolation
    className?: string;
}

const NotesManager: React.FC<NotesManagerProps> = ({
    currentBook,
    currentChapter,
    tabId,
    className = ''
}) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newTopic, setNewTopic] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    
    // Create unique storage key that includes tab ID for isolation
    const baseKey = `notes_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;
    const storageKey = tabId ? `${baseKey}_${tabId}` : baseKey;

    // Load notes from localStorage
    useEffect(() => {
        const savedNotes = localStorage.getItem(storageKey);
        if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
                ...note,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt)
            }));
            setNotes(parsedNotes);
        }
    }, [storageKey]);

    // Save notes to localStorage
    const saveNotes = (updatedNotes: Note[]) => {
        localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        setNotes(updatedNotes);
    };

    // Add new note
    const handleAddNote = () => {
        if (!newTopic.trim()) return;

        const newNote: Note = {
            id: Date.now().toString(),
            topic: newTopic.trim(),
            content: '', // Start with empty content for immediate editing
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const updatedNotes = [...notes, newNote];
        saveNotes(updatedNotes);
        setSelectedNoteId(newNote.id);
        setIsEditing(true); // Start in editing mode
        setNewTopic('');
        setIsAddingNote(false);
    };

    // Delete note
    const handleDeleteNote = (noteId: string) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            const updatedNotes = notes.filter(note => note.id !== noteId);
            saveNotes(updatedNotes);
            if (selectedNoteId === noteId) {
                setSelectedNoteId(null);
                setIsEditing(false);
            }
        }
    };

    // Update note content
    const handleUpdateNote = (noteId: string, newContent: string) => {
        const updatedNotes = notes.map(note =>
            note.id === noteId
                ? { ...note, content: newContent, updatedAt: new Date() }
                : note
        );
        saveNotes(updatedNotes);
    };

    // Get current selected note
    const selectedNote = notes.find(note => note.id === selectedNoteId);

    // Auto-save content changes
    const [contentBuffer, setContentBuffer] = useState('');
    useEffect(() => {
        if (selectedNote && contentBuffer !== selectedNote.content) {
            const timer = setTimeout(() => {
                if (contentBuffer.trim() && selectedNoteId) {
                    handleUpdateNote(selectedNoteId, contentBuffer);
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [contentBuffer, selectedNote, selectedNoteId]);

    // Set content buffer when note changes
    useEffect(() => {
        if (selectedNote) {
            setContentBuffer(selectedNote.content);
        }
    }, [selectedNote]);

    return (
        <div className={`h-full ${className}`}>
            {/* Mobile-First Responsive Layout */}
            <div className="h-full flex flex-col">
                
                {/* Mobile: Single Column Layout */}
                <div className="block sm:hidden h-full">
                    {selectedNote ? (
                        /* Mobile: Note Editor/Viewer */
                        <div className="h-full flex flex-col">
                            {/* Mobile Note Header */}
                            <div className="px-4 py-3 border-b theme-border theme-surface flex items-center justify-between sticky top-0">
                                <button
                                    onClick={() => {
                                        setSelectedNoteId(null);
                                        setIsEditing(false);
                                    }}
                                    className="p-2 -ml-2 theme-text hover:theme-accent-bg rounded-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="font-semibold theme-text text-center flex-1 truncate px-2">{selectedNote.topic}</h2>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-2 rounded-lg ${
                                        isEditing ? 'theme-accent text-white' : 'theme-surface2 theme-text hover:theme-accent-bg'
                                    }`}
                                >
                                    {isEditing ? (
                                        <EyeIcon className="w-5 h-5" />
                                    ) : (
                                        <PencilIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Mobile Note Content */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                {isEditing ? (
                                    <textarea
                                        value={contentBuffer}
                                        onChange={(e) => setContentBuffer(e.target.value)}
                                        className="w-full h-full p-4 border rounded-lg resize-none theme-input text-sm"
                                        placeholder="Write your notes here using Markdown..."
                                        style={{ minHeight: 'calc(100vh - 200px)' }}
                                    />
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none prose-sm">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                code: ({ className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const isInline = !match;
                                                    return !isInline ? (
                                                        <SyntaxHighlighter
                                                            style={tomorrow as any}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            className="text-xs"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {selectedNote.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Mobile: Notes List */
                        <div className="h-full flex flex-col">
                            {/* Mobile Header with Add Button */}
                            <div className="px-4 py-3 border-b theme-border theme-surface">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                                        <BookOpenIcon className="w-5 h-5" />
                                        Notes
                                    </h2>
                                    {!isAddingNote && notes.length > 0 && (
                                        <button
                                            onClick={() => setIsAddingNote(true)}
                                            className="btn-primary flex items-center gap-2 px-3 py-2 text-sm"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Add
                                        </button>
                                    )}
                                </div>

                                {/* Mobile Add Note Form */}
                                {isAddingNote && (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            placeholder="Note topic..."
                                            className="w-full px-3 py-2 border rounded-lg theme-input text-sm"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddNote}
                                                className="flex-1 btn-primary text-sm py-2"
                                            >
                                                Create Note
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingNote(false);
                                                    setNewTopic('');
                                                }}
                                                className="flex-1 btn-secondary text-sm py-2"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Notes List */}
                            <div className="flex-1 overflow-y-auto">
                                {notes.length === 0 ? (
                                    <div className="p-6 text-center h-full flex flex-col justify-center">
                                        <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-semibold mb-2 theme-text">No notes yet</h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                                            Create topic-wise notes to organize your learning and ideas
                                        </p>
                                        <button
                                            onClick={() => setIsAddingNote(true)}
                                            className="btn-primary flex items-center gap-2 mx-auto px-4 py-3"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            Add First Note
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-3">
                                        {notes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="p-4 rounded-lg border theme-surface hover:theme-surface2 transition-all cursor-pointer"
                                                onClick={() => {
                                                    setSelectedNoteId(note.id);
                                                    setIsEditing(false);
                                                }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-base line-clamp-2 theme-text mb-1">
                                                            {note.topic}
                                                        </h4>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            Updated: {note.updatedAt.toLocaleDateString()}
                                                        </p>
                                                        {note.content && (
                                                            <p className="text-sm theme-text opacity-70 mt-2 line-clamp-2">
                                                                {note.content.substring(0, 100)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteNote(note.id);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-2 -mr-2"
                                                        title="Delete note"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop: Two Column Layout (Original) */}
                <div className="hidden sm:flex h-full">
                    {/* Desktop Notes List Sidebar */}
                    <div className="w-1/3 border-r theme-border theme-surface">
                        <div className="p-4 border-b theme-border">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold theme-text flex items-center gap-2">
                                    <BookOpenIcon className="w-5 h-5" />
                                    Notes
                                </h2>
                                <button
                                    onClick={() => setIsAddingNote(true)}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add Note
                                </button>
                            </div>

                            {/* Add note form */}
                            {isAddingNote && (
                                <div className="mb-4 p-4 theme-surface2 rounded-lg border theme-border">
                                    <h3 className="font-semibold mb-3 theme-text">New Note Topic</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            placeholder="Enter topic name..."
                                            className="w-full px-3 py-2 border rounded theme-input"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddNote}
                                                disabled={!newTopic.trim()}
                                                className="flex-1 btn-primary disabled:opacity-50"
                                            >
                                                Create Note
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingNote(false);
                                                    setNewTopic('');
                                                }}
                                                className="flex-1 btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes List */}
                        <div className="flex-1 overflow-y-auto">
                            {notes.length === 0 ? (
                                <div className="p-8 text-center">
                                    <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold mb-2 theme-text">No notes yet</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        Create topic-wise notes to organize your learning
                                    </p>
                                    <button
                                        onClick={() => setIsAddingNote(true)}
                                        className="btn-primary flex items-center gap-2 mx-auto"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add First Note
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 p-4">
                                    {notes.map((note) => (
                                        <div
                                            key={note.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedNoteId === note.id
                                                    ? 'theme-accent text-white'
                                                    : 'theme-surface hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                            onClick={() => {
                                                setSelectedNoteId(note.id);
                                                setIsEditing(false);
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-sm line-clamp-1">
                                                        {note.topic}
                                                    </h4>
                                                    <p className="text-xs opacity-75 mt-1">
                                                        Updated: {note.updatedAt.toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNote(note.id);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Delete note"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Note Editor/Viewer */}
                    <div className="flex-1 flex flex-col">
                        {selectedNote ? (
                            <>
                                {/* Note Header */}
                                <div className="p-4 border-b theme-border theme-surface flex items-center justify-between">
                                    <h2 className="text-xl font-bold theme-text">{selectedNote.topic}</h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className={`btn-secondary flex items-center gap-2 ${
                                                isEditing ? 'theme-accent text-white' : ''
                                            }`}
                                        >
                                            {isEditing ? (
                                                <>
                                                    <EyeIcon className="w-4 h-4" />
                                                    Preview
                                                </>
                                            ) : (
                                                <>
                                                    <PencilIcon className="w-4 h-4" />
                                                    Edit
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Note Content */}
                                <div className="flex-1 p-4">
                                    {isEditing ? (
                                        <textarea
                                            value={contentBuffer}
                                            onChange={(e) => setContentBuffer(e.target.value)}
                                            className="w-full h-full p-4 border rounded-lg resize-none theme-input"
                                            placeholder="Write your notes here using Markdown..."
                                        />
                                    ) : (
                                        <div className="h-full overflow-y-auto prose dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    code: ({ className, children, ...props }: any) => {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        const isInline = !match;
                                                        return !isInline ? (
                                                            <SyntaxHighlighter
                                                                style={tomorrow as any}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {selectedNote.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold mb-2 theme-text">Select a note</h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Choose a note from the sidebar to view and edit
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotesManager;
