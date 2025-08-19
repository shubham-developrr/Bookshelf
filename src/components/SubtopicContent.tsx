// SubtopicContent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Highlight } from '../types/types';

interface SubtopicContentProps {
  content: string;
  highlights: Highlight[];
  currentBook: string;
  addHighlight: (highlight: Omit<Highlight, 'id' | 'timestamp'>) => void;
  removeHighlight: (id: string) => void;
}

const SubtopicContent: React.FC<SubtopicContentProps> = ({ 
  content, 
  highlights, 
  currentBook,
  addHighlight,
  removeHighlight
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; show: boolean }>({ 
    top: 0, left: 0, show: false 
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');

  // Handle touch events for mobile
  const handleTouchStart = () => {
    if (menuPosition.show) {
      window.getSelection()?.removeAllRanges();
      setMenuPosition(prev => ({ ...prev, show: false }));
      setShowColorPicker(false);
      setShowNoteInput(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(selectedText);
        
        const contentArea = contentRef.current;
        if (contentArea && contentArea.contains(range.commonAncestorContainer)) {
          setShowColorPicker(false);
          setShowNoteInput(false);
          
          let top = window.scrollY + rect.top - 60;
          let left = window.scrollX + rect.left;
          
          const viewportWidth = window.innerWidth;
          if (left + 250 > viewportWidth) {
            left = viewportWidth - 260;
          }
          
          if (left < 10) {
            left = 10;
          }
          
          if (top < 10) {
            top = window.scrollY + rect.bottom + 10;
          }
          
          setMenuPosition({
            top,
            left,
            show: true
          });
        }
      }
    }, 300);
  };

  // Handle mouse events for desktop
  const handleMouseUp = (e: React.MouseEvent) => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(selectedText);
        
        const contentArea = contentRef.current;
        if (contentArea && contentArea.contains(range.commonAncestorContainer)) {
          setShowColorPicker(false);
          setShowNoteInput(false);
          
          let top = window.scrollY + rect.top - 60;
          let left = window.scrollX + rect.left;
          
          const viewportWidth = window.innerWidth;
          if (left + 250 > viewportWidth) {
            left = viewportWidth - 260;
          }
          
          if (left < 10) {
            left = 10;
          }
          
          if (top < 10) {
            top = window.scrollY + rect.bottom + 10;
          }
          
          setMenuPosition({
            top,
            left,
            show: true
          });
        }
      }
    }, 100);
  };

  // Hide menu when clicking outside
  const hideMenu = () => {
    setMenuPosition(prev => ({ ...prev, show: false }));
    setShowColorPicker(false);
    setShowNoteInput(false);
    window.getSelection()?.removeAllRanges();
  };

  // Apply highlight
  const applyHighlight = (color: string) => {
    if (!selectedText) {
      hideMenu();
      return;
    }

    try {
      addHighlight({ 
        text: selectedText, 
        color, 
        chapterId: currentBook
      });
    } catch (error) {
      console.error('Highlighting failed:', error);
    } finally {
      setTimeout(() => {
        window.getSelection()?.removeAllRanges();
      }, 100);
      hideMenu();
    }
  };

  // Add note
  const addNote = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && noteText.trim()) {
      const text = selection.toString().trim();
      if (text.length > 0) {
        addHighlight({ 
          text, 
          color: 'blue', 
          chapterId: currentBook
        });
        
        setTimeout(() => {
          selection.removeAllRanges();
        }, 100);
      }
      setNoteText('');
    }
    setShowNoteInput(false);
    hideMenu();
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add CSS styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .subtopic-content {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
        cursor: text;
        touch-action: manipulation;
      }
      
      .subtopic-content::selection {
        background: rgba(59, 130, 246, 0.3);
      }
      
      .highlight-yellow {
        background: linear-gradient(120deg, rgba(255, 235, 59, 0.4) 0%, rgba(255, 235, 59, 0.6) 100%) !important;
        padding: 2px 4px;
        border-radius: 3px;
        box-decoration-break: clone;
        display: inline;
      }
      
      .highlight-green {
        background: linear-gradient(120deg, rgba(76, 175, 80, 0.4) 0%, rgba(76, 175, 80, 0.6) 100%) !important;
        padding: 2px 4px;
        border-radius: 3px;
        box-decoration-break: clone;
        display: inline;
      }
      
      .highlight-blue {
        background: linear-gradient(120deg, rgba(33, 150, 243, 0.4) 0%, rgba(33, 150, 243, 0.6) 100%) !important;
        padding: 2px 4px;
        border-radius: 3px;
        box-decoration-break: clone;
        display: inline;
      }
      
      .highlight-red {
        background: linear-gradient(120deg, rgba(244, 67, 54, 0.4) 0%, rgba(244, 67, 54, 0.6) 100%) !important;
        padding: 2px 4px;
        border-radius: 3px;
        box-decoration-break: clone;
        display: inline;
      }
      
      .highlight-menu {
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Get highlights for this chapter
  const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);

  // Apply highlights to content
  const applyHighlightsToContent = (content: string, highlights: Highlight[]) => {
    if (highlights.length === 0) {
      return content;
    }

    let processedContent = content;
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
    
    sortedHighlights.forEach(highlight => {
      const escapedText = highlight.text.replace(/[.*+?^${}()|[\\]\]/g, '\\$&');
      const regex = new RegExp(escapedText, 'g');
      
      let cssClass = '';
      switch(highlight.color) {
        case 'yellow':
          cssClass = 'highlight-yellow';
          break;
        case 'green':
          cssClass = 'highlight-green';
          break;
        case 'blue':
          cssClass = 'highlight-blue';
          break;
        case 'red':
          cssClass = 'highlight-red';
          break;
        default:
          cssClass = 'highlight-yellow';
      }
      
      processedContent = processedContent.replace(regex, 
        `<span class="${cssClass}">${highlight.text}</span>`);
    });

    return processedContent;
  };

  return (
    <div 
      className="subtopic-content px-3 sm:px-0" 
      ref={contentRef} 
      style={{ padding: '10px', minHeight: '200px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
    >
      <p 
        className="theme-text-secondary leading-relaxed text-justify px-2 sm:px-0" 
        style={{ 
          lineHeight: 1.8, 
          fontSize: '15px', 
          fontFamily: 'Georgia, serif', 
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
        dangerouslySetInnerHTML={{ 
          __html: applyHighlightsToContent(content, chapterHighlights) 
        }}
      />
      
      {menuPosition.show && (
        <div 
          ref={menuRef} 
          className="highlight-menu fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700"
          style={{ 
            top: `${menuPosition.top}px`, 
            left: `${menuPosition.left}px`,
            minWidth: '280px',
            maxWidth: '95vw',
            zIndex: 9999
          }}
        >
          {showColorPicker ? (
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                Choose highlight color:
              </div>
              <div className="flex justify-center gap-4 mb-4">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyHighlight('yellow');
                  }} 
                  className="w-10 h-10 bg-yellow-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform touch-manipulation" 
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="Yellow"
                />
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyHighlight('green');
                  }} 
                  className="w-10 h-10 bg-green-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform touch-manipulation" 
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="Green"
                />
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyHighlight('blue');
                  }} 
                  className="w-10 h-10 bg-blue-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform touch-manipulation" 
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="Blue"
                />
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyHighlight('red');
                  }} 
                  className="w-10 h-10 bg-red-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform touch-manipulation" 
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="Red"
                />
              </div>
              <button 
                onClick={() => setShowColorPicker(false)} 
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 rounded-lg touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
            </div>
          ) : showNoteInput ? (
            <div className="p-4 w-full">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add a note to this highlight:
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write your note..."
                  className="w-full h-20 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-gray-600 resize-none"
                  style={{ minHeight: '80px' }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowNoteInput(false)} 
                  className="flex-1 py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 rounded-lg touch-manipulation"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={addNote} 
                  className="flex-1 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium touch-manipulation"
                  style={{ minHeight: '44px' }}
                >
                  Save Note
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Mobile: Stacked layout */}
              <div className="block sm:hidden p-3 space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  Selected text options:
                </div>
                <button 
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg flex items-center justify-center gap-3 font-medium touch-manipulation"
                  onClick={() => setShowColorPicker(true)}
                  style={{ minHeight: '44px' }}
                >
                  <span className="w-4 h-4 bg-yellow-400 rounded-full"></span>
                  Highlight Text
                </button>
                <button 
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center justify-center gap-3 font-medium touch-manipulation"
                  onClick={() => setShowNoteInput(true)}
                  style={{ minHeight: '44px' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Add Notes
                </button>
                <button 
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg flex items-center justify-center gap-3 font-medium touch-manipulation"
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection) {
                      const selectedText = selection.toString().trim();
                      if (selectedText) {
                        console.log('Explain:', selectedText);
                      }
                    }
                    hideMenu();
                  }}
                  style={{ minHeight: '44px' }}
                >
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Explanation
                </button>
              </div>

              {/* Desktop: Horizontal layout */}
              <div className="hidden sm:flex items-center">
                <button 
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-r border-gray-200 dark:border-gray-600"
                  onClick={() => setShowColorPicker(true)}
                >
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  Highlight
                </button>
                <button 
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-r border-gray-200 dark:border-gray-600"
                  onClick={() => setShowNoteInput(true)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes
                </button>
                <button 
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection) {
                      const selectedText = selection.toString().trim();
                      if (selectedText) {
                        console.log('Explain:', selectedText);
                      }
                    }
                    hideMenu();
                  }}
                >
                  <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Explain
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubtopicContent;