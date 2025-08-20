import React, { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';
import HTMLCodeEditor from './HTMLCodeEditor';

interface GeneralTabProps {
    tabName: string;
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
    tabName,
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [editorMode, setEditorMode] = useState<'rich' | 'html'>('rich');
    
    // Save editor mode preference
    const storageKey = `editor_mode_${currentBook}_${currentChapter}_${tabName}`;
    
    useEffect(() => {
        const savedMode = localStorage.getItem(storageKey);
        if (savedMode === 'html' || savedMode === 'rich') {
            setEditorMode(savedMode);
        }
    }, [storageKey]);
    
    const handleModeSwitch = (mode: 'rich' | 'html') => {
        setEditorMode(mode);
        localStorage.setItem(storageKey, mode);
    };
    
    // Mobile detection
    const isMobile = () => window.innerWidth <= 768;
    
    return (
        <div className={className}>
            {/* Editor Mode Switcher */}
            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 pb-4 border-b theme-border`}>
                <div className={`flex items-center gap-2 ${isMobile() ? 'justify-center' : ''}`}>
                    <svg className="w-5 h-5 theme-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3 className="text-lg font-semibold theme-text">General Editor</h3>
                </div>
                
                <div className={`flex ${isMobile() ? 'justify-center' : ''} gap-1 p-1 theme-surface2 rounded-lg`}>
                    <button
                        onClick={() => handleModeSwitch('rich')}
                        className={`flex items-center gap-2 ${isMobile() ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded-md transition-all ${
                            editorMode === 'rich'
                                ? 'theme-accent text-white shadow-sm'
                                : 'theme-text hover:theme-surface hover:theme-text'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                        </svg>
                        Rich Text
                    </button>
                    <button
                        onClick={() => handleModeSwitch('html')}
                        className={`flex items-center gap-2 ${isMobile() ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded-md transition-all ${
                            editorMode === 'html'
                                ? 'theme-accent text-white shadow-sm'
                                : 'theme-text hover:theme-surface hover:theme-text'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="16,18 22,12 16,6"/>
                            <polyline points="8,6 2,12 8,18"/>
                        </svg>
                        HTML Code
                    </button>
                </div>
            </div>
            
            {/* Editor Content */}
            {editorMode === 'rich' ? (
                <RichTextEditor
                    tabName={tabName}
                    currentBook={currentBook}
                    currentChapter={currentChapter}
                    className="w-full"
                />
            ) : (
                <HTMLCodeEditor
                    tabName={tabName}
                    currentBook={currentBook}
                    currentChapter={currentChapter}
                    className="w-full"
                />
            )}
        </div>
    );
};

export default GeneralTab;
