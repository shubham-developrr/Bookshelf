# Qwen Code Context: Interactive Study Bookshelf

## Project Overview

This project is a React-based web application called "Interactive Study Bookshelf," designed as a digital textbook platform for engineering students. It provides an organized way to access study materials, read content, highlight text, take notes, and interact with AI-powered explanations. The application uses a subject-chapter-subtopic hierarchy to structure the content.

Key technologies used:
- **Frontend Framework**: React with TypeScript (v18+)
- **Routing**: React Router DOM (v7+)
- **Build Tool**: Vite
- **Styling**: Custom CSS with theme support
- **AI Integration**: Groq SDK for interacting with LLMs (specifically Llama3)
- **Highlighting**: Custom implementation for text selection and highlighting
- **Icons**: Custom SVG icon components

## Building and Running

1.  **Prerequisites**: Ensure you have Node.js and npm installed.
2.  **Setup**: Run `npm install` to install dependencies listed in `package.json`.
3.  **Development Server**: Run `npm run dev` to start the Vite development server. This will usually make the app available at `http://localhost:5173`.
4.  **Building for Production**: Run `npm run build` to create a production-ready build in the `dist` directory.
5.  **Preview Production Build**: Run `npm run preview` to locally preview the production build.

### Environment Variables

The application requires a Groq API key to function. This key should be placed in a `.env.local` file in the project root as `GROQ_API_KEY=your_actual_key_here`. The Vite configuration (`vite.config.ts`) is set up to load this variable and make it available to the browser code.

## Project Structure

- `src/`
  - `index.tsx`: Entry point, renders the main `App` component.
  - `components/`: Reusable UI components (e.g., `App.tsx`, icons).
  - `pages/`: Page-level components corresponding to different routes (e.g., `BookshelfPage.tsx`, `ReaderPage.tsx`).
  - `constants/`: Contains data structures like `syllabus` and `chapterSubtopics` defining the content hierarchy, and sample `READER_TEXT`.
  - `contexts/`: React context providers, specifically `ThemeContext` for managing UI themes.
  - `types/`: TypeScript type definitions (e.g., `Highlight`).
  - `assets/`: Static assets like images.
- `index.html`: Main HTML file.
- `index.css`: Global CSS styles and theme definitions.
- `vite.config.ts`: Vite build configuration, including alias setup and environment variable handling.
- `package.json`: Project metadata, dependencies, and scripts.
- `.env.local`: Local environment variables (not committed to version control).

## Key Features and Functionality

1.  **Content Navigation**:
    - The `BookshelfPage` displays a grid of subjects.
    - Clicking a subject leads to a `SubjectPage` listing its chapters.
    - Clicking a chapter leads to the `ReaderPage` for that chapter.
2.  **Reading Experience**:
    - The `ReaderPage` displays chapter content, organized by subtopics.
    - Subtopics can be expanded/collapsed to show detailed text content.
    - Text content is currently simulated with placeholder text in `ReaderPage.tsx`, but subtopic titles and structure come from `constants.tsx`.
3.  **Text Interaction**:
    - Users can select text within the content area.
    - A context menu appears, allowing users to:
        - Highlight the selected text in different colors (yellow, green, blue, red).
        - Add a note related to the selection.
        - Ask the AI Guru to explain the selected text.
4.  **AI Guru**:
    - An AI-powered assistant accessible via a floating button on most pages or the context menu.
    - Users can ask questions or request explanations for selected text.
    - Integrates with the Groq API using the Llama3 model.
    - Features a chat interface with streaming responses.
5.  **Highlights & Notes**:
    - Highlights and notes are stored in the application state (`App.tsx`).
    - A dedicated `HighlightsPage` displays all highlights/notes for a chapter.
6.  **Theming**:
    - Supports different UI themes (light, dark, etc.) using a custom `ThemeContext`.
    - A theme selector is accessible from the main bookshelf page.

## Development Conventions

- **Language**: TypeScript is used for type safety.
- **Component Structure**: Components are typically functional components using React hooks (useState, useEffect, useContext, etc.).
- **Styling**: Custom CSS classes are used, often prefixed with `theme-` to indicate they are affected by the current theme. Tailwind-like utility classes are not used; styling is done via standard CSS.
- **Routing**: React Router DOM is used for client-side navigation.
- **State Management**: Local component state (`useState`) and React Context (`ThemeContext`) are used. The main application state (highlights) is lifted to the `App` component.
- **AI Integration**: The `groq-sdk` is configured to work in the browser (`dangerouslyAllowBrowser: true`). API key handling is done via Vite's environment variable features.
- **File Naming**: Files generally use PascalCase for components (`.tsx`) and camelCase for other modules (`.ts`, `.tsx` for constants).