# Bookshelf Project - Organized Structure

## Overview
This project has been successfully organized with a clean folder structure and updated image references. All files are now properly categorized and the website uses the actual subject book cover images instead of placeholder images.

## Project Structure

```
Bookshelf/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── application-of-soft-computing.png
│   │   │   ├── database-management-system.png
│   │   │   ├── design-and-analysis-of-algorithm.png
│   │   │   ├── mechanics-of-robots.png
│   │   │   ├── object-oriented-system-design-with-cpp.png
│   │   │   ├── web-technology.png
│   │   │   ├── image.png
│   │   │   └── index.ts (image mapping and utility functions)
│   │   └── docs/
│   │       ├── GEMINI.md
│   │       ├── QWEN.md
│   │       ├── metadata.json
│   │       ├── syllabus.jpg
│   │       ├── syllabus (1).jpg
│   │       ├── syllabus (2).jpg
│   │       ├── syllabus (3).jpg
│   │       ├── syllabus (4).jpg
│   │       └── syllabus (5).jpg
│   ├── components/
│   │   ├── App.tsx (main application component)
│   │   └── icons.tsx (all SVG icons)
│   ├── constants/
│   │   └── constants.tsx (app constants and syllabus data)
│   ├── types/
│   │   └── types.ts (TypeScript type definitions)
│   ├── index.tsx (application entry point)
│   └── vite-env.d.ts (TypeScript declarations for assets)
├── index.html (main HTML file)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Changes Made

### 1. File Organization
- **Images**: All subject book cover images moved to `src/assets/images/` with kebab-case naming
- **Documentation**: All markdown files and syllabus images moved to `src/assets/docs/`
- **Components**: React components organized in `src/components/`
- **Constants**: App constants moved to `src/constants/`
- **Types**: TypeScript definitions moved to `src/types/`

### 2. Image Implementation
- Created `src/assets/images/index.ts` with proper image imports and mapping
- Added TypeScript declarations for image files in `src/vite-env.d.ts`
- Updated `App.tsx` to use real book cover images instead of placeholder Picsum images

### 3. Import Path Updates
All import paths have been updated to reflect the new structure:
```typescript
// Old imports (broken)
import { ScreenID, Highlight } from '../../types';
import { AIGuruIcon, ... } from '../../components/icons';
import { READER_TEXT, syllabus } from '../../constants';

// New imports (working)
import { ScreenID, Highlight } from '../types/types';
import { AIGuruIcon, ... } from './icons';
import { READER_TEXT, syllabus } from '../constants/constants';
import { getBookImage } from '../assets/images/index';
```

### 4. Image Mapping
Created a centralized image mapping system that matches book titles to their corresponding images:

```typescript
export const bookImages = {
  'Object Oriented System Design with C++': ObjectOrientedSystemDesignWithCpp,
  'Application of Soft Computing': ApplicationOfSoftComputing,
  'Database Management System': DatabaseManagementSystem,
  'Web Technology': WebTechnology,
  'Design and Analysis of Algorithm': DesignAndAnalysisOfAlgorithm,
  'Mechanics of Robots': MechanicsOfRobots,
};
```

## Book Cover Images
The following subject book cover images are now properly integrated:

1. **Application of Soft Computing** → `application-of-soft-computing.png`
2. **Database Management System** → `database-management-system.png`
3. **Design and Analysis of Algorithm** → `design-and-analysis-of-algorithm.png`
4. **Mechanics of Robots** → `mechanics-of-robots.png`
5. **Object Oriented System Design with C++** → `object-oriented-system-design-with-cpp.png`
6. **Web Technology** → `web-technology.png`

## Running the Project

1. **Development Server**: 
   ```bash
   npm run dev
   ```
   Server runs at `http://localhost:5173`

2. **Build for Production**:
   ```bash
   npm run build
   ```

3. **Preview Production Build**:
   ```bash
   npm run preview
   ```

## Benefits of This Organization

1. **Clean Structure**: Files are logically organized by purpose
2. **Better Maintainability**: Easy to find and update specific components
3. **Proper Asset Management**: Images are properly imported and bundled
4. **TypeScript Support**: Full type safety with proper declarations
5. **Scalability**: Structure supports future expansion
6. **Real Book Covers**: Uses actual subject images instead of placeholders

## Notes
- All duplicate files have been removed
- The project now follows React/Vite best practices
- Images are optimized and properly handled by Vite's asset pipeline
- All import paths are relative and correct for the new structure
