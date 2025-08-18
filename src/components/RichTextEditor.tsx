import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PencilIcon, EyeIcon, BookOpenIcon } from './icons';
import 'katex/dist/katex.min.css';

interface RichTextEditorProps {
    tabName: string;
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    tabName,
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(true);
    const storageKey = `customtab_${currentBook}_${currentChapter.replace(/\s+/g, '_')}_${tabName.replace(/\s+/g, '_')}`;

    // Load content from localStorage on component mount
    React.useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setContent(saved);
        }
    }, [storageKey]);

    // Save content to localStorage
    const handleSave = () => {
        localStorage.setItem(storageKey, content);
    };

    // Auto-save on content change (with debouncing)
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (content.trim()) {
                localStorage.setItem(storageKey, content);
            }
        }, 1000); // Save after 1 second of inactivity

        return () => clearTimeout(timer);
    }, [content, storageKey]);

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
