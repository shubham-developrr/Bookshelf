# Copilot Instructions for Interactive Study Bookshelf

## 🏗️ Architecture Overview

This is a React 19 + TypeScript educational platform with a sophisticated multi-provider AI integration, advanced text highlighting system, and comprehensive book creation/marketplace features.

### Core Application Flow
- **Main App**: `src/components/App.tsx` - React Router setup with theme/user context providers
- **Entry Points**: Users start at `EnhancedBookshelfPage` → navigate to subjects → chapters → reading mode
- **AI Integration**: Global `EnhancedAIGuruModal` accessible from any page via floating button
- **State Management**: Context-based (Theme, User) + localStorage for persistence

## 🤖 AI System Architecture

### Multi-Provider Fallback Pattern
```typescript
// Primary: Gemini API (user's API key) → Fallback: Groq (app API key)
// Located in: src/services/EnhancedAIService.ts
const aiService = EnhancedAIService.getInstance();
await aiService.generateResponse(prompt, fastMode, enableThinking);
```

**Key Implementation Details:**
- **Cascading Fallback**: Gemini models (2.5-pro → 2.5-flash → 1.5-pro → 1.5-flash) → Groq llama-3.3-70b
- **User API Keys**: Users provide their own Gemini API keys via `GeminiAPIService`
- **Environment Variables**: `VITE_GROQ_API_KEY` (fallback), user-provided Gemini keys stored in localStorage

### AI Integration Points
- **AI Guru Modal**: `EnhancedAIGuruModal.tsx` - Main conversational interface with chat history persistence
- **Text Selection**: Right-click → "Explain with AI" sends context-aware prompts with JSON formatting
- **Content Generation**: SVG icons, educational responses, exam evaluation
- **Memory System**: Chat history stored in localStorage with automatic summarization for context

## 📝 Text Highlighting System

### Multi-Engine Architecture
The app uses **3 different highlighting engines** for different contexts:

1. **AdvancedTextSelectionEngine** - Most sophisticated, mobile-optimized
2. **ProfessionalTextHighlighter** - Clean, modern interface  
3. **KindleStyleTextViewerFixed** - Mobile-first with haptic feedback and justified text layout

**Key Pattern:**
```typescript
// Highlights persist in localStorage with chapter-specific keys
const highlight: Highlight = {
  id: string,
  text: string, 
  color: 'yellow' | 'green' | 'blue' | 'red',
  chapterId: string,
  timestamp: Date
};
```

**Critical Implementation Details:**
- **Mobile Selection**: Double-tap to start selection, drag for multi-word selection (4+ words minimum)
- **Haptic Feedback**: Uses `src/utils/haptics.ts` for tactile feedback on mobile selections
- **Touch vs Mouse**: Components handle both with `touchActive` state to prevent double-firing
- **Context Menu**: Positioned with viewport edge detection and responsive fallback positioning

## 📚 Book Management & Storage

### Data Architecture
```typescript
// Books stored as: localStorage['books'] = Book[]
// Chapters: localStorage[`chapters_${bookId}`] = Chapter[]  
// Content: localStorage[`${templateType}_${bookName}_${chapterKey}`] = any
```

### Template System
**6 Core Templates** with isolated storage:
- `FLASHCARD` → `flashcards_${bookName}_${chapterKey}`
- `MCQ` → `mcq_${bookName}_${chapterKey}` 
- `QA` → `qa_${bookName}_${chapterKey}`
- `NOTES` → `notes_${bookName}_${chapterKey}`
- `MINDMAP` → `mindmaps_${bookName}_${chapterKey}`
- `VIDEOS` → `videos_${bookName}_${chapterKey}`

**Custom Tabs**: `customtab_${tabId}_${bookName}_${chapterKey}` pattern

## 🎨 Theme System

### Dynamic CSS Variables
Themes use CSS custom properties managed by `ThemeContext.tsx`:
```typescript
// Themes: 'light' | 'dark' | 'blue' | 'amoled' | 'custom'
// CSS classes: theme-bg, theme-surface, theme-text, theme-accent
```

**Theme Application:**
- Context sets CSS variables on `:root`
- Components use `theme-*` utility classes
- Custom themes generated from user color picker

## 🚀 Development Workflows

### Key Commands
```bash
npm run dev              # Start development server (port 5173)
npm run build           # Production build
npm run preview         # Preview build locally
```

### Environment Setup
```env
# Required for full functionality:
VITE_GROQ_API_KEY=your_groq_key         # AI fallback
# Optional (user-provided via UI):
# Gemini API keys stored in localStorage
```

### Local Storage Key Patterns
```typescript
// Core Data:
'books'                              // All user books
`chapters_${bookId}`                 // Book chapters
`highlights_${chapter}`              // Text highlights

// Template System (Tab Isolated):
`flashcards_${book}_${chapter}`      // Base template
`flashcards_${book}_${chapter}_${tabId}`  // Tab-isolated version

// Template Types:
'FLASHCARD', 'MCQ', 'QA', 'NOTES', 'MINDMAP', 'VIDEOS'

// Custom Tabs:
`customtab_${tabName}_${book}_${chapter}`

// Tab Persistence (User-specific):
`tabs_cache_${userId}_${chapterId}`

// Settings:
'theme-mode', 'user_gemini_api_key', 'ai_guru_memory_summary'
```

**Critical Pattern**: All template data can exist in both base and tab-isolated versions. Always check for tab-specific keys first: `${templateType}_${book}_${chapter}_${tabId}` before falling back to base keys.

## 📁 Critical File Locations

### Core Components
- **App Shell**: `src/components/App.tsx`
- **Main Pages**: `src/pages/Enhanced*.tsx` (Bookshelf, Reader, etc.)
- **AI System**: `src/services/EnhancedAIService.ts`, `src/components/EnhancedAIGuruModal.tsx`
- **Highlighting**: `src/components/AdvancedTextSelectionEngine.tsx`

### Services & Utils
- **AI Services**: `src/services/EnhancedAIService.ts`, `GeminiAPIService.ts`
- **Book Management**: `src/utils/BookManager.ts`
- **Export/Import**: `src/services/marketplaceExportService.ts`

### Data & Types
- **Type Definitions**: `src/types/types.ts`
- **Constants**: `src/constants/constants.tsx`

## ⚠️ Common Patterns & Conventions

### Error Handling
```typescript
// AI calls always have fallback providers
try {
  return await geminiAPI.generate(prompt);
} catch (error) {
  return await groqAPI.generate(prompt); // Fallback
}
```

### Data Persistence
```typescript
// Template data pattern:
const key = `${templateType}_${bookName}_${chapterKey}`;
localStorage.setItem(key, JSON.stringify(data));
```

## 🎯 Component Development Patterns

### Hook Usage Standards
```typescript
// Standard component structure with proper hook ordering
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // 1. State hooks first
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 2. Refs
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 3. Storage key pattern (critical for data persistence)
  const baseKey = `${templateType}_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;
  const storageKey = tabId ? `${baseKey}_${tabId}` : baseKey;
  
  // 4. Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setData(JSON.parse(saved));
    }
  }, [storageKey]);
  
  // 5. Auto-save with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, storageKey]);
  
  // 6. Event handlers with useCallback for performance
  const handleSave = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, storageKey]);
};
```

### Tab Isolation System
```typescript
// Templates support both shared and tab-isolated data
// Always construct storage keys to check tab-specific data first
const getTemplateData = (templateType: string, tabId?: string) => {
  const baseKey = `${templateType}_${book}_${chapter}`;
  const tabKey = tabId ? `${baseKey}_${tabId}` : null;
  
  // Priority: tab-specific → base → default
  if (tabKey && localStorage.getItem(tabKey)) {
    return JSON.parse(localStorage.getItem(tabKey)!);
  }
  if (localStorage.getItem(baseKey)) {
    return JSON.parse(localStorage.getItem(baseKey)!);
  }
  return [];
};
```

## 📱 Mobile-First Responsive Patterns

### Component Structure
```typescript
// Standard mobile detection pattern used throughout
const isMobile = () => window.innerWidth <= 768;
const isSmallMobile = () => window.innerWidth <= 480;

// Responsive state management
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth <= 768);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

### Touch Event Patterns
```typescript
// Prevent mouse/touch double-firing
const [touchActive, setTouchActive] = useState(false);

const handleTouchStart = (e: React.TouchEvent) => {
  setTouchActive(true);
  // Touch-specific logic
};

const handleMouseEvent = (e: React.MouseEvent) => {
  if (touchActive && isMobile()) return; // Ignore mouse on mobile
  // Mouse-specific logic
};

// Reset touch state with delay
setTimeout(() => setTouchActive(false), 500);
```

### Responsive UI Patterns
- **Tailwind Classes**: `sm:hidden` (hide on desktop), `hidden sm:block` (show on desktop only)
- **Conditional Rendering**: `{isMobile() ? <MobileComponent /> : <DesktopComponent />}`
- **Dynamic Classes**: `${isMobile() ? 'text-xs p-1' : 'text-sm p-3'}`

## 🔧 Debugging Tips

1. **AI Issues**: Check browser console for provider fallback messages
2. **Storage Issues**: Inspect localStorage keys - they follow strict naming patterns  
3. **Highlighting**: Look for selection range errors in mobile browsers
4. **Theme Issues**: Check CSS variable application on document root
5. **Mobile Touch**: Use touchActive state debugging in KindleStyleTextViewerFixed
6. **Tab Isolation**: Verify storage keys include tabId suffixes for isolated data

## 🚀 Marketplace & Export System

The platform includes sophisticated export/import functionality:
- **MarketplaceBookExportService**: Creates complete book modules with all content
- **Export Format v2.0**: Comprehensive data preservation including templates, highlights, notes
- **Supabase Integration**: Backend marketplace for book publishing/sharing

When working with export/import features, understand the complete data gathering process captures ALL localStorage content associated with books.
