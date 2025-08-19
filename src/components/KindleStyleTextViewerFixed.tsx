import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface WordElement {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lineIndex: number;
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
  isStarting?: boolean;
}

interface Highlight {
  id: string;
  text: string;
  color: string;
  chapterId: string;
  startWordIndex?: number;
  endWordIndex?: number;
}

interface KindleStyleTextViewerProps {
  content: string;
  highlights: Highlight[];
  onHighlight?: (text: string, color: string) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  onExplainWithAI?: (text: string, context?: string) => void;
  currentBook: string;
  className?: string;
}

const KindleStyleTextViewer: React.FC<KindleStyleTextViewerProps> = ({
  content,
  highlights,
  onHighlight,
  onRemoveHighlight,
  onExplainWithAI,
  currentBook,
  className = ''
}) => {
  // Mobile detection and responsive calculations
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;
  const isSmallMobile = () => typeof window !== 'undefined' && window.innerWidth <= 480;
  
  const fontSize = isSmallMobile() ? 17 : isMobile() ? 16 : 15;
  const lineHeight = isSmallMobile() ? 1.8 : isMobile() ? 1.7 : 1.6;
  const fontFamily = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

  // State management
  const [words, setWords] = useState<WordElement[]>([]);
  const [selection, setSelection] = useState<SelectionState>({
    isSelecting: false,
    startWord: null,
    endWord: null,
    selectionRect: null,
    isStartingSelection: false
  });
  const [selectedText, setSelectedText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // Enhanced mobile touch handling states
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchMoved, setTouchMoved] = useState(false);
  const [initialTouchPos, setInitialTouchPos] = useState({ x: 0, y: 0 });
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [tapCount, setTapCount] = useState<number>(0);
  const [dragStartWord, setDragStartWord] = useState<number | null>(null);
  const [touchActive, setTouchActive] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas-based text measurement for mobile accuracy
  const createTextMeasurer = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    return {
      measureText: (text: string) => {
        const metrics = ctx.measureText(text);
        return {
          width: metrics.width,
          height: fontSize * 1.2
        };
      },
      spaceWidth: ctx.measureText(' ').width
    };
  }, [fontSize, fontFamily]);

  // Mobile-optimized text layout system
  const parseAndLayoutText = useCallback(() => {
    if (!content || !containerRef.current) return [];

    const container = containerRef.current;
    const measurer = createTextMeasurer();
    if (!measurer) return [];

    // Mobile-optimized container calculations
    const mobilePadding = isSmallMobile() ? 12 : isMobile() ? 16 : 20;
    const containerWidth = container.clientWidth - (mobilePadding * 2);
    
    console.log('Mobile-First Layout Debug:', {
      containerClientWidth: container.clientWidth,
      effectiveWidth: containerWidth,
      fontSize,
      isMobile: isMobile(),
      isSmallMobile: isSmallMobile()
    });

    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const wordElements: WordElement[] = [];
    
    let currentX = 0;
    let currentY = mobilePadding;
    let lineIndex = 0;

    const lineHeightPx = fontSize * lineHeight;
    const spaceWidth = Math.max(measurer.spaceWidth, 4);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraphIndex > 0) {
        currentY += lineHeightPx * 0.8;
        lineIndex++;
      }

      const words = paragraph.split(/\s+/).filter(word => word.length > 0);
      
      words.forEach((word) => {
        const measurements = measurer.measureText(word);
        const wordWidth = Math.max(measurements.width, word.length * 6);

        // Smart line wrapping for mobile
        if (currentX + wordWidth > containerWidth - 10 && currentX > 0) {
          currentX = 0;
          currentY += lineHeightPx;
          lineIndex++;
        }

        wordElements.push({
          text: word,
          x: currentX,
          y: currentY - (lineHeightPx * 0.1), // Adjust Y position to center text better
          width: wordWidth,
          height: lineHeightPx * 0.9, // Slightly larger highlight area
          lineIndex: lineIndex
        });

        currentX += wordWidth + spaceWidth;
      });

      // Add paragraph spacing
      if (paragraphIndex < paragraphs.length - 1) {
        currentY += lineHeightPx * 0.5;
      }
    });

    console.log('Generated words for mobile:', wordElements.length);
    return wordElements;
  }, [content, fontSize, lineHeight, fontFamily, createTextMeasurer]);

  // Update layout
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

  // Find word at position with mobile-optimized hit detection
  const findWordAtPosition = (clientX: number, clientY: number): number | null => {
    if (!containerRef.current) return null;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Mobile-friendly hit detection with larger touch targets
    const touchBuffer = isMobile() ? 5 : 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (
        x >= word.x - touchBuffer &&
        x <= word.x + word.width + touchBuffer &&
        y >= word.y - touchBuffer &&
        y <= word.y + word.height + touchBuffer
      ) {
        return i;
      }
    }
    return null;
  };

  // Enhanced mobile selection completion
  const handleSelectionEnd = () => {
    console.log('Selection End - State:', {
      isSelecting: selection.isSelecting,
      isStartingSelection: selection.isStartingSelection,
      startWord: selection.startWord,
      endWord: selection.endWord,
      isMobile: isMobile()
    });

    if (selection.startWord === null) {
      setSelection({
        isSelecting: false,
        startWord: null,
        endWord: null,
        selectionRect: null,
        isStartingSelection: false
      });
      return;
    }

    // Handle both single word and range selections
    const startIndex = selection.startWord;
    const endIndex = selection.endWord ?? selection.startWord;
    
    const actualStart = Math.min(startIndex, endIndex);
    const actualEnd = Math.max(startIndex, endIndex);
    const wordCount = actualEnd - actualStart + 1;
    
    // Mobile-aware selection validation
    if (isMobile() && wordCount < 4 && actualStart !== actualEnd) {
      console.log(`Mobile: Selection too short (${wordCount} words) - minimum 4 required for drag`);
      clearSelection();
      return;
    }
    
    const selectedWords = words.slice(actualStart, actualEnd + 1);
    const text = selectedWords.map(w => w.text).join(' ');
    setSelectedText(text);

    // Enhanced menu positioning with proper viewport handling
    if (selectedWords.length > 0) {
      const lastWord = selectedWords[selectedWords.length - 1];
      const container = containerRef.current;
      
      if (container) {
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the exact end position of the selected text
        const textEndX = lastWord.x + lastWord.width;
        const textEndY = lastWord.y;
        
        // Convert to viewport coordinates
        const viewportX = containerRect.left + textEndX;
        const viewportY = containerRect.top + textEndY;
        
        // Menu dimensions
        const menuWidth = 320;
        const menuHeight = 60;
        const menuGap = 10;
        
        // Initial positioning: to the right of selection end
        let menuX = viewportX + menuGap;
        let menuY = viewportY - menuHeight - menuGap; // Above the text
        
        console.log('Menu Position Calculation:', {
          selectedText: selectedText,
          lastWordPosition: { x: lastWord.x, y: lastWord.y, width: lastWord.width },
          textEnd: { x: textEndX, y: textEndY },
          viewport: { x: viewportX, y: viewportY },
          initialMenu: { x: menuX, y: menuY },
          windowSize: { width: window.innerWidth, height: window.innerHeight },
          scrollY: window.scrollY
        });
        
        // Horizontal positioning adjustments
        if (menuX + menuWidth > window.innerWidth - 10) {
          // Try positioning to the left of selection
          menuX = viewportX - menuWidth - menuGap;
          
          // If still off-screen, center on viewport
          if (menuX < 10) {
            menuX = Math.max(10, (window.innerWidth - menuWidth) / 2);
            // If centered, put menu below text
            menuY = viewportY + lastWord.height + menuGap;
          }
        }
        
        // Ensure menu is not cut off on the left
        if (menuX < 10) {
          menuX = 10;
        }
        
        // Vertical positioning adjustments
        if (menuY < window.scrollY + 10) {
          // Position below text if above viewport
          menuY = viewportY + lastWord.height + menuGap;
        }
        
        // Ensure menu doesn't go below viewport
        const maxY = window.scrollY + window.innerHeight - menuHeight - 10;
        if (menuY > maxY) {
          menuY = Math.max(window.scrollY + 10, maxY);
        }
        
        console.log('Final Menu Position:', {
          x: menuX,
          y: menuY,
          adjustments: {
            horizontalOverflow: viewportX + menuGap + menuWidth > window.innerWidth,
            verticalOverflow: viewportY - menuHeight - menuGap < window.scrollY,
            finallyPositioned: 'at text end with fallbacks applied'
          }
        });
        
        setMenuPosition({ x: menuX, y: menuY });
        setShowMenu(true);
        
        // Success haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([20, 30, 20]);
        }
      }
    }

    setSelection(prev => ({
      ...prev,
      isSelecting: false,
      isStartingSelection: false
    }));
  };

  // Enhanced mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Mark touch as active to prevent mouse events
    setTouchActive(true);
    
    // Prevent mouse events from firing on mobile
    if (isMobile()) {
      // Only prevent default if we're not in a scrolling gesture
      // This allows normal scrolling to work
      e.stopPropagation();
    }
    
    const touch = e.touches[0];
    const currentTime = Date.now();
    
    setTouchStartTime(currentTime);
    setTouchMoved(false);
    setInitialTouchPos({ x: touch.clientX, y: touch.clientY });
    setShowMenu(false);
    
    const wordIndex = findWordAtPosition(touch.clientX, touch.clientY);
    console.log('Touch Start - Word Index:', wordIndex, 'isMobile:', isMobile());
    
    if (wordIndex !== null) {
      // Check for double-tap on mobile
      const timeSinceLastTap = currentTime - lastTapTime;
      const isDoubleTap = timeSinceLastTap < 500 && timeSinceLastTap > 20; // More lenient timing for testing
      
      setLastTapTime(currentTime);
      
      if (isMobile()) {
        // On mobile: ONLY allow selection on double-tap, NEVER on single tap
        if (isDoubleTap) {
          console.log('Touch: Double-tap detected - starting selection');
          e.preventDefault(); // Prevent scrolling only when starting selection
          
          setSelection({
            isSelecting: true,
            startWord: wordIndex,
            endWord: wordIndex,
            selectionRect: null,
            isStartingSelection: false
          });
          
          // Strong haptic feedback for double-tap
          if ('vibrate' in navigator) {
            navigator.vibrate([15, 50, 15]);
          }
          
          // Store drag start for potential multi-word selections
          setDragStartWord(wordIndex);
        } else {
          console.log('Touch: Single tap - clearing selection, allowing scroll');
          // Single tap on mobile: ALWAYS clear any existing selection and allow scrolling
          clearSelection();
          setDragStartWord(null);
          // Don't prevent default - allow normal scrolling
        }
      } else {
        // Desktop: immediate selection start (unchanged)
        setSelection({
          isSelecting: false,
          startWord: wordIndex,
          endWord: wordIndex,
          selectionRect: null,
          isStartingSelection: true
        });
        
        // Immediate visual feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([15, 50, 15]);
        }
        
        // Store drag start for multi-word selections
        setDragStartWord(wordIndex);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const moveDistance = Math.abs(touch.clientX - initialTouchPos.x) + Math.abs(touch.clientY - initialTouchPos.y);
    
    // Detect movement
    if (moveDistance > 10) {
      setTouchMoved(true);
      
      // Mobile drag selection behavior - ONLY if selection is already active
      if (isMobile()) {
        // Only allow drag selection if we're already in selection mode (after double-tap)
        if (selection.isSelecting && dragStartWord !== null) {
          const wordIndex = findWordAtPosition(touch.clientX, touch.clientY);
          
          if (wordIndex !== null && wordIndex !== dragStartWord) {
            console.log('Mobile: Drag detected during active selection - expanding selection');
            e.preventDefault(); // Prevent scrolling during active selection drag
            
            // Expand existing selection
            setSelection(prev => ({
              ...prev,
              endWord: wordIndex,
              isSelecting: true,
              isStartingSelection: false
            }));
            
            return;
          }
        } else {
          // No active selection on mobile - allow normal scrolling
          console.log('Mobile: Movement detected without active selection - allowing scroll');
          return;
        }
      } else {
        // Desktop behavior (unchanged)
        if (!selection.isSelecting && !selection.isStartingSelection) {
          return;
        }
      }
    }
    
    // Handle active selection expansion (desktop or mobile with active selection)
    if ((selection.isSelecting || selection.isStartingSelection) && selection.startWord !== null) {
      e.preventDefault(); // Prevent scrolling during selection
      
      const wordIndex = findWordAtPosition(touch.clientX, touch.clientY);
      if (wordIndex !== null) {
        setSelection(prev => ({
          ...prev,
          endWord: wordIndex,
          isSelecting: true,
          isStartingSelection: false
        }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const timeDiff = Date.now() - touchStartTime;
    
    console.log('Touch End Debug:', {
      touchMoved,
      timeDiff,
      isSelecting: selection.isSelecting,
      isStartingSelection: selection.isStartingSelection,
      startWord: selection.startWord,
      endWord: selection.endWord,
      isMobile: isMobile()
    });

    // Mobile behavior
    if (isMobile()) {
      // Handle multi-word drag selection
      if (selection.isSelecting && selection.startWord !== null && selection.endWord !== null) {
        const wordCount = Math.abs(selection.endWord - selection.startWord) + 1;
        
        if (wordCount >= 4) {
          console.log('Mobile: Drag selection with 4+ words - completing');
          setTimeout(() => {
            handleSelectionEnd();
          }, 50);
        } else {
          console.log('Mobile: Drag selection too short (< 4 words) - clearing');
          clearSelection();
        }
      }
      // Handle double-tap single word selection  
      else if (selection.isSelecting && selection.startWord !== null && selection.endWord !== null 
               && selection.startWord === selection.endWord && !touchMoved) {
        console.log('Mobile: Double-tap single word selection - completing');
        setTimeout(() => {
          handleSelectionEnd();
        }, 50);
      }
      // Clear everything else on mobile
      else {
        console.log('Mobile: Clearing selection - not meeting criteria');
        clearSelection();
      }
    }
    // Desktop behavior (original logic)
    else {
      // Quick tap without movement - complete selection
      if (!touchMoved && timeDiff < 300 && selection.startWord !== null) {
        console.log('Desktop: Quick tap - completing selection');
        setSelection(prev => ({
          ...prev,
          endWord: prev.startWord,
          isSelecting: false,
          isStartingSelection: false
        }));
        
        setTimeout(() => {
          handleSelectionEnd();
        }, 50);
      }
      // Long press or drag - complete if we have selection
      else if ((selection.isSelecting || selection.isStartingSelection) && selection.startWord !== null) {
        console.log('Desktop: Completing drag/long press selection');
        if (selection.endWord === null) {
          setSelection(prev => ({ ...prev, endWord: prev.startWord }));
        }
        setTimeout(() => {
          handleSelectionEnd();
        }, 50);
      }
      // Clear if just scrolling
      else {
        console.log('Desktop: Clearing selection - was scrolling');
        clearSelection();
      }
    }
    
    setTouchMoved(false);
    setDragStartWord(null);
    
    // Reset touch active flag after a delay to prevent mouse events
    setTimeout(() => {
      setTouchActive(false);
    }, 500);
  };
  
  const clearSelection = () => {
    setSelection({
      isSelecting: false,
      startWord: null,
      endWord: null,
      selectionRect: null,
      isStartingSelection: false
    });
    setShowMenu(false);
    setSelectedText('');
  };

  // Mouse handlers for desktop (also handles Playwright testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore mouse events if touch is active (prevents mobile double-firing)
    if (touchActive && isMobile()) {
      console.log('Mouse event ignored - touch is active');
      return;
    }
    
    e.preventDefault();
    const wordIndex = findWordAtPosition(e.clientX, e.clientY);
    if (wordIndex !== null) {
      // Mobile-aware mouse handling for testing compatibility
      if (isMobile()) {
        console.log('Mobile (via mouse): Click detected - checking for double-click requirement');
        
        // Check for double-click timing - more lenient for Playwright testing
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTime;
        const isDoubleClick = timeSinceLastTap < 500 && timeSinceLastTap > 20; // More lenient timing
        
        setLastTapTime(currentTime);
        
        if (isDoubleClick) {
          console.log('Mobile (via mouse): Double-click confirmed - starting selection');
          setSelection({
            isSelecting: true,
            startWord: wordIndex,
            endWord: wordIndex,
            selectionRect: null,
            isStartingSelection: false
          });
          setDragStartWord(wordIndex);
        } else {
          console.log('Mobile (via mouse): Single click - no selection allowed');
          // Single click - clear any existing selection and DO NOT start new selection
          clearSelection();
          setDragStartWord(null);
        }
        setShowMenu(false);
      } else {
        // Desktop: immediate selection start
        setSelection({
          isSelecting: true,
          startWord: wordIndex,
          endWord: wordIndex,
          selectionRect: null,
          isStartingSelection: false
        });
        setShowMenu(false);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Ignore mouse events if touch is active (prevents mobile double-firing)
    if (touchActive && isMobile()) {
      return;
    }
    
    // Only allow mouse move selection if we have an active selection
    if (selection.isSelecting && selection.startWord !== null) {
      const wordIndex = findWordAtPosition(e.clientX, e.clientY);
      if (wordIndex !== null) {
        setSelection(prev => ({
          ...prev,
          endWord: wordIndex
        }));
      }
    }
  };

  const handleMouseUp = () => {
    // Ignore mouse events if touch is active (prevents mobile double-firing)
    if (touchActive && isMobile()) {
      return;
    }
    
    if (selection.isSelecting) {
      handleSelectionEnd();
    }
  };

  // Check if selected text is exactly highlighted (for showing delete button)
  const getExactHighlightMatch = (text: string): Highlight | null => {
    const currentHighlights = highlights.filter(h => h.chapterId === currentBook);
    
    // ONLY show delete button for exact matches to prevent random word deletion
    return currentHighlights.find(h => {
      const highlightText = h.text.toLowerCase().trim();
      const selectedTextLower = text.toLowerCase().trim();
      
      // Only exact matches - no substring matching to prevent false positives
      return highlightText === selectedTextLower;
    }) || null;
  };

  // Find the specific highlight to remove (for the delete action)
  const getHighlightToRemove = (text: string): Highlight | null => {
    const currentHighlights = highlights.filter(h => h.chapterId === currentBook);
    
    // Priority 1: Exact match
    const exactMatch = currentHighlights.find(h => h.text.toLowerCase() === text.toLowerCase());
    if (exactMatch) return exactMatch;
    
    // Priority 2: Find the highlight that contains the selected text
    const containerMatch = currentHighlights.find(h => {
      const highlightText = h.text.toLowerCase();
      const selectedTextLower = text.toLowerCase();
      return highlightText.includes(selectedTextLower) && selectedTextLower.trim() !== '';
    });
    
    return containerMatch || null;
  };

  // Highlight application
  const applyHighlight = (color: string) => {
    if (selectedText && onHighlight) {
      onHighlight(selectedText, color);
    }
    setShowMenu(false);
    setSelectedText('');
    setSelection({
      isSelecting: false,
      startWord: null,
      endWord: null,
      selectionRect: null,
      isStartingSelection: false
    });
  };

  // Remove highlight
  const removeHighlight = () => {
    if (selectedText && onRemoveHighlight) {
      const highlightToRemove = getHighlightToRemove(selectedText);
      if (highlightToRemove) {
        onRemoveHighlight(highlightToRemove.id);
      }
    }
    setShowMenu(false);
    setSelectedText('');
    setSelection({
      isSelecting: false,
      startWord: null,
      endWord: null,
      selectionRect: null,
      isStartingSelection: false
    });
  };

  const handleAIExplanation = () => {
    if (selectedText && onExplainWithAI) {
      onExplainWithAI(selectedText, content);
    }
    setShowMenu(false);
    setSelectedText('');
    setSelection({
      isSelecting: false,
      startWord: null,
      endWord: null,
      selectionRect: null,
      isStartingSelection: false
    });
  };

  // AI Guru explanation (enhanced with educational prompt)
  const handleAIGuruExplanation = () => {
    if (selectedText && onExplainWithAI) {
      // Create enhanced context for AI Guru
      const contextWindow = 200; // characters around the selected text
      const selectedIndex = content.indexOf(selectedText);
      const contextStart = Math.max(0, selectedIndex - contextWindow);
      const contextEnd = Math.min(content.length, selectedIndex + selectedText.length + contextWindow);
      const contextualContent = content.slice(contextStart, contextEnd);
      
      // Enhanced prompt for AI Guru with college student focus
      const aiGuruRequest = {
        selectedText,
        context: contextualContent,
        promptType: 'AI_GURU_ENHANCED',
        learningLevel: 'college',
        requireFormatting: true
      };
      
      onExplainWithAI(JSON.stringify(aiGuruRequest), content);
    }
    setShowMenu(false);
    setSelectedText('');
    setSelection({
      isSelecting: false,
      startWord: null,
      endWord: null,
      selectionRect: null,
      isStartingSelection: false
    });
  };

  // Calculate highlight rectangles
  const highlightRects = useMemo(() => {
    const rects: HighlightRect[] = [];
    const currentHighlights = highlights.filter(h => h.chapterId === currentBook);

    currentHighlights.forEach(highlight => {
      // Use text-based matching for backward compatibility
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
    if ((!selection.isSelecting && !selection.isStartingSelection) || selection.startWord === null) {
      return [];
    }

    const startIndex = selection.startWord;
    const endIndex = selection.endWord ?? selection.startWord;
    const actualStart = Math.min(startIndex, endIndex);
    const actualEnd = Math.max(startIndex, endIndex);
    
    const selectedWords = words.slice(actualStart, actualEnd + 1);

    const groupedByLine = selectedWords.reduce((acc, word) => {
      if (!acc[word.lineIndex]) acc[word.lineIndex] = [];
      acc[word.lineIndex].push(word);
      return acc;
    }, {} as Record<number, WordElement[]>);

    return Object.values(groupedByLine).map(lineWords => {
      const firstWord = lineWords[0];
      const lastWord = lineWords[lineWords.length - 1];
      
      return {
        x: firstWord.x,
        y: firstWord.y,
        width: lastWord.x + lastWord.width - firstWord.x,
        height: firstWord.height,
        color: 'selection',
        highlightId: 'selection',
        isStarting: selection.isStartingSelection
      };
    });
  }, [selection, words]);

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

  return (
    <>
      <style>{`
        .kindle-text-viewer {
          position: relative;
          width: 100%;
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          color: #f3f4f6;
          background: transparent;
          padding: 20px;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        .dark .kindle-text-viewer {
          color: #f9fafb;
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
          color: #f3f4f6;
          font-weight: 400;
        }

        .dark .kindle-word {
          color: #f9fafb;
        }

        .kindle-word:hover {
          background-color: rgba(59, 130, 246, 0.2);
          border-radius: 2px;
        }

        .kindle-highlight {
          position: absolute;
          pointer-events: none;
          border-radius: 3px;
          opacity: 0.6;
          transition: opacity 0.2s ease;
          z-index: 5;
        }

        .highlight-yellow { 
          background: rgba(255, 235, 59, 0.7); 
          color: #ffffff !important;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
        }
        .highlight-green { 
          background: rgba(76, 175, 80, 0.6); 
          color: #ffffff !important;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
        }
        .highlight-blue { 
          background: rgba(33, 150, 243, 0.6); 
          color: #ffffff !important;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
        }
        .highlight-red { 
          background: rgba(244, 67, 54, 0.6); 
          color: #ffffff !important;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
        }

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
          padding: 8px 12px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
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
          padding: 8px 10px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 36px;
          height: 36px;
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

        .ai-guru-button { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .ai-guru-button:hover { background: linear-gradient(135deg, #d97706, #b45309); }

        .remove-button { background: linear-gradient(135deg, #6b7280, #4b5563); }
        .remove-button:hover { background: linear-gradient(135deg, #4b5563, #374151); }

        .yellow-btn { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .green-btn { background: linear-gradient(135deg, #10b981, #059669); }
        .blue-btn { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .red-btn { background: linear-gradient(135deg, #ef4444, #dc2626); }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .kindle-text-viewer {
            padding: 16px;
            font-size: 16px;
            line-height: 1.7;
            color: #f3f4f6;
          }

          .kindle-word {
            color: #f3f4f6;
            font-weight: 400;
          }

          .kindle-menu {
            padding: 10px 14px;
            gap: 10px;
            max-width: calc(100vw - 30px);
          }

          .kindle-menu-button {
            min-width: 40px;
            height: 40px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .kindle-text-viewer {
            padding: 12px;
            font-size: 17px;
            line-height: 1.8;
            color: #f9fafb;
          }

          .kindle-word {
            color: #f9fafb;
            font-weight: 500;
          }

          .kindle-menu {
            padding: 12px 16px;
            gap: 12px;
            max-width: calc(100vw - 20px);
          }

          .kindle-menu-button {
            min-width: 44px;
            height: 44px;
            font-size: 16px;
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
          {/* AI Guru button */}
          {onExplainWithAI && (
            <button 
              className="kindle-menu-button ai-guru-button"
              onClick={handleAIGuruExplanation}
              title="AI Guru - Detailed Explanation"
            >
              🎓
            </button>
          )}

          {/* Copy button */}
          <button 
            className="kindle-menu-button copy-button"
            onClick={() => {
              if (selectedText) {
                navigator.clipboard.writeText(selectedText).then(() => {
                  // Optional: Show a brief success indicator
                }).catch(() => {
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = selectedText;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                });
              }
            }}
            title="Copy selected text"
          >
            📋
          </button>

          {/* Remove highlight button - only show if text is exactly highlighted */}
          {onRemoveHighlight && getExactHighlightMatch(selectedText) && (
            <button 
              className="kindle-menu-button remove-button"
              onClick={removeHighlight}
              title="Remove highlight"
            >
              🗑️
            </button>
          )}
          
          {/* Highlight color buttons */}
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
