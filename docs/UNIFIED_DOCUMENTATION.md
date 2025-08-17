# 📚 Interactive Study Bookshelf & AI Guru – Unified Documentation

---

## 1. Overview & Educational Philosophy

The Interactive Study Bookshelf combines a powerful AI tutoring system (AI Guru) with a feature-rich digital bookshelf. The platform is designed using advanced educational methodologies, offering personalized, adaptive, and engaging learning experiences. It integrates best practices from learning science, cognitive psychology, and modern UI/UX design to maximize student success.

### ✨ Pedagogical Foundation
- **Socratic Method:** Discovery-based learning through guided questioning
- **Scaffolded Learning:** Systematic progression from simple to complex
- **Active Learning:** Interactive activities, discussions, and problem-solving
- **Growth Mindset:** Celebrates effort, progress, and learning from mistakes
- **Cognitive Science Integration:** Spaced repetition, retrieval practice, dual coding, metacognitive strategies

---

## 2. Key Features

### 🤖 AI Guru – Advanced Educational AI
- **Concept Learning Mode:** Engaging hooks, clear overviews, structured learning plans, multi-modal teaching, understanding checks, and interactive practice
- **Homework Help:** Step-by-step guidance, conceptual focus, error analysis, and strategic thinking
- **Adaptive Practice:** Difficulty matching, immediate feedback, progress tracking, and varied practice
- **Teaching Techniques:** Analogies, storytelling, mnemonics, chunking, interleaving, elaborative questioning
- **Personalization:** Adapts to learning style, ability, and interests
- **Content Boundaries:** Academic topics only; no medical, dangerous, or non-academic advice

### 📖 Bookshelf & Reading Experience
- **Multi-Color Highlighting:** Yellow, green, blue, red highlights with custom CSS styling
- **Smart Notes:** Contextual note-taking system
- **AI Integration:** Explain highlighted text with AI
- **Progress Tracking:** Reading progress across subjects
- **Responsive Design:** Works on desktop, tablet, and mobile

### 🔍 Search & Subtopics
- **Comprehensive Search:** Search across subjects, chapters, and subtopics with real-time results
- **Subtopic Bar:** Collapsible, context-aware bar for each chapter
- **AI Explanation & Video Buttons:** Each subtopic has AI and video integration (YouTube-ready)
- **Direct Navigation:** Click search results to jump to content

### 🖍️ Text Highlighting Solution
- **Immediate Selection Capture:** Preserves selection before menu appears
- **Manual Highlight Processing:** Custom regex-based implementation for reliability
- **Visual Feedback:** Styled spans for each highlight color
- **Event Handling:** Prevents UI from clearing selection
- **Works on Desktop & Mobile:** Fully tested and reliable

---

## 3. Complete Subtopics List

See the [COMPLETE_SUBTOPICS_LIST.md](./COMPLETE_SUBTOPICS_LIST.md) for a detailed breakdown of all subjects, chapters, and subtopics (150 subtopics across 6 subjects).

---

## 4. Technical Implementation & Solutions

### System Prompt & AI Configuration
- **Model:** moonshotai/kimi-k2-instruct (via GROQ)
- **Temperature:** 0.7 (balanced creativity)
- **Max Tokens:** 1000
- **Streaming:** Real-time response delivery
- **Context Preservation:** Maintains conversation continuity

### UI & Component Structure
- **React + Vite + TypeScript:** Modern, scalable frontend
- **Componentized Design:** All features modularized for maintainability
- **Image & Asset Management:** Centralized mapping for book covers and documentation
- **TypeScript Support:** Full type safety

### Highlighting Implementation
- **State Management:** `selectedText` and `selectedRange` in component state
- **Processing:** Custom `applyHighlightsToContent()` function
- **Styling:** CSS classes with gradients and rounded corners
- **Event Handling:** `preventDefault()` and `stopPropagation()`

---

## 5. Project Structure & Organization

```
Bookshelf/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── docs/
│   ├── components/
│   ├── constants/
│   ├── contexts/
│   ├── pages/
│   ├── types/
│   ├── utils/
│   ├── index.tsx
│   └── vite-env.d.ts
├── index.html
├── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── docs/
│   ├── [All documentation files]
├── screenshots/
│   ├── [Feature demonstration images]
├── misc/
│   ├── [Non-essential files]
```

- **Essential Files:** `src/`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `index.css`, `README.md`, `.gitignore`, `docs/`
- **Screenshots:** Feature demonstrations
- **Misc:** Temporary/non-essential files (safe to delete)

---

## 6. Future Enhancements & Usage Guidelines

### Planned Features
- Multi-modal learning (images, audio, interactive elements)
- Learning analytics and progress tracking
- Collaborative/group study features
- Assessment tools and content library
- Knowledge graphs and advanced personalization

### Usage Guidelines
- **For Students:** Be specific, ask questions, practice actively, reflect, use feedback
- **For Educators:** Use as supplemental support, monitor progress, provide context, encourage critical thinking

---

**Happy Learning with your Interactive Study Bookshelf & AI Guru!**

*For detailed subtopics and technical guides, see the individual files in the `docs/` folder.*
