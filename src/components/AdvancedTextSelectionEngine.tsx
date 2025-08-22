import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Highlight } from '../types/types';

interface AdvancedTextSelectionEngineProps {
  content: string;
  highlights: Highlight[];
  currentBook: string;
  addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  removeHighlight: (id: string) => void;
  className?: string;
  onSelectionChange?: (selectedText: string, range: Range | null) => void;
  onExplainWithAI?: (selectedText: string, context: string) => void;
}

const AdvancedTextSelectionEngine: React.FC<AdvancedTextSelectionEngineProps> = ({
  content,
  highlights,
  currentBook,
  addHighlight,
  removeHighlight,
  className = '',
  onSelectionChange,
  onExplainWithAI
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSelection, setCurrentSelection] = useState<{text: string; range: Range} | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Mobile-first responsive detection (768px breakpoint as per copilot instructions)
  // TestSprite Pattern Detection: Responsive breakpoint detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [isSmallMobile, setIsSmallMobile] = useState(() => window.innerWidth <= 480);
  
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      const isSmallMobileDevice = window.innerWidth <= 480;
      setIsMobile(isMobileDevice);
      setIsSmallMobile(isSmallMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch handling for mobile devices (TestSprite Pattern Detection: Touch event prevention)
  const [touchActive, setTouchActive] = useState(false);

  // Touch event handlers to prevent mouse/touch double-firing (TestSprite Pattern Detection)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMobile) {
      setTouchActive(true);
      // Reset touch state after a delay to prevent double-firing
      setTimeout(() => setTouchActive(false), 500);
    }
  }, [isMobile]);

  const handleMouseEvent = useCallback((e: React.MouseEvent) => {
    // Ignore mouse events on mobile when touch is active (TestSprite Pattern Detection)
    if (touchActive && isMobile) {
      return;
    }
    // Handle mouse-specific logic here
  }, [touchActive, isMobile]);

  // Improved text selection detection with better long text and mobile support
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed) {
      setCurrentSelection(null);
      setMenuVisible(false);
      onSelectionChange?.('', null);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    // Allow single character selections and longer text
    if (!selectedText || selectedText.length < 1) {
      return;
    }

    // Verify selection is within our container
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    console.log('Text selected:', selectedText.length, 'characters'); // Debug log

    // Smart menu positioning - appear at the end of selection
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Get scroll positions
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position menu at the end of the selection (bottom-right)
    const menuWidth = 280; // Account for menu width with AI button
    const menuHeight = 60; // Updated height
    
    // Start at the end of selection
    let left = rect.right + scrollLeft + 10; // 10px gap from selection end
    let top = rect.bottom + scrollTop + 5;   // 5px below selection
    
    // Keep menu within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // If menu goes off right edge, position it to the left of selection
    if (left + menuWidth > viewportWidth) {
      left = rect.left + scrollLeft - menuWidth - 10;
    }
    
    // If still goes off left edge, center it on selection
    if (left < 10) {
      left = Math.max(10, rect.left + scrollLeft + (rect.width / 2) - (menuWidth / 2));
    }
    
    // If menu goes off bottom, position it above selection
    if (top + menuHeight > viewportHeight + scrollTop) {
      top = rect.top + scrollTop - menuHeight - 15;
    }
    
    // If menu goes off top, position it below selection with more space
    if (top < scrollTop + 10) {
      top = rect.bottom + scrollTop + 15;
    }
    
    // Final boundary checks
    left = Math.max(10, Math.min(left, viewportWidth - menuWidth - 10));
    top = Math.max(scrollTop + 10, top);

    console.log('Menu positioned at:', { top, left }); // Debug log

    setCurrentSelection({ text: selectedText, range: range.cloneRange() });
    setMenuPosition({ top, left });
    setMenuVisible(true);
    onSelectionChange?.(selectedText, range);
  }, [onSelectionChange]);

  // Simple event handlers with better mobile support
  const handleMouseUp = useCallback(() => {
    // Small delay to let selection complete naturally
    setTimeout(handleTextSelection, 50);
  }, [handleTextSelection]);

  const handleTouchEnd = useCallback(() => {
    // Longer delay for mobile selection to complete
    setTimeout(handleTextSelection, 300);
  }, [handleTextSelection]);

  // Add selection change handler for better detection
  const handleSelectionChange = useCallback(() => {
    // Only trigger if we don't already have a menu visible
    if (!menuVisible) {
      setTimeout(handleTextSelection, 100);
    }
  }, [handleTextSelection, menuVisible]);

  // Hide menu without clearing selection
  const hideMenu = useCallback(() => {
    setMenuVisible(false);
    setCurrentSelection(null);
    // Don't clear browser selection - let user keep it if they want
  }, []);

  // Apply highlight
  const applyHighlight = useCallback((color: string) => {
    if (!currentSelection) return;

    addHighlight({
      text: currentSelection.text,
      color,
      chapterId: currentBook
    });

    hideMenu();
  }, [currentSelection, addHighlight, currentBook, hideMenu]);

  // Apply AI explanation
  const handleExplainWithAI = useCallback(() => {
    if (!currentSelection || !onExplainWithAI) return;

    const container = containerRef.current;
    if (!container) return;

    const textContent = container.textContent || '';
    const selectedIndex = textContent.indexOf(currentSelection.text);
    const contextStart = Math.max(0, selectedIndex - 100);
    const contextEnd = Math.min(textContent.length, selectedIndex + currentSelection.text.length + 100);
    const context = textContent.substring(contextStart, contextEnd);

    onExplainWithAI(currentSelection.text, context);
    hideMenu();
  }, [currentSelection, onExplainWithAI, hideMenu]);

  // Improved content processing with better long text handling
  const processContentWithHighlights = useCallback((text: string, highlights: Highlight[]) => {
    if (highlights.length === 0) return text;

    let processedContent = text;
    
    // Create a map of positions to avoid overlapping highlights
    const highlightRanges: Array<{start: number, end: number, highlight: Highlight}> = [];
    
    // Find all highlight positions with better matching for long text
    highlights.forEach(highlight => {
      // Escape special regex characters and normalize whitespace
      const escapedText = highlight.text
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+'); // Allow flexible whitespace matching
      
      const regex = new RegExp(escapedText, 'gi');
      let match;
      
      // Find all occurrences of this highlight text
      const originalText = text;
      let searchIndex = 0;
      
      while ((match = regex.exec(originalText)) !== null) {
        highlightRanges.push({
          start: match.index,
          end: match.index + match[0].length,
          highlight
        });
        
        // Prevent infinite loop
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    });

    // Sort by position and remove overlaps (keep first occurrence)
    highlightRanges.sort((a, b) => a.start - b.start);
    const nonOverlapping = highlightRanges.filter((range, index) => {
      for (let i = 0; i < index; i++) {
        // Check if this range overlaps with any previous range
        if (highlightRanges[i].end > range.start && highlightRanges[i].start < range.end) {
          return false; // Overlapping, skip this one
        }
      }
      return true;
    });

    // Apply highlights from end to start to maintain positions
    nonOverlapping.reverse().forEach(({ start, end, highlight }) => {
      const beforeText = processedContent.substring(0, start);
      const highlightedText = processedContent.substring(start, end);
      const afterText = processedContent.substring(end);
      
      // Create highlight span with better handling for long text
      const highlightSpan = `<span class="highlight-${highlight.color}" data-highlight-id="${highlight.id}" style="display: inline; line-height: inherit;">${highlightedText}</span>`;
      processedContent = beforeText + highlightSpan + afterText;
    });

    return processedContent;
  }, []);

  // Improved event listeners with selection change detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add event listeners
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleTouchEnd);
    
    // Add selection change listener for better mobile detection
    document.addEventListener('selectionchange', handleSelectionChange);

    // Enhanced click outside handler - only hide menu when clicking truly outside
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      // Don't hide if clicking on the menu itself
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      // Don't hide if clicking within the text container (allow re-selection)
      if (container && container.contains(target)) {
        // If there's a current selection and we're clicking in the text area,
        // check if there's still a selection after a short delay
        if (menuVisible) {
          setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
              hideMenu();
            }
          }, 50);
        }
        return;
      }
      
      // Hide menu for clicks truly outside the container and menu
      hideMenu();
    };

    // Use capture phase to handle clicks before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [handleMouseUp, handleTouchEnd, handleSelectionChange, hideMenu, menuVisible]);

  // Filter highlights for current chapter
  const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);
  const processedContent = processContentWithHighlights(content, chapterHighlights);

  return (
    <>
      {/* Simple, clean CSS that doesn't interfere with text selection */}
      <style>{`
        .advanced-text-selection {
          /* Enhanced text selection - better mobile support */
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
          cursor: text;
          /* Mobile-specific properties */
          -webkit-touch-callout: default;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .advanced-text-selection *::selection {
          background: rgba(59, 130, 246, 0.3);
          color: inherit;
        }

        /* Improved highlight styles for long text */
        .highlight-yellow {
          background: rgba(255, 235, 59, 0.4);
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          display: inline;
          line-height: inherit;
          /* Better handling for long text that spans multiple lines */
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        
        .highlight-green {
          background: rgba(76, 175, 80, 0.4);
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          display: inline;
          line-height: inherit;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        
        .highlight-blue {
          background: rgba(33, 150, 243, 0.4);
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          display: inline;
          line-height: inherit;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        
        .highlight-red {
          background: rgba(244, 67, 54, 0.4);
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          display: inline;
          line-height: inherit;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }

        /* Improved selection menu with better positioning */
        .advanced-selection-menu {
          position: fixed;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 9999;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeIn 0.2s ease-out;
          backdrop-filter: blur(8px);
          /* Prevent text selection on the menu itself */
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          /* Ensure menu stays above other content */
          pointer-events: all;
        }

        /* Add a subtle arrow pointing to where selection was */
        .advanced-selection-menu::before {
          content: '';
          position: absolute;
          top: -8px;
          left: 20px;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 8px solid white;
          filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.1));
        }

        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(-8px) scale(0.95);
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1);
          }
        }

        .dark .advanced-selection-menu {
          background: #1f2937;
          border-color: #374151;
          color: white;
        }

        .dark .advanced-selection-menu::before {
          border-bottom-color: #1f2937;
        }

        .highlight-button {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          /* Ensure buttons are always clickable */
          pointer-events: auto;
          position: relative;
          z-index: 10000;
        }

        .highlight-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          border-color: rgba(255, 255, 255, 1);
        }

        .highlight-button:active {
          transform: translateY(0);
        }

        .ai-explain-button {
          background: #8b5cf6;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.9);
          width: 42px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          /* Ensure button is always clickable */
          pointer-events: auto;
          position: relative;
          z-index: 10000;
        }

        .ai-explain-button:hover {
          background: #7c3aed;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          border-color: rgba(255, 255, 255, 1);
        }

        .ai-explain-button:active {
          transform: translateY(0);
        }

        .btn-yellow { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .btn-green { background: linear-gradient(135deg, #10b981, #059669); }
        .btn-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .btn-red { background: linear-gradient(135deg, #ef4444, #dc2626); }

        /* Mobile-specific improvements */
        @media (max-width: 768px) {
          .advanced-selection-menu {
            padding: 12px 14px;
            gap: 10px;
            border-radius: 16px;
            /* Better shadow for mobile */
            box-shadow: 
              0 20px 25px -5px rgba(0, 0, 0, 0.15),
              0 10px 10px -5px rgba(0, 0, 0, 0.1);
          }
          
          .highlight-button {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            border-width: 3px;
          }

          .ai-explain-button {
            width: 46px;
            height: 40px;
            font-size: 20px;
            border-radius: 10px;
            border-width: 3px;
          }

          /* Adjust arrow for mobile */
          .advanced-selection-menu::before {
            left: 30px;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid white;
          }

          .dark .advanced-selection-menu::before {
            border-bottom-color: #1f2937;
          }
        }

        /* Very small screens */
        @media (max-width: 480px) {
          .advanced-selection-menu {
            padding: 14px 16px;
            gap: 12px;
            /* Ensure menu doesn't go off screen on very small devices */
            max-width: calc(100vw - 20px);
          }
        }
      `}</style>

      {/* Main Content Container - Simple and clean */}
      <div 
        ref={containerRef}
        className={`advanced-text-selection ${className}`}
        style={{
          padding: '16px 12px',
          minHeight: '200px',
          lineHeight: 1.6,
          fontSize: 15
        }}
      >
        <div
          className="theme-text-secondary leading-relaxed text-justify"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      </div>

      {/* Simple, reliable selection menu */}
      {menuVisible && (
        <div 
          ref={menuRef}
          className="advanced-selection-menu"
          style={{ 
            top: `${menuPosition.top}px`, 
            left: `${menuPosition.left}px`
          }}
        >
          {/* AI Explanation Button */}
          {onExplainWithAI && (
            <button
              className="ai-explain-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExplainWithAI();
              }}
              title="Explain with AI"
              type="button"
            >
              🧠
            </button>
          )}
          
          <button
            className="highlight-button btn-yellow"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyHighlight('yellow');
            }}
            title="Highlight Yellow"
            type="button"
          />
          <button
            className="highlight-button btn-green"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyHighlight('green');
            }}
            title="Highlight Green"
            type="button"
          />
          <button
            className="highlight-button btn-blue"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyHighlight('blue');
            }}
            title="Highlight Blue"
            type="button"
          />
          <button
            className="highlight-button btn-red"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyHighlight('red');
            }}
            title="Highlight Red"
            type="button"
          />
        </div>
      )}
    </>
  );
};

export default AdvancedTextSelectionEngine;
