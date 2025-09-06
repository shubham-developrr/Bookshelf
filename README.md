# 📚 Interactive Study Bookshelf

An intelligent, AI-powered educational platform designed for college students to enhance learning through interactive features, smart text highlighting, and an advanced AI tutor system.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Overview

Interactive Study Bookshelf is a comprehensive educational platform that transforms traditional studying into an engaging, personalized learning experience. With advanced AI integration, intelligent text highlighting, and comprehensive subject coverage, it's designed to help college students master complex academic concepts.

## ✨ Key Features

### 🤖 AI Guru - Advanced Educational Tutor
- **Smart Tutoring**: Powered by Groq's Kimmy K2 Instructor model for educational excellence
- **LaTeX Math Rendering**: Beautiful mathematical equations with proper formatting
- **Code Syntax Highlighting**: Interactive code blocks with copy functionality
- **Adaptive Learning**: Personalized teaching based on your learning style
- **Socratic Method**: Guided discovery through strategic questioning
- **Homework Assistance**: Step-by-step problem solving without giving away answers
- **Practice Quizzes**: Adaptive assessments tailored to your proficiency level

### 📖 Interactive Reading Experience
- **Smart Text Highlighting**: Multi-color highlighting system (Yellow, Green, Blue, Red)
- **Context-Aware Notes**: Add notes to any highlighted text
- **Text Selection Engine**: Advanced text selection with persistent highlights
- **Reading Progress**: Track your study progress across subjects
- **Chapter Navigation**: Seamless navigation through academic content

### 🔍 Intelligent Search System
- **Real-time Search**: Instant search across subjects, chapters, and subtopics
- **Smart Results**: Categorized search results with direct navigation
- **Content Discovery**: Find relevant topics quickly and efficiently

### 🎨 Multiple Themes
- **4 Beautiful Themes**: Light, Dark, Blue, and Green themes
- **Smooth Transitions**: Elegant theme switching with persistent preferences
- **Responsive Design**: Optimized for all screen sizes

### 📚 Comprehensive Subject Coverage
- Object Oriented System Design with C++
- Database Management System  
- Web Technology
- Design and Analysis of Algorithm
- Application of Soft Computing
- Mechanics of Robots

Each subject includes detailed chapters and subtopics with structured learning paths.

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/shubham-developrr/Bookshelf.git
   cd Bookshelf
   ```

2. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

6. **Preview Production Build**
   ```bash
   npm run preview
   ```

## 📖 JSDoc Documentation

The codebase is thoroughly documented using JSDoc comments. This ensures that the purpose and usage of each component, function, and type are clear and easy to understand. The documentation is written in a way that it can be used to automatically generate a comprehensive documentation website.

### Documentation Philosophy
- **Clarity**: Comments are written to be as clear and concise as possible.
- **Completeness**: All components, props, functions, and types are documented.
- **Consistency**: A consistent style is used across all documentation.

## 🏗️ Project Structure

```
Bookshelf/
├── 📁 src/                    # Source code
│   ├── 📁 assets/            # Static assets
│   │   └── 📁 images/        # Application images
│   ├── 📁 components/         # React components
│   │   ├── App.tsx           # Main application component
│   │   ├── EnhancedAIGuruModal.tsx  # AI tutor interface
│   │   ├── TextHighlighter.tsx      # Text highlighting engine
│   │   └── ...               # Other components
│   ├── 📁 pages/             # Page components
│   │   ├── EnhancedBookshelfPage.tsx # Main bookshelf view
│   │   ├── SubjectPage.tsx   # Subject chapter listing
│   │   ├── EnhancedReaderPage.tsx    # Reading interface
│   │   └── ...               # Other pages
│   ├── 📁 contexts/          # React contexts
│   │   ├── ThemeContext.tsx  # Theme management
│   │   └── UserContext.tsx   # User state management
│   ├── 📁 services/          # Application services
│   │   ├── EnhancedAIService.ts # AI service abstraction
│   │   ├── SupabaseUserService.ts # User service for Supabase
│   │   └── ...               # Other services
│   ├── 📁 types/             # TypeScript definitions
│   │   ├── types.ts          # General application types
│   │   └── bookModule.ts     # Book module types
│   ├── 📁 utils/             # Utility functions
│   │   ├── BookManager.ts    # Book management utilities
│   │   └── ...               # Other utilities
│   ├── 📁 constants/         # Application constants
│   │   └── constants.tsx     # Subject and chapter data
│   └── 📄 index.tsx          # Main entry point for the React app
├── 📄 .env.local              # Environment variables
├── 📄 netlify.toml            # Netlify deployment configuration
├── 📄 package.json            # Dependencies and scripts
├── 📄 tsconfig.json           # TypeScript configuration
└── 📄 README.md               # This file
```

## 🛠️ Tech Stack

### Frontend Framework
- **React 19.1.1** - Modern UI library with latest features
- **TypeScript 5.8.2** - Type-safe JavaScript development
- **Vite 6.2.0** - Lightning-fast build tool and dev server

### Routing & Navigation
- **React Router DOM 7.8.1** - Client-side routing

### AI & Natural Language Processing
- **Groq SDK 0.5.0** - AI model integration
- **React Markdown 10.1.0** - Markdown rendering
- **Remark Math 6.0.0** - Mathematical notation support
- **Rehype KaTeX 7.0.1** - LaTeX math rendering
- **Remark GFM 4.0.1** - GitHub Flavored Markdown

### Text Processing & Highlighting
- **React Highlight Words 0.21.0** - Text highlighting
- **React Syntax Highlighter 15.6.1** - Code syntax highlighting
- **Web Highlighter 0.7.4** - Advanced text selection
- **Rangy 1.3.2** - Cross-browser text range handling

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **KaTeX 0.16.22** - Mathematical notation rendering

### Development Tools
- **Vite Plugin React 5.0.0** - React integration for Vite
- **Various @types packages** - TypeScript definitions

## 🎨 Features Deep Dive

### AI Guru Capabilities
- **Educational Tutoring**: Comprehensive learning support based on pedagogical best practices
- **Mathematical Rendering**: Beautiful LaTeX equations rendered with KaTeX
- **Code Examples**: Syntax-highlighted code blocks with copy functionality
- **Adaptive Teaching**: Adjusts teaching style based on student responses
- **Homework Help**: Guided problem-solving without revealing complete solutions
- **Practice Generation**: Creates custom quizzes and practice problems

### Text Highlighting System
- **Multi-Color Support**: Yellow, Green, Blue, and Red highlighting options
- **Persistent Highlights**: Highlights saved across sessions
- **Context Menu**: Right-click for highlighting and note options
- **Note Integration**: Add contextual notes to highlighted text
- **AI Integration**: Ask AI to explain highlighted content

### Search & Navigation
- **Instant Search**: Real-time search across all content
- **Smart Categorization**: Results organized by subjects, chapters, and subtopics
- **Quick Navigation**: Direct links to relevant content sections
- **Breadcrumb Navigation**: Clear path tracking

## 🌈 Theme System

The application includes four beautifully crafted themes:

1. **Light Theme** - Clean, professional light interface
2. **Dark Theme** - Easy on the eyes dark mode
3. **Blue Theme** - Calming blue color scheme
4. **Green Theme** - Nature-inspired green palette

Theme preferences are automatically saved and restored on subsequent visits.

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# Groq API Configuration
VITE_GROQ_API_KEY=your_groq_api_key_here

# Optional: Custom API endpoints
VITE_API_BASE_URL=https://api.groq.com
```

### Build Configuration
The project uses Vite for optimal build performance. Configuration can be modified in `vite.config.ts`.

### TypeScript Configuration
The `tsconfig.json` file is configured to support a modern React project with Vite. Here are some of the key settings:
- **`target: "ES2022"`**: Compiles TypeScript to a modern version of JavaScript, which is supported by all major browsers.
- **`module: "ESNext"`**: Uses the latest ECMAScript module syntax.
- **`jsx: "react-jsx"`**: Uses the new JSX transform from React 17.
- **`moduleResolution: "bundler"`**:  A modern module resolution strategy that works well with bundlers like Vite.
- **`paths`**: Allows for absolute imports starting with `@/` (e.g., `import MyComponent from '@/components/MyComponent'`).
- **`skipLibCheck: true`**: Speeds up compilation by not type-checking library declaration files.

## 📖 Usage Guide

### Getting Started
1. Launch the application and select a subject from the bookshelf
2. Navigate to specific chapters and subtopics
3. Use the AI Guru button for educational assistance
4. Highlight important text and add notes
5. Search for specific topics using the search functionality

### AI Guru Usage
- Click the AI Guru button from any page
- Choose from quick actions or type custom questions
- Receive structured, educational responses
- Practice with adaptive quizzes
- Get homework help with step-by-step guidance

### Text Highlighting
- Select text you want to highlight
- Right-click to open context menu
- Choose highlight color or add notes
- View all highlights in the dedicated highlights page

## 🚀 Development

### Development Workflow
1. **Start Development Server**: `npm run dev`
2. **Make Changes**: Edit files in the `src` directory
3. **Hot Reload**: Changes reflect immediately
4. **Build**: `npm run build` for production builds
5. **Preview**: `npm run preview` to test production builds

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a pull request

### Code Style
- Use TypeScript for type safety
- Follow React functional component patterns
- Maintain consistent code formatting
- Add comments for complex logic
- Write meaningful commit messages

## 🔍 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Port Already in Use**
```bash
# Kill processes using port 5173
npx kill-port 5173
```

**Environment Variables Not Loading**
- Ensure `.env.local` is in the root directory
- Restart the development server after adding variables
- Check that variable names start with `VITE_`

### Performance Optimization
- Use React DevTools for component analysis
- Monitor bundle size with `npm run build`
- Optimize images and assets
- Implement code splitting for large components

## 📋 Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 🗺️ Roadmap

### Upcoming Features
- [ ] Video integration for subtopic tutorials
- [ ] Offline reading mode
- [ ] Study streak tracking
- [ ] Collaborative study sessions
- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Integration with external learning platforms
- [ ] Voice-to-text note taking
- [ ] Spaced repetition system
- [ ] Progress sharing and social features

### Version History
- **v1.0.0** - Initial release with core features
- **v0.9.0** - Beta release with AI integration
- **v0.8.0** - Alpha release with basic functionality

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Issues**: Report bugs or request features via GitHub Issues
2. **Pull Requests**: Submit PRs for bug fixes and features
3. **Documentation**: Help improve documentation and examples
4. **Testing**: Add test cases for new features
5. **Feedback**: Share your experience and suggestions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** for providing excellent AI model access
- **React Community** for the amazing ecosystem
- **KaTeX** for beautiful mathematical rendering
- **Tailwind CSS** for the utility-first CSS framework
- **Vite** for the incredible build tool experience

## 📞 Support

Need help? We're here for you:

- **GitHub Issues**: [Report bugs or request features](https://github.com/shubham-developrr/Bookshelf/issues)
- **Documentation**: Check the `docs/` folder for detailed guides
- **Email**: [Your contact email]

## 🌟 Show Your Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting any issues you encounter
- 💡 Suggesting new features
- 🔄 Sharing with fellow students and educators

---

**Made with ❤️ for students, by developers who care about education.**

*Happy Learning! 📚✨*
