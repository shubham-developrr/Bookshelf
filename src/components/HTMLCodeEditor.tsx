import React, { useState, useEffect } from 'react';

interface HTMLCodeEditorProps {
    tabName: string;
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const HTMLCodeEditor: React.FC<HTMLCodeEditorProps> = ({
    tabName,
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [htmlCode, setHtmlCode] = useState('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [savedContent, setSavedContent] = useState('');
    
    const storageKey = `html_editor_${currentBook}_${currentChapter}_${tabName}`;
    
    // Default HTML template
    const defaultTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My HTML Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #667eea;
            text-align: center;
            margin-bottom: 30px;
        }
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        .btn:hover {
            background: #5a6cd8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to My HTML Page</h1>
        <p>This is a complete HTML document with embedded CSS and JavaScript.</p>
        
        <button class="btn" onclick="changeColor()">Change Background</button>
        <button class="btn" onclick="showAlert()">Show Alert</button>
        
        <div id="content">
            <h2>Interactive Content</h2>
            <p>Click the buttons above to see JavaScript in action!</p>
        </div>
    </div>

    <script>
        function changeColor() {
            const colors = ['#667eea', '#f093fb', '#f5576c', '#4facfe', '#43e97b'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.style.background = \`linear-gradient(135deg, \${randomColor} 0%, #764ba2 100%)\`;
        }
        
        function showAlert() {
            alert('Hello from JavaScript! You can write any JS code here.');
        }
        
        // Add some interactive functionality
        document.addEventListener('DOMContentLoaded', function() {
            console.log('HTML page loaded successfully!');
        });
    </script>
</body>
</html>`;

    // Load saved content on mount
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setHtmlCode(saved);
            setSavedContent(saved);
        } else {
            setHtmlCode(defaultTemplate);
        }
    }, [storageKey]);

    // Save content to localStorage
    const handleSave = () => {
        localStorage.setItem(storageKey, htmlCode);
        setSavedContent(htmlCode);
        // Show a brief success indication
        const originalText = 'Save';
        const saveButton = document.querySelector('[data-save-btn]') as HTMLButtonElement;
        if (saveButton) {
            saveButton.textContent = 'Saved!';
            saveButton.style.background = '#10b981';
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.style.background = '';
            }, 1000);
        }
    };

    // Toggle preview mode
    const handlePreview = () => {
        setIsPreviewMode(!isPreviewMode);
    };

    // Toggle fullscreen mode
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    // Reset to default template
    const handleReset = () => {
        if (confirm('Reset to default template? This will overwrite your current code.')) {
            setHtmlCode(defaultTemplate);
        }
    };

    // Mobile detection
    const isMobile = () => window.innerWidth <= 768;

    return (
        <div className={`${className} ${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
            {/* Header with controls */}
            <div className={`flex ${isMobile() ? 'flex-col gap-2' : 'items-center justify-between'} mb-4 pb-4 border-b theme-border`}>
                <div className={`flex items-center gap-2 ${isMobile() ? 'justify-center' : ''}`}>
                    <svg className="w-5 h-5 theme-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <h3 className="text-lg font-semibold theme-text">HTML Code Editor</h3>
                    {savedContent && savedContent !== htmlCode && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
                            Unsaved changes
                        </span>
                    )}
                </div>
                
                <div className={`flex ${isMobile() ? 'flex-wrap justify-center' : ''} gap-2`}>
                    <button
                        onClick={handleSave}
                        data-save-btn
                        className={`${isMobile() ? 'btn-primary text-xs px-3 py-2' : 'btn-primary text-sm'} flex items-center gap-2`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save
                    </button>
                    
                    <button
                        onClick={handlePreview}
                        className={`${isMobile() ? 'text-xs px-3 py-2' : 'text-sm'} ${
                            isPreviewMode 
                                ? 'btn-secondary bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                                : 'btn-secondary'
                        } flex items-center gap-2`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {isPreviewMode ? 'Edit Code' : 'Preview'}
                    </button>

                    <button
                        onClick={toggleFullScreen}
                        className={`${isMobile() ? 'btn-secondary text-xs px-3 py-2' : 'btn-secondary text-sm'} flex items-center gap-2`}
                        title="Toggle Fullscreen"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            {isFullScreen ? (
                                <>
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                                    <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                                    <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
                                    <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                                </>
                            ) : (
                                <>
                                    <path d="M15 3h6v6"/>
                                    <path d="M9 21H3v-6"/>
                                    <path d="M21 3l-7 7"/>
                                    <path d="M3 21l7-7"/>
                                </>
                            )}
                        </svg>
                        {isFullScreen ? 'Exit' : 'Fullscreen'}
                    </button>

                    <button
                        onClick={handleReset}
                        className={`${isMobile() ? 'btn-secondary text-xs px-3 py-2' : 'btn-secondary text-sm'} flex items-center gap-2 text-orange-600 hover:text-orange-700`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        Reset
                    </button>
                </div>
            </div>

            {/* Editor or Preview */}
            <div className={`${isFullScreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'} border theme-border rounded-lg overflow-hidden`}>
                {!isPreviewMode ? (
                    /* Code Editor */
                    <textarea
                        value={htmlCode}
                        onChange={(e) => setHtmlCode(e.target.value)}
                        className={`w-full h-full p-4 theme-input font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Write your HTML, CSS, and JavaScript code here..."
                        spellCheck={false}
                        style={{
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            tabSize: 2,
                            fontFamily: '"Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace'
                        }}
                    />
                ) : (
                    /* Live Preview */
                    <div className="h-full bg-white">
                        <iframe
                            srcDoc={htmlCode}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
                            title="HTML Preview"
                        />
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className={`mt-4 pt-4 border-t theme-border ${isMobile() ? 'text-center' : 'flex justify-between items-center'}`}>
                <div className={`text-sm theme-text-secondary ${isMobile() ? 'mb-2' : ''}`}>
                    💡 Write complete HTML documents with CSS and JavaScript
                </div>
                <div className={`text-xs theme-text-secondary ${isMobile() ? '' : 'text-right'}`}>
                    Auto-saves to: {tabName} - {currentBook}/{currentChapter}
                </div>
            </div>
        </div>
    );
};

export default HTMLCodeEditor;
