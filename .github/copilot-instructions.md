# Interactive Study Bookshelf - AI Agent Instructions

## Architecture Overview

This is a **React + TypeScript educational platform** with advanced AI tutoring, mobile-optimized text highlighting, and a theme system. The app transforms static educational content into an interactive learning experience with Kindle-style text selection and AI-powered explanations.

### Core Application Structure
- **Main App Component**: `src/components/App.tsx` (preferred) or `AppNew.tsx` (legacy)
- **Routing**: React Router with context providers (`ThemeProvider`, `UserProvider`)
- **Pages**: Bookshelf → Subject → Chapter → Reader (with text highlighting)
- **AI Integration**: Groq SDK with `moonshotai/kimi-k2-instruct` model

## Key Architectural Patterns

### 1. Theme System (Critical)
```tsx
// All components use CSS variables defined in index.css
<div className="theme-surface theme-text theme-transition">
  // Themes: light, dark, blue, amoled
  // Never use hardcoded colors - always use theme classes
</div>
```
**Files**: `src/contexts/ThemeContext.tsx`, `index.css` (CSS variables)

### 2. Text Highlighting Engine
```tsx
// KindleStyleTextViewerFixed is the WORKING implementation
import KindleStyleTextViewerFixed from './components/KindleStyleTextViewerFixed';
// NOT KindleStyleTextViewer - that's the broken version

// Canvas-based text measurement for mobile accuracy
// Word-level positioning with coordinate-based selection
// Mobile: double-tap for single words, drag for multi-word
```
**Files**: `src/components/KindleStyleTextViewerFixed.tsx` (1250 lines, complex)

### 3. AI Integration Pattern
```tsx
// Enhanced AI with LaTeX + markdown rendering
import { ENHANCED_AI_GURU_PROMPT } from '../utils/aiGuruPrompt';
// Model: 'moonshotai/kimi-k2-instruct' via Groq
// API Key: process.env.GROQ_API_KEY (from .env.local)
```
**Files**: `src/components/EnhancedAIGuruModal.tsx`, `src/utils/aiGuruPrompt.ts`

## Critical Development Workflows

### Environment Setup
```bash
# Required environment variable
GROQ_API_KEY=your_key_here  # in .env.local

# Development (main app runs on :5174)
npm run dev

# Build with proper env loading
npm run build
```

### Mobile Text Selection Debugging
The text highlighting system is the most complex part. Key points:
- `KindleStyleTextViewerFixed.tsx` uses canvas measurement for accurate word positioning
- Mobile requires `touchActive` flag to prevent mouse events from interfering
- Double-tap detection window: 500ms, movement threshold: 5px
- Menu positioning uses `getExactHighlightMatch()` vs `getHighlightToRemove()`

### Theme Development
```tsx
// Never use hardcoded colors - always reference CSS variables
.theme-surface { background-color: var(--color-surface); }
.theme-accent-text { color: var(--color-accent); }

// Theme changes update CSS variables dynamically
// Test all 4 themes: light, dark, blue, amoled
```

## Project-Specific Conventions

### Component Organization
- **Pages**: Route-level components in `src/pages/`
- **Components**: Reusable UI in `src/components/`
- **Enhanced versions preferred**: `EnhancedAIGuruModal` > `AIGuruModal`

### State Management
- **Highlights**: Local state in App.tsx, passed down as props
- **AI**: Modal state with `initialPrompt` for context passing
- **Themes**: Context with localStorage persistence
- **No Redux** - using React Context + local state

### AI Response Format
```tsx
// Enhanced responses support LaTeX math
<ReactMarkdown 
  remarkPlugins={[remarkMath]} 
  rehypePlugins={[rehypeKatex]}
>
  {content} // $inline math$ and $$display math$$
</ReactMarkdown>
```

### Mobile-First Responsive Design
```tsx
// Mobile breakpoints: 480px, 768px
const isMobile = () => window.innerWidth <= 768;
const isSmallMobile = () => window.innerWidth <= 480;

// Touch events use passive:false for text selection
// Separate touch/mouse handlers to prevent conflicts
```

## Common Gotchas

### Text Highlighting
- Use `KindleStyleTextViewerFixed.tsx` NOT `KindleStyleTextViewer.tsx`
- Delete button should only appear for exactly highlighted text
- Menu positioning: calculate end of selection, not center
- Mobile: prevent accidental selection during scrolling

### AI Integration
- Always check `process.env.GROQ_API_KEY` availability
- Use enhanced prompt system for better educational responses
- LaTeX requires `katex/dist/katex.min.css` import

### Theme System
- Components must support all 4 themes
- Test theme switching in every new component
- Use `theme-transition` class for smooth animations

## Files to Reference

**Core Architecture**: `src/components/App.tsx`, `src/contexts/ThemeContext.tsx`
**Text Engine**: `src/components/KindleStyleTextViewerFixed.tsx` (complex, read carefully)
**AI System**: `src/components/EnhancedAIGuruModal.tsx`, `src/utils/aiGuruPrompt.ts`
**Styling**: `index.css` (CSS variables), theme utility classes
**Config**: `vite.config.ts` (env variable handling), `package.json` (dependencies)

## Legacy/Deprecated
- `AppNew.tsx` (use `App.tsx`)
- `KindleStyleTextViewer.tsx` (use `KindleStyleTextViewerFixed.tsx`)
- `AdvancedTextSelectionEngine.tsx` (replaced by Kindle-style)
