import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PencilIcon, EyeIcon, BookOpenIcon } from './icons';
import { BookTabManager } from '../utils/BookTabManager';
import { BookSyncService } from '../services/BookSyncService';
import 'katex/dist/katex.min.css';

interface RichTextEditorProps {
    tabName: string;
    currentBook: string;
    currentChapter: string;
    className?: string;
    customStorageKey?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    tabName,
    currentBook,
    currentChapter,
    className = '',
    customStorageKey
}) => {
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(true);

    // Load content using either custom storage key or BookTabManager
    useEffect(() => {
        if (customStorageKey) {
            const savedContent = localStorage.getItem(customStorageKey);
            if (savedContent) {
                setContent(savedContent);
            }
        } else {
            const savedContent = BookTabManager.loadCustomTabData(currentBook, currentChapter, tabName);
            if (savedContent) {
                setContent(savedContent);
            }
        }
    }, [currentBook, currentChapter, tabName, customStorageKey]);

    // Save content using either custom storage key or BookTabManager
    const handleSave = () => {
        if (customStorageKey) {
            localStorage.setItem(customStorageKey, content);
        } else {
            BookTabManager.saveCustomTabData(currentBook, currentChapter, tabName, content);
        }
        
        // Trigger immediate cloud sync
        triggerBackgroundSync();
    };

    // Auto-save on content change (with debouncing)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content.trim()) {
                console.log(`🔄 Auto-saving Rich Text content for ${tabName}...`);
                if (customStorageKey) {
                    localStorage.setItem(customStorageKey, content);
                } else {
                    BookTabManager.saveCustomTabData(currentBook, currentChapter, tabName, content);
                }
                
                // Trigger cloud sync in background
                setTimeout(() => {
                    triggerBackgroundSync();
                }, 1000); // Delay sync by 1 second to batch multiple saves
            }
        }, 1000); // Save after 1 second of inactivity

        return () => clearTimeout(timer);
    }, [content, currentBook, currentChapter, tabName, customStorageKey]);

    // Trigger background cloud sync
    const triggerBackgroundSync = async () => {
        try {
            const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const currentBookData = books.find((book: any) => book.name === currentBook);
            
            if (currentBookData) {
                console.log(`🌐 Triggering background sync for book: ${currentBook}`);
                await BookSyncService.collectAllBookDataTemp(currentBook, currentBookData.id);
                console.log(`✅ Background sync completed for: ${currentBook}`);
            }
        } catch (error) {
            console.warn(`⚠️ Background sync failed for ${currentBook}:`, error);
            // Don't show error to user - background sync failures should be silent
        }
    };

    const placeholder = `# ${tabName}

Start writing your content here...

## Features Available:

### Mathematics (LaTeX)
- Inline math: $E = mc^2$
- Display math: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

### Code Blocks
\`\`\`javascript
function greeting(name) {
    return \`Hello, \${name}!\`;
}
\`\`\`

### Formatting
- **Bold text**
- *Italic text*  
- ~~Strikethrough~~
- \`inline code\`

### Lists
1. Numbered lists
2. Second item

- Bullet points
- Another point

### Links & Images
[Link text](https://example.com)

### Quotes
> This is a blockquote
> Multiple lines supported

### Tables
| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |

---

*Happy writing! 📝*`;

    return (
        <div className={`theme-surface rounded-lg ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b theme-border">
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    <BookOpenIcon />
                    {tabName}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(true)}
                        className={`p-2 rounded-lg transition-all ${
                            isEditing 
                                ? 'theme-accent text-white' 
                                : 'btn-secondary hover:btn-primary'
                        }`}
                        title="Edit mode"
                    >
                        <PencilIcon />
                    </button>
                    <button
                        onClick={() => setIsEditing(false)}
                        className={`p-2 rounded-lg transition-all ${
                            !isEditing 
                                ? 'theme-accent text-white' 
                                : 'btn-secondary hover:btn-primary'
                        }`}
                        title="Preview mode"
                    >
                        <EyeIcon />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4">
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium theme-text">
                                Content (Markdown with LaTeX support):
                            </label>
                            <button
                                onClick={handleSave}
                                className="btn-secondary text-sm"
                            >
                                Save
                            </button>
                        </div>
                        
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={placeholder}
                            className="w-full h-96 p-4 theme-surface border rounded-lg theme-text font-mono text-sm resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{ minHeight: '384px' }}
                        />
                        
                        {/* Helpful Tips */}
                        <div className="text-xs theme-text-secondary space-y-1">
                            <p><strong>LaTeX Math:</strong> Use $inline$ for inline math, $$display$$ for display math</p>
                            <p><strong>Code:</strong> Use ```language for code blocks, `backticks` for inline code</p>
                            <p><strong>Auto-save:</strong> Content is automatically saved as you type</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {content.trim() ? (
                            <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none theme-text">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={tomorrow as any}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        // Style tables
                                        table: ({ children }) => (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    {children}
                                                </table>
                                            </div>
                                        ),
                                        thead: ({ children }) => (
                                            <thead className="theme-surface-secondary">
                                                {children}
                                            </thead>
                                        ),
                                        th: ({ children }) => (
                                            <th className="px-3 py-2 text-left text-sm font-medium theme-text uppercase tracking-wider border-b theme-border">
                                                {children}
                                            </th>
                                        ),
                                        td: ({ children }) => (
                                            <td className="px-3 py-2 text-sm theme-text border-b theme-border">
                                                {children}
                                            </td>
                                        ),
                                        // Style blockquotes
                                        blockquote: ({ children }) => (
                                            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 theme-surface-secondary rounded-r-lg">
                                                {children}
                                            </blockquote>
                                        ),
                                        // Style links
                                        a: ({ children, href }) => (
                                            <a 
                                                href={href} 
                                                className="text-blue-500 hover:text-blue-700 underline"
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            >
                                                {children}
                                            </a>
                                        )
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                                    <BookOpenIcon />
                                </div>
                                <h3 className="text-lg font-medium theme-text mb-2">No content yet</h3>
                                <p className="theme-text-secondary mb-4">Switch to edit mode to start writing</p>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="btn-primary flex items-center gap-2 mx-auto"
                                >
                                    <PencilIcon />
                                    Start Writing
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RichTextEditor;
