import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Highlight } from '../types/types';

interface TextSelectionEngineProps {
  content: string;
  highlights: Highlight[];
  currentBook: string;
  addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  removeHighlight: (id: string) => void;
  className?: string;
  onSelectionChange?: (selectedText: string, range: Range | null) => void;
}

interface SelectionData {
  text: string;
  range: Range;
  rect: DOMRect;
}

const TextSelectionEngine: React.FC<TextSelectionEngineProps> = ({
  content,
  highlights,
  currentBook,
  addHighlight,
  removeHighlight,
  className = '',
  onSelectionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSelection, setCurrentSelection] = useState<SelectionData | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; show: boolean }>({
    top: 0,
    left: 0,
    show: false
  });
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modern text selection detection that works on both desktop and mobile
  const detectTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setCurrentSelection(null);
      setIsMenuVisible(false);
      onSelectionChange?.('', null);
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    
    if (text.length === 0) {
      setCurrentSelection(null);
      setIsMenuVisible(false);
      onSelectionChange?.('', null);
      return null;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return null;
    }

    const rect = range.getBoundingClientRect();
    const selectionData = { text, range: range.cloneRange(), rect };
    setCurrentSelection(selectionData);
    onSelectionChange?.(text, range);
    
    return selectionData;
  }, [onSelectionChange]);

  // Show selection menu at appropriate position
  const showSelectionMenu = useCallback((selectionData: SelectionData) => {
    if (!selectionData) return;

    const { rect } = selectionData;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Calculate position relative to viewport
    let top = rect.top + scrollTop - 60;
    let left = rect.left + scrollLeft + (rect.width / 2) - 125; // Center the menu

    // Ensure menu stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 10) left = 10;
    if (left + 250 > viewportWidth) left = viewportWidth - 260;
    if (top < 10) top = rect.bottom + scrollTop + 10;

    setMenuPosition({ top, left, show: true });
    setIsMenuVisible(true);
  }, []);

  // Handle selection events - works for both mouse and touch
  const handleSelectionEvent = useCallback((event: Event) => {
    // Small delay to allow selection to complete
    setTimeout(() => {
      const selectionData = detectTextSelection();
      if (selectionData) {
        showSelectionMenu(selectionData);
      }
    }, 100);
  }, [detectTextSelection, showSelectionMenu]);

  // Hide menu
  const hideMenu = useCallback(() => {
    setIsMenuVisible(false);
    setMenuPosition(prev => ({ ...prev, show: false }));
    setCurrentSelection(null);
    
    // Clear selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  // Apply highlight with color
  const applyHighlight = useCallback((color: string) => {
    if (!currentSelection) return;

    const { text } = currentSelection;
    addHighlight({
      text,
      color,
      chapterId: currentBook
    });

    hideMenu();
  }, [currentSelection, addHighlight, currentBook, hideMenu]);

  // Process content with highlights
  const processContentWithHighlights = useCallback((text: string, highlights: Highlight[]) => {
    if (highlights.length === 0) return text;

    let processedContent = text;
    
    // Sort highlights by length (longest first) to avoid conflicts
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
    
    sortedHighlights.forEach(highlight => {
      const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedText})`, 'gi');
      
      const cssClass = `highlight-${highlight.color}`;
      processedContent = processedContent.replace(regex, 
        `<span class="${cssClass}" data-highlight-id="${highlight.id}">$1</span>`
      );
    });

    return processedContent;
  }, []);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Modern event handling for both desktop and mobile
    const events = {
      // Desktop events
      mouseup: handleSelectionEvent,
      // Mobile/touch events  
      touchend: handleSelectionEvent,
      // Selection change event (modern browsers)
      selectionchange: handleSelectionEvent
    };

    // Add event listeners
    Object.entries(events).forEach(([eventType, handler]) => {
      if (eventType === 'selectionchange') {
        document.addEventListener(eventType, handler);
      } else {
        container.addEventListener(eventType, handler);
      }
    });

    // Click outside to hide menu
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Cleanup
    return () => {
      Object.entries(events).forEach(([eventType, handler]) => {
        if (eventType === 'selectionchange') {
          document.removeEventListener(eventType, handler);
        } else {
          container.removeEventListener(eventType, handler);
        }
      });
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handleSelectionEvent, hideMenu]);

  // Filter highlights for current chapter
  const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);
  const processedContent = processContentWithHighlights(content, chapterHighlights);

  return (
    <>
      {/* Highlight Styles */}
      <style>{`
        .text-selection-container {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
          cursor: text;
          -webkit-touch-callout: default;
          -webkit-tap-highlight-color: rgba(0,0,0,0.1);
        }
        
        .text-selection-container::selection {
          background: rgba(59, 130, 246, 0.3);
        }
        
        .text-selection-container::-moz-selection {
          background: rgba(59, 130, 246, 0.3);
        }
        
        .highlight-yellow {
          background: linear-gradient(120deg, rgba(255, 235, 59, 0.4) 0%, rgba(255, 235, 59, 0.6) 100%) !important;
          padding: 2px 4px;
          border-radius: 3px;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          display: inline;
          cursor: pointer;
        }
        
        .highlight-green {
          background: linear-gradient(120deg, rgba(76, 175, 80, 0.4) 0%, rgba(76, 175, 80, 0.6) 100%) !important;
          padding: 2px 4px;
          border-radius: 3px;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          display: inline;
          cursor: pointer;
        }
        
        .highlight-blue {
          background: linear-gradient(120deg, rgba(33, 150, 243, 0.4) 0%, rgba(33, 150, 243, 0.6) 100%) !important;
          padding: 2px 4px;
          border-radius: 3px;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          display: inline;
          cursor: pointer;
        }
        
        .highlight-red {
          background: linear-gradient(120deg, rgba(244, 67, 54, 0.4) 0%, rgba(244, 67, 54, 0.6) 100%) !important;
          padding: 2px 4px;
          border-radius: 3px;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          display: inline;
          cursor: pointer;
        }

        .selection-menu {
          position: fixed;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          z-index: 9999;
          padding: 8px;
          display: flex;
          gap: 8px;
          backdrop-filter: blur(10px);
          max-width: 90vw;
        }

        .dark .selection-menu {
          background: rgba(31, 41, 55, 0.95);
          border-color: rgba(75, 85, 99, 0.8);
        }

        .color-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .color-button:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .color-button:active {
          transform: scale(0.95);
        }

        .color-yellow { background-color: #fbbf24; }
        .color-green { background-color: #34d399; }
        .color-blue { background-color: #3b82f6; }
        .color-red { background-color: #ef4444; }

        @media (max-width: 768px) {
          .selection-menu {
            padding: 12px;
            gap: 12px;
          }
          
          .color-button {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>

      {/* Main Content Container */}
      <div 
        ref={containerRef}
        className={`text-selection-container ${className}`}
        style={{ 
          padding: '10px', 
          minHeight: '200px',
          lineHeight: 1.8, 
          fontSize: 15, 
          fontFamily: 'Georgia, serif' 
        }}
      >
        <div
          className="theme-text-secondary leading-relaxed text-justify"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      </div>

      {/* Selection Menu */}
      {isMenuVisible && menuPosition.show && (
        <div 
          ref={menuRef}
          className="selection-menu"
          style={{ 
            top: `${menuPosition.top}px`, 
            left: `${menuPosition.left}px`
          }}
        >
          <button
            className="color-button color-yellow"
            onClick={() => applyHighlight('yellow')}
            title="Highlight Yellow"
            aria-label="Highlight with yellow"
          />
          <button
            className="color-button color-green"
            onClick={() => applyHighlight('green')}
            title="Highlight Green"
            aria-label="Highlight with green"
          />
          <button
            className="color-button color-blue"
            onClick={() => applyHighlight('blue')}
            title="Highlight Blue"
            aria-label="Highlight with blue"
          />
          <button
            className="color-button color-red"
            onClick={() => applyHighlight('red')}
            title="Highlight Red"
            aria-label="Highlight with red"
          />
        </div>
      )}
    </>
  );
};

export default TextSelectionEngine;
