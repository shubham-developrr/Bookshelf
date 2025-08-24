import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Highlight } from '../types/types';

interface ProfessionalTextHighlighterProps {
  content: string;
  highlights: Highlight[];
  currentBook: string;
  addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  removeHighlight: (id: string) => void;
  onExplainWithAI?: (selectedText: string, context: string) => void;
  className?: string;
}

interface SelectionMenu {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  selectedRange: Range | null;
}

const ProfessionalTextHighlighter: React.FC<ProfessionalTextHighlighterProps> = ({
  content,
  highlights,
  currentBook,
  addHighlight,
  removeHighlight,
  onExplainWithAI,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    selectedRange: null
  });

  // Create processed HTML content with highlights
  const createHighlightedContent = useCallback(() => {
    if (!content) return '';
    
    let processedContent = content;
    const currentHighlights = highlights.filter(h => h.chapterId === currentBook);
    
    if (currentHighlights.length === 0) return processedContent;

    // Sort highlights by text length (longest first) to prevent conflicts
    const sortedHighlights = [...currentHighlights].sort((a, b) => b.text.length - a.text.length);
    
    // Apply highlights
    sortedHighlights.forEach((highlight, index) => {
      const uniqueId = `highlight-${highlight.id}-${index}`;
      const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create a more specific regex to avoid partial matches
      const regex = new RegExp(`\\b${escapedText}\\b`, 'gi');
      
      processedContent = processedContent.replace(regex, (match) => {
        return `<span class="text-highlight highlight-${highlight.color}" data-highlight-id="${highlight.id}" data-unique-id="${uniqueId}">${match}</span>`;
      });
    });

    return processedContent;
  }, [content, highlights, currentBook]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    if (!selectedText || selectedText.length < 1) {
      setSelectionMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    // Verify selection is within our container
    const container = containerRef.current;
    if (!container) return;

    let commonAncestor = range.commonAncestorContainer;
    
    // Check if the selection is within our container
    let isWithinContainer = false;
    if (commonAncestor.nodeType === Node.TEXT_NODE) {
      isWithinContainer = container.contains(commonAncestor.parentNode);
    } else {
      isWithinContainer = container.contains(commonAncestor);
    }

    if (!isWithinContainer) {
      setSelectionMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    // Calculate menu position
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Position menu below selection
    let x = rect.left + rect.width / 2 - 150; // Center the menu
    let y = rect.bottom + window.scrollY + 10;

    // Ensure menu stays within viewport
    const menuWidth = 300;
    const menuHeight = 60;

    if (x < 10) x = 10;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight + window.scrollY) {
      y = rect.top + window.scrollY - menuHeight - 10;
    }

    setSelectionMenu({
      visible: true,
      x,
      y,
      selectedText,
      selectedRange: range.cloneRange()
    });
  }, []);

  // Event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let selectionTimeout: NodeJS.Timeout;

    const handleMouseUp = () => {
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(handleTextSelection, 100);
    };

    const handleTouchEnd = () => {
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(handleTextSelection, 300);
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      
      // Don't hide if clicking on menu
      if (target.closest('.selection-menu')) return;
      
      // Hide menu if clicking outside container
      if (!container.contains(target)) {
        setSelectionMenu(prev => ({ ...prev, visible: false }));
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      clearTimeout(selectionTimeout);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handleTextSelection]);

  // Apply highlight
  const applyHighlight = (color: string) => {
    if (!selectionMenu.selectedText) return;

    addHighlight({
      text: selectionMenu.selectedText,
      color,
      chapterId: currentBook
    });

    // Clear selection and hide menu
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    setSelectionMenu(prev => ({ ...prev, visible: false }));
  };

  // Handle AI explanation
  const handleAIExplanation = () => {
    if (!selectionMenu.selectedText || !onExplainWithAI) return;

    const container = containerRef.current;
    if (!container) return;

    const fullText = container.textContent || '';
    const selectedIndex = fullText.indexOf(selectionMenu.selectedText);
    const contextStart = Math.max(0, selectedIndex - 100);
    const contextEnd = Math.min(fullText.length, selectedIndex + selectionMenu.selectedText.length + 100);
    const context = fullText.substring(contextStart, contextEnd);

    onExplainWithAI(selectionMenu.selectedText, context);
    setSelectionMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
      {/* Styles */}
      <style>{`
        .professional-text-highlighter {
          position: relative;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          cursor: text;
          line-height: 1.6;
          font-size: 15px;
          padding: 20px;
        }

        .professional-text-highlighter ::selection {
          background: rgba(59, 130, 246, 0.3);
        }

        .professional-text-highlighter ::-moz-selection {
          background: rgba(59, 130, 246, 0.3);
        }

        .text-highlight {
          padding: 2px 4px;
          margin: 0 1px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .text-highlight:hover {
          opacity: 0.8;
          transform: scale(1.02);
        }

        .highlight-yellow {
          background-color: rgba(255, 235, 59, 0.7) !important;
          border-left: 3px solid #FBC02D;
        }

        .highlight-green {
          background-color: rgba(76, 175, 80, 0.7) !important;
          border-left: 3px solid #388E3C;
        }

        .highlight-blue {
          background-color: rgba(33, 150, 243, 0.7) !important;
          border-left: 3px solid #1976D2;
        }

        .highlight-red {
          background-color: rgba(244, 67, 54, 0.7) !important;
          border-left: 3px solid #D32F2F;
        }

        .selection-menu {
          position: fixed;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          padding: 12px 16px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(8px);
          animation: menuSlideIn 0.2s ease-out;
        }

        @keyframes menuSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dark .selection-menu {
          background: #1f2937;
          border-color: #374151;
          color: white;
        }

        .menu-button {
          padding: 10px 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 44px;
          height: 44px;
          justify-content: center;
        }

        .menu-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .menu-button:active {
          transform: translateY(0);
        }

        .ai-button {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .ai-button:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
        }

        .color-button {
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-weight: 600;
        }

        .yellow-btn { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .green-btn { background: linear-gradient(135deg, #10b981, #059669); }
        .blue-btn { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .red-btn { background: linear-gradient(135deg, #ef4444, #dc2626); }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .selection-menu {
            padding: 14px 18px;
            gap: 14px;
          }

          .menu-button {
            min-width: 48px;
            height: 48px;
            font-size: 16px;
          }

          .professional-text-highlighter {
            padding: 16px;
            font-size: 16px;
            line-height: 1.8;
          }
        }

        @media (max-width: 480px) {
          .selection-menu {
            padding: 16px 20px;
            gap: 16px;
            max-width: calc(100vw - 20px);
          }

          .menu-button {
            min-width: 52px;
            height: 52px;
          }
        }
      `}</style>

      {/* Main container */}
      <div 
        ref={containerRef}
        className={`professional-text-highlighter ${className}`}
        dangerouslySetInnerHTML={{ __html: createHighlightedContent() }}
      />

      {/* Selection menu */}
      {selectionMenu.visible && (
        <div 
          className="selection-menu"
          style={{ 
            left: `${selectionMenu.x}px`, 
            top: `${selectionMenu.y}px` 
          }}
        >
          {onExplainWithAI && (
            <button 
              className="menu-button ai-button"
              onClick={handleAIExplanation}
              title="Explain with AI"
            >
              🧠
            </button>
          )}
          
          <button 
            className="menu-button color-button yellow-btn"
            onClick={() => applyHighlight('yellow')}
            title="Yellow highlight"
          >
            ●
          </button>
          
          <button 
            className="menu-button color-button green-btn"
            onClick={() => applyHighlight('green')}
            title="Green highlight"
          >
            ●
          </button>
          
          <button 
            className="menu-button color-button blue-btn"
            onClick={() => applyHighlight('blue')}
            title="Blue highlight"
          >
            ●
          </button>
          
          <button 
            className="menu-button color-button red-btn"
            onClick={() => applyHighlight('red')}
            title="Red highlight"
          >
            ●
          </button>
        </div>
      )}
    </>
  );
};

export default ProfessionalTextHighlighter;
