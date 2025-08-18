# Bookshelf Content Creation Tool - Setup Guide

## Overview
Separate React application for creating educational book modules with rich media support and custom theming.

## Project Setup Commands

```bash
# Create new Vite React TypeScript project
npm create vite@latest bookshelf-creator -- --template react-ts
cd bookshelf-creator

# Install core dependencies
npm install

# Install additional dependencies for rich editing
npm install @tinymce/tinymce-react
npm install react-dropzone
npm install react-colorful
npm install react-hook-form
npm install @hookform/resolvers
npm install yup
npm install lucide-react
npm install clsx
npm install tailwindcss

# Install development dependencies
npm install -D @types/node
npm install -D autoprefixer
npm install -D postcss
npm install -D tailwindcss

# Initialize Tailwind CSS
npx tailwindcss init -p
```

## Key Features to Implement

### 1. Rich Text Editor Component
- TinyMCE integration for WYSIWYG editing
- Markdown support for advanced users
- Math equation support (LaTeX)
- Code syntax highlighting
- Custom styling options

### 2. Media Management System
- Drag & drop file upload
- Image optimization and resizing
- Video embedding support
- PDF attachment handling
- Media library organization

### 3. Book Structure Builder
- Hierarchical content organization (Book > Subject > Unit > Chapter)
- Drag & drop reordering
- Template system for common structures
- Navigation tree component

### 4. Theme Customization Studio
- Color picker for theme colors
- Font selection and typography
- Layout spacing controls
- Real-time preview system
- Theme preset library

### 5. Export System
- JSON module generation
- Asset bundling and optimization
- Validation and testing
- Preview in main app format
- Version management

## Project Structure
```
src/
├── components/
│   ├── Editor/
│   │   ├── RichTextEditor.tsx
│   │   ├── MarkdownEditor.tsx
│   │   └── EditorToolbar.tsx
│   ├── MediaManager/
│   │   ├── MediaUploader.tsx
│   │   ├── MediaLibrary.tsx
│   │   └── MediaPreview.tsx
│   ├── BookBuilder/
│   │   ├── StructureTree.tsx
│   │   ├── ChapterEditor.tsx
│   │   └── NavigationPanel.tsx
│   ├── ThemeStudio/
│   │   ├── ColorPicker.tsx
│   │   ├── FontSelector.tsx
│   │   └── ThemePreview.tsx
│   └── Export/
│       ├── ExportWizard.tsx
│       ├── ValidationPanel.tsx
│       └── PreviewModal.tsx
├── hooks/
│   ├── useBookBuilder.ts
│   ├── useMediaUpload.ts
│   └── useThemeCustomizer.ts
├── utils/
│   ├── bookValidator.ts
│   ├── mediaProcessor.ts
│   └── exportGenerator.ts
└── types/
    └── bookModule.ts (shared with main app)
```

## Next Steps
1. Set up the project structure
2. Implement basic rich text editor
3. Add media upload functionality
4. Build book structure management
5. Create theme customization system
6. Implement export functionality
