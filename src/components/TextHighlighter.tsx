import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Highlight } from '../types/types';

interface TextHighlighterProps {
  content: string;
  highlights: Highlight[];
  currentBook: string;
  addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  removeHighlight: (id: string) => void;
  className?: string;
  onExplainWithAI?: (selectedText: string, context: string) => void;
}

const TextHighlighter: React.FC<TextHighlighterProps> = ({
  content,
  highlights,
  currentBook,
  addHighlight,
  removeHighlight,
  className = '',
  onExplainWithAI
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Simple, reliable text selection handler
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setMenuVisible(false);
      setSelectedText('');
      setSelectedRange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (!text) {
      setMenuVisible(false);
      return;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!container.contains(range.commonAncestorContainer)) return;
    } catch (e) {
      return;
    }

    setSelectedText(text);
    setSelectedRange(range.cloneRange());

    // Position menu
    const rect = range.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let x = rect.left + scrollLeft + rect.width / 2 - 150; // Center menu
    let y = rect.bottom + scrollTop + 10;

    // Keep menu in viewport
    const menuWidth = 300;
    const menuHeight = 60;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (x < 10) {
      x = 10;
    }
    if (y + menuHeight > window.innerHeight + scrollTop) {
      y = rect.top + scrollTop - menuHeight - 10;
    }

    setMenuPosition({ x, y });
    setMenuVisible(true);
  }, []);

  // Event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      setTimeout(handleSelection, 50);
    };

    const handleTouchEnd = () => {
      setTimeout(handleSelection, 200);
    };

    const handleClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (!container.contains(target) && !document.querySelector('.highlight-menu')?.contains(target)) {
        setMenuVisible(false);
        setSelectedText('');
        setSelectedRange(null);
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handleSelection]);

  // Apply highlight
  const applyHighlight = useCallback((color: string) => {
    if (!selectedText || !selectedRange) return;

    addHighlight({
      text: selectedText,
      color,
      chapterId: currentBook
    });

    setMenuVisible(false);
    setSelectedText('');
    setSelectedRange(null);

    // Clear selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, [selectedText, selectedRange, addHighlight, currentBook]);

  // AI explanation
  const handleAIExplanation = useCallback(() => {
    if (!selectedText || !onExplainWithAI) return;

    const container = containerRef.current;
    if (!container) return;

    const fullText = container.textContent || '';
    const index = fullText.indexOf(selectedText);
    const start = Math.max(0, index - 100);
    const end = Math.min(fullText.length, index + selectedText.length + 100);
    const context = fullText.substring(start, end);

    onExplainWithAI(selectedText, context);
    setMenuVisible(false);
  }, [selectedText, onExplainWithAI]);

  // Process content with highlights - WORKING METHOD
  const processContent = (text: string) => {
    if (highlights.length === 0) return text;

    // Filter highlights for current book
    const currentHighlights = highlights.filter(h => h.chapterId === currentBook);
    if (currentHighlights.length === 0) return text;

    let result = text;

    // Sort highlights by length (longest first) to avoid conflicts
    const sortedHighlights = [...currentHighlights].sort((a, b) => b.text.length - a.text.length);

    sortedHighlights.forEach(highlight => {
      const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedText})`, 'gi');
      
      result = result.replace(regex, (match) => {
        return `<mark class="highlight-${highlight.color}" data-highlight-id="${highlight.id}">${match}</mark>`;
      });
    });

    return result;
  };

  return (
    <div className={`text-highlighter ${className}`}>
      <style>
        {`
          .text-highlighter {
            position: relative;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            cursor: text;
          }

          .text-highlighter mark {
            border-radius: 3px;
            padding: 2px 4px;
            margin: 0 1px;
            line-height: 1.4;
          }

          .highlight-yellow {
            background-color: rgba(255, 235, 59, 0.6) !important;
            color: inherit !important;
          }

          .highlight-green {
            background-color: rgba(76, 175, 80, 0.6) !important;
            color: inherit !important;
          }

          .highlight-blue {
            background-color: rgba(33, 150, 243, 0.6) !important;
            color: inherit !important;
          }

          .highlight-red {
            background-color: rgba(244, 67, 54, 0.6) !important;
            color: inherit !important;
          }

          .highlight-menu {
            position: fixed;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 10px;
            z-index: 10000;
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .dark .highlight-menu {
            background: #1f2937;
            border-color: #374151;
            color: white;
          }

          .highlight-btn {
            width: 35px;
            height: 35px;
            border: 2px solid white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .highlight-btn:hover {
            transform: scale(1.1);
          }

          .ai-btn {
            background: #8b5cf6;
            color: white;
            border: 2px solid white;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
          }

          .ai-btn:hover {
            background: #7c3aed;
            transform: scale(1.05);
          }

          .btn-yellow { background: #fbbf24; }
          .btn-green { background: #10b981; }
          .btn-blue { background: #3b82f6; }
          .btn-red { background: #ef4444; }

          @media (max-width: 768px) {
            .highlight-btn {
              width: 40px;
              height: 40px;
            }
            .highlight-menu {
              padding: 12px;
              gap: 10px;
            }
          }
        `}
      </style>

      <div
        ref={containerRef}
        className="content-container"
        style={{
          padding: '16px',
          lineHeight: '1.6',
          fontSize: '15px',
          minHeight: '200px'
        }}
        dangerouslySetInnerHTML={{
          __html: processContent(content)
        }}
      />

      {menuVisible && (
        <div
          className="highlight-menu"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`
          }}
        >
          {onExplainWithAI && (
            <button className="ai-btn" onClick={handleAIExplanation}>
              🧠 AI
            </button>
          )}
          <button
            className="highlight-btn btn-yellow"
            onClick={() => applyHighlight('yellow')}
            title="Yellow highlight"
          />
          <button
            className="highlight-btn btn-green"
            onClick={() => applyHighlight('green')}
            title="Green highlight"
          />
          <button
            className="highlight-btn btn-blue"
            onClick={() => applyHighlight('blue')}
            title="Blue highlight"
          />
          <button
            className="highlight-btn btn-red"
            onClick={() => applyHighlight('red')}
            title="Red highlight"
          />
        </div>
      )}
    </div>
  );
};

export default TextHighlighter;
