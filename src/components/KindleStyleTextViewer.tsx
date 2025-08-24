import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Highlight } from '../types/types';

interface KindleStyleTextViewerProps {
  content: string;
  highlights: Highlight[];
  currentBook: string;
  addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  removeHighlight: (id: string) => void;
  onExplainWithAI?: (selectedText: string, context: string) => void;
  className?: string;
}

interface WordElement {
  text: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lineIndex: number;
  wordIndex: number;
}

interface SelectionState {
  isSelecting: boolean;
  startWord: number | null;
  endWord: number | null;
  selectionRect: DOMRect | null;
  isStartingSelection?: boolean;
}

interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  highlightId: string;
}

const KindleStyleTextViewer: React.FC<KindleStyleTextViewerProps> = ({
  content,
  highlights,
  currentBook,
  addHighlight,
  removeHighlight,
  onExplainWithAI,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [words, setWords] = useState<WordElement[]>([]);
  const [selection, setSelection] = useState<SelectionState>({
    isSelecting: false,
    startWord: null,
    endWord: null,
    selectionRect: null,
    isStartingSelection: false
  });
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  // Font and layout settings - responsive
  const getResponsiveFontSize = () => {
    if (typeof window === 'undefined') return 15;
    if (window.innerWidth <= 480) return 16;
    if (window.innerWidth <= 768) return 15;
    return 15;
  };

  const getResponsiveLineHeight = () => {
    if (typeof window === 'undefined') return 1.6;
    if (window.innerWidth <= 480) return 1.8;
    if (window.innerWidth <= 768) return 1.7;
    return 1.6;
  };

  const fontSize = getResponsiveFontSize();
  const lineHeight = getResponsiveLineHeight();
  const fontFamily = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

  // Touch handling states
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchMoved, setTouchMoved] = useState(false);
  const [initialTouchPos, setInitialTouchPos] = useState({ x: 0, y: 0 });

  // Parse content into words and calculate positions
  const parseAndLayoutText = useCallback(() => {
    if (!content || !containerRef.current || !measureRef.current) return [];

    const container = containerRef.current;
    const measurer = measureRef.current;
    const containerWidth = container.clientWidth - 40;

    // Set measurer font properties
    measurer.style.fontSize = `${fontSize}px`;
    measurer.style.fontFamily = fontFamily;
    measurer.style.lineHeight = `${lineHeight}`;
    measurer.style.visibility = 'hidden';
    measurer.style.position = 'absolute';
    measurer.style.whiteSpace = 'nowrap';

    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const wordElements: WordElement[] = [];
    
    let currentX = 0;
    let currentY = 20;
    let lineIndex = 0;
    let globalWordIndex = 0;

    const spaceWidth = (() => {
      measurer.textContent = ' ';
      return measurer.getBoundingClientRect().width || 4;
    })();

    const lineHeightPx = fontSize * lineHeight;

    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraphIndex > 0) {
        currentY += lineHeightPx * 0.8;
        lineIndex++;
      }

      const words = paragraph.split(/\s+/).filter(word => word.length > 0);
      
      words.forEach((word) => {
        measurer.textContent = word;
        const wordRect = measurer.getBoundingClientRect();
        const wordWidth = wordRect.width || word.length * 8;

        if (currentX + wordWidth > containerWidth - 20 && currentX > 0) {
          currentX = 0;
          currentY += lineHeightPx;
          lineIndex++;
        }

        wordElements.push({
          text: word,
          index: globalWordIndex,
          x: currentX,
          y: currentY,
          width: wordWidth,
          height: lineHeightPx * 0.9,
          lineIndex,
          wordIndex: globalWordIndex
        });

        currentX += wordWidth + spaceWidth;
        globalWordIndex++;
      });

      currentX = 0;
      currentY += lineHeightPx;
      lineIndex++;
    });

    return wordElements;
  }, [content, fontSize, lineHeight, fontFamily]);

  // Update word positions when content changes
  useEffect(() => {
    const updateLayout = () => {
      const newWords = parseAndLayoutText();
      setWords(newWords);
    };

    updateLayout();
    
    const handleResize = () => {
      setTimeout(updateLayout, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [parseAndLayoutText]);

  // Handle clicks outside to hide menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      
      if (target.closest('.kindle-menu') || target.closest('.kindle-text-viewer')) {
        return;
      }
      
      setShowMenu(false);
      setSelectedText('');
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  // Find word at position
  const findWordAtPosition = (clientX: number, clientY: number): number | null => {
    if (!containerRef.current) return null;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (
        x >= word.x &&
        x <= word.x + word.width &&
        y >= word.y &&
        y <= word.y + word.height
      ) {
        return i;
      }
    }
    return null;
  };

  // Unified selection end handler
  const handleSelectionEnd = () => {
    if (!selection.isSelecting || selection.startWord === null || selection.endWord === null) {
      setSelection({
        isSelecting: false,
        startWord: null,
        endWord: null,
        selectionRect: null,
        isStartingSelection: false
      });
      return;
    }

    const startIndex = Math.min(selection.startWord, selection.endWord);
    const endIndex = Math.max(selection.startWord, selection.endWord);
    
    if (startIndex === endIndex) {
      setSelection({
        isSelecting: false,
        startWord: null,
        endWord: null,
        selectionRect: null,
        isStartingSelection: false
      });
      return;
    }

    const selectedWords = words.slice(startIndex, endIndex + 1);
    const text = selectedWords.map(w => w.text).join(' ');
    setSelectedText(text);

    // Calculate menu position - place at end of selection
    const firstWord = selectedWords[0];
    const lastWord = selectedWords[selectedWords.length - 1];
    const container = containerRef.current;
    
    if (container) {
      const containerRect = container.getBoundingClientRect();
      // Position menu at the end of the last selected word
      let menuX = containerRect.left + lastWord.x + lastWord.width + 10;
      let menuY = containerRect.top + lastWord.y + window.scrollY - 60;
      
      const menuWidth = 300;
      const menuHeight = 60;
      
      // Keep menu within viewport
      if (menuX + menuWidth > window.innerWidth - 10) {
        menuX = containerRect.left + lastWord.x - menuWidth - 10;
      }
      if (menuX < 10) {
        menuX = 10;
        menuY = containerRect.top + lastWord.y + lastWord.height + window.scrollY + 10;
      }
      if (menuY < window.scrollY + 10) {
        menuY = containerRect.top + lastWord.y + lastWord.height + window.scrollY + 10;
      }
      
      setMenuPosition({ x: menuX, y: menuY });
      setShowMenu(true);
    }

    setSelection(prev => ({
      ...prev,
      isSelecting: false,
      isStartingSelection: false
    }));
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const wordIndex = findWordAtPosition(e.clientX, e.clientY);
    if (wordIndex !== null) {
      setSelection({
        isSelecting: true,
        startWord: wordIndex,
        endWord: wordIndex,
        selectionRect: null,
        isStartingSelection: false
      });
      setShowMenu(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selection.isSelecting || selection.startWord === null) return;

    const wordIndex = findWordAtPosition(e.clientX, e.clientY);
    if (wordIndex !== null) {
      setSelection(prev => ({
        ...prev,
        endWord: wordIndex
      }));
    }
  };

  const handleMouseUp = () => {
    handleSelectionEnd();
  };

  // Touch event handlers - improved mobile detection
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchMoved(false);
    setInitialTouchPos({ x: touch.clientX, y: touch.clientY });
    
    const wordIndex = findWordAtPosition(touch.clientX, touch.clientY);
    if (wordIndex !== null) {
      // Immediate visual feedback with longer duration
      setSelection({
        isSelecting: false,
        startWord: wordIndex,
        endWord: wordIndex,
        selectionRect: null,
        isStartingSelection: true
      });
      
      // Stronger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
      
      // Shorter delay for better responsiveness
      setTimeout(() => {
        const currentTime = Date.now();
        const timeDiff = currentTime - touchStartTime;
        
        if (!touchMoved && timeDiff < 300) {
          setSelection(prev => ({
            ...prev,
            isSelecting: true,
            isStartingSelection: false
          }));
          setShowMenu(false);
        } else {
          // Clear the starting selection if it was a scroll
          setSelection({
            isSelecting: false,
            startWord: null,
            endWord: null,
            selectionRect: null,
            isStartingSelection: false
          });
        }
      }, 100); // Reduced delay for better responsiveness
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const moveDistance = Math.abs(touch.clientX - initialTouchPos.x) + Math.abs(touch.clientY - initialTouchPos.y);
    
    // More sensitive touch detection
    if (moveDistance > 8) {
      setTouchMoved(true);
      
      // If we're not actively selecting, let the scroll happen
      if (!selection.isSelecting) {
        // Clear any starting selection
        if (selection.isStartingSelection) {
          setSelection({
            isSelecting: false,
            startWord: null,
            endWord: null,
            selectionRect: null,
            isStartingSelection: false
          });
        }
        return;
      }
    }
    
    // Handle active selection
    if (selection.isSelecting && selection.startWord !== null) {
      e.preventDefault(); // Prevent scrolling during selection
      
      const wordIndex = findWordAtPosition(touch.clientX, touch.clientY);
      if (wordIndex !== null) {
        setSelection(prev => ({
          ...prev,
          endWord: wordIndex
        }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    console.log('TouchEnd - Selection State:', {
      isSelecting: selection.isSelecting,
      isStartingSelection: selection.isStartingSelection,
      startWord: selection.startWord,
      endWord: selection.endWord,
      touchMoved,
      timeSinceStart: Date.now() - touchStartTime
    });

    // If we were just scrolling, don't process selection
    if (touchMoved && !selection.isSelecting) {
      // Clear any visual indicators
      setSelection({
        isSelecting: false,
        startWord: null,
        endWord: null,
        selectionRect: null,
        isStartingSelection: false
      });
      setTouchMoved(false);
      return;
    }
    
    // Process selection if we were actively selecting AND have both start and end
    if (selection.isSelecting && selection.startWord !== null && selection.endWord !== null) {
      console.log('Processing selection:', {
        startWord: selection.startWord,
        endWord: selection.endWord,
        selectedWordsCount: Math.abs(selection.endWord - selection.startWord) + 1
      });
      handleSelectionEnd();
    } else if (selection.isStartingSelection && selection.startWord !== null) {
      // Handle single word selection
      console.log('Converting starting selection to actual selection');
      setSelection(prev => ({
        ...prev,
        isSelecting: false,
        endWord: prev.startWord,
        isStartingSelection: false
      }));
      
      // Process the single word selection after a brief delay
      setTimeout(() => {
        handleSelectionEnd();
      }, 50);
    } else {
      // Clear selection state
      console.log('Clearing selection state');
      setSelection({
        isSelecting: false,
        startWord: null,
        endWord: null,
        selectionRect: null,
        isStartingSelection: false
      });
    }
    
    setTouchMoved(false);
  };

  // Calculate highlight rectangles
  const highlightRects = useMemo(() => {
    const rects: HighlightRect[] = [];
    const currentHighlights = highlights.filter(h => h.chapterId === currentBook);

    currentHighlights.forEach(highlight => {
      const highlightWords = highlight.text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      for (let i = 0; i <= words.length - highlightWords.length; i++) {
        const matchingWords = words.slice(i, i + highlightWords.length);
        const matchText = matchingWords.map(w => w.text.toLowerCase()).join(' ');
        
        if (matchText === highlight.text.toLowerCase()) {
          const groupedByLine = matchingWords.reduce((acc, word) => {
            if (!acc[word.lineIndex]) acc[word.lineIndex] = [];
            acc[word.lineIndex].push(word);
            return acc;
          }, {} as Record<number, WordElement[]>);

          Object.values(groupedByLine).forEach(lineWords => {
            const firstWord = lineWords[0];
            const lastWord = lineWords[lineWords.length - 1];
            
            rects.push({
              x: firstWord.x,
              y: firstWord.y,
              width: lastWord.x + lastWord.width - firstWord.x,
              height: firstWord.height,
              color: highlight.color,
              highlightId: highlight.id
            });
          });
          break;
        }
      }
    });

    return rects;
  }, [words, highlights, currentBook]);

  // Calculate selection overlay rectangles
  const selectionRects = useMemo(() => {
    if ((!selection.isSelecting && !selection.isStartingSelection) || selection.startWord === null || selection.endWord === null) {
      return [];
    }

    const startIndex = Math.min(selection.startWord, selection.endWord);
    const endIndex = Math.max(selection.startWord, selection.endWord);
    const selectedWords = words.slice(startIndex, endIndex + 1);

    const groupedByLine = selectedWords.reduce((acc, word) => {
      if (!acc[word.lineIndex]) acc[word.lineIndex] = [];
      acc[word.lineIndex].push(word);
      return acc;
    }, {} as Record<number, WordElement[]>);

    return Object.values(groupedByLine).map((lineWords) => {
      const firstWord = lineWords[0];
      const lastWord = lineWords[lineWords.length - 1];
      return {
        x: firstWord.x,
        y: firstWord.y,
        width: lastWord.x + lastWord.width - firstWord.x,
        height: firstWord.height,
        isStarting: selection.isStartingSelection
      };
    });
  }, [selection, words]);

  // Handle highlight application
  const applyHighlight = (color: string) => {
    if (selectedText) {
      addHighlight({
        text: selectedText,
        color,
        chapterId: currentBook
      });
    }
    setShowMenu(false);
    setSelectedText('');
  };

  // Handle AI explanation
  const handleAIExplanation = () => {
    if (selectedText && onExplainWithAI) {
      onExplainWithAI(selectedText, content);
    }
    setShowMenu(false);
    setSelectedText('');
  };

  return (
    <>
      <style>{`
        .kindle-text-viewer {
          position: relative;
          padding: 20px;
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          font-family: ${fontFamily};
          cursor: text;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        .kindle-word {
          position: absolute;
          cursor: text;
          pointer-events: auto;
          display: inline-block;
          margin: 0;
          padding: 0;
          line-height: 1;
          white-space: nowrap;
        }

        .kindle-word:hover {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 2px;
        }

        .kindle-highlight {
          position: absolute;
          pointer-events: none;
          border-radius: 3px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
          z-index: 5;
        }

        .highlight-yellow { background: #ffeb3b; }
        .highlight-green { background: #4caf50; }
        .highlight-blue { background: #2196f3; }
        .highlight-red { background: #f44336; }

        .kindle-selection {
          position: absolute;
          background: rgba(59, 130, 246, 0.4);
          pointer-events: none;
          border-radius: 3px;
          border: 1px solid rgba(59, 130, 246, 0.6);
          animation: selectionPulse 1.5s ease-in-out infinite;
          z-index: 10;
        }

        .starting-selection {
          background: rgba(59, 130, 246, 0.6) !important;
          animation: startingPulse 0.5s ease-in-out;
        }

        @keyframes selectionPulse {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.01);
          }
        }

        @keyframes startingPulse {
          0% { 
            opacity: 0.8; 
            transform: scale(1.05);
          }
          100% { 
            opacity: 0.4;
            transform: scale(1);
          }
        }

        .kindle-menu {
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
          animation: menuFadeIn 0.2s ease-out;
          backdrop-filter: blur(8px);
        }

        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dark .kindle-menu {
          background: #1f2937;
          border-color: #374151;
          color: white;
        }

        .kindle-menu-button {
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
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .kindle-menu-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .kindle-menu-button:active {
          transform: scale(0.95);
        }

        .ai-button { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        .ai-button:hover { background: linear-gradient(135deg, #7c3aed, #6d28d9); }

        .yellow-btn { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .green-btn { background: linear-gradient(135deg, #10b981, #059669); }
        .blue-btn { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .red-btn { background: linear-gradient(135deg, #ef4444, #dc2626); }

        .measurer {
          position: absolute;
          visibility: hidden;
          height: auto;
          width: auto;
          white-space: nowrap;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .kindle-text-viewer {
            padding: 16px;
            font-size: 16px;
            line-height: 1.7;
          }

          .kindle-menu {
            padding: 14px 18px;
            gap: 14px;
          }

          .kindle-menu-button {
            min-width: 48px;
            height: 48px;
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .kindle-text-viewer {
            padding: 12px;
            font-size: 17px;
            line-height: 1.8;
          }

          .kindle-menu {
            padding: 16px 20px;
            gap: 16px;
            max-width: calc(100vw - 20px);
          }

          .kindle-menu-button {
            min-width: 52px;
            height: 52px;
            font-size: 18px;
          }
        }
      `}</style>

      <div 
        ref={containerRef}
        className={`kindle-text-viewer ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ height: words.length > 0 ? Math.max(...words.map(w => w.y + w.height)) + 40 : 'auto' }}
      >
        <span ref={measureRef} className="measurer">M</span>

        {/* Render highlights */}
        {highlightRects.map((rect, index) => (
          <div
            key={`highlight-${rect.highlightId}-${index}`}
            className={`kindle-highlight highlight-${rect.color}`}
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height
            }}
          />
        ))}

        {/* Render selection overlay */}
        {selectionRects.map((rect, index) => (
          <div
            key={`selection-${index}`}
            className={`kindle-selection ${rect.isStarting ? 'starting-selection' : ''}`}
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height
            }}
          />
        ))}

        {/* Render words */}
        {words.map((word, index) => (
          <span
            key={index}
            className="kindle-word"
            style={{
              left: word.x,
              top: word.y,
              width: word.width,
              height: word.height
            }}
            data-word-index={index}
          >
            {word.text}
          </span>
        ))}
      </div>

      {/* Selection menu */}
      {showMenu && (
        <div 
          className="kindle-menu"
          style={{ 
            left: menuPosition.x,
            top: menuPosition.y
          }}
        >
          {onExplainWithAI && (
            <button 
              className="kindle-menu-button ai-button"
              onClick={handleAIExplanation}
              title="Explain with AI"
            >
              🧠
            </button>
          )}
          
          <button 
            className="kindle-menu-button yellow-btn"
            onClick={() => applyHighlight('yellow')}
            title="Yellow highlight"
          >
            ●
          </button>
          
          <button 
            className="kindle-menu-button green-btn"
            onClick={() => applyHighlight('green')}
            title="Green highlight"
          >
            ●
          </button>
          
          <button 
            className="kindle-menu-button blue-btn"
            onClick={() => applyHighlight('blue')}
            title="Blue highlight"
          >
            ●
          </button>
          
          <button 
            className="kindle-menu-button red-btn"
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

export default KindleStyleTextViewer;
