# Interactive Study Bookshelf - AI Agent Instructions

## Architecture Overview

This is a **React + TypeScript educational platform** with advanced AI tutoring, mobile-optimized text highlighting, theme system, and comprehensive content management. The app transforms static educational content into an interactive learning experience with Kindle-style text selection, AI-powered explanations, and rich multimedia support.

### Core Application Structure
- **Main App Component**: `src/components/App.tsx` (current) vs `AppNew.tsx` (legacy)
- **Routing**: React Router with nested context providers (`ThemeProvider`, `UserProvider`)
- **Page Flow**: Bookshelf → Subject → Chapter → Reader (with multi-tab content management)
- **AI Integration**: Groq SDK with `moonshotai/kimi-k2-instruct` model for educational responses

## Key Architectural Patterns

### 1. Theme System (Critical)
```tsx
// All components MUST use CSS variables defined in index.css
<div className="theme-surface theme-text theme-transition">
  // 4 themes: light, dark, blue, amoled
  // Never hardcode colors - always use theme utility classes
</div>
```
**CSS Variables**: `:root` defines `--color-bg`, `--color-surface`, etc. in `index.css`
**Context**: `src/contexts/ThemeContext.tsx` with localStorage persistence
**Files**: Theme changes update CSS variables dynamically via `ThemeContext`

### 2. Text Highlighting Engine (Complex - 1368 lines)
```tsx
// CRITICAL: Use KindleStyleTextViewerFixed.tsx - the WORKING implementation
import KindleStyleTextViewerFixed from './components/KindleStyleTextViewerFixed';
// NEVER use KindleStyleTextViewer.tsx - that's the broken legacy version

// Canvas-based text measurement for pixel-perfect mobile accuracy
// Word-level positioning with coordinate-based selection system
// Mobile: double-tap (500ms window, 5px threshold) for single words, drag for multi-word
// Haptic feedback integration for mobile UX
```
**Complex Logic**: Canvas text measurement, touch/mouse event coordination, selection menu positioning
**Mobile-First**: Separate touch/mouse handlers prevent interference, `touchActive` flag critical

### 3. AI Integration Pattern
```tsx
// Enhanced AI with LaTeX math + markdown + code syntax highlighting
import { ENHANCED_AI_GURU_PROMPT, AI_GURU_SYSTEM_CONTEXT } from '../utils/aiGuruPrompt';
// Model: 'moonshotai/kimi-k2-instruct' via Groq SDK
// API Key: process.env.GROQ_API_KEY (loaded via vite.config.ts from .env.local)
```
**Response Rendering**: `EnhancedAIResponse.tsx` with ReactMarkdown + rehype-katex + react-syntax-highlighter
**Message System**: Conversation history with user/model/error role types

### 4. Content Management System
```tsx
// Multi-tab content management for chapters
// Tabs: Text, MCQ, Q&A, Notes, Mind Maps, Flashcards, Videos
// Import/Export functionality with JSON + ZIP support
// Template-based content creation system
```
**Template System**: Pre-defined chapter templates with configurable tab types
**Data Persistence**: Local storage for content, structured JSON export/import

## Critical Development Workflows

### Environment Setup
```bash
# Required environment variable
GROQ_API_KEY=your_groq_api_key  # in .env.local (NOT .env)

# Development server (runs on port 5174, NOT 5173)
npm run dev

# Install with legacy peer deps (required for React 19)
npm install --legacy-peer-deps

# Build with proper env variable loading
npm run build
```

### Testing & Debugging
```bash
# Playwright tests for UI validation
npx playwright test

# Multiple test files for different features:
# - comprehensive-final-test.spec.ts (full app flow)
# - enhanced-reader-test.spec.ts (content management)
# - flashcard-functionality-complete.spec.ts (flashcard system)
```

### Mobile Text Selection Debugging
**Most Complex Component**: `KindleStyleTextViewerFixed.tsx` (1368 lines)
- Canvas measurement for accurate word positioning on mobile devices
- Touch event coordination with `touchActive` flag prevents mouse interference
- Double-tap detection: 500ms window, 5px movement threshold
- Menu positioning: `getExactHighlightMatch()` vs `getHighlightToRemove()` logic
- Haptic feedback integration for native-like mobile experience

### Theme Development
```css
/* CSS Variable Pattern - ALL colors must use variables */
.theme-surface { background-color: var(--color-surface); }
.theme-accent-text { color: var(--color-accent); }
.theme-transition { transition: all 0.3s ease; }

/* Test ALL 4 themes: light, dark, blue, amoled */
/* Mobile-first responsive: 640px, 768px, 1024px breakpoints */
```

## Project-Specific Conventions

### Component Organization & Naming
```
src/
├── components/           # Reusable UI components
│   ├── Enhanced*.tsx    # Preferred versions (EnhancedAIGuruModal > AIGuruModal)
│   ├── *Manager.tsx     # Content management (MCQManager, FlashCardManager, etc.)
│   └── icons.tsx        # Centralized icon components
├── pages/              # Route-level components
│   ├── Enhanced*.tsx   # Current implementations
│   └── *.tsx          # Legacy versions
├── contexts/          # React contexts (Theme, User)
├── utils/            # Utility functions (AI prompts, search algorithms)
└── types/           # TypeScript definitions
```

### State Management Philosophy
- **No Redux** - Using React Context + local state only
- **Highlights**: Local state in `App.tsx`, passed down as props to reader components
- **AI State**: Modal state with `initialPrompt` for context passing between components
- **Themes**: Context with localStorage persistence and CSS variable updates
- **Content**: Local state with localStorage backup, JSON export for persistence

### AI Response Format & Rendering
```tsx
// Enhanced AI responses support LaTeX math + code + markdown
<ReactMarkdown 
  remarkPlugins={[remarkMath, remarkGfm]} 
  rehypePlugins={[rehypeKatex]}
  components={{
    code: ({ language, children }) => (
      <SyntaxHighlighter language={language}>{children}</SyntaxHighlighter>
    )
  }}
>
  {content} // Supports: $inline math$, $$display math$$, ```code blocks```
</ReactMarkdown>
```

### Mobile-First Responsive Design
```tsx
// Breakpoint utilities defined in index.css
// Mobile: ≤640px, Tablet: 641-1024px, Desktop: ≥1025px
const isMobile = () => window.innerWidth <= 640;
const isTablet = () => window.innerWidth > 640 && window.innerWidth <= 1024;

// Touch events require passive:false for text selection to work
// Always separate touch/mouse handlers to prevent conflicts
```

## Common Gotchas & Critical Fixes

### Text Highlighting System
- **NEVER use `KindleStyleTextViewer.tsx`** - use `KindleStyleTextViewerFixed.tsx`
- Delete button positioning: only appears for exactly highlighted text (not partial matches)
- Menu positioning: calculate end of selection coordinates, not center
- Mobile scrolling: prevent accidental selection during scroll gestures
- Canvas measurement: required for pixel-perfect word positioning on mobile

### AI Integration Requirements
- Check `process.env.GROQ_API_KEY` availability before making requests
- Use `ENHANCED_AI_GURU_PROMPT` system for consistent educational responses
- LaTeX rendering requires `katex/dist/katex.min.css` import in main CSS
- Message history management for conversation context

### Theme System Requirements
- **ALL components must support all 4 themes** (light, dark, blue, amoled)
- Test theme switching in every new component during development
- Use `theme-transition` class for smooth color transitions
- Never hardcode colors - always use CSS variables via theme utility classes

### Content Management
- Import/Export uses JSZip for packaging content with metadata
- Template system defines available tab types per chapter
- Content managers (MCQ, Q&A, etc.) use consistent JSON structure
- File uploads handled via react-dropzone with validation

## Files to Reference for Understanding

### Core Architecture
- `src/components/App.tsx` - Main app routing and state management
- `src/contexts/ThemeContext.tsx` - Theme system implementation
- `src/contexts/UserContext.tsx` - User state and content management

### Complex Systems (Read Before Modifying)
- `src/components/KindleStyleTextViewerFixed.tsx` - Text highlighting engine (1368 lines)
- `src/components/EnhancedAIGuruModal.tsx` - AI integration with conversation history
- `src/utils/aiGuruPrompt.ts` - AI prompt engineering for educational responses

### Content Management
- `src/pages/EnhancedReaderPage.tsx` - Multi-tab content system
- `src/components/*Manager.tsx` - Individual content type managers
- `src/components/BookContentManager.tsx` - Import/export functionality

### Styling & Configuration
- `index.css` - CSS variables, theme utilities, responsive breakpoints
- `vite.config.ts` - Environment variable handling, build configuration
- `package.json` - Dependencies (note: requires --legacy-peer-deps)

## Legacy/Deprecated Components (Do Not Use)
- `AppNew.tsx` → Use `App.tsx`
- `KindleStyleTextViewer.tsx` → Use `KindleStyleTextViewerFixed.tsx`
- `AdvancedTextSelectionEngine.tsx` → Replaced by Kindle-style system
- Basic component versions → Use Enhanced* versions when available
