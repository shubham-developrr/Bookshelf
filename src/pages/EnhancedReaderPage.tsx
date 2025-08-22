import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, AlertIcon, SparklesIcon, PlusIcon, TrashIcon, ExamIcon } from '../components/icons';
import { Highlight } from '../types/types';
import { chapterSubtopics } from '../constants/constants';
import { AIGuruIcon } from '../components/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import KindleStyleTextViewer from '../components/KindleStyleTextViewerFixed';
import YouTubePlayerModal from '../components/YouTubePlayerModal';
import InlineContentEditor from '../components/InlineContentEditor';
import FlashCardManager from '../components/FlashCardManager';
import RichTextEditor from '../components/RichTextEditor';
import MCQManager from '../components/MCQManager';
import QAManager from '../components/QAManager';
import MindMapManager from '../components/MindMapManager';
import NotesManager from '../components/NotesManager';
import VideosManager from '../components/VideosManager';
import HTMLCodeEditor from '../components/HTMLCodeEditor';
import { ResponsiveTabBar } from '../components/ResponsiveTabBar';
import { generateAIGuruResponse } from '../services/githubModelsService';
import { tabPersistenceManager } from '../services/TabPersistenceManager';
import Groq from 'groq-sdk';

// Template ID Constants - Built-in IDs that cannot be changed
const TEMPLATE_IDS = {
    'Notes': 'NOTES',
    'Flash card': 'FLASHCARD', 
    'MCQ': 'MCQ',
    'Q&A': 'QA',
    'Videos': 'VIDEOS',
    'Mind Map': 'MINDMAP'
} as const;

// Desktop Tab Icon Mapping Function
const getDesktopTabIcon = (tabName: string) => {
  const iconMap: { [key: string]: JSX.Element } = {
    notes: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M13.4 2H6.6C5.7 2 5 2.7 5 3.6v16.8c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6V7.6L13.4 2z"></path>
        <path d="M13 2v6h6"></path>
        <path d="M9 14h4"></path>
        <path d="M9 18h7"></path>
      </svg>
    ),
    qa: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <path d="M8 10h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M16 10h.01"></path>
      </svg>
    ),
    'q&a': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <path d="M8 10h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M16 10h.01"></path>
      </svg>
    ),
    quiz: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    mcq: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    flashcard: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    'flash-card': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    mindmap: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 12v-1"></path>
        <path d="M12 20v-1"></path>
        <path d="M12 4V3"></path>
        <path d="m5 10-.8-.4"></path>
        <path d="m5 18-.8-.4"></path>
        <path d="m19 10.4-.8-.4"></path>
        <path d="m19 18.4-.8-.4"></path>
      </svg>
    ),
    'mind-map': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 12v-1"></path>
        <path d="M12 20v-1"></path>
        <path d="M12 4V3"></path>
        <path d="m5 10-.8-.4"></path>
        <path d="m5 18-.8-.4"></path>
        <path d="m19 10.4-.8-.4"></path>
        <path d="m19 18.4-.8-.4"></path>
      </svg>
    ),
    summary: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    videos: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    ),
    video: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    ),
    custom: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    )
  };

  const normalizedName = tabName.toLowerCase().replace(/[\s-_]/g, '');
  
  // Direct match
  if (iconMap[normalizedName]) return iconMap[normalizedName];
  
  // Partial matching for common patterns
  if (normalizedName.includes('quiz') || normalizedName.includes('mcq')) return iconMap.quiz;
  if (normalizedName.includes('flashcard') || normalizedName.includes('flash')) return iconMap.flashcard;
  if (normalizedName.includes('mindmap') || normalizedName.includes('mind')) return iconMap.mindmap;
  if (normalizedName.includes('note')) return iconMap.notes;
  if (normalizedName.includes('video')) return iconMap.video;
  if (normalizedName.includes('summary') || normalizedName.includes('summar')) return iconMap.summary;
  if (normalizedName.includes('qa') || normalizedName.includes('q&a') || normalizedName.includes('question')) return iconMap.qa;
  
  // Default fallback icon (general tab icon)
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );
};

interface SubtopicData {
    id: string;
    title: string;
    content: string;
    images: string[];
    imageCaptions?: string[]; // Captions for each image
    videoLinks?: VideoData[];
}

interface VideoData {
    id: string;
    title: string;
    youtubeUrl: string;
    startTime?: number;
    endTime?: number;
}

interface EnhancedReaderPageProps {
    openAIGuru: (prompt?: string) => void;
    highlights: Highlight[];
    addHighlight: (highlight: Omit<Highlight, 'id' | 'timestamp'>) => void;
    removeHighlight: (id: string) => void;
}

// Custom Tab with Editor Switching Component - MOVED OUTSIDE TO FIX HOOKS ISSUE
const CustomTabWithEditorSwitching: React.FC<{ tabName: string; currentBook: string; currentChapter: string }> = ({ tabName, currentBook, currentChapter }) => {
    const [editorMode, setEditorMode] = useState<'rich' | 'html'>('rich');
    const [htmlEditors, setHtmlEditors] = useState<{ id: string; title: string }[]>([]);
    const [richTextEditors, setRichTextEditors] = useState<{ id: string; title: string }[]>([]);
    const storageKey = `editor_mode_${currentBook}_${currentChapter}_${tabName}`;
    const htmlEditorsStorageKey = `html_editors_${currentBook}_${currentChapter}_${tabName}`;
    const richTextEditorsStorageKey = `rich_text_editors_${currentBook}_${currentChapter}_${tabName}`;
    
    useEffect(() => {
        const savedMode = localStorage.getItem(storageKey);
        if (savedMode === 'html' || savedMode === 'rich') {
            setEditorMode(savedMode);
        }
        
        // Load existing HTML editors
        const savedHtmlEditors = localStorage.getItem(htmlEditorsStorageKey);
        if (savedHtmlEditors) {
            try {
                const parsedEditors = JSON.parse(savedHtmlEditors);
                setHtmlEditors(parsedEditors);
            } catch (e) {
                console.warn('Failed to parse saved HTML editors:', e);
                setHtmlEditors([]);
            }
        }
        
        // Load existing Rich Text editors
        const savedRichTextEditors = localStorage.getItem(richTextEditorsStorageKey);
        if (savedRichTextEditors) {
            try {
                const parsedEditors = JSON.parse(savedRichTextEditors);
                setRichTextEditors(parsedEditors);
            } catch (e) {
                console.warn('Failed to parse saved Rich Text editors:', e);
                setRichTextEditors([]);
            }
        }
    }, [storageKey, htmlEditorsStorageKey, richTextEditorsStorageKey]);
    
    const handleModeSwitch = (mode: 'rich' | 'html') => {
        setEditorMode(mode);
        localStorage.setItem(storageKey, mode);
    };
    
    const addNewHtmlEditor = () => {
        const newEditor = {
            id: Date.now().toString(),
            title: `HTML Editor ${htmlEditors.length + 1}`
        };
        const updatedEditors = [...htmlEditors, newEditor];
        setHtmlEditors(updatedEditors);
        localStorage.setItem(htmlEditorsStorageKey, JSON.stringify(updatedEditors));
    };
    
    const removeHtmlEditor = (editorId: string) => {
        if (htmlEditors.length <= 1) {
            alert('Cannot remove the last HTML editor. At least one editor must remain.');
            return;
        }
        
        const updatedEditors = htmlEditors.filter(editor => editor.id !== editorId);
        setHtmlEditors(updatedEditors);
        localStorage.setItem(htmlEditorsStorageKey, JSON.stringify(updatedEditors));
        
        // Also remove the content from localStorage
        const contentKey = `html_editor_content_${currentBook}_${currentChapter}_${tabName}_${editorId}`;
        localStorage.removeItem(contentKey);
    };
    
    const updateHtmlEditorTitle = (editorId: string, newTitle: string) => {
        const updatedEditors = htmlEditors.map(editor => 
            editor.id === editorId ? { ...editor, title: newTitle } : editor
        );
        setHtmlEditors(updatedEditors);
        localStorage.setItem(htmlEditorsStorageKey, JSON.stringify(updatedEditors));
    };
    
    const addNewRichTextEditor = () => {
        const newEditor = {
            id: Date.now().toString(),
            title: `Rich Text Editor ${richTextEditors.length + 1}`
        };
        const updatedEditors = [...richTextEditors, newEditor];
        setRichTextEditors(updatedEditors);
        localStorage.setItem(richTextEditorsStorageKey, JSON.stringify(updatedEditors));
    };
    
    const removeRichTextEditor = (editorId: string) => {
        if (richTextEditors.length <= 1) {
            alert('Cannot remove the last Rich Text editor. At least one editor must remain.');
            return;
        }
        
        const updatedEditors = richTextEditors.filter(editor => editor.id !== editorId);
        setRichTextEditors(updatedEditors);
        localStorage.setItem(richTextEditorsStorageKey, JSON.stringify(updatedEditors));
        
        // Also remove the content from localStorage
        const contentKey = `rich_text_editor_content_${currentBook}_${currentChapter}_${tabName}_${editorId}`;
        localStorage.removeItem(contentKey);
    };
    
    const updateRichTextEditorTitle = (editorId: string, newTitle: string) => {
        const updatedEditors = richTextEditors.map(editor => 
            editor.id === editorId ? { ...editor, title: newTitle } : editor
        );
        setRichTextEditors(updatedEditors);
        localStorage.setItem(richTextEditorsStorageKey, JSON.stringify(updatedEditors));
    };
    
    const isMobile = () => window.innerWidth <= 768;
    
    return (
        <div className="w-full">
            {/* Editor Mode Switcher */}
            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 pb-4 border-b theme-border`}>
                <div className={`flex items-center gap-2 ${isMobile() ? 'justify-center' : ''}`}>
                    <svg className="w-5 h-5 theme-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3 className="text-lg font-semibold theme-text">Custom Editor</h3>
                </div>
                
                <div className={`flex ${isMobile() ? 'justify-center' : ''} gap-1 p-1 theme-surface2 rounded-lg`}>
                    <button
                        onClick={() => handleModeSwitch('rich')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            editorMode === 'rich'
                                ? 'theme-accent text-white shadow-sm'
                                : 'theme-text hover:theme-surface2'
                        }`}
                    >
                        📝 Rich Text
                    </button>
                    <button
                        onClick={() => handleModeSwitch('html')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            editorMode === 'html'
                                ? 'theme-accent text-white shadow-sm'
                                : 'theme-text hover:theme-surface2'
                        }`}
                    >
                        💾 HTML Code
                    </button>
                </div>
            </div>

            {/* Rich Text Mode */}
            {editorMode === 'rich' ? (
                <div className="w-full space-y-6">
                    {/* Rich Text Editors Management Header */}
                    <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} p-4 theme-surface2 rounded-lg`}>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 theme-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            <span className="font-medium theme-text">Rich Text Editors</span>
                            <span className="text-sm theme-text-secondary px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                                {richTextEditors.length}
                            </span>
                        </div>
                        
                        <button
                            onClick={addNewRichTextEditor}
                            className={`flex items-center gap-2 ${isMobile() ? 'w-full justify-center' : ''} px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition font-medium text-sm`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Rich Text Editor
                        </button>
                    </div>
                    
                    {/* Rich Text Editors List */}
                    <div className="space-y-6">
                        {richTextEditors.map((editor, index) => (
                            <div key={editor.id} className="theme-surface rounded-lg p-4 border theme-border">
                                {/* Editor Header */}
                                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 pb-3 border-b theme-border`}>
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={editor.title}
                                            onChange={(e) => updateRichTextEditorTitle(editor.id, e.target.value)}
                                            className="font-medium theme-text bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1"
                                            placeholder="Editor title..."
                                        />
                                    </div>
                                    
                                    {richTextEditors.length > 1 && (
                                        <button
                                            onClick={() => removeRichTextEditor(editor.id)}
                                            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg theme-transition text-sm"
                                            title="Remove this editor"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <polyline points="3,6 5,6 21,6"/>
                                                <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                                                <line x1="10" y1="11" x2="10" y2="17"/>
                                                <line x1="14" y1="11" x2="14" y2="17"/>
                                            </svg>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                
                                {/* Rich Text Editor Component */}
                                <RichTextEditor
                                    tabName={`${tabName}_${editor.id}`}
                                    currentBook={currentBook}
                                    currentChapter={currentChapter}
                                    className="w-full"
                                    customStorageKey={`rich_text_editor_content_${currentBook}_${currentChapter}_${tabName}_${editor.id}`}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {richTextEditors.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                                <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium theme-text mb-2">No Rich Text editors</h3>
                            <p className="theme-text-secondary mb-4">Click "Add Rich Text Editor" to create your first editor</p>
                            <button
                                onClick={addNewRichTextEditor}
                                className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                            >
                                Add Rich Text Editor
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full space-y-6">
                    {/* HTML Editors Management Header */}
                    <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} p-4 theme-surface2 rounded-lg`}>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 theme-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <polyline points="16,18 22,12 16,6"/>
                                <polyline points="8,6 2,12 8,18"/>
                            </svg>
                            <span className="font-medium theme-text">HTML Code Editors</span>
                            <span className="text-sm theme-text-secondary px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                                {htmlEditors.length}
                            </span>
                        </div>
                        
                        <button
                            onClick={addNewHtmlEditor}
                            className={`flex items-center gap-2 ${isMobile() ? 'w-full justify-center' : ''} px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition font-medium text-sm`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add HTML Editor
                        </button>
                    </div>
                    
                    {/* HTML Editors List */}
                    <div className="space-y-6">
                        {htmlEditors.map((editor, index) => (
                            <div key={editor.id} className="theme-surface rounded-lg p-4 border theme-border">
                                {/* Editor Header */}
                                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 pb-3 border-b theme-border`}>
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={editor.title}
                                            onChange={(e) => updateHtmlEditorTitle(editor.id, e.target.value)}
                                            className="font-medium theme-text bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            placeholder="Editor title..."
                                        />
                                    </div>
                                    
                                    {htmlEditors.length > 1 && (
                                        <button
                                            onClick={() => removeHtmlEditor(editor.id)}
                                            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg theme-transition text-sm"
                                            title="Remove this editor"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <polyline points="3,6 5,6 21,6"/>
                                                <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                                                <line x1="10" y1="11" x2="10" y2="17"/>
                                                <line x1="14" y1="11" x2="14" y2="17"/>
                                            </svg>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                
                                {/* HTML Editor Component */}
                                <HTMLCodeEditor
                                    tabName={`${tabName}_${editor.id}`}
                                    currentBook={currentBook}
                                    currentChapter={currentChapter}
                                    className="w-full"
                                    customStorageKey={`html_editor_content_${currentBook}_${currentChapter}_${tabName}_${editor.id}`}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {htmlEditors.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                                <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <polyline points="16,18 22,12 16,6"/>
                                    <polyline points="8,6 2,12 8,18"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium theme-text mb-2">No HTML editors</h3>
                            <p className="theme-text-secondary mb-4">Click "Add HTML Editor" to create your first editor</p>
                            <button
                                onClick={addNewHtmlEditor}
                                className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                            >
                                Add HTML Editor
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const EnhancedReaderPage: React.FC<EnhancedReaderPageProps> = ({ 
    openAIGuru, 
    highlights, 
    addHighlight, 
    removeHighlight 
}) => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { state: userState } = useUser();
    
    const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
    const [customSubtopics, setCustomSubtopics] = useState<SubtopicData[]>([]);
    const [isCustomChapter, setIsCustomChapter] = useState(false);
    const [isLoadingSubtopics, setIsLoadingSubtopics] = useState(false);
    
    // Chapter Data Loading States
    const [isLoadingChapterData, setIsLoadingChapterData] = useState(true);
    const [chapterDataProgress, setChapterDataProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Initializing chapter...');
    const [smallFilesLoaded, setSmallFilesLoaded] = useState(false);
    
    const [editingSubtopic, setEditingSubtopic] = useState<string | null>(null);
    const [showAddSubtopic, setShowAddSubtopic] = useState(false);
    const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
    const [activeTab, setActiveTab] = useState('read'); // Main content tab now called 'read'
    const [availableTemplates] = useState<string[]>(['Notes', 'Flash card', 'MCQ', 'Q&A', 'Mind Map', 'Videos']); // Template options
    const [activeTabs, setActiveTabs] = useState<string[]>(['read', 'highlights']); // Default visible tabs - only Read and Highlights
    const [showTemplateSelector, setShowTemplateSelector] = useState(false); // Show template selection modal
    const [newTabName, setNewTabName] = useState(''); // For adding custom tabs
    const [showAddTab, setShowAddTab] = useState(false); // Show add tab form
    const [tabNames, setTabNames] = useState<{ [key: string]: string }>({}); // Custom names for tabs
    const [showRenameInput, setShowRenameInput] = useState<string | null>(null); // Tab being renamed
    const [renameValue, setRenameValue] = useState(''); // Rename input value

    // Tab persistence state
    const [isTabsLoaded, setIsTabsLoaded] = useState(false);
    
    // Manage tab states
    const [showManageDropdown, setShowManageDropdown] = useState(false);
    const [managingTab, setManagingTab] = useState<string | null>(null);
    const [showSvgEditor, setShowSvgEditor] = useState(false);
    // State for SVG AI generation
    const [customSvgCode, setCustomSvgCode] = useState('');
    const [aiSvgPreview, setAiSvgPreview] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [svgGenerationStep, setSvgGenerationStep] = useState<'input' | 'preview' | 'saved'>('input');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedAiModel, setSelectedAiModel] = useState('llama3-groq-70b-8192-tool-use-preview');
    const [availableModels, setAvailableModels] = useState<string[]>([
        'llama3-groq-70b-8192-tool-use-preview',
        'llama-3.3-70b-versatile', 
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
        'llama3-8b-8192',
        'llama-3.1-70b-versatile'
    ]);
    const [tabSvgs, setTabSvgs] = useState<{ [key: string]: string }>(() => {
        const saved = localStorage.getItem('tabCustomSvgs');
        return saved ? JSON.parse(saved) : {};
    });
    
    // YouTube Player Modal states
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [currentVideoData, setCurrentVideoData] = useState<VideoData | null>(null);
    const [currentSubtopicForVideo, setCurrentSubtopicForVideo] = useState<string>('');
    const [currentVideoMode, setCurrentVideoMode] = useState<'play' | 'edit'>('edit');
    
    const contentRef = useRef<HTMLDivElement>(null);
    // Remove shared fileInputRef - we'll create individual ones for each subtopic

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';
    
    const currentSubtopics = currentChapter && chapterSubtopics[currentBook] 
        ? chapterSubtopics[currentBook][currentChapter] || []
        : [];

    // PROGRESSIVE CHAPTER DATA LOADING
    const loadChapterDataProgressively = async () => {
        try {
            setIsLoadingChapterData(true);
            setChapterDataProgress(0);
            setSmallFilesLoaded(false);
            
            console.log('🔄 Starting progressive chapter data loading...');
            
            // PHASE 1: Load small essential data (<100KB) - FAST
            setLoadingMessage('Loading essential data...');
            const smallDataTypes = ['NOTES', 'MCQ', 'QA', 'FLASHCARD'];
            const smallDataPromises = [];
            
            for (const dataType of smallDataTypes) {
                const key = `${dataType}_${currentBook.replace(/\s+/g, '_')}_${currentChapter.replace(/\s+/g, '_')}`;
                const data = localStorage.getItem(key);
                
                if (data) {
                    const size = new Blob([data]).size;
                    if (size < 100 * 1024) { // Less than 100KB
                        console.log(`📄 ${dataType}: ${(size/1024).toFixed(1)}KB (small - loading now)`);
                        smallDataPromises.push(Promise.resolve({ type: dataType, data }));
                    }
                }
            }
            
            // Wait for all small files
            await Promise.all(smallDataPromises);
            setChapterDataProgress(50);
            setSmallFilesLoaded(true);
            
            console.log('✅ PHASE 1 COMPLETE: Small files loaded, UI ready');
            
            // PHASE 2: Load medium files in background (100KB-1MB)
            setLoadingMessage('Loading media content...');
            setTimeout(async () => {
                const mediumDataTypes = ['MINDMAP', 'VIDEOS'];
                
                for (const dataType of mediumDataTypes) {
                    const key = `${dataType}_${currentBook.replace(/\s+/g, '_')}_${currentChapter.replace(/\s+/g, '_')}`;
                    const data = localStorage.getItem(key);
                    
                    if (data) {
                        const size = new Blob([data]).size;
                        if (size >= 100 * 1024 && size < 1024 * 1024) { // 100KB-1MB
                            console.log(`📊 ${dataType}: ${(size/1024).toFixed(1)}KB (medium - background loading)`);
                            // Simulate processing time
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                }
                
                setChapterDataProgress(80);
                console.log('✅ PHASE 2 COMPLETE: Medium files loaded');
                
                // PHASE 3: Load large files (>1MB) - BACKGROUND
                setTimeout(async () => {
                    const allKeys = Object.keys(localStorage);
                    const chapterKeys = allKeys.filter(key => 
                        key.includes(currentBook.replace(/\s+/g, '_')) && 
                        key.includes(currentChapter.replace(/\s+/g, '_'))
                    );
                    
                    for (const key of chapterKeys) {
                        const data = localStorage.getItem(key);
                        if (data) {
                            const size = new Blob([data]).size;
                            if (size >= 1024 * 1024) { // >1MB
                                console.log(`📚 ${key}: ${(size/1024/1024).toFixed(2)}MB (large - background loading)`);
                                // Process in chunks to avoid blocking
                                await new Promise(resolve => setTimeout(resolve, 50));
                            }
                        }
                    }
                    
                    setChapterDataProgress(100);
                    setIsLoadingChapterData(false);
                    console.log('🎉 PHASE 3 COMPLETE: All chapter data loaded');
                }, 500);
                
            }, 200);
            
        } catch (error) {
            console.error('❌ Chapter data loading failed:', error);
            setIsLoadingChapterData(false);
            setSmallFilesLoaded(true); // Allow entry even if some loading fails
        }
    };

    // MAIN CHAPTER INITIALIZATION - with progressive loading
    useEffect(() => {
        const initializeChapter = async () => {
            if (!currentBook || !currentChapter) return;
            
            console.log(`🚀 Initializing chapter: ${currentBook} → ${currentChapter}`);
            
            // Start progressive data loading
            await loadChapterDataProgressively();
            
            // Check if custom chapter
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBook = savedBooks.find((book: any) => book.name === currentBook);
            
            if (customBook) {
                setIsCustomChapter(true);
                setIsLoadingSubtopics(true);
                await loadCustomSubtopics(customBook.id, currentChapter);
                setIsLoadingSubtopics(false);
            } else {
                setIsCustomChapter(false);
                setIsLoadingSubtopics(false);
            }
        };
        
        initializeChapter();
    }, [currentBook, currentChapter]);

    // Detect existing templates and restore tabs
    useEffect(() => {
        if (!currentBook || !currentChapter) return;

        const detectExistingTemplates = (): string[] => {
            const existingTabs: string[] = ['read', 'highlights']; // Always include core tabs
            const chapterKey = currentChapter.replace(/\s+/g, '_');

            // Check for template data in localStorage using new template ID system
            const templateMappings = [
                { storageKeys: [`flashcards_${currentBook}_${chapterKey}`], templateId: 'FLASHCARD', displayName: 'Flash card' },
                { storageKeys: [`mcq_${currentBook}_${chapterKey}`], templateId: 'MCQ', displayName: 'MCQ' },
                { storageKeys: [`qa_${currentBook}_${chapterKey}`], templateId: 'QA', displayName: 'Q&A' },
                { storageKeys: [`videos_${currentBook}_${chapterKey}`], templateId: 'VIDEOS', displayName: 'Videos' },
                { storageKeys: [`notes_${currentBook}_${chapterKey}`], templateId: 'NOTES', displayName: 'Notes' },
                { storageKeys: [`mindmaps_${currentBook}_${chapterKey}`], templateId: 'MINDMAP', displayName: 'Mind Map' }
            ];

            // Check each template type and create tabs with new ID system
            templateMappings.forEach(({ storageKeys, templateId, displayName }) => {
                let hasData = false;
                
                // Check all possible storage keys for this template
                storageKeys.forEach(storageKey => {
                    const data = localStorage.getItem(storageKey);
                    if (data && data !== 'null' && data !== '[]') {
                        try {
                            const parsed = JSON.parse(data);
                            // Only add if there's meaningful content
                            if ((Array.isArray(parsed) && parsed.length > 0) || 
                                (typeof parsed === 'object' && Object.keys(parsed).length > 0)) {
                                hasData = true;
                            }
                        } catch (err) {
                            console.warn(`Failed to parse template data for ${storageKey}:`, err);
                        }
                    }
                });
                
                if (hasData) {
                    const tabId = `${templateId}_1`;
                    existingTabs.push(tabId);
                    // Set display name
                    setTabNames(prev => ({
                        ...prev,
                        [tabId]: displayName
                    }));
                }
            });

            // Check for custom tabs (RichTextEditor content)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`customtab_${currentBook}_${chapterKey}_`)) {
                    const tabName = key.replace(`customtab_${currentBook}_${chapterKey}_`, '');
                    const content = localStorage.getItem(key);
                    if (content && content.trim() && content !== 'null') {
                        // Generate tab ID from custom name
                        const customTabId = tabName.toLowerCase().replace(/\s+/g, '');
                        if (!existingTabs.includes(customTabId)) {
                            existingTabs.push(customTabId);
                            // Store custom name mapping
                            setTabNames(prev => ({
                                ...prev,
                                [customTabId]: tabName
                            }));
                        }
                    }
                }
            }

            return existingTabs;
        };

        // Restore existing template tabs
        const existingTemplateTabs = detectExistingTemplates();
        if (existingTemplateTabs.length > 2) { // More than just 'read' and 'highlights'
            setActiveTabs(existingTemplateTabs);
        }
    }, [currentBook, currentChapter]);

    // Initialize TabPersistenceManager when user is authenticated
    useEffect(() => {
        if (userState.isAuthenticated && userState.user?.id) {
            const initializeTabManager = async () => {
                try {
                    await tabPersistenceManager.initialize(userState.user!.id);
                    console.log('TabPersistenceManager initialized for user:', userState.user!.id);
                } catch (error) {
                    console.error('Failed to initialize TabPersistenceManager:', error);
                }
            };
            initializeTabManager();
        }
    }, [userState.isAuthenticated, userState.user?.id]);

    // Tab persistence integration
    useEffect(() => {
        if (!currentBook || !currentChapter || !userState.isAuthenticated || isTabsLoaded) return;

        const loadPersistedTabs = async () => {
            try {
                const chapterTabs = tabPersistenceManager.getChapterTabs(currentChapter, currentBook);
                
                if (chapterTabs && chapterTabs.tabs.length > 0) {
                    // Convert persisted tabs to current format
                    const tabIds = chapterTabs.tabs.map(tab => tab.id);
                    const tabNamesMap: { [key: string]: string } = {};
                    
                    chapterTabs.tabs.forEach(tab => {
                        tabNamesMap[tab.id] = tab.title;
                    });

                    setActiveTabs(tabIds);
                    setTabNames(tabNamesMap);
                    setActiveTab(chapterTabs.activeTabId || tabIds[0]);
                    console.log('Loaded persisted tabs:', chapterTabs);
                }
                setIsTabsLoaded(true);
            } catch (error) {
                console.error('Failed to load persisted tabs:', error);
                setIsTabsLoaded(true);
            }
        };

        loadPersistedTabs();
    }, [currentBook, currentChapter, userState.isAuthenticated, isTabsLoaded]);

    // Save tabs when they change (debounced)
    useEffect(() => {
        if (!currentBook || !currentChapter || !userState.isAuthenticated || !isTabsLoaded) return;

        const saveTabsState = () => {
            try {
                // Convert current tab state to persistence format
                const tabsToSave = activeTabs.map(tabId => ({
                    id: tabId,
                    title: tabNames[tabId] || tabId,
                    type: getTabType(tabId),
                    content: getTabContent(tabId),
                    isActive: tabId === activeTab,
                    lastModified: new Date().toISOString(),
                    chapterId: currentChapter,
                    bookId: currentBook
                }));

                const chapterTabsState = {
                    chapterId: currentChapter,
                    bookId: currentBook,
                    tabs: tabsToSave,
                    activeTabId: activeTab,
                    lastAccessed: new Date().toISOString()
                };

                tabPersistenceManager.saveChapterTabs(chapterTabsState);
                console.log('Saved tabs state:', chapterTabsState);
            } catch (error) {
                console.error('Failed to save tabs state:', error);
            }
        };

        const timeoutId = setTimeout(saveTabsState, 500); // Debounce saves
        return () => clearTimeout(timeoutId);
    }, [activeTabs, activeTab, tabNames, currentBook, currentChapter, userState.isAuthenticated, isTabsLoaded]);

    // Helper functions for tab persistence
    const getTabType = (tabId: string): 'text' | 'mcq' | 'qna' | 'notes' | 'mindmap' | 'flashcards' | 'videos' => {
        if (tabId.startsWith('MCQ_')) return 'mcq';
        if (tabId.startsWith('QA_')) return 'qna';
        if (tabId.startsWith('NOTES_')) return 'notes';
        if (tabId.startsWith('MINDMAP_')) return 'mindmap';
        if (tabId.startsWith('FLASHCARD_')) return 'flashcards';
        if (tabId.startsWith('VIDEOS_')) return 'videos';
        return 'text';
    };

    const getTabContent = (tabId: string): any => {
        // Get content from localStorage based on tab type
        const chapterKey = currentChapter.replace(/\s+/g, '_');
        const type = getTabType(tabId);
        
        switch (type) {
            case 'mcq':
                return JSON.parse(localStorage.getItem(`mcq_${currentBook}_${chapterKey}`) || '[]');
            case 'qna':
                return JSON.parse(localStorage.getItem(`qa_${currentBook}_${chapterKey}`) || '[]');
            case 'notes':
                return localStorage.getItem(`notes_${currentBook}_${chapterKey}`) || '';
            case 'mindmap':
                return JSON.parse(localStorage.getItem(`mindmaps_${currentBook}_${chapterKey}`) || '{}');
            case 'flashcards':
                return JSON.parse(localStorage.getItem(`flashcards_${currentBook}_${chapterKey}`) || '[]');
            case 'videos':
                return JSON.parse(localStorage.getItem(`videos_${currentBook}_${chapterKey}`) || '[]');
            default:
                return localStorage.getItem(`customtab_${currentBook}_${chapterKey}_${tabNames[tabId] || tabId}`) || '';
        }
    };

    const loadCustomSubtopics = async (bookId: string, chapter: string) => {
        // Add a small delay to simulate loading if needed for UX
        const saved = localStorage.getItem(`subtopics_${bookId}_${chapter.replace(/\s+/g, '_')}`);
        if (saved) {
            setCustomSubtopics(JSON.parse(saved));
        }
    };

    const saveCustomSubtopics = (bookId: string, chapter: string, subtopics: SubtopicData[]) => {
        localStorage.setItem(`subtopics_${bookId}_${chapter.replace(/\s+/g, '_')}`, JSON.stringify(subtopics));
        setCustomSubtopics(subtopics);
    };

    const handleAddSubtopic = () => {
        if (!newSubtopicTitle.trim()) return;

        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const newSubtopic: SubtopicData = {
            id: `subtopic_${Date.now()}`,
            title: newSubtopicTitle.trim(),
            content: 'Click edit to add content for this subtopic.',
            images: [],
            videoLinks: []
        };

        const updatedSubtopics = [...customSubtopics, newSubtopic];
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
        
        setNewSubtopicTitle('');
        setShowAddSubtopic(false);
    };

    const handleUpdateSubtopicContent = (subtopicId: string, content: string) => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => 
            sub.id === subtopicId ? { ...sub, content } : sub
        );
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    const handleDeleteSubtopic = (subtopicId: string) => {
        if (confirm('Are you sure you want to delete this subtopic?')) {
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBook = savedBooks.find((book: any) => book.name === currentBook);
            if (!customBook) return;

            const updatedSubtopics = customSubtopics.filter(sub => sub.id !== subtopicId);
            saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
        }
    };

    const handleImageUpload = async (subtopicId: string, file: File) => {
        // Import the asset manager service
        const { SupabaseAssetService } = await import('../services/SupabaseAssetService');
        
        // Get book ID for context
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        try {
            // Upload to cloud storage
            const uploadResult = await SupabaseAssetService.uploadAsset(file, {
                bookId: customBook.id,
                chapterId: currentChapter,
                assetType: 'image'
            });

            if (uploadResult.success && uploadResult.url) {
                // Update subtopic with cloud URL instead of base64
                const updatedSubtopics = customSubtopics.map(sub => 
                    sub.id === subtopicId 
                        ? { ...sub, images: [...sub.images, uploadResult.url!] }
                        : sub
                );
                
                saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
                console.log(`✅ Image uploaded to cloud: ${file.name}`);
            } else {
                throw new Error(uploadResult.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Cloud upload failed, falling back to base64:', error);
            // Fallback to base64 storage
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageBase64 = e.target?.result as string;
                const updatedSubtopics = customSubtopics.map(sub => 
                    sub.id === subtopicId 
                        ? { ...sub, images: [...sub.images, imageBase64] }
                        : sub
                );
                saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
            };
            reader.readAsDataURL(file);
        }
    };

    // Enhanced content update handler for InlineContentEditor
    const handleContentAndImagesUpdate = (subtopicId: string, content: string, images: string[], imageCaptions?: string[]) => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => 
            sub.id === subtopicId 
                ? { ...sub, content, images, imageCaptions: imageCaptions || sub.imageCaptions || [] }
                : sub
        );
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    // Video management functions
    const openVideoModal = (subtopic: string, videoData?: VideoData, mode: 'play' | 'edit' = 'edit') => {
        setCurrentSubtopicForVideo(subtopic);
        setCurrentVideoData(videoData || null);
        setCurrentVideoMode(mode);
        setShowVideoModal(true);
    };

    const handleVideoSave = (videoData: VideoData) => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        // Find the subtopic data
        const subtopicData = customSubtopics.find(sub => sub.title === currentSubtopicForVideo);
        if (!subtopicData) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicData.id) {
                const existingVideos = sub.videoLinks || [];
                const videoIndex = existingVideos.findIndex(v => v.id === videoData.id);
                
                let updatedVideos;
                if (videoIndex >= 0) {
                    // Update existing video
                    updatedVideos = existingVideos.map(v => v.id === videoData.id ? videoData : v);
                } else {
                    // Add new video
                    updatedVideos = [...existingVideos, videoData];
                }
                
                return { ...sub, videoLinks: updatedVideos };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
        setShowVideoModal(false);
        setCurrentVideoData(null);
        setCurrentSubtopicForVideo('');
    };

    const handleVideoDelete = (subtopicId: string, videoId: string) => {
        if (!confirm('Are you sure you want to delete this video?')) return;
        
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicId && sub.videoLinks) {
                return { ...sub, videoLinks: sub.videoLinks.filter(v => v.id !== videoId) };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    const handleImageDelete = (subtopicId: string, imageIndex: number) => {
        if (!confirm('Are you sure you want to delete this image?')) return;
        
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicId) {
                const updatedImages = sub.images.filter((_, index) => index !== imageIndex);
                return { ...sub, images: updatedImages };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    const moveImage = (subtopicId: string, imageIndex: number, direction: 'up' | 'down') => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicId) {
                const images = [...sub.images];
                const newIndex = direction === 'up' ? imageIndex - 1 : imageIndex + 1;
                
                if (newIndex >= 0 && newIndex < images.length) {
                    [images[imageIndex], images[newIndex]] = [images[newIndex], images[imageIndex]];
                }
                
                return { ...sub, images };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    // Determine unit number based on chapter name/position
    const getUnitNumber = (book: string, chapter: string): number => {
        if (!chapterSubtopics[book]) return 1;
        const chapters = Object.keys(chapterSubtopics[book]);
        const chapterIndex = chapters.findIndex(ch => ch === chapter);
        return chapterIndex >= 0 ? chapterIndex + 1 : 1;
    };

    const currentUnitNumber = getUnitNumber(currentBook, currentChapter);

    // Sample content for legacy subtopics
    const subtopicContent: Record<string, string> = {
        'What is Object-Oriented Design?': `Object-Oriented Design (OOD) is a software design methodology that organizes software design around data, or objects, rather than functions and logic. An object can be defined as a data field that has unique attributes and behavior.

Object-oriented design is the process of planning a system of interacting objects for the purpose of solving a software problem. It's one approach to software design, and it's particularly useful for modeling complex systems where objects interact with each other.

Key principles of OOD include:
1. **Encapsulation**: Bundling data and methods that work on that data within one unit
2. **Inheritance**: Mechanism where you can derive a class from another class for a hierarchy of classes
3. **Polymorphism**: Ability of different classes to be treated as instances of the same class through a common interface
4. **Abstraction**: Hiding complex implementation details while showing only essential features

These principles help create more maintainable, scalable, and reusable code.`,

        'Benefits of OOD': `Object-Oriented Design offers numerous advantages that make it a popular choice for software development:

**1. Modularity and Reusability**
Code is organized into discrete objects that can be reused across different parts of the application or even in different projects. This reduces development time and maintains consistency.

**2. Maintainability**
Changes to one part of the system are less likely to affect other parts due to encapsulation. This makes debugging and updating easier.

**3. Scalability**
New features can be added by creating new objects or extending existing ones without modifying the entire system architecture.

**4. Real-world Modeling**
OOD naturally maps to real-world entities, making the code more intuitive and easier to understand for developers.

**5. Code Organization**
Related data and functions are grouped together, making the codebase more organized and easier to navigate.

**6. Team Development**
Different team members can work on different classes simultaneously without conflicts, improving development efficiency.`,

        'Object-Oriented vs Procedural Programming': `The fundamental difference between Object-Oriented Programming (OOP) and Procedural Programming lies in their approach to organizing and structuring code.

**Procedural Programming:**
- Follows a top-down approach
- Code is organized as a sequence of functions or procedures
- Data and functions are separate entities
- Global data can be accessed by any function
- Examples: C, Pascal, FORTRAN

**Object-Oriented Programming:**
- Follows a bottom-up approach
- Code is organized around objects that contain both data and methods
- Data and functions are encapsulated within objects
- Data is protected and accessed through methods
- Examples: Java, C++, Python, C#

**Key Differences:**

| Aspect | Procedural | Object-Oriented |
|--------|------------|-----------------|
| Structure | Functions and procedures | Classes and objects |
| Data Security | Less secure (global data) | More secure (encapsulation) |
| Code Reusability | Limited | High (inheritance) |
| Problem Solving | Divide and conquer | Real-world modeling |
| Maintenance | Difficult for large systems | Easier due to modularity |

**When to Use Each:**
- Procedural: Simple, linear problems with clear step-by-step solutions
- Object-Oriented: Complex systems with multiple interacting components`,

        'History of OOP': `The evolution of Object-Oriented Programming spans several decades, with contributions from many brilliant computer scientists.

**1960s - Early Concepts:**
The concept of objects and classes was first introduced in Simula, developed by Ole-Johan Dahl and Kristen Nygaard in Norway. Simula is considered the first object-oriented programming language.

**1970s - Smalltalk Revolution:**
Alan Kay and his team at Xerox PARC developed Smalltalk, which refined and popularized OOP concepts. Kay coined the term "object-oriented programming" and established many principles we use today.

**1980s - Commercial Adoption:**
- C++ was developed by Bjarne Stroustrup, bringing OOP to the widely-used C language
- Object-oriented design methodologies began to emerge
- The first commercial OOP tools and frameworks appeared

**1990s - Mainstream Success:**
- Java was released by Sun Microsystems, making OOP more accessible
- Design patterns were formalized by the "Gang of Four"
- UML (Unified Modeling Language) was standardized for OO design

**2000s-Present - Modern Evolution:**
- Languages like C# and Python gained popularity
- Advanced OOP concepts like generics and reflection became common
- Integration with other paradigms (functional programming) emerged

The history shows how OOP evolved from academic research to become the dominant programming paradigm for large-scale software development.`,

        'UML Introduction': `The Unified Modeling Language (UML) is a standardized modeling language consisting of an integrated set of diagrams, developed to help system and software developers specify, visualize, construct, and document the artifacts of software systems.

**What is UML?**
UML provides a standard way to visualize the design of a system. It's not a programming language but a visual language for modeling software systems. Think of it as the "blueprint" language for software.

**Why Use UML?**
1. **Communication**: Provides a common vocabulary for developers, analysts, and stakeholders
2. **Documentation**: Creates comprehensive system documentation
3. **Design**: Helps in planning and designing system architecture
4. **Analysis**: Assists in understanding existing systems

**Main Types of UML Diagrams:**

**Structural Diagrams:**
- Class Diagram: Shows classes and relationships
- Object Diagram: Shows instances of classes
- Component Diagram: Shows system components
- Deployment Diagram: Shows hardware/software mapping

**Behavioral Diagrams:**
- Use Case Diagram: Shows system functionality
- Activity Diagram: Shows workflow
- Sequence Diagram: Shows object interactions over time
- State Diagram: Shows object state changes

**Benefits:**
- Standardized notation understood worldwide
- Helps identify potential issues early in design
- Facilitates team communication
- Provides multiple views of the same system
- Tool support for automatic code generation

UML is essential for large-scale software projects where clear communication and documentation are crucial.`
    };

    const toggleSubtopic = (subtopic: string) => {
        setExpandedSubtopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subtopic)) {
                newSet.delete(subtopic);
            } else {
                newSet.add(subtopic);
            }
            return newSet;
        });
    };

    const handleSubtopicExplain = (subtopic: string) => {
        openAIGuru(`Explain "${subtopic}" from ${currentChapter} chapter of ${currentBook} subject in detail.`);
    };

    // Handle AI explanation of selected text
    const handleExplainSelectedText = (selectedText: string, context: string) => {
        const prompt = `Explain this specific text: "${selectedText}" 

Context: This is from the "${currentChapter}" chapter of the "${currentBook}" subject.

Surrounding context: "${context}"

Please provide a detailed explanation of the selected text, focusing on:
1. What it means in simple terms
2. Why it's important in this subject
3. How it relates to the broader topic
4. Any examples or real-world applications

Make the explanation educational and easy to understand.`;

        openAIGuru(prompt);
    };

    const handleVideoLink = (subtopic: string) => {
        // Find the subtopic data and get first video
        const subtopicData = customSubtopics.find(sub => sub.title === subtopic);
        if (subtopicData && subtopicData.videoLinks && subtopicData.videoLinks.length > 0) {
            // Play the first video
            const firstVideo = subtopicData.videoLinks[0];
            openVideoModal(subtopic, firstVideo, 'play');
        } else {
            // No videos found, show message
            alert(`No videos available for "${subtopic}". Use "Edit Video" to add videos.`);
        }
    };
    
    const handleEditVideo = (subtopic: string) => {
        // Find existing video data for this subtopic
        const subtopicData = customSubtopics.find(sub => sub.title === subtopic);
        const existingVideo = subtopicData?.videoLinks && subtopicData.videoLinks.length > 0 
            ? subtopicData.videoLinks[0] // Get the first video for editing
            : null;
        
        // Open the modal with existing video data (if any) in edit mode
        openVideoModal(subtopic, existingVideo, 'edit');
    };

    // Template and tab management functions
    const handleAddTemplateTab = (templateName: string) => {
        const templateId = TEMPLATE_IDS[templateName as keyof typeof TEMPLATE_IDS];
        if (!templateId) {
            console.error(`Unknown template: ${templateName}`);
            return;
        }
        
        let counter = 1;
        let tabId = `${templateId}_${counter}`;
        
        // Find next available counter for this template type
        while (activeTabs.includes(tabId)) {
            counter++;
            tabId = `${templateId}_${counter}`;
        }
        
        setActiveTabs([...activeTabs, tabId]);
        
        // Set display name with counter if > 1
        setTabNames(prev => ({
            ...prev,
            [tabId]: counter > 1 ? `${templateName} ${counter}` : templateName
        }));
        
        setActiveTab(tabId);
        setShowTemplateSelector(false);
    };

    const handleAddCustomTab = () => {
        if (newTabName.trim()) {
            const baseId = newTabName.trim().toLowerCase().replace(/\s+/g, '');
            let tabId = baseId;
            let counter = 1;
            
            while (activeTabs.includes(tabId)) {
                counter++;
                tabId = `${baseId}${counter}`;
            }
            
            setActiveTabs([...activeTabs, tabId]);
            setTabNames(prev => ({
                ...prev,
                [tabId]: newTabName.trim()
            }));
            setActiveTab(tabId);
            setNewTabName('');
            setShowAddTab(false);
        }
    };

    const handleDeleteTab = (tabName: string) => {
        // Prevent deletion of core tabs
        if (tabName === 'read' || tabName === 'highlights') {
            alert('Cannot delete core tabs (Read, Highlights)');
            return;
        }
        
        if (confirm(`Are you sure you want to delete the "${getTabDisplayName(tabName)}" tab?`)) {
            setActiveTabs(activeTabs.filter(tab => tab !== tabName));
            
            // Remove custom name if exists
            const newTabNames = { ...tabNames };
            delete newTabNames[tabName];
            setTabNames(newTabNames);
            
            // Clear localStorage data for this specific tab instance
            if (currentBook && currentChapter) {
                const chapterKey = currentChapter.replace(/\s+/g, '_');
                
                // Get the template ID from the tab name
                const getTemplateIdFromTab = (tabName: string): string | null => {
                    // Handle template IDs with numbers (e.g., "FLASHCARD_1", "MCQ_2")
                    if (tabName.includes('_')) {
                        const baseId = tabName.split('_')[0];
                        return baseId;
                    }
                    return null;
                };
                
                const templateId = getTemplateIdFromTab(tabName);
                
                // Clear tab-specific data using the new tab ID isolation system
                if (templateId) {
                    const templateStorageMappings: { [key: string]: string } = {
                        'FLASHCARD': `flashcards_${currentBook}_${chapterKey}_${tabName}`,
                        'MCQ': `mcq_${currentBook}_${chapterKey}_${tabName}`,
                        'QA': `qa_${currentBook}_${chapterKey}_${tabName}`,
                        'VIDEOS': `videos_${currentBook}_${chapterKey}_${tabName}`,
                        'NOTES': `notes_${currentBook}_${chapterKey}_${tabName}`,
                        'MINDMAP': `mindmaps_${currentBook}_${chapterKey}_${tabName}`
                    };
                    
                    const storageKey = templateStorageMappings[templateId];
                    if (storageKey) {
                        localStorage.removeItem(storageKey);
                        console.log(`Cleared tab-specific localStorage key: ${storageKey}`);
                    }
                } else {
                    // Handle custom tabs
                    const displayName = getTabDisplayName(tabName);
                    const customTabKey = `customtab_${currentBook}_${chapterKey}_${displayName}`;
                    const originalCustomTabKey = `customtab_${currentBook}_${chapterKey}_${tabName}`;
                    
                    localStorage.removeItem(customTabKey);
                    localStorage.removeItem(originalCustomTabKey);
                    console.log(`Cleared custom tab keys: ${customTabKey}, ${originalCustomTabKey}`);
                }
            }
            
            if (activeTab === tabName) {
                setActiveTab('read'); // Switch back to read tab
            }
        }
    };

    const handleRenameTab = (tabName: string) => {
        if (renameValue.trim()) {
            setTabNames(prev => ({
                ...prev,
                [tabName]: renameValue.trim()
            }));
        }
        setShowRenameInput(null);
        setRenameValue('');
    };

    const startRename = (tabName: string) => {
        setShowRenameInput(tabName);
        setRenameValue(getTabDisplayName(tabName));
    };

    // Manage tab functions
    const handleManageTab = (tabName: string) => {
        setManagingTab(tabName);
        setShowManageDropdown(true);
    };

    const handleSvgEdit = (tabName: string) => {
        setManagingTab(tabName);
        setCustomSvgCode(tabSvgs[tabName] || '');
        setShowSvgEditor(true);
        setShowManageDropdown(false);
    };

    // Intelligent SVG processor to standardize size and clean up
    const processSvgCode = (svgCode: string): string => {
        let processed = svgCode.trim();
        
        // Remove any text nodes outside of SVG elements more aggressively
        processed = processed.replace(/^[^<]*<svg/, '<svg');
        processed = processed.replace(/<\/svg>[^>]*$/, '</svg>');
        
        // Ensure it starts with <svg and ends with </svg>
        if (!processed.startsWith('<svg')) {
            return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>`; // Return a simple placeholder if not valid SVG
        }
        
        // Remove all existing size-related attributes and classes
        processed = processed.replace(/class\s*=\s*["'][^"']*["']/g, '');
        processed = processed.replace(/className\s*=\s*["'][^"']*["']/g, '');
        processed = processed.replace(/width\s*=\s*["'][^"']*["']/g, '');
        processed = processed.replace(/height\s*=\s*["'][^"']*["']/g, '');
        processed = processed.replace(/style\s*=\s*["'][^"']*["']/g, '');
        
        // Remove text elements and tspan elements that might contain unwanted text
        processed = processed.replace(/<text[^>]*>.*?<\/text>/gi, '');
        processed = processed.replace(/<tspan[^>]*>.*?<\/tspan>/gi, '');
        
        // Standardize the opening svg tag with our required attributes
        processed = processed.replace(/<svg[^>]*>/i, '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">');
        
        // Ensure we have the correct viewBox (normalize common variations)
        processed = processed.replace(/viewBox\s*=\s*["'][^"']*["']/g, 'viewBox="0 0 24 24"');
        
        // Clean up multiple spaces and normalize formatting
        processed = processed.replace(/\s+/g, ' ').trim();
        
        // Remove any remaining text content between tags (but preserve path data)
        processed = processed.replace(/>([^<]+)</g, (match, text) => {
            // Only remove text that doesn't look like path data or numbers
            if (/^[\s\d\.\-MmLlHhVvCcSsQqTtAaZz\s,]+$/.test(text)) {
                return match; // Keep path data
            }
            return '><'; // Remove other text
        });
        
        return processed;
    };

    // AI-powered SVG generation function with better model
    // Fetch available models from Groq
    const fetchAvailableModels = async () => {
        try {
            const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!groqApiKey) {
                console.warn('⚠️ VITE_GROQ_API_KEY not found in environment variables');
                return;
            }

            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const models = data.data
                    .map((model: any) => model.id)
                    .filter((id: string) => 
                        id.includes('llama') || 
                        id.includes('mixtral') || 
                        id.includes('gemma') ||
                        id.includes('groq')
                    )
                    .sort();
                
                setAvailableModels(models);
                console.log('📋 Available Groq models:', models);
            } else {
                console.warn('⚠️ Failed to fetch models:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch Groq models, using defaults:', error);
        }
    };

    // Load available models on mount
    useEffect(() => {
        console.log('🔑 Environment check:', {
            hasGroqKey: !!import.meta.env.VITE_GROQ_API_KEY,
            keyPreview: import.meta.env.VITE_GROQ_API_KEY ? 
                `${import.meta.env.VITE_GROQ_API_KEY.substring(0, 8)}...${import.meta.env.VITE_GROQ_API_KEY.substring(-8)}` : 
                'Not found'
        });
        fetchAvailableModels();
    }, []);

    const generateAISvg = async (prompt: string): Promise<string> => {
        try {
            // Use Groq with kimi-k2-instruct model
            const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!groqApiKey) {
                throw new Error('Groq API key is not configured');
            }

            console.log(`🤖 Generating SVG with Groq (Kimi K2)`);
            console.log(`📝 User prompt: "${prompt}"`);

            const systemPrompt = `You are an expert SVG icon designer. Generate clean, minimal SVG icons based on user descriptions.

CRITICAL REQUIREMENTS:
1. ONLY output valid SVG code - nothing else
2. Use class="w-5 h-5" for size (exactly this format)
3. Use stroke="currentColor" and fill="none" for theme compatibility
4. Set stroke-width="2" for consistency
5. Use viewBox="0 0 24 24" for proper scaling
6. Create simple, recognizable icons with clean lines
7. Avoid complex details - keep it minimal and scalable
8. Use stroke-linecap="round" stroke-linejoin="round" for smooth lines

EXAMPLES OF GOOD SVG FORMAT:
- Book: <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
- Calculator: <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>

Focus on the CORE VISUAL CONCEPT. Make it instantly recognizable.`;

            const userPrompt = `Create an SVG icon for: ${prompt}

Remember: Output ONLY the SVG code, nothing else. Make it clean, minimal, and professional.`;

            // Use Groq SDK
            const groq = new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true });

            const response = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'moonshotai/kimi-k2-instruct',
                temperature: 0.3,
                max_tokens: 500
            });

            const generatedSvg = response.choices[0]?.message?.content || '';

            // Comment out GitHub Models code for fallback
            /*
            const githubToken = import.meta.env.VITE_GITHUB_MODELS_TOKEN;
            if (!githubToken) {
                throw new Error('GitHub Models API token is not configured');
            }
            const generatedSvg = await generateAIGuruResponse(userPrompt, systemPrompt);
            */

            if (!generatedSvg) {
                throw new Error('No SVG generated by AI');
            }

            console.log('🔄 Raw AI response:', generatedSvg);

            // Clean and validate the generated SVG
            let cleanSvg = generatedSvg;
            
            // Remove any markdown code blocks
            cleanSvg = cleanSvg.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
            
            // Remove extra text before and after SVG
            const svgStart = cleanSvg.indexOf('<svg');
            const svgEnd = cleanSvg.lastIndexOf('</svg>') + 6;
            if (svgStart >= 0 && svgEnd > svgStart) {
                cleanSvg = cleanSvg.substring(svgStart, svgEnd);
            }
            
            // Ensure it has proper SVG structure
            if (!cleanSvg.includes('<svg') || !cleanSvg.includes('</svg>')) {
                throw new Error('Generated content is not a valid SVG');
            }

            // Ensure proper attributes
            if (!cleanSvg.includes('class="w-5 h-5"')) {
                cleanSvg = cleanSvg.replace(/<svg[^>]*>/, '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">');
            }

            console.log('✅ AI-generated SVG:', cleanSvg);
            return cleanSvg;

            /* GROQ FALLBACK - COMMENTED FOR NOW
            } catch (githubError) {
                console.warn('GitHub Models failed, trying Groq fallback:', githubError);
                
                const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
                if (!groqApiKey) {
                    throw new Error('Both GitHub Models and Groq API keys are not configured');
                }

                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: selectedAiModel,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        max_tokens: 1000,
                        temperature: 0.3,
                        top_p: 0.9,
                        presence_penalty: 0.1,
                        frequency_penalty: 0.1
                    })
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Groq API error: ${response.status} - ${errorData}`);
                }

                const data = await response.json();
                let generatedSvg = data.choices?.[0]?.message?.content?.trim();

                if (!generatedSvg) {
                    throw new Error('No SVG generated by AI');
                }

                console.log('🔄 Raw AI response:', generatedSvg);
                // ... rest of SVG processing
            */

        } catch (error) {
            console.error('❌ AI SVG generation failed:', error);
            throw error; // Re-throw to handle in UI
        }
    };

    // Handle AI SVG generation with preview
    const handleGenerateAISvg = async () => {
        if (!customSvgCode.trim()) return;
        
        setIsGeneratingAI(true);
        setSvgGenerationStep('preview');
        
        try {
            const generatedSvg = await generateAISvg(customSvgCode);
            setAiSvgPreview(generatedSvg);
        } catch (error) {
            console.error('❌ AI SVG generation failed:', error);
            
            // Show fallback based on prompt keywords
            const prompt_lower = customSvgCode.toLowerCase();
            let fallbackSvg = '';
            
            if (prompt_lower.includes('book') || prompt_lower.includes('read')) {
                fallbackSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>';
            } else if (prompt_lower.includes('note') || prompt_lower.includes('write')) {
                fallbackSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>';
            } else if (prompt_lower.includes('graduation') || prompt_lower.includes('education') || prompt_lower.includes('cap')) {
                fallbackSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 14V8" /></svg>';
            } else {
                fallbackSvg = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>';
            }
            
            setAiSvgPreview(fallbackSvg);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Handle saving the AI generated SVG
    const handleSaveAISvg = async () => {
        if (managingTab && aiSvgPreview) {
            try {
                // Update the tab SVG
                setTabSvgs(prev => ({
                    ...prev,
                    [managingTab]: aiSvgPreview
                }));
                
                // Save to localStorage
                localStorage.setItem('tabCustomSvgs', JSON.stringify({
                    ...tabSvgs,
                    [managingTab]: aiSvgPreview
                }));
                
                console.log('✅ SVG icon updated successfully!');
                
                // Reset and close editor
                setSvgGenerationStep('saved');
                setTimeout(() => {
                    setShowSvgEditor(false);
                    setManagingTab(null);
                    setCustomSvgCode('');
                    setAiSvgPreview('');
                    setSvgGenerationStep('input');
                }, 1000);
                
            } catch (error) {
                console.error('❌ Failed to save SVG:', error);
                alert('Failed to save SVG. Please try again.');
            }
        }
    };

    const handleSaveSvg = async () => {
        if (managingTab && customSvgCode.trim()) {
            setIsSaving(true);
            try {
                let processedSvg: string;
                
                // If the input looks like a natural language description, use AI generation
                if (!customSvgCode.trim().startsWith('<svg') && !customSvgCode.trim().includes('</svg>')) {
                    console.log('🤖 Generating AI SVG for prompt:', customSvgCode);
                    processedSvg = await generateAISvg(customSvgCode);
                } else {
                    // Process existing SVG code
                    processedSvg = processSvgCode(customSvgCode);
                }
                
                // Update the tab SVG
                setTabSvgs(prev => ({
                    ...prev,
                    [managingTab]: processedSvg
                }));
                
                // Save to localStorage
                localStorage.setItem('tabCustomSvgs', JSON.stringify({
                    ...tabSvgs,
                    [managingTab]: processedSvg
                }));
                
                // Clear the editor state
                setShowSvgEditor(false);
                setManagingTab(null);
                setCustomSvgCode('');
                setSvgGenerationStep('input');
                setAiSvgPreview('');
                
                console.log('✅ SVG icon updated successfully!');
            } catch (error) {
                console.error('Error saving SVG:', error);
                alert('Failed to generate or save SVG. Please try again.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const getTabIcon = (tabName: string) => {
        // Return custom SVG if exists
        if (tabSvgs[tabName]) {
            return <div dangerouslySetInnerHTML={{ __html: tabSvgs[tabName] }} />;
        }
        
        // Return default icon
        return getDesktopTabIcon(tabName);
    };

    // Get display name for tabs
    const getTabDisplayName = (tabName: string): string => {
        // Return custom name if exists
        if (tabNames[tabName]) {
            return tabNames[tabName];
        }
        
        const displayNames: { [key: string]: string } = {
            'read': 'Read',
            'highlights': 'Highlights',
            'notes': 'Notes',
            'flashcard': 'Flash Cards',
            'mcq': 'MCQ',
            'q&a': 'Q&A',
            'video': 'Videos',
            'videos': 'Videos',
            'mindmap': 'Mind Maps',
            'general': 'General'
        };
        
        // Handle numbered duplicates
        const baseMatch = tabName.match(/^([a-z]+)(\d+)$/);
        if (baseMatch) {
            const [, baseId, number] = baseMatch;
            const baseName = displayNames[baseId] || baseId;
            return `${baseName} ${number}`;
        }
        
        return displayNames[tabName.toLowerCase()] || tabName;
    };

    // Flash card content renderer
    const renderFlashCardContent = () => {
        return (
            <FlashCardManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                tabId={activeTab}
                className="w-full"
            />
        );
    };

    // MCQ content renderer
    const renderMCQContent = () => {
        return (
            <MCQManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                tabId={activeTab}
                className="w-full"
            />
        );
    };

    // Q&A content renderer
    const renderQAContent = () => {
        return (
            <QAManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                tabId={activeTab}
                className="w-full"
            />
        );
    };

    // Video player handlers
    const handlePlayVideo = (youtubeUrl: string, title: string) => {
        setCurrentVideoData({
            id: Date.now().toString(),
            title: title,
            youtubeUrl: youtubeUrl
        });
        setCurrentVideoMode('play');
        setShowVideoModal(true);
    };

    // Mind Map content renderer
    const renderMindMapContent = () => {
        return (
            <MindMapManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                tabId={activeTab}
                className="w-full"
            />
        );
    };

    // Videos content renderer
    const renderVideosContent = () => {
        return (
            <VideosManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                tabId={activeTab}
                className="w-full"
            />
        );
    };

    // Render content based on active tab
    const renderTabContent = () => {
        // Handle core tabs
        if (activeTab === 'read') {
            return renderReadContent(); // Main content
        }
        if (activeTab === 'highlights') {
            return renderHighlightsContent();
        }
        
        // Extract template type for new ID format (e.g., 'MCQ_1' -> 'MCQ')
        const getTemplateType = (tabId: string): string => {
            const match = tabId.match(/^([A-Z]+)_\d+$/);
            return match ? match[1] : tabId.toLowerCase();
        };
        
        const templateType = getTemplateType(activeTab);
        
        // Handle template-based tabs using template type
        switch (templateType) {
            case 'NOTES':
                return renderNotesContent();
            case 'FLASHCARD':
                return renderFlashCardContent();
            case 'MCQ':
                return renderMCQContent();
            case 'QA':
                return renderQAContent();
            case 'MINDMAP':
                return renderMindMapContent();
            case 'VIDEOS':
                return renderVideosContent();
        }
        
        // Handle legacy tab names for backward compatibility
        switch (activeTab.toLowerCase()) {
            case 'notes':
                return renderNotesContent();
            case 'flashcard':
                return renderFlashCardContent();
            case 'mcq':
                return renderMCQContent();
            case 'q&a':
                return renderQAContent();
            case 'mindmap':
                return renderMindMapContent();
            case 'videos':
                return renderVideosContent();
            default:
                // Handle custom tabs
                return renderCustomTabContent(activeTab);
        }
    };

    const renderReadContent = () => {
        // Show loading state for custom chapters that are still loading
        if (isCustomChapter && isLoadingSubtopics) {
            return (
                <div className="text-center py-12">
                    <div className="w-8 h-8 mx-auto mb-4 animate-spin">
                        <div className="w-full h-full border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
                    </div>
                    <h3 className="text-lg font-medium theme-text mb-2">Loading content...</h3>
                    <p className="theme-text-secondary">Please wait while we load your chapter content</p>
                </div>
            );
        }

        // This will contain the existing subtopic content
        return (
            <div>
                {/* Add Subtopic Button */}
                {isCustomChapter && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowAddSubtopic(!showAddSubtopic)}
                            className="px-3 py-2 text-sm theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                        >
                            {showAddSubtopic ? 'Cancel' : '+ Add Subtopic'}
                        </button>
                    </div>
                )}

                {/* Add Subtopic Form */}
                {isCustomChapter && showAddSubtopic && (
                    <div className="mb-6 card p-4 sm:p-6">
                        <h3 className="text-lg font-semibold theme-text mb-4">Add New Subtopic</h3>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium theme-text mb-2">Subtopic Title</label>
                                <input
                                    type="text"
                                    value={newSubtopicTitle}
                                    onChange={(e) => setNewSubtopicTitle(e.target.value)}
                                    placeholder="e.g., Introduction to React Components"
                                    className="w-full px-3 py-2 theme-surface border border-gray-300 rounded-lg theme-text"
                                />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setShowAddSubtopic(false)}
                                    className="flex-1 sm:flex-none px-3 py-2 text-sm text-gray-600 hover:text-gray-800 theme-transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddSubtopic}
                                    className="flex-1 sm:flex-none px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                >
                                    Add Subtopic
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subtopics - Expandable with individual content */}
                {allSubtopics.length > 0 && (
                    <div className="mb-8">
                        {!isCustomChapter && (
                            <h2 className="text-lg font-semibold theme-text mb-4">
                                Chapter Topics ({allSubtopics.length})
                            </h2>
                        )}
                        <div className="space-y-4">
                            {allSubtopics.map((subtopic, index) => {
                                const subtopicData = isCustomChapter 
                                    ? customSubtopics.find(sub => sub.title === subtopic)
                                    : null;

                                return (
                                    <div key={index} className="theme-transition">
                                        {/* Subtopic Header */}
                                        <div className="theme-surface rounded-lg overflow-hidden theme-transition">
                                            <div 
                                                className="p-4 cursor-pointer hover:theme-surface2 theme-transition"
                                                onClick={() => toggleSubtopic(subtopic)}
                                            >
                                                {/* Desktop Layout - Title and Buttons in Same Row */}
                                                <div className="hidden sm:flex items-center justify-between">
                                                    <h3 className="font-semibold theme-text text-base sm:text-lg">
                                                        {currentUnitNumber}.{index + 1} {subtopic}
                                                    </h3>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSubtopicExplain(subtopic);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 theme-transition"
                                                        >
                                                            Explain
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleVideoLink(subtopic);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 theme-transition"
                                                        >
                                                            Video
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditVideo(subtopic);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 theme-transition"
                                                        >
                                                            Edit Video
                                                        </button>
                                                        {/* Edit and Delete buttons for custom subtopics */}
                                                        {isCustomChapter && subtopicData && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingSubtopic(editingSubtopic === subtopicData.id ? null : subtopicData.id);
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition"
                                                                >
                                                                    {editingSubtopic === subtopicData.id ? 'Cancel' : 'Edit'}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSubtopic(subtopicData.id);
                                                                    }}
                                                                    className="p-1 text-red-600 hover:text-red-800 theme-transition"
                                                                >
                                                                    <TrashIcon />
                                                                </button>
                                                            </>
                                                        )}
                                                        <svg 
                                                            className={`w-5 h-5 theme-text-secondary transition-transform ${expandedSubtopics.has(subtopic) ? 'rotate-180' : ''}`} 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Mobile Layout - Title and Buttons in Separate Rows */}
                                                <div className="sm:hidden">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="font-semibold theme-text text-sm sm:text-base pr-2">
                                                            {currentUnitNumber}.{index + 1} {subtopic}
                                                        </h3>
                                                        <svg 
                                                            className={`w-5 h-5 theme-text-secondary transition-transform flex-shrink-0 ${expandedSubtopics.has(subtopic) ? 'rotate-180' : ''}`} 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                    {/* Action buttons in separate compact row */}
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSubtopicExplain(subtopic);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 theme-transition"
                                                        >
                                                            💡 Explain
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleVideoLink(subtopic);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 theme-transition"
                                                        >
                                                            🎥 Video
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditVideo(subtopic);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 theme-transition"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        {/* Edit and Delete buttons for custom subtopics */}
                                                        {isCustomChapter && subtopicData && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingSubtopic(editingSubtopic === subtopicData.id ? null : subtopicData.id);
                                                                    }}
                                                                    className="px-2 py-1 text-xs font-medium rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition"
                                                                >
                                                                    {editingSubtopic === subtopicData.id ? '❌ Cancel' : '✏️ Edit'}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSubtopic(subtopicData.id);
                                                                    }}
                                                                    className="px-2 py-1 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 theme-transition"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Content Section */}
                                        {expandedSubtopics.has(subtopic) && (
                                            <div className="mt-6 mb-8 px-0">
                                                {/* Enhanced Inline Content Editor for Custom Subtopics */}
                                                {isCustomChapter && subtopicData && editingSubtopic === subtopicData.id && (
                                                    <InlineContentEditor
                                                        subtopicId={subtopicData.id}
                                                        initialContent={subtopicData.content}
                                                        images={subtopicData.images}
                                                        imageCaptions={subtopicData.imageCaptions || []}
                                                        onContentUpdate={(content, images, imageCaptions) => 
                                                            handleContentAndImagesUpdate(subtopicData.id, content, images, imageCaptions)
                                                        }
                                                        onImageUpload={(subtopicId, file) => handleImageUpload(subtopicId, file)}
                                                        className="max-w-none"
                                                        isEditing={true}
                                                    />
                                                )}

                                                {/* Display Mode for Custom Subtopics when not editing */}
                                                {isCustomChapter && subtopicData && editingSubtopic !== subtopicData.id && (
                                                    <InlineContentEditor
                                                        subtopicId={subtopicData.id}
                                                        initialContent={subtopicData.content}
                                                        images={subtopicData.images}
                                                        imageCaptions={subtopicData.imageCaptions || []}
                                                        onContentUpdate={(content, images, imageCaptions) => 
                                                            handleContentAndImagesUpdate(subtopicData.id, content, images, imageCaptions)
                                                        }
                                                        onImageUpload={(subtopicId, file) => handleImageUpload(subtopicId, file)}
                                                        className="max-w-none"
                                                        isEditing={false}
                                                        highlights={highlights.filter(h => h.chapterId === currentBook)}
                                                        currentBook={currentBook}
                                                        onHighlight={(text: string, color: string) => {
                                                            addHighlight({
                                                                text,
                                                                color,
                                                                chapterId: currentBook
                                                            });
                                                        }}
                                                        onRemoveHighlight={removeHighlight}
                                                        onExplainWithAI={handleExplainSelectedText}
                                                    />
                                                )}

                                                {/* Static Content for Legacy Subtopics */}
                                                {!isCustomChapter && (
                                                    <div 
                                                        className="prose prose-sm sm:prose-base lg:prose-lg max-w-none theme-text"
                                                        style={{ width: '100%' }}
                                                    >
                                                        <KindleStyleTextViewer
                                                            content={subtopicContent[subtopic] || 'Content for this subtopic will be added soon. Click the Explain button above for an AI explanation.'}
                                                            highlights={highlights.filter(h => h.chapterId === currentBook)}
                                                            currentBook={currentBook}
                                                            onHighlight={(text: string, color: string) => {
                                                                addHighlight({
                                                                    text,
                                                                    color,
                                                                    chapterId: currentBook
                                                                });
                                                            }}
                                                            onRemoveHighlight={removeHighlight}
                                                            className="subtopic-content-enhanced"
                                                            onExplainWithAI={handleExplainSelectedText}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State for Custom Chapters */}
                {isCustomChapter && customSubtopics.length === 0 && !isLoadingSubtopics && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No subtopics yet</h3>
                        <p className="theme-text-secondary mb-6">Click "Add Subtopic" to get started with your content</p>
                    </div>
                )}

                {/* Empty State for Regular Chapters with no subtopics */}
                {!isCustomChapter && allSubtopics.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No content available</h3>
                        <p className="theme-text-secondary">This chapter doesn't have any subtopics yet</p>
                    </div>
                )}
            </div>
        );
    };

    const renderHighlightsContent = () => {
        const currentHighlights = highlights.filter(h => h.chapterId === currentBook);
        
        return (
            <div className="theme-surface rounded-lg p-3 sm:p-6 mx-1 sm:mx-0">
                {/* Mobile-First Header */}
                <div className="mb-4 sm:mb-6">
                    {/* Mobile Header */}
                    <div className="block sm:hidden">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold theme-text">Highlights</h2>
                            <span className="text-xs theme-text-secondary px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                                {currentHighlights.length}
                            </span>
                        </div>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden sm:flex items-center justify-between">
                        <h2 className="text-lg font-semibold theme-text">Highlights & Notes</h2>
                        <span className="text-sm theme-text-secondary">
                            {currentHighlights.length} highlight{currentHighlights.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                
                {currentHighlights.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-base sm:text-lg font-medium theme-text mb-2">No highlights yet</h3>
                        <p className="text-sm theme-text-secondary px-4">
                            Select text in any tab to create highlights and they'll appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {currentHighlights.map((highlight) => (
                            <div key={highlight.id} className="border theme-border rounded-lg p-3 sm:p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span 
                                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: highlight.color }}
                                            ></span>
                                            <span className="text-xs theme-text-secondary">
                                                {new Date(highlight.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="theme-text leading-relaxed text-sm sm:text-base">
                                            "{highlight.text}"
                                        </p>
                                    </div>
                                    
                                    {/* Mobile Action Buttons */}
                                    <div className="flex sm:hidden flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(highlight.text);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg theme-surface2 text-sm hover:theme-accent hover:text-white transition-all"
                                            title="Copy"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => openAIGuru(highlight.text)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg theme-surface2 text-sm hover:theme-accent hover:text-white transition-all"
                                            title="AI Explain"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => removeHighlight(highlight.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg theme-surface2 text-sm hover:bg-red-500 hover:text-white transition-all"
                                            title="Delete"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Desktop Action Buttons */}
                                    <div className="hidden sm:flex gap-2 ml-4">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(highlight.text);
                                            }}
                                            className="text-sm btn-secondary"
                                            title="Copy highlight"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={() => openAIGuru(highlight.text)}
                                            className="text-sm btn-secondary"
                                            title="Explain with AI"
                                        >
                                            🎓
                                        </button>
                                        <button
                                            onClick={() => removeHighlight(highlight.id)}
                                            className="text-sm btn-secondary hover:bg-red-500 hover:text-white"
                                            title="Remove highlight"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderNotesContent = () => {
        return (
            <NotesManager
                currentBook={currentBook}
                currentChapter={currentChapter}
                tabId={activeTab}
                className="h-full"
            />
        );
    };

    // Custom Tab with Editor Switching Component - MOVED OUTSIDE TO FIX HOOKS ISSUE
    // See CustomTabWithEditorSwitching component defined outside of this component
    
    // Placeholder for the inline component (now moved outside)
    const renderCustomTabWithEditorSwitching = (tabName: string, currentBook: string, currentChapter: string) => {
        return (
            <CustomTabWithEditorSwitching 
                tabName={tabName} 
                currentBook={currentBook} 
                currentChapter={currentChapter} 
            />
        );
    };

    const renderCustomTabContent = (tabName: string) => {
        // Extract template type from new ID format (e.g., 'MCQ_1' -> 'MCQ')
        const getTemplateType = (tabId: string): string => {
            const match = tabId.match(/^([A-Z]+)_\d+$/);
            return match ? match[1] : tabId.toLowerCase();
        };
        
        const templateType = getTemplateType(tabName);
        
        // Handle template-based tabs using template type
        switch (templateType) {
            case 'NOTES':
                return (
                    <NotesManager
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                        className="w-full"
                    />
                );
                
            case 'FLASHCARD':
                return (
                    <FlashCardManager
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                        className="w-full"
                    />
                );
                
            case 'MCQ':
                return (
                    <MCQManager
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                        className="w-full"
                    />
                );
                
            case 'QA':
                return (
                    <QAManager
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                        className="w-full"
                    />
                );
                
            case 'VIDEOS':
                return (
                    <VideosManager
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                        className="w-full"
                    />
                );
                
            case 'MINDMAP':
                return (
                    <MindMapManager
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                    />
                );
        }
        
        // Handle legacy tab names for backward compatibility
        if (tabName === 'Mind Map' || tabName === 'mindmap') {
            return (
                <MindMapManager
                    currentBook={currentBook}
                    currentChapter={currentChapter}
                />
            );
        }
        
        // Handle all custom tabs with editor switching functionality (Rich Text <-> HTML Code Editor)
        // This applies to ALL custom tabs created through the custom tab option
        return (
            <CustomTabWithEditorSwitching
                tabName={tabName}
                currentBook={currentBook}
                currentChapter={currentChapter}
            />
        );
    };

    if (!currentBook || !currentChapter) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 theme-bg min-h-screen">
                <div className="text-center py-8">
                    <h1 className="text-xl font-bold mb-4 theme-text">Chapter Not Found</h1>
                    <button 
                        onClick={() => navigate('/')} 
                        className="btn-primary"
                    >
                        Go Back to Bookshelf
                    </button>
                </div>
            </div>
        );
    }

    // Initialize loading state properly for new chapters - MOVED BEFORE EARLY RETURN
    useEffect(() => {
        if (!isCustomChapter && currentSubtopics.length === 0) {
            setIsLoadingSubtopics(false); // Non-custom chapters don't need loading
        }
    }, [isCustomChapter, currentSubtopics]);

    // Combine legacy and custom subtopics for display
    const allSubtopics = isCustomChapter 
        ? customSubtopics.map(sub => sub.title)
        : currentSubtopics;

    // PROGRESSIVE LOADING SCREEN - Show until small files are loaded
    if (isLoadingChapterData && !smallFilesLoaded) {
        return (
            <div className="theme-bg min-h-screen theme-text">
                {/* Header */}
                <header className="sticky top-0 theme-surface backdrop-blur-sm z-10 p-3 sm:p-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <button 
                                onClick={() => navigate(`/subject/${encodeURIComponent(currentBook)}`)}
                                className="p-2 rounded-lg hover:theme-surface2 theme-transition"
                                style={{ minWidth: '44px', minHeight: '44px' }}
                            >
                                <BackIcon />
                            </button>
                            <h1 className="font-semibold text-base sm:text-lg theme-text truncate">
                                {currentChapter}
                            </h1>
                        </div>
                    </div>
                </header>

                {/* Loading Content */}
                <div className="flex items-center justify-center min-h-[60vh] px-4">
                    <div className="text-center max-w-md mx-auto">
                        {/* Animated Loading Spinner */}
                        <div className="relative w-16 h-16 mx-auto mb-6">
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                            <div 
                                className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-spin"
                                style={{ 
                                    borderTopColor: 'transparent',
                                    animation: 'spin 1s linear infinite'
                                }}
                            ></div>
                        </div>
                        
                        {/* Loading Message */}
                        <h2 className="text-lg font-semibold mb-3 theme-text">
                            Loading Chapter Data
                        </h2>
                        <p className="text-sm theme-text opacity-75 mb-4">
                            {loadingMessage}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                            <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${chapterDataProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-xs theme-text opacity-50">
                            {chapterDataProgress}% loaded
                        </p>
                        
                        {/* Loading Details */}
                        <div className="mt-6 text-left theme-surface rounded-lg p-4">
                            <h3 className="text-sm font-medium mb-2 theme-text">Smart Loading Strategy:</h3>
                            <div className="space-y-1 text-xs theme-text opacity-75">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${chapterDataProgress >= 10 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span>Essential data (&lt;100KB)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${chapterDataProgress >= 50 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span>Template content</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${chapterDataProgress >= 80 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span>Media files (background)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="theme-bg min-h-screen theme-text theme-transition">
            {/* Mobile-Optimized Header */}
            <header className="sticky top-0 theme-surface backdrop-blur-sm z-10 p-3 sm:p-4 theme-transition">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button 
                            onClick={() => navigate(`/subject/${encodeURIComponent(currentBook)}`)}
                            className="p-2 rounded-lg hover:theme-surface2 theme-transition touch-manipulation"
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        >
                            <BackIcon />
                        </button>
                        <h1 className="font-semibold text-base sm:text-lg theme-text truncate">
                            {currentChapter}
                        </h1>
                    </div>
                    
                    {/* Exam Mode Button - Theme Adaptive */}
                    <button
                        onClick={() => navigate(`/exam/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)}
                        className="flex items-center gap-2 px-3 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition touch-manipulation font-medium text-sm"
                        style={{ minHeight: '44px' }}
                    >
                        <ExamIcon />
                        <span className="hidden sm:inline">Exam Mode</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                {/* Responsive Tab Navigation */}
                <div className="py-3 sm:py-4">
                    {/* Mobile Only: Enhanced SVG Tab System */}
                    <div className="block sm:hidden">
                        <ResponsiveTabBar
                            activeTab={activeTab}
                            onTabChange={(tab) => setActiveTab(tab)}
                            activeTabs={activeTabs}
                            onDeleteTab={handleDeleteTab}
                            getTabDisplayName={getTabDisplayName}
                            showTemplateSelector={showTemplateSelector}
                            onToggleTemplateSelector={() => setShowTemplateSelector(!showTemplateSelector)}
                            showRenameInput={showRenameInput}
                            renameValue={renameValue}
                            onRenameValueChange={(value) => setRenameValue(value)}
                            onStartRename={startRename}
                            onHandleRename={handleRenameTab}
                            onEditSvg={handleSvgEdit}
                            getTabIcon={getTabIcon}
                        />
                    </div>

                    {/* Desktop Only: Original Design Restored */}
                    <div className="hidden sm:flex flex-wrap gap-2 text-sm border-b theme-border mb-4">
                        {/* Core tabs - Original Desktop Design */}
                        <button 
                            onClick={() => setActiveTab('read')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                activeTab === 'read' 
                                    ? 'theme-accent text-white' 
                                    : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                            Read
                        </button>
                        <button 
                            onClick={() => setActiveTab('highlights')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                activeTab === 'highlights' 
                                    ? 'theme-accent text-white' 
                                    : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="m16 5-1.5-1.5a2.12 2.12 0 0 0-3 0L3 12.06V16h3.94L15.5 7.5a2.12 2.12 0 0 0 0-3Z"></path>
                                <path d="m14.5 6.5 3 3"></path>
                                <path d="M12 21v-2.5a2.5 2.5 0 0 1 2.5-2.5H17"></path>
                                <path d="M21 15v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"></path>
                            </svg>
                            Highlights
                        </button>
                        
                        {/* Active Tabs - Original Desktop Design with SVG Icons */}
                        {activeTabs.filter(tab => tab !== 'read' && tab !== 'highlights').map((tab) => (
                            <div key={tab} className="relative">
                                {showRenameInput === tab ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleRenameTab(tab);
                                                } else if (e.key === 'Escape') {
                                                    setShowRenameInput(null);
                                                    setRenameValue('');
                                                }
                                            }}
                                            onBlur={() => handleRenameTab(tab)}
                                            className="px-2 py-1 text-sm theme-surface2 border rounded theme-text min-w-0"
                                            style={{ width: '120px' }}
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setActiveTab(tab)}
                                        onDoubleClick={() => startRename(tab)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all group relative cursor-pointer ${
                                            activeTab === tab 
                                                ? 'theme-accent text-white' 
                                                : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                                        }`}
                                        title="Double-click to rename, click X to delete"
                                    >
                                        {getTabIcon(tab)}
                                        {getTabDisplayName(tab)}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTab(tab);
                                            }}
                                            className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-lg leading-none"
                                            title="Delete tab"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Template Selector - Original Desktop Design */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed theme-border hover:theme-accent-border transition-colors theme-text"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Template
                            </button>
                            
                            {/* Desktop Template Dropdown */}
                            {showTemplateSelector && (
                                <div className="absolute top-full left-0 mt-2 w-48 theme-surface rounded-lg shadow-lg border theme-border z-20">
                                    <div className="p-2">
                                        <div className="text-sm font-semibold theme-text mb-2">Choose Template:</div>
                                        {availableTemplates.map((template) => {
                                            const templateId = TEMPLATE_IDS[template as keyof typeof TEMPLATE_IDS];
                                            const hasTemplate = activeTabs.some(tab => tab.startsWith(`${templateId}_`));
                                            return (
                                                <button
                                                    key={template}
                                                    onClick={() => handleAddTemplateTab(template)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                                                        hasTemplate 
                                                            ? 'theme-muted-bg theme-muted-text cursor-pointer' 
                                                            : 'hover:theme-accent-bg theme-text'
                                                    }`}
                                                >
                                                    {template} {hasTemplate && '(Add Another)'}
                                                </button>
                                            );
                                        })}
                                        
                                        <hr className="my-2 theme-border" />
                                        
                                        {/* Custom Tab Option */}
                                        {showAddTab ? (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={newTabName}
                                                    onChange={(e) => setNewTabName(e.target.value)}
                                                    placeholder="Custom tab name..."
                                                    className="px-2 py-1 text-sm theme-surface2 border rounded theme-text"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddCustomTab();
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={handleAddCustomTab}
                                                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowAddTab(false);
                                                            setNewTabName('');
                                                        }}
                                                        className="px-2 py-1 text-xs theme-muted-bg theme-text rounded hover:theme-accent-bg"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddTab(true)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:theme-accent-bg theme-text"
                                            >
                                                ➕ Custom Tab
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Manage Tabs Button - Desktop Only */}
                        <div className="relative">
                            <button
                                onClick={() => setShowManageDropdown(!showManageDropdown)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg theme-surface2 theme-text hover:theme-accent-bg hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                                Manage
                            </button>
                            
                            {/* Manage Dropdown */}
                            {showManageDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-48 theme-surface rounded-lg shadow-lg border theme-border z-20">
                                    <div className="p-2">
                                        <div className="text-sm font-semibold theme-text mb-2">Manage Tabs:</div>
                                        {activeTabs.filter(tab => tab !== 'read' && tab !== 'highlights').map((tab) => (
                                            <div key={tab} className="mb-1">
                                                <div className="text-xs theme-text-secondary px-3 py-1 font-medium">
                                                    {getTabDisplayName(tab)}
                                                </div>
                                                <div className="flex flex-col gap-1 px-2">
                                                    <button
                                                        onClick={() => {
                                                            startRename(tab);
                                                            setShowManageDropdown(false);
                                                        }}
                                                        className="w-full text-left px-2 py-1 rounded text-xs hover:theme-surface2 theme-transition theme-text"
                                                    >
                                                        📝 Rename
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleSvgEdit(tab);
                                                        }}
                                                        className="w-full text-left px-2 py-1 rounded text-xs hover:theme-surface2 theme-transition theme-text"
                                                    >
                                                        🎨 Edit Icon
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteTab(tab);
                                                            setShowManageDropdown(false);
                                                        }}
                                                        className="w-full text-left px-2 py-1 rounded text-xs hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 theme-transition theme-text"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                                <hr className="my-1 theme-border" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Close manage dropdown when clicking outside */}
                        {showManageDropdown && (
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => {
                                    setShowManageDropdown(false);
                                }}
                            />
                        )}
                        
                        {/* Close template selector when clicking outside */}
                        {showTemplateSelector && (
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => {
                                    setShowTemplateSelector(false);
                                    setShowAddTab(false);
                                    setNewTabName('');
                                }}
                            />
                        )}
                    </div>
                    
                    {/* Template Selector Modal - For Mobile Only */}
                    {showTemplateSelector && (
                        <div className="block sm:hidden">
                            <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50" 
                                 onClick={(e) => {
                                     if (e.target === e.currentTarget) {
                                         setShowTemplateSelector(false);
                                         setShowAddTab(false);
                                         setNewTabName('');
                                     }
                                 }}>
                                <div className="w-full max-w-md mx-4 theme-surface rounded-lg shadow-xl border theme-border max-h-[80vh] overflow-y-auto">
                                    <div className="p-4">
                                        <h3 className="text-lg font-semibold theme-text mb-4">Choose Learning Tool</h3>
                                        
                                        {/* Template Grid */}
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            {availableTemplates.map((template) => {
                                                const templateId = TEMPLATE_IDS[template as keyof typeof TEMPLATE_IDS];
                                                const hasTemplate = activeTabs.some(tab => tab.startsWith(`${templateId}_`));
                                                return (
                                                    <button
                                                        key={template}
                                                        onClick={() => {
                                                            handleAddTemplateTab(template);
                                                            setShowTemplateSelector(false);
                                                        }}
                                                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                                                            hasTemplate 
                                                                ? 'theme-surface2 theme-text' 
                                                                : 'theme-accent text-white hover:bg-opacity-90'
                                                        }`}
                                                        style={{ minHeight: '44px' }}
                                                    >
                                                        <div className="text-center">
                                                            <div>{template}</div>
                                                            {hasTemplate && <div className="text-xs opacity-70">Add Another</div>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        <hr className="my-4 theme-border" />
                                        
                                        {/* Custom Tool Option */}
                                        {showAddTab ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={newTabName}
                                                    onChange={(e) => setNewTabName(e.target.value)}
                                                    placeholder="Custom tool name..."
                                                    className="w-full px-3 py-3 text-sm theme-surface2 border theme-border rounded-lg theme-text"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddCustomTab();
                                                            setShowTemplateSelector(false);
                                                        }
                                                    }}
                                                    style={{ minHeight: '44px' }}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            handleAddCustomTab();
                                                            setShowTemplateSelector(false);
                                                        }}
                                                        className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 touch-manipulation"
                                                    >
                                                        Add Tool
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowAddTab(false);
                                                            setNewTabName('');
                                                        }}
                                                        className="flex-1 px-3 py-2 text-sm theme-surface2 theme-text rounded hover:theme-accent-bg touch-manipulation"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddTab(true)}
                                                className="w-full px-3 py-3 rounded-lg text-sm hover:theme-accent-bg theme-text font-medium touch-manipulation"
                                                style={{ minHeight: '44px' }}
                                            >
                                                ➕ Create Custom Tool
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Content Area */}
                {renderTabContent()}
                
            </main>
            
            {/* Enhanced SVG Editor Modal with Icon Selection */}
            {showSvgEditor && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-4xl mx-4 theme-surface rounded-lg shadow-xl border theme-border">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold theme-text mb-4">
                                Choose Icon for "{getTabDisplayName(managingTab || '')}"
                            </h3>
                            
                            {/* Icon Selection Grid */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium theme-text mb-3">Choose from Popular Icons:</h4>
                                <div className="grid grid-cols-10 gap-2 mb-4">
                                    {/* 19 Predefined Icons */}
                                    {[
                                        {
                                            name: 'Book',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`
                                        },
                                        {
                                            name: 'Document',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`
                                        },
                                        {
                                            name: 'Pencil',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>`
                                        },
                                        {
                                            name: 'Heart',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`
                                        },
                                        {
                                            name: 'Star',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>`
                                        },
                                        {
                                            name: 'Lightning Bolt',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`
                                        },
                                        {
                                            name: 'Beaker (Lab)',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A8.014 8.014 0 004 21h16a8.014 8.014 0 00-.244-5.572zM8 3a2 2 0 012-2h4a2 2 0 012 2v5.172a2 2 0 00.586 1.414l2 2c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l2-2A2 2 0 006 9.172V3z" /></svg>`
                                        },
                                        {
                                            name: 'Lightbulb',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>`
                                        },
                                        {
                                            name: 'Calculator',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`
                                        },
                                        {
                                            name: 'Globe',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                                        },
                                        {
                                            name: 'Chart Bar',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`
                                        },
                                        {
                                            name: 'Code',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>`
                                        },
                                        {
                                            name: 'Music Note',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>`
                                        },
                                        {
                                            name: 'Camera',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`
                                        },
                                        {
                                            name: 'Map',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>`
                                        },
                                        {
                                            name: 'Clock',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                                        },
                                        {
                                            name: 'Shield',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM9 12l2 2 4-4" /></svg>`
                                        },
                                        {
                                            name: 'Puzzle',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>`
                                        },
                                        {
                                            name: 'Fire',
                                            svg: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-4 1.657 0 3 .5 3 2.5a4 4 0 01-1.464 3.114 3.5 3.5 0 00-.536 4.657 4.5 4.5 0 01-.5.707z" /></svg>`
                                        }
                                    ].map((icon, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCustomSvgCode(icon.svg)}
                                            className={`p-3 border-2 rounded-lg hover:border-blue-500 theme-transition flex items-center justify-center min-h-[50px] ${
                                                customSvgCode === icon.svg ? 'border-blue-500 theme-accent-bg' : 'border-gray-200 dark:border-gray-700 theme-surface2'
                                            }`}
                                            title={icon.name}
                                        >
                                            <div className="theme-text" dangerouslySetInnerHTML={{ __html: icon.svg }} />
                                        </button>
                                    ))}
                                    
                                    {/* Custom Code Option */}
                                    <button
                                        onClick={() => {
                                            setCustomSvgCode('');
                                            // Focus on textarea after modal updates
                                            setTimeout(() => {
                                                const textarea = document.querySelector('.svg-custom-textarea') as HTMLTextAreaElement;
                                                if (textarea) textarea.focus();
                                            }, 100);
                                        }}
                                        className={`p-3 border-2 rounded-lg hover:border-purple-500 theme-transition flex items-center justify-center min-h-[50px] ${
                                            customSvgCode && ![
                                                `<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`,
                                                // ... (add all other icon SVGs here for comparison)
                                            ].includes(customSvgCode)
                                                ? 'border-purple-500 theme-accent-bg' : 'border-gray-200 dark:border-gray-700 theme-surface2'
                                        }`}
                                        title="Custom SVG Code"
                                    >
                                        <svg className="w-5 h-5 theme-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
            {/* AI-Powered SVG Generator Section */}
            <div className="mb-4">
                <label className="block text-sm font-medium theme-text mb-2">
                    🤖 Describe Your Icon or Paste SVG Code:
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={customSvgCode}
                        onChange={(e) => setCustomSvgCode(e.target.value)}
                        placeholder='Try: "calculator icon", "music note", "graduation cap" or paste SVG code...'
                        className="w-full h-12 pl-10 pr-4 theme-surface border rounded-lg theme-text text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 svg-custom-textarea"
                        autoFocus
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-4 h-4 theme-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                <div className="text-xs theme-text-secondary mt-2 space-y-1">
                    <p>💡 <strong>Natural Language:</strong> Describe what icon you want (e.g., "book", "lightbulb", "calculator")</p>
                    <p>🔧 <strong>SVG Code:</strong> Paste existing SVG code to standardize it for our design system</p>
                </div>
            </div>

            {/* AI Model Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium theme-text mb-2">
                    🧠 AI Model Selection:
                </label>
                <select
                    value={selectedAiModel}
                    onChange={(e) => setSelectedAiModel(e.target.value)}
                    className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {availableModels.map((model) => (
                        <option key={model} value={model}>
                            {model.includes('llama-3.3') ? '🦙 Llama 3.3 70B (Latest & Best)' :
                             model.includes('llama3-groq-70b') ? '🦙 Llama 3 70B (Tool Use)' :
                             model.includes('llama-3.1-70b') ? '🦙 Llama 3.1 70B (Versatile)' :
                             model.includes('mixtral') ? '🌀 Mixtral 8x7B (Creative)' :
                             model.includes('gemma2') ? '💎 Gemma 2 9B (Fast)' :
                             model.includes('llama3-8b') ? '🦙 Llama 3 8B (Quick)' :
                             model}
                        </option>
                    ))}
                </select>
                <p className="text-xs theme-text-secondary mt-1">
                    💡 Different models have different strengths. Llama 3.3 is most capable, Gemma 2 is fastest.
                </p>
            </div>

            {/* AI Generation Workflow */}
            <div className="space-y-4">
                {/* Generate Preview Step */}
                {svgGenerationStep === 'input' && customSvgCode.trim() && !customSvgCode.startsWith('<svg') && (
                    <button
                        onClick={handleGenerateAISvg}
                        disabled={isGeneratingAI}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {isGeneratingAI ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Generating Preview...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generate Preview with AI
                            </>
                        )}
                    </button>
                )}

                {/* Preview Step */}
                {svgGenerationStep === 'preview' && aiSvgPreview && (
                    <div className="space-y-4 p-4 theme-surface-secondary rounded-lg border theme-border">
                        <div className="text-center">
                            <p className="text-sm font-medium theme-text mb-3">🎨 AI Generated Preview:</p>
                            <div className="inline-flex items-center justify-center w-16 h-16 theme-surface rounded-lg border-2 theme-border shadow-sm">
                                <div 
                                    className="theme-text"
                                    dangerouslySetInnerHTML={{ __html: aiSvgPreview }} 
                                />
                            </div>
                            <p className="text-xs theme-text-secondary mt-2">Preview of your custom icon</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveAISvg}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save This Icon
                            </button>
                            <button
                                onClick={() => {
                                    setSvgGenerationStep('input');
                                    setAiSvgPreview('');
                                }}
                                className="flex-1 theme-surface theme-text border theme-border hover:theme-surface-hover px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Step */}
                {svgGenerationStep === 'saved' && (
                    <div className="text-center py-6 space-y-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">✅ Icon Saved Successfully!</p>
                            <p className="text-xs theme-text-secondary">The editor will close automatically...</p>
                        </div>
                    </div>
                )}

                {/* Regular Preview (for SVG code) */}
                {customSvgCode && customSvgCode.startsWith('<svg') && svgGenerationStep === 'input' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium theme-text mb-2">Preview:</label>
                        <div className="p-4 border rounded-lg theme-surface2 flex items-center justify-center">
                            <div className="theme-text" dangerouslySetInnerHTML={{ __html: customSvgCode }} />
                        </div>
                    </div>
                )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
                <button
                    onClick={() => {
                        setShowSvgEditor(false);
                        setManagingTab(null);
                        setCustomSvgCode('');
                        setSvgGenerationStep('input');
                        setAiSvgPreview('');
                    }}
                    className="flex-1 px-4 py-2 theme-surface2 theme-text rounded hover:theme-surface theme-transition"
                >
                    Cancel
                </button>
                {/* Only show Save button for direct SVG code */}
                {customSvgCode && customSvgCode.startsWith('<svg') && svgGenerationStep === 'input' && (
                    <button
                        onClick={handleSaveSvg}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed theme-transition flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {isSaving ? 'Saving...' : 'Save Icon'}
                    </button>
                )}
            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Mobile-Optimized AI Guru Button */}
            <button 
                onClick={() => openAIGuru()} 
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 theme-accent rounded-full shadow-lg hover:bg-opacity-90 theme-transition transform hover:scale-110 z-20 touch-manipulation"
                style={{ 
                    width: '56px', 
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <AIGuruIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
            </button>
            
            {/* Close mobile dropdowns when clicking outside */}
            {showTemplateSelector && (
                <div 
                    className="fixed inset-0 z-10 sm:hidden" 
                    onClick={() => {
                        setShowTemplateSelector(false);
                        setShowAddTab(false);
                        setNewTabName('');
                    }}
                />
            )}
            
            {/* YouTube Player Modal */}
            <YouTubePlayerModal
                isOpen={showVideoModal}
                onClose={() => {
                    setShowVideoModal(false);
                    setCurrentVideoData(null);
                    setCurrentSubtopicForVideo('');
                    setCurrentVideoMode('edit');
                }}
                videoData={currentVideoData}
                onSave={handleVideoSave}
                subtopicTitle={currentSubtopicForVideo}
                mode={currentVideoMode}
            />
        </div>
    );
};

export default EnhancedReaderPage;
