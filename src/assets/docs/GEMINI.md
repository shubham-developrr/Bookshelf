

# Project Overview

This project is a web-based interactive bookshelf application. It allows users to browse and read educational content, specifically focusing on physics textbooks. The application provides features for navigating chapters, reading content, highlighting text, and practicing questions. It also integrates with a Groq-powered AI assistant ("AI Guru") to provide explanations and answer questions.

## Key Technologies

*   **Frontend:** React, TypeScript, Vite
*   **AI:** @groq/groq-sdk
*   **Styling:** Tailwind CSS (inferred from class names like `flex`, `justify-between`, etc.)

## Architecture

The application is a single-page application (SPA) built with React. It uses a component-based architecture with different screens for various functionalities like bookshelf view, chapter list, reader, and practice questions. The navigation is handled by a custom navigation stack implemented in the main `App` component. The state is managed within React components using hooks like `useState` and `useEffect`.

# Building and Running

**Prerequisites:** Node.js

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add your Groq API key:
    ```
    GROQ_API_KEY=your_api_key_here
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Build for production:**
    ```bash
    npm run build
    ```

5.  **Preview the production build:**
    ```bash
    npm run preview
    ```

# Development Conventions

*   **Styling:** The project uses Tailwind CSS for styling. Utility classes are used directly in the JSX of the components.
*   **Components:** The application is divided into several components, each responsible for a specific part of the UI. There are screen components, modal components, and smaller icon components.
*   **State Management:** The application state is managed using React hooks (`useState`, `useEffect`, `useCallback`, `useRef`).
*   **AI Integration:** The application uses the `@groq/groq-sdk` library to interact with the Groq API. The `AIGuruModal` component encapsulates the chat functionality with the AI.
*   **Navigation:** A custom navigation stack is implemented in the `App` component to manage the flow between different screens.
*   **Types:** The project uses TypeScript for type safety. The `types.ts` file defines the custom types used throughout the application.
