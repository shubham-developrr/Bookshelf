import React, { useState } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon, UploadIcon } from './icons';
import { processAIImport } from '../utils/aiImportService';
import { OCRService } from '../utils/ocrService';
import AILoadingAnimation from './AILoadingAnimation';
import { QATest } from './TestComponents';
import { BookTabManager, BookTabContext } from '../utils/BookTabManager';
import { UnifiedBookAdapter } from '../services/UnifiedBookAdapter';
import { RealTimeSyncService } from '../services/RealTimeSyncService';

interface QAQuestion {
    id: string;
    question: string;
    answer: string;
    marks: number;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    timestamp: Date;
}

interface QAManagerProps {
    currentBook: string;
    currentChapter: string;
    tabId?: string; // Unique tab identifier for isolation
    className?: string;
}

const QAManager: React.FC<QAManagerProps> = ({
    currentBook,
    currentChapter,
    tabId,
    className = ''
}) => {
    const [qaQuestions, setQaQuestions] = useState<QAQuestion[]>([]);
    const [mode, setMode] = useState<'practice' | 'manage' | 'add' | 'import' | 'test'>('practice');
    const [displayMode, setDisplayMode] = useState<'individual' | 'batch'>('individual');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedMarks, setSelectedMarks] = useState<number[]>([]);
    const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

    // Form states for adding new questions
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [newMarks, setNewMarks] = useState<number>(2);
    const [newCategory, setNewCategory] = useState('');
    const [customMarks, setCustomMarks] = useState<number[]>([]);
    const [showCustomMarks, setShowCustomMarks] = useState(false);
    const [customMarkInput, setCustomMarkInput] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('tab');
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [isAIProcessing, setIsAIProcessing] = useState(false);

    // Initialize real-time sync service
    const realTimeSync = React.useMemo(() => RealTimeSyncService.getInstance(), []);

    // Edit state
    const [editingQuestion, setEditingQuestion] = useState<QAQuestion | null>(null);

    // Book tab context for proper data isolation
    const tabContext: BookTabContext = React.useMemo(() => {
        return BookTabManager.createTemplateTabContext(
            currentBook,
            currentChapter,
            'qa'
        );
    }, [currentBook, currentChapter]);

    // Base marks options
    const baseMarksOptions = [1, 2, 5, 7, 10];
    
    // Get all marks options (base + custom)
    const getAllMarksOptions = () => {
        const allMarks = [...baseMarksOptions, ...customMarks];
        return [...new Set(allMarks)].sort((a, b) => a - b);
    };

    // Get marks that actually have questions
    // Mobile detection
    const isMobile = () => window.innerWidth <= 768;

    const getAvailableMarks = () => {
        const questionMarks = qaQuestions.map(q => q.marks);
        return getAllMarksOptions().filter(mark => questionMarks.includes(mark));
    };

    // Load Q&As using unified system with real-time sync
    React.useEffect(() => {
        try {
            // Try unified system first
            const unifiedData = UnifiedBookAdapter.getTemplateData(currentBook, currentChapter, 'QA', tabId);
            if (unifiedData && Array.isArray(unifiedData) && unifiedData.length > 0) {
                const questions = unifiedData.map((q: any) => ({
                    ...q,
                    timestamp: new Date(q.timestamp)
                }));
                setQaQuestions(questions);
                return;
            }

            // Fallback to legacy data
            const data = BookTabManager.loadTabData('qa', tabContext);
            if (data && Array.isArray(data)) {
                const questions = data.map((q: any) => ({
                    ...q,
                    timestamp: new Date(q.timestamp)
                }));
                setQaQuestions(questions);
            }
        } catch (error) {
            console.error('Failed to load QA questions:', error);
        }
    }, [currentBook, currentChapter, tabId, tabContext]);

    // Listen for real-time sync events
    React.useEffect(() => {
        const handleSyncEvent = (event: any) => {
            if (event.templateType === 'QA' && 
                event.bookName === currentBook && 
                event.chapterName === currentChapter) {
                // Reload data when sync event occurs
                const syncedData = UnifiedBookAdapter.getTemplateData(currentBook, currentChapter, 'QA', tabId);
                if (syncedData && Array.isArray(syncedData)) {
                    const questions = syncedData.map((q: any) => ({
                        ...q,
                        timestamp: new Date(q.timestamp)
                    }));
                    setQaQuestions(questions);
                }
            }
        };

        const unsubscribe = realTimeSync.subscribe(`qa_${currentBook}_${currentChapter}`, handleSyncEvent);
        return unsubscribe;
    }, [currentBook, currentChapter, tabId, realTimeSync]);

    // Save Q&As using unified system with real-time sync
    const saveQaQuestions = async (questions: QAQuestion[]) => {
        try {
            // Save using unified adapter with automatic cloud sync
            const adapter = UnifiedBookAdapter.getInstance();
            await adapter.saveTemplateData(currentBook, currentChapter, 'QA', questions, tabId);
            setQaQuestions(questions);
            
            // Broadcast real-time sync event to other tabs
            realTimeSync.broadcastSyncEvent({
                type: 'template_updated',
                bookName: currentBook,
                chapterName: currentChapter,
                templateType: 'QA'
            });

            // Also save to legacy system for backward compatibility
            BookTabManager.saveTabData('qa', tabContext, questions);
        } catch (error) {
            console.error('Failed to save QA questions:', error);
            // Fallback to legacy save
            BookTabManager.saveTabData('qa', tabContext, questions);
            setQaQuestions(questions);
        }
    };

    // Create new Q&A
    const handleAddQuestion = () => {
        if (newQuestion.trim() && newAnswer.trim()) {
            if (editingQuestion) {
                // Edit existing question
                const updatedQuestions = qaQuestions.map(q => 
                    q.id === editingQuestion.id 
                        ? {
                            ...q,
                            question: newQuestion.trim(),
                            answer: newAnswer.trim(),
                            marks: newMarks,
                            category: newCategory.trim() || undefined,
                        }
                        : q
                );
                saveQaQuestions(updatedQuestions);
                setEditingQuestion(null);
            } else {
                // Add new question
                const newQA: QAQuestion = {
                    id: Date.now().toString(),
                    question: newQuestion.trim(),
                    answer: newAnswer.trim(),
                    marks: newMarks,
                    category: newCategory.trim() || undefined,
                    timestamp: new Date()
                };
                
                const updatedQuestions = [...qaQuestions, newQA];
                saveQaQuestions(updatedQuestions);
            }
            
            // Reset form
            setNewQuestion('');
            setNewAnswer('');
            setNewMarks(2);
            setNewCategory('');
            setMode('practice');
        }
    };

    // Handle AI-powered smart import with OCR support
    const handleSmartImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isImageFile = file.type.startsWith('image/');
        const isTextFile = file.type.includes('text');
        const isPDFFile = file.type === 'application/pdf';

        if (!isImageFile && !isTextFile && !isPDFFile) {
            alert('Please select a text file (.txt), image file (.jpg, .png, etc.), or PDF file');
            return;
        }

        setIsAIProcessing(true);
        
        try {
            let text = '';

            if (isImageFile || isPDFFile) {
                // Use OCR for image and PDF files
                const ocrService = new OCRService();
                const ocrResult = await ocrService.extractTextFromFile(file, (progress) => {
                    // Progress can be shown to user if needed
                    console.log(`OCR Progress: ${Math.round(progress.progress * 100)}%`);
                });

                if (!ocrResult.success || !ocrResult.text.trim()) {
                    alert('Could not extract text from the file. Please try a clearer image or different file.');
                    return;
                }

                text = ocrResult.text;
            } else {
                // Regular text file processing
                text = await file.text();
            }
            
            if (!text.trim()) {
                alert('The selected file is empty or no text could be extracted.');
                return;
            }
            
            // Use AI service to process the text
            const result = await processAIImport(text, 'qa');
            
            if (result.success && result.data.length > 0) {
                const updatedQuestions = [...qaQuestions, ...result.data];
                saveQaQuestions(updatedQuestions);
                alert(`🤖 AI Import Success! Extracted ${result.data.length} Q&A pairs from your ${isImageFile || isPDFFile ? (isPDFFile ? 'PDF' : 'image') : 'text'} content.`);
                setMode('practice');
            } else {
                alert(result.message || 'No Q&A pairs could be extracted from the content. Please ensure your content contains questions and answers.');
            }
        } catch (error) {
            console.error('AI import error:', error);
            alert('Failed to process the file. Please check the content and try again.');
        } finally {
            setIsAIProcessing(false);
            // Reset file input
            event.target.value = '';
        }
    };

    // Handle file import
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            if (file.type === 'text/plain') {
                const text = await file.text();
                await processTextImport(text);
            } else {
                alert('Please select a .txt file');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing file. Please check the format.');
        }
        
        // Reset file input
        event.target.value = '';
    };

    // Process text import based on selected format
    const processTextImport = async (text: string) => {
        const lines = text.trim().split('\n').filter(line => line.trim());
        const importedQuestions: QAQuestion[] = [];
        
        for (const line of lines) {
            try {
                let parts: string[] = [];
                
                if (selectedFormat === 'tab') {
                    parts = line.split('\t').map(p => p.trim());
                } else if (selectedFormat === 'semicolon') {
                    parts = line.split(';').map(p => p.trim());
                } else if (selectedFormat === 'pipe') {
                    parts = line.split('|').map(p => p.trim());
                }
                
                if (parts.length >= 2) {
                    const question: QAQuestion = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        question: parts[0],
                        answer: parts[1],
                        marks: parts[2] ? parseInt(parts[2]) || 2 : 2,
                        category: parts[3] || undefined,
                        timestamp: new Date()
                    };
                    importedQuestions.push(question);
                }
            } catch (err) {
                console.warn('Skipping invalid line:', line);
            }
        }
        
        if (importedQuestions.length > 0) {
            const updatedQuestions = [...qaQuestions, ...importedQuestions];
            saveQaQuestions(updatedQuestions);
            alert(`Successfully imported ${importedQuestions.length} questions!`);
            setMode('practice');
        } else {
            alert('No valid questions found. Please check your format.');
        }
    };

    // Process manual text input
    const handleManualImport = async () => {
        const textarea = document.querySelector('textarea[placeholder*="Question"]') as HTMLTextAreaElement;
        if (textarea && textarea.value.trim()) {
            await processTextImport(textarea.value);
            textarea.value = '';
        }
    };

    // Copy format to clipboard
    const copyFormatToClipboard = async () => {
        const formats = {
            tab: "Question[TAB]Answer[TAB]Marks[TAB]Category",
            semicolon: "Question;Answer;Marks;Category",
            pipe: "Question|Answer|Marks|Category"
        };
        
        try {
            await navigator.clipboard.writeText(formats[selectedFormat as keyof typeof formats]);
            alert('Format template copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy format. Please copy manually from the example.');
        }
    };

    // Show format example
    const showFormatExample = () => {
        setShowFormatModal(true);
    };

    // Filter questions by selected marks
    const getFilteredQuestions = () => {
        if (selectedMarks.length === 0) return qaQuestions;
        return qaQuestions.filter(q => selectedMarks.includes(q.marks));
    };

    const filteredQuestions = getFilteredQuestions();

    // Format example modal
    const FormatExampleModal = () => {
        if (!showFormatModal) return null;
        
        const examples = {
            tab: `What is a Database Management System?	A software system that stores, retrieves, and runs queries on data in databases.	5	Theory
Explain the concept of normalization in databases	Normalization is the process of organizing data to reduce redundancy and improve integrity	10	Theory
Calculate the time complexity of bubble sort	O(n²) in worst case, where we compare each element with every other element in nested loops	15	Numerical`,
            semicolon: `What is Object-Oriented Programming?;A programming paradigm based on objects that contain data and code;5;Theory
What is inheritance in OOP?;Inheritance allows a class to acquire properties and methods from another class;8;Theory
Implement a binary search algorithm;A divide-and-conquer algorithm that finds target in sorted array by repeatedly halving search space;20;Programming`,
            pipe: `What is machine learning?|A type of AI that enables systems to learn from data without explicit programming|10|Theory
Explain supervised learning|Learning with labeled training data to make predictions on new data|15|Theory
Code a simple linear regression|Algorithm that models relationship between variables using a straight line|25|Programming`
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="theme-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                    <div className="p-4 border-b theme-border flex justify-between items-center">
                        <h3 className="text-lg font-semibold theme-text">Format Example: {selectedFormat.toUpperCase()} Separated</h3>
                        <button
                            onClick={() => setShowFormatModal(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono theme-text whitespace-pre-wrap overflow-x-auto">
                            {examples[selectedFormat as keyof typeof examples]}
                        </pre>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => copyFormatToClipboard()}
                                className="btn-primary text-sm"
                            >
                                📋 Copy This Example
                            </button>
                            <button
                                onClick={() => setShowFormatModal(false)}
                                className="btn-secondary text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (mode === 'add') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <PlusIcon />
                        {editingQuestion ? 'Edit Q&A Question' : 'Add Q&A Question'}
                    </h2>
                    <button
                        onClick={() => {
                            setMode('practice');
                            setEditingQuestion(null);
                            setNewQuestion('');
                            setNewAnswer('');
                            setNewMarks(2);
                            setNewCategory('');
                        }}
                        className="btn-secondary text-sm"
                    >
                        Back to Practice
                    </button>
                </div>

                <div className="space-y-4 max-w-2xl">
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Question:
                        </label>
                        <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Enter the question..."
                            className="w-full h-24 p-3 theme-surface border rounded-lg theme-text resize-none"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Marks:
                            </label>
                            <select
                                value={newMarks}
                                onChange={(e) => setNewMarks(Number(e.target.value))}
                                className="w-full p-2 theme-surface border rounded theme-text"
                            >
                                {getAllMarksOptions().map(mark => (
                                    <option key={mark} value={mark}>{mark} mark{mark !== 1 ? 's' : ''}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowCustomMarks(!showCustomMarks)}
                                className="mt-1 text-xs btn-secondary"
                            >
                                {showCustomMarks ? 'Hide' : 'Add'} Custom Marks
                            </button>
                            {showCustomMarks && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="number"
                                        value={customMarkInput}
                                        onChange={(e) => setCustomMarkInput(e.target.value)}
                                        placeholder="e.g., 15"
                                        className="flex-1 p-1 text-sm theme-surface border rounded theme-text"
                                        min="1"
                                        max="100"
                                    />
                                    <button
                                        onClick={() => {
                                            const marks = parseInt(customMarkInput);
                                            if (marks && marks > 0 && marks <= 100 && !getAllMarksOptions().includes(marks)) {
                                                setCustomMarks([...customMarks, marks]);
                                                setCustomMarkInput('');
                                            }
                                        }}
                                        className="px-2 py-1 text-xs btn-primary"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Category (optional):
                            </label>
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="e.g., Theory, Numerical"
                                className="w-full p-2 theme-surface border rounded theme-text"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Answer:
                        </label>
                        <textarea
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            placeholder="Enter the answer..."
                            className="w-full h-32 p-3 theme-surface border rounded-lg theme-text resize-none"
                        />
                    </div>

                    <button
                        onClick={handleAddQuestion}
                        disabled={!newQuestion.trim() || !newAnswer.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editingQuestion ? 'Update Question' : 'Add Question'}
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'import') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <UploadIcon />
                        Import Q&A Questions
                    </h2>
                    <button
                        onClick={() => setMode('practice')}
                        className="btn-secondary text-sm"
                    >
                        Back to Practice
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Import format explanation */}
                    <div className="theme-surface border theme-border rounded-lg p-4">
                        <h3 className="font-medium theme-text mb-2">
                            📝 Import Format
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium theme-text mb-1">
                                    Choose Format:
                                </label>
                                <select 
                                    value={selectedFormat}
                                    onChange={(e) => setSelectedFormat(e.target.value)}
                                    className="w-full p-2 theme-surface border rounded theme-text text-sm"
                                >
                                    <option value="tab">Tab separated (recommended)</option>
                                    <option value="semicolon">Semicolon separated</option>
                                    <option value="pipe">Pipe separated</option>
                                </select>
                            </div>
                            
                            {/* Copy Format Button */}
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => copyFormatToClipboard()}
                                    className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
                                >
                                    📋 Copy Format
                                </button>
                                <button 
                                    onClick={() => showFormatExample()}
                                    className="flex-1 btn-secondary text-sm"
                                >
                                    👁️ View Example
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-xs theme-text-secondary mt-2">
                            Format: Question{selectedFormat === 'tab' ? '[TAB]' : selectedFormat === 'semicolon' ? ';' : '|'}Answer{selectedFormat === 'tab' ? '[TAB]' : selectedFormat === 'semicolon' ? ';' : '|'}Marks{selectedFormat === 'tab' ? '[TAB]' : selectedFormat === 'semicolon' ? ';' : '|'}Category (optional)
                        </p>
                    </div>

                    {/* File import */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Upload .txt file:
                        </label>
                        <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileImport}
                            className="w-full p-2 theme-surface border rounded theme-text"
                        />
                    </div>

                    {/* AI Smart Import */}
                    <div className="border theme-border rounded-lg p-4">
                        <h3 className="font-medium theme-text mb-3">🤖 AI Smart Import</h3>
                        <p className="text-sm theme-text-secondary mb-4">
                            AI-powered intelligent extraction from text files or images with OCR - no formatting required!
                        </p>
                        
                        {/* Performance and Limitation Notes */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">⚡ Performance Tips:</h4>
                            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>• <strong>Text files (.txt)</strong> process instantly and are recommended</li>
                                <li>• <strong>PDF and Image files</strong> may take 1-2 minutes for OCR processing</li>
                                <li>• <strong>Large PDFs not supported</strong> - PDF should contain less than 10,000 characters</li>
                                <li>• For best results, use clear, high-quality images with readable text</li>
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <input
                                type="file"
                                accept=".txt,.jpg,.jpeg,.png,.bmp,.webp,.pdf"
                                onChange={handleSmartImport}
                                className="w-full p-2 theme-surface border rounded theme-text text-sm"
                                disabled={isAIProcessing}
                            />
                            <button 
                                onClick={() => {
                                    const input = document.querySelector('input[type="file"][accept*=".txt"]') as HTMLInputElement;
                                    input?.click();
                                }}
                                className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                                disabled={isAIProcessing}
                            >
                                {isAIProcessing ? (
                                    <AILoadingAnimation 
                                        message="AI is analyzing..." 
                                        emoji="📚"
                                        size="md"
                                    />
                                ) : (
                                    <>
                                        🤖 AI Smart Import
                                    </>
                                )}
                            </button>
                            <p className="text-xs theme-text-secondary">
                                Upload any text file and AI will intelligently extract Q&A pairs with proper formatting. No specific format required!
                            </p>
                        </div>
                    </div>

                    {/* Manual import */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Or paste questions manually:
                        </label>
                        <textarea
                            placeholder="Question 1[TAB]Answer 1[TAB]5[TAB]Theory&#10;Question 2[TAB]Answer 2[TAB]10[TAB]Numerical"
                            className="w-full h-32 p-3 theme-surface border rounded-lg theme-text font-mono text-sm"
                        />
                        <button 
                            onClick={handleManualImport}
                            className="mt-3 btn-primary"
                        >
                            Import Questions
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'manage') {
        return (
            <div className={`theme-surface rounded-lg p-2 sm:p-6 ${className}`}>
                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 sm:mb-6`}>
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        ⚙️ Manage Q&A Questions
                    </h2>
                    <button
                        onClick={() => setMode('practice')}
                        className={`${isMobile() ? 'btn-secondary text-sm w-full py-2' : 'btn-secondary text-sm'}`}
                    >
                        Back to Practice
                    </button>
                </div>

                {qaQuestions.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-base sm:text-lg font-medium theme-text mb-2">No questions to manage</h3>
                        <p className="theme-text-secondary mb-3 sm:mb-4 text-sm">Add questions to start managing them</p>
                        <button
                            onClick={() => setMode('add')}
                            className={`${isMobile() ? 'btn-primary w-full text-sm py-2 max-w-xs mx-auto' : 'btn-primary'} flex items-center justify-center gap-2`}
                        >
                            <PlusIcon />
                            Add First Question
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {/* Summary */}
                        <div className={`flex ${isMobile() ? 'flex-col gap-2' : 'justify-between items-center'} ${isMobile() ? 'p-3' : 'p-4'} theme-surface2 rounded-lg`}>
                            <div className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary ${isMobile() ? 'text-center' : ''}`}>
                                Total: {qaQuestions.length} questions | Total marks: {qaQuestions.reduce((sum, q) => sum + q.marks, 0)}
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-2 sm:space-y-3">
                            {qaQuestions.map((question) => (
                                <div key={question.id} className={`border theme-border rounded-lg ${isMobile() ? 'p-3' : 'p-4'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className={`flex ${isMobile() ? 'flex-col gap-1' : 'items-center gap-2'} mb-2`}>
                                                <h3 className={`${isMobile() ? 'text-sm' : ''} font-medium theme-text`}>
                                                    {question.question}
                                                </h3>
                                                <div className={`flex ${isMobile() ? 'gap-1' : 'gap-2'}`}>
                                                    <span className={`${isMobile() ? 'text-xs' : 'text-xs'} theme-text-secondary theme-surface2 px-2 py-1 rounded`}>
                                                        {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                                    </span>
                                                    {question.category && (
                                                        <span className={`${isMobile() ? 'text-xs' : 'text-xs'} theme-text-secondary theme-surface2 px-2 py-1 rounded`}>
                                                            {question.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary mb-2 sm:mb-3`}>
                                                <strong>Answer:</strong> {question.answer}
                                            </p>
                                        </div>
                                        <div className={`flex ${isMobile() ? 'flex-col gap-1 ml-2' : 'gap-2'}`}>
                                            <button
                                                onClick={() => {
                                                    // Set up edit mode with this question
                                                    setEditingQuestion(question);
                                                    setNewQuestion(question.question);
                                                    setNewAnswer(question.answer);
                                                    setNewMarks(question.marks);
                                                    setNewCategory(question.category || '');
                                                    setMode('add');
                                                }}
                                                className={`${isMobile() ? 'btn-secondary text-xs px-2 py-1' : 'btn-secondary text-sm'} flex items-center gap-1`}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this question?')) {
                                                        const updatedQuestions = qaQuestions.filter(q => q.id !== question.id);
                                                        setQaQuestions(updatedQuestions);
                                                        // Save to localStorage
                                                        localStorage.setItem(`qa_${currentBook}_${currentChapter}`, JSON.stringify(updatedQuestions));
                                                    }
                                                }}
                                                className={`${isMobile() ? 'btn-danger text-xs px-2 py-1' : 'btn-danger text-sm'} flex items-center gap-1`}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (mode === 'test') {
        return (
            <QATest
                questions={qaQuestions}
                currentBook={currentBook}
                currentChapter={currentChapter}
                onBack={() => setMode('practice')}
            />
        );
    }

    return (
        <div className={`theme-surface rounded-lg p-2 sm:p-6 ${className}`}>
            <FormatExampleModal />
            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 sm:mb-6`}>
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    <SparklesIcon />
                    Q&A Practice
                </h2>
                <div className={`flex ${isMobile() ? 'flex-wrap gap-1' : 'gap-2'}`}>
                    <button
                        onClick={() => setMode('add')}
                        className={`${isMobile() ? 'btn-secondary text-xs px-2 py-1' : 'btn-secondary text-sm'} flex items-center gap-1`}
                    >
                        <PlusIcon />
                        Add
                    </button>
                    <button
                        onClick={() => setMode('test')}
                        className={`${isMobile() ? 'btn-primary text-xs px-2 py-1' : 'btn-primary text-sm'} flex items-center gap-1`}
                    >
                        🧪 Test
                    </button>
                    <button
                        onClick={() => setMode('import')}
                        className={`${isMobile() ? 'btn-secondary text-xs px-2 py-1' : 'btn-secondary text-sm'} flex items-center gap-1`}
                    >
                        <UploadIcon />
                        Import
                    </button>
                    <button
                        onClick={() => setMode('manage')}
                        className={`${isMobile() ? 'btn-secondary text-xs px-2 py-1' : 'btn-secondary text-sm'} flex items-center gap-1`}
                    >
                        ⚙️ Manage
                    </button>
                    {/* Settings Gear Icon */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                            className={`${isMobile() ? 'btn-secondary text-xs px-2 py-1' : 'btn-secondary text-sm px-3 py-2'} flex items-center gap-1`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {!isMobile() && <span>Settings</span>}
                        </button>
                        
                        {/* Settings Dropdown */}
                        {showSettingsDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-64 theme-surface rounded-lg shadow-lg border theme-border z-20 p-4">
                                <div className="space-y-4">
                                    {/* Display mode toggle */}
                                    <div>
                                        <div className="text-sm font-medium theme-text mb-2">View Mode:</div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setDisplayMode('individual');
                                                    setShowSettingsDropdown(false);
                                                }}
                                                className={`flex-1 px-3 py-1 text-sm rounded ${
                                                    displayMode === 'individual' 
                                                        ? 'theme-accent text-white' 
                                                        : 'btn-secondary'
                                                }`}
                                            >
                                                Individual
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDisplayMode('batch');
                                                    setShowSettingsDropdown(false);
                                                }}
                                                className={`flex-1 px-3 py-1 text-sm rounded ${
                                                    displayMode === 'batch' 
                                                        ? 'theme-accent text-white' 
                                                        : 'btn-secondary'
                                                }`}
                                            >
                                                Batch View
                                            </button>
                                        </div>
                                    </div>

                                    {/* Marks filter */}
                                    <div>
                                        <div className="text-sm font-medium theme-text mb-2">Filter by marks:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {getAvailableMarks().map(mark => (
                                                <button
                                                    key={mark}
                                                    onClick={() => {
                                                        setSelectedMarks(prev => 
                                                            prev.includes(mark) 
                                                                ? prev.filter(m => m !== mark)
                                                                : [...prev, mark]
                                                        );
                                                    }}
                                                    className={`px-2 py-1 text-xs rounded ${
                                                        selectedMarks.includes(mark)
                                                            ? 'theme-accent text-white'
                                                            : 'btn-secondary'
                                                    }`}
                                                >
                                                    {mark}
                                                </button>
                                            ))}
                                            {selectedMarks.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedMarks([])}
                                                    className="px-2 py-1 text-xs btn-secondary"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Close dropdown when clicking outside */}
                        {showSettingsDropdown && (
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowSettingsDropdown(false)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {qaQuestions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 theme-text-secondary">
                        <SparklesIcon />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium theme-text mb-2">No Q&A questions yet</h3>
                    <p className="theme-text-secondary mb-3 sm:mb-4 text-sm">Add questions to start practicing</p>
                    <button
                        onClick={() => setMode('add')}
                        className={`${isMobile() ? 'btn-primary w-full text-sm py-2 max-w-xs mx-auto' : 'btn-primary'} flex items-center justify-center gap-2`}
                    >
                        <PlusIcon />
                        Add First Question
                    </button>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {/* Questions display */}
                    {displayMode === 'individual' ? (
                        // Individual question display
                        filteredQuestions.length > 0 && (
                            <div className="space-y-3 sm:space-y-4">
                                <div className={`flex ${isMobile() ? 'flex-col gap-2 text-center' : 'items-center justify-between'} ${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary`}>
                                    <span>Question {currentQuestionIndex + 1} of {filteredQuestions.length}</span>
                                    <span>{filteredQuestions[currentQuestionIndex]?.marks} mark{filteredQuestions[currentQuestionIndex]?.marks !== 1 ? 's' : ''}</span>
                                </div>

                                <div className={`border theme-border rounded-lg ${isMobile() ? 'p-3' : 'p-6'}`}>
                                    <h3 className={`${isMobile() ? 'text-base' : 'text-lg'} font-medium theme-text mb-3 sm:mb-4`}>
                                        {filteredQuestions[currentQuestionIndex]?.question}
                                    </h3>
                                    
                                    {showAnswers[filteredQuestions[currentQuestionIndex]?.id] && (
                                        <div className={`${isMobile() ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t theme-border`}>
                                            <h4 className={`font-medium theme-text ${isMobile() ? 'text-sm mb-2' : 'mb-2'}`}>Answer:</h4>
                                            <p className={`theme-text-secondary ${isMobile() ? 'text-sm leading-relaxed' : 'leading-relaxed'}`}>
                                                {filteredQuestions[currentQuestionIndex]?.answer}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex justify-center gap-3 sm:gap-4">
                                    <button
                                        onClick={() => {
                                            const currentId = filteredQuestions[currentQuestionIndex]?.id;
                                            setShowAnswers(prev => ({
                                                ...prev,
                                                [currentId]: !prev[currentId]
                                            }));
                                        }}
                                        className={`${isMobile() ? 'btn-primary text-sm px-4 py-2' : 'btn-primary'}`}
                                    >
                                        {showAnswers[filteredQuestions[currentQuestionIndex]?.id] ? 'Hide Answer' : 'Show Answer'}
                                    </button>
                                </div>

                                {/* Navigation */}
                                <div className="flex justify-center gap-3 sm:gap-4">
                                    <button
                                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className={`${isMobile() ? 'btn-secondary text-sm px-3 py-2' : 'btn-secondary'} disabled:opacity-50`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentQuestionIndex(Math.min(filteredQuestions.length - 1, currentQuestionIndex + 1))}
                                        disabled={currentQuestionIndex === filteredQuestions.length - 1}
                                        className={`${isMobile() ? 'btn-secondary text-sm px-3 py-2' : 'btn-secondary'} disabled:opacity-50`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        // Batch view - all questions together
                        <div className={`space-y-4 ${isMobile() ? 'sm:space-y-6' : 'space-y-6'}`}>
                            {filteredQuestions.map((question) => (
                                <div key={question.id} className={`border theme-border rounded-lg ${isMobile() ? 'p-3' : 'p-6'}`}>
                                    <div className={`flex ${isMobile() ? 'flex-col gap-2' : 'justify-between items-start'} mb-3`}>
                                        <h3 className={`${isMobile() ? 'text-base' : 'text-lg'} font-medium theme-text flex-1`}>
                                            {question.question}
                                        </h3>
                                        <span className={`${isMobile() ? 'text-xs self-start' : 'text-sm'} theme-text-secondary bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ${isMobile() ? '' : 'ml-4'}`}>
                                            {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    
                                    {showAnswers[question.id] && (
                                        <div className={`${isMobile() ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t theme-border`}>
                                            <h4 className={`font-medium theme-text ${isMobile() ? 'text-sm mb-2' : 'mb-2'}`}>Answer:</h4>
                                            <p className={`theme-text-secondary ${isMobile() ? 'text-sm leading-relaxed' : 'leading-relaxed'}`}>
                                                {question.answer}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div className="mt-3 sm:mt-4">
                                        <button
                                            onClick={() => {
                                                setShowAnswers(prev => ({
                                                    ...prev,
                                                    [question.id]: !prev[question.id]
                                                }));
                                            }}
                                            className={`${isMobile() ? 'btn-secondary text-xs px-3 py-1' : 'btn-secondary text-sm'}`}
                                        >
                                            {showAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary */}
                    <div className="text-center text-sm theme-text-secondary">
                        Total: {qaQuestions.length} questions | 
                        Filtered: {filteredQuestions.length} questions | 
                        Total marks: {filteredQuestions.reduce((sum, q) => sum + q.marks, 0)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QAManager;
