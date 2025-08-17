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
      className="subtopic-content" 
      ref={contentRef} 
      style={{ padding: '10px', minHeight: '200px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
    >
      <p 
        className="theme-text-secondary leading-relaxed text-justify" 
        style={{ lineHeight: 1.8, fontSize: 15, fontFamily: 'Georgia, serif', whiteSpace: 'normal' }}
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
            minWidth: '250px',
            maxWidth: '90vw',
            zIndex: 9999
          }}
        >
          {showColorPicker ? (
            <div className="flex items-center gap-2 p-3">
              <span className="text-xs text-gray-600 dark:text-gray-300 mr-2">Color:</span>
              <button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyHighlight('yellow');
              }} className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Yellow"></button>
              <button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyHighlight('green');
              }} className="w-6 h-6 bg-green-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Green"></button>
              <button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyHighlight('blue');
              }} className="w-6 h-6 bg-blue-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Blue"></button>
              <button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyHighlight('red');
              }} className="w-6 h-6 bg-red-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Red"></button>
              <button onClick={() => setShowColorPicker(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2">✕</button>
            </div>
          ) : showNoteInput ? (
            <div className="p-3 w-64">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note..."
                className="w-full h-16 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-gray-600 resize-none mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowNoteInput(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
                <button onClick={addNote} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Save</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
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
          )}
        </div>
      )}
    </div>
  );
};

export default SubtopicContent;