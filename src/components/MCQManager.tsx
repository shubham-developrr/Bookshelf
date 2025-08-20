import React, { useState } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon, UploadIcon } from './icons';
import { processAIImport } from '../utils/aiImportService';
import { MCQTest } from './TestComponents';

interface MCQOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface MCQQuestion {
    id: string;
    question: string;
    options: MCQOption[];
    explanation?: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
}

interface MCQManagerProps {
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const MCQManager: React.FC<MCQManagerProps> = ({
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [mode, setMode] = useState<'practice' | 'manage' | 'add' | 'import' | 'test'>('practice');
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
    const [showResults, setShowResults] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState('pipe');
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [isAIProcessing, setIsAIProcessing] = useState(false);

    // Edit state
    const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(null);

    // Form state for adding/editing
    const [newQuestion, setNewQuestion] = useState('');
    const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
    const [correctOption, setCorrectOption] = useState<number>(0);
    const [newExplanation, setNewExplanation] = useState('');
    const [newCategory, setNewCategory] = useState('');

    const storageKey = `mcq_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load MCQs from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setMcqQuestions(JSON.parse(saved));
        }
    }, [storageKey]);

    // Save MCQs to localStorage
    const saveMcqQuestions = (questions: MCQQuestion[]) => {
        localStorage.setItem(storageKey, JSON.stringify(questions));
        setMcqQuestions(questions);
    };

    // Handle adding/editing MCQ questions
    const handleAddMCQ = () => {
        if (!newQuestion.trim() || newOptions.some(opt => !opt.trim())) {
            return;
        }

        if (editingQuestion) {
            // Edit existing question
            const updatedQuestions = mcqQuestions.map(q => 
                q.id === editingQuestion.id 
                    ? {
                        ...q,
                        question: newQuestion.trim(),
                        options: newOptions.map((text, index) => ({
                            id: `${editingQuestion.id}_opt_${index}`,
                            text: text.trim(),
                            isCorrect: index === correctOption
                        })),
                        explanation: newExplanation.trim() || undefined,
                        category: newCategory.trim() || undefined,
                    }
                    : q
            );
            saveMcqQuestions(updatedQuestions);
            setEditingQuestion(null);
        } else {
            // Add new question
            const newMCQ: MCQQuestion = {
                id: Date.now().toString(),
                question: newQuestion.trim(),
                options: newOptions.map((text, index) => ({
                    id: `${Date.now()}_opt_${index}`,
                    text: text.trim(),
                    isCorrect: index === correctOption
                })),
                explanation: newExplanation.trim() || undefined,
                category: newCategory.trim() || undefined,
            };
            
            const updatedQuestions = [...mcqQuestions, newMCQ];
            saveMcqQuestions(updatedQuestions);
        }
        
        // Reset form
        setNewQuestion('');
        setNewOptions(['', '', '', '']);
        setCorrectOption(0);
        setNewExplanation('');
        setNewCategory('');
        setMode('practice');
    };

    // Handle AI-powered import
    const handleSmartImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.includes('text')) {
            alert('Please select a text file (.txt)');
            return;
        }

        setIsAIProcessing(true);
        
        try {
            const text = await file.text();
            
            if (!text.trim()) {
                alert('The selected file is empty.');
                return;
            }
            
            // Use AI service to process the text
            const result = await processAIImport(text, 'mcq');
            
            if (result.success && result.data.length > 0) {
                const updatedQuestions = [...mcqQuestions, ...result.data];
                saveMcqQuestions(updatedQuestions);
                alert(`🤖 AI Import Success! Extracted ${result.data.length} MCQ questions from your text content.`);
                setMode('practice');
            } else {
                alert(result.message || 'No MCQ questions could be extracted from the text. Please ensure your text contains questions with multiple choice options.');
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

    // Handle standard format file import (pipe, semicolon, JSON)
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>, type: 'text' | 'pdf') => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (type === 'pdf') {
            alert('PDF import has been removed. Please use text files or AI smart import.');
            return;
        }

        if (!file.type.includes('text')) {
            alert('Please select a text file (.txt)');
            return;
        }

        try {
            const text = await file.text();
            await processTextImport(text);
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
        const importedQuestions: MCQQuestion[] = [];
        
        for (const line of lines) {
            try {
                let question: MCQQuestion | null = null;
                
                if (selectedFormat === 'pipe') {
                    const parts = line.split('|').map(p => p.trim());
                    if (parts.length >= 6) {
                        question = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            question: parts[0],
                            options: [
                                { id: '1', text: parts[1], isCorrect: parts[1] === parts[5] },
                                { id: '2', text: parts[2], isCorrect: parts[2] === parts[5] },
                                { id: '3', text: parts[3], isCorrect: parts[3] === parts[5] },
                                { id: '4', text: parts[4], isCorrect: parts[4] === parts[5] }
                            ],
                            explanation: parts[6] || undefined
                        };
                    }
                } else if (selectedFormat === 'semicolon') {
                    const parts = line.split(';').map(p => p.trim());
                    if (parts.length >= 6) {
                        question = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            question: parts[0],
                            options: [
                                { id: '1', text: parts[1], isCorrect: parts[1] === parts[5] },
                                { id: '2', text: parts[2], isCorrect: parts[2] === parts[5] },
                                { id: '3', text: parts[3], isCorrect: parts[3] === parts[5] },
                                { id: '4', text: parts[4], isCorrect: parts[4] === parts[5] }
                            ],
                            explanation: parts[6] || undefined
                        };
                    }
                } else if (selectedFormat === 'json') {
                    const parsed = JSON.parse(line);
                    if (parsed.question && parsed.options && Array.isArray(parsed.options)) {
                        question = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            question: parsed.question,
                            options: parsed.options.map((opt: string, idx: number) => ({
                                id: (idx + 1).toString(),
                                text: opt,
                                isCorrect: idx === parsed.correct
                            })),
                            explanation: parsed.explanation
                        };
                    }
                }
                
                if (question) {
                    importedQuestions.push(question);
                }
            } catch (err) {
                console.warn('Skipping invalid line:', line);
            }
        }
        
        if (importedQuestions.length > 0) {
            const updatedQuestions = [...mcqQuestions, ...importedQuestions];
            saveMcqQuestions(updatedQuestions);
            alert(`Successfully imported ${importedQuestions.length} questions!`);
            setMode('practice');
        } else {
            alert('No valid questions found. Please check your format.');
        }
    };

    // Process manual text input
    const handleManualImport = async () => {
        const textarea = document.querySelector('textarea[placeholder*="Paste your MCQ"]') as HTMLTextAreaElement;
        if (textarea && textarea.value.trim()) {
            await processTextImport(textarea.value);
            textarea.value = '';
        }
    };

    // Copy format to clipboard
    const copyFormatToClipboard = async () => {
        const formats = {
            pipe: "Question|Option A|Option B|Option C|Option D|Correct Answer|Explanation (optional)",
            semicolon: "Question;Option A;Option B;Option C;Option D;Correct Answer;Explanation (optional)",
            json: '{"question": "Your Question", "options": ["Option A", "Option B", "Option C", "Option D"], "correct": 0, "explanation": "Optional explanation"}'
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

    if (mode === 'test') {
        return (
            <MCQTest
                questions={mcqQuestions}
                currentBook={currentBook}
                currentChapter={currentChapter}
                onBack={() => setMode('practice')}
            />
        );
    }

    if (mode === 'import') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <UploadIcon />
                        Import MCQ Questions
                    </h2>
                    <button
                        onClick={() => setMode('practice')}
                        className="btn-secondary text-sm"
                    >
                        Back to Practice
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Research-based import options */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Text File Import */}
                    <div className="border theme-border rounded-lg p-4">
                        <h3 className="font-medium theme-text mb-3">📄 Text File Import</h3>
                        <p className="text-sm theme-text-secondary mb-4">
                            Import from .txt files with structured format
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium theme-text mb-1">
                                    Format:
                                </label>
                                <select 
                                    value={selectedFormat}
                                    onChange={(e) => setSelectedFormat(e.target.value)}
                                    className="w-full p-2 theme-surface border rounded theme-text text-sm"
                                >
                                    <option value="pipe">Question|OptionA|OptionB|OptionC|OptionD|CorrectAnswer|Explanation</option>
                                    <option value="semicolon">Question;A;B;C;D;Answer;Note</option>
                                    <option value="json">JSON Format</option>
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
                            
                            <input
                                type="file"
                                accept=".txt,.json"
                                onChange={(e) => handleFileImport(e, 'text')}
                                className="w-full p-2 theme-surface border rounded theme-text text-sm"
                            />
                            <button 
                                onClick={() => {
                                    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                                    input?.click();
                                }}
                                className="w-full btn-secondary text-sm"
                            >
                                Import Text File
                            </button>
                        </div>
                    </div>                        {/* AI Smart Import */}
                        <div className="border theme-border rounded-lg p-4">
                            <h3 className="font-medium theme-text mb-3">� AI Smart Import</h3>
                            <p className="text-sm theme-text-secondary mb-4">
                                AI-powered intelligent extraction from unstructured text - no formatting required!
                            </p>
                            <div className="space-y-3">
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={(e) => handleSmartImport(e)}
                                    className="w-full p-2 theme-surface border rounded theme-text text-sm"
                                />
                                <button 
                                    onClick={() => {
                                        const inputs = document.querySelectorAll('input[type="file"]');
                                        const smartInput = inputs[1] as HTMLInputElement;
                                        smartInput?.click();
                                    }}
                                    className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                                    disabled={isAIProcessing}
                                >
                                    {isAIProcessing ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            Processing with AI...
                                        </>
                                    ) : (
                                        <>
                                            🤖 AI Smart Import
                                        </>
                                    )}
                                </button>
                                <p className="text-xs theme-text-secondary">
                                    Upload any text file and AI will intelligently extract MCQ questions with proper formatting. No specific format required!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Manual Text Input */}
                    <div className="border theme-border rounded-lg p-4">
                        <h3 className="font-medium theme-text mb-3">✍️ Manual Import</h3>
                        <textarea
                            placeholder="Paste your MCQ questions here in the selected format..."
                            className="w-full h-32 p-3 theme-surface border rounded-lg theme-text text-sm font-mono"
                        />
                        <div className="flex gap-2 mt-3">
                            <button 
                                onClick={handleManualImport}
                                className="btn-primary text-sm"
                            >
                                Process & Import
                            </button>
                            <button 
                                onClick={() => showFormatExample()}
                                className="btn-secondary text-sm"
                            >
                                Preview Format
                            </button>
                        </div>
                    </div>

                    {/* Import Capabilities */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            🤖 AI Import Capabilities
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Real AI-powered question extraction from unstructured text</li>
                            <li>• Intelligent pattern recognition for questions and answers</li>
                            <li>• Automatic option generation and answer identification</li>
                            <li>• Support for multiple text formats (structured and unstructured)</li>
                            <li>• Difficulty classification and category detection</li>
                            <li>• Explanation generation and quality validation</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // Format example modal
    const FormatExampleModal = () => {
        if (!showFormatModal) return null;
        
        const examples = {
            pipe: `What is HTML?|HyperText Markup Language|HyperText Multi Language|HyperLink Markup Language|High Tech Modern Language|HyperText Markup Language|HTML is the standard markup language for creating web pages
What is CSS?|Cascading Style Sheets|Computer Style Sheets|Creative Style System|Cascading System Styles|Cascading Style Sheets|CSS is used for styling web pages`,
            semicolon: `What is JavaScript?;A scripting language;A styling language;A markup language;A database;A scripting language;JavaScript is a programming language for web development
What is React?;A JavaScript library;A database;A web server;A programming language;A JavaScript library;React is a library for building user interfaces`,
            json: `[
  {
    "question": "What is Node.js?",
    "options": ["A runtime environment", "A web browser", "A database", "A framework"],
    "correct": 0,
    "explanation": "Node.js is a JavaScript runtime built on Chrome's V8 engine"
  },
  {
    "question": "What is MongoDB?",
    "options": ["A relational database", "A NoSQL database", "A web server", "A programming language"],
    "correct": 1,
    "explanation": "MongoDB is a document-oriented NoSQL database"
  }
]`
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="theme-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                    <div className="p-4 border-b theme-border flex justify-between items-center">
                        <h3 className="text-lg font-semibold theme-text">Format Example: {selectedFormat.toUpperCase()}</h3>
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

    // Mobile detection
    const isMobile = () => window.innerWidth <= 768;

    return (
        <div className={`theme-surface rounded-lg p-2 sm:p-6 ${className}`}>
            <FormatExampleModal />
            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 sm:mb-6`}>
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    <SparklesIcon />
                    MCQ Practice
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
                        className={`${isMobile() ? 'btn-secondary text-xs px-2 py-1' : 'btn-secondary text-sm'}`}
                    >
                        Manage ({mcqQuestions.length})
                    </button>
                </div>
            </div>

            {/* Add Question Form - Show regardless of existing questions */}
            {mode === 'add' && (
                <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold theme-text">
                            {editingQuestion ? 'Edit MCQ Question' : 'Add New MCQ Question'}
                        </h3>
                        <button
                            onClick={() => {
                                setMode('practice');
                                setEditingQuestion(null);
                                setNewQuestion('');
                                setNewOptions(['', '', '', '']);
                                setCorrectOption(0);
                                setNewExplanation('');
                                setNewCategory('');
                            }}
                            className="btn-secondary text-sm"
                        >
                            Back to Practice
                        </button>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Question:
                        </label>
                        <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Enter your question here..."
                            className="w-full h-24 p-3 theme-surface border rounded-lg theme-text resize-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Options:
                        </label>
                        <div className="space-y-2">
                            {['A', 'B', 'C', 'D'].map((letter, index) => (
                                <div key={letter} className="flex items-center gap-3">
                                    <span className="font-medium theme-text">{letter}.</span>
                                    <input
                                        type="text"
                                        value={newOptions[index]}
                                        onChange={(e) => {
                                            const updated = [...newOptions];
                                            updated[index] = e.target.value;
                                            setNewOptions(updated);
                                        }}
                                        placeholder={`Option ${letter}`}
                                        className="flex-1 p-2 theme-surface border rounded theme-text"
                                    />
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="correct-answer"
                                            checked={correctOption === index}
                                            onChange={() => setCorrectOption(index)}
                                            className="mr-1"
                                        />
                                        <span className="text-sm theme-text-secondary">Correct</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Explanation (optional):
                        </label>
                        <textarea
                            value={newExplanation}
                            onChange={(e) => setNewExplanation(e.target.value)}
                            placeholder="Explain why this is the correct answer..."
                            className="w-full h-20 p-3 theme-surface border rounded-lg theme-text resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Category (optional):
                        </label>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="e.g., Physics, Chemistry, Math..."
                            className="w-full p-2 theme-surface border rounded theme-text"
                        />
                    </div>
                    
                    <button 
                        onClick={handleAddMCQ}
                        disabled={!newQuestion.trim() || newOptions.some(opt => !opt.trim())}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editingQuestion ? 'Update Question' : 'Add Question'}
                    </button>
                </div>
            )}

            {mcqQuestions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 theme-text-secondary">
                        <SparklesIcon />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium theme-text mb-2">No MCQ questions yet</h3>
                    <p className="theme-text-secondary mb-3 sm:mb-4 text-sm">Add questions manually or import from files</p>
                    <div className={`flex ${isMobile() ? 'flex-col gap-2' : 'gap-3 justify-center'}`}>
                        <button
                            onClick={() => setMode('add')}
                            className={`${isMobile() ? 'btn-primary w-full text-sm py-2' : 'btn-primary'} flex items-center justify-center gap-2`}
                        >
                            <PlusIcon />
                            Add Question
                        </button>
                        <button
                            onClick={() => setMode('import')}
                            className={`${isMobile() ? 'btn-secondary w-full text-sm py-2' : 'btn-secondary'} flex items-center justify-center gap-2`}
                        >
                            <UploadIcon />
                            Import Questions
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {mode === 'practice' && mcqQuestions.length > 0 && (
                        <div>
                            {/* Question Display */}
                            <div className={`theme-surface rounded-lg ${isMobile() ? 'p-3' : 'p-6'} mb-4 sm:mb-6 border theme-border`}>
                                <div className={`flex ${isMobile() ? 'flex-col gap-2' : 'justify-between items-center'} mb-3 sm:mb-4`}>
                                    <span className="text-sm theme-text-secondary">
                                        Question {currentQuestionIndex + 1} of {mcqQuestions.length}
                                    </span>
                                    <span className="text-sm theme-text-secondary">
                                        {mcqQuestions[currentQuestionIndex]?.difficulty || 'medium'}
                                    </span>
                                </div>
                                
                                <h3 className={`${isMobile() ? 'text-base' : 'text-lg'} font-medium theme-text mb-4 sm:mb-6`}>
                                    {mcqQuestions[currentQuestionIndex]?.question}
                                </h3>
                                
                                {/* Options */}
                                <div className={`space-y-2 sm:space-y-3 ${isMobile() ? 'mb-4' : 'mb-6'}`}>
                                    {mcqQuestions[currentQuestionIndex]?.options.map((option, index) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                const currentId = mcqQuestions[currentQuestionIndex].id;
                                                setSelectedAnswers(prev => ({
                                                    ...prev,
                                                    [currentId]: option.id
                                                }));
                                            }}
                                            className={`w-full text-left ${isMobile() ? 'p-3 text-sm' : 'p-4'} rounded-lg border theme-transition ${
                                                selectedAnswers[mcqQuestions[currentQuestionIndex].id] === option.id
                                                    ? 'theme-accent-bg theme-accent-bg-text border-current'
                                                    : 'theme-border hover:theme-surface2 theme-text'
                                            }`}
                                        >
                                            <span className="font-medium mr-3">
                                                {String.fromCharCode(65 + index)}.
                                            </span>
                                            {option.text}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Show Answer Button */}
                                {selectedAnswers[mcqQuestions[currentQuestionIndex].id] && (
                                    <div className="space-y-3 sm:space-y-4">
                                        <button
                                            onClick={() => setShowResults(true)}
                                            className={`${isMobile() ? 'btn-primary w-full text-sm py-2' : 'btn-primary'}`}
                                        >
                                            Check Answer
                                        </button>
                                        
                                        {showResults && (
                                            <div className={`${isMobile() ? 'p-3' : 'p-4'} rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20`}>
                                                <div className="flex items-center mb-2">
                                                    <span className={`font-medium ${
                                                        mcqQuestions[currentQuestionIndex].options.find(opt => 
                                                            opt.id === selectedAnswers[mcqQuestions[currentQuestionIndex].id]
                                                        )?.isCorrect 
                                                            ? 'text-green-600 dark:text-green-400' 
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {mcqQuestions[currentQuestionIndex].options.find(opt => 
                                                            opt.id === selectedAnswers[mcqQuestions[currentQuestionIndex].id]
                                                        )?.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                                                    </span>
                                                </div>
                                                
                                                <p className={`${isMobile() ? 'text-xs' : 'text-sm'} text-green-700 dark:text-green-300 mb-2`}>
                                                    <strong>Correct Answer:</strong> {
                                                        mcqQuestions[currentQuestionIndex].options.find(opt => opt.isCorrect)?.text
                                                    }
                                                </p>
                                                
                                                {mcqQuestions[currentQuestionIndex].explanation && (
                                                    <p className={`${isMobile() ? 'text-xs' : 'text-sm'} text-green-700 dark:text-green-300`}>
                                                        <strong>Explanation:</strong> {mcqQuestions[currentQuestionIndex].explanation}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Navigation */}
                                <div className={`flex ${isMobile() ? 'justify-center gap-3' : 'justify-between'} mt-4 sm:mt-6`}>
                                    <button
                                        onClick={() => {
                                            setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1));
                                            setShowResults(false);
                                        }}
                                        disabled={currentQuestionIndex === 0}
                                        className={`${isMobile() ? 'btn-secondary text-sm px-3 py-2' : 'btn-secondary'} disabled:opacity-50`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentQuestionIndex(Math.min(mcqQuestions.length - 1, currentQuestionIndex + 1));
                                            setShowResults(false);
                                        }}
                                        disabled={currentQuestionIndex === mcqQuestions.length - 1}
                                        className={`${isMobile() ? 'btn-secondary text-sm px-3 py-2' : 'btn-secondary'} disabled:opacity-50`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {mode === 'manage' && (
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-base sm:text-lg font-semibold theme-text">Manage Questions</h3>
                            {mcqQuestions.map((question, index) => (
                                <div key={question.id} className={`theme-surface2 rounded-lg ${isMobile() ? 'p-3' : 'p-4'} border theme-border`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className={`font-medium theme-text ${isMobile() ? 'text-sm mb-2' : 'mb-2'}`}>
                                                Q{index + 1}. {question.question}
                                            </div>
                                            <div className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary space-y-1`}>
                                                {question.options.map((option, optIndex) => (
                                                    <div key={option.id} className={option.isCorrect ? 'text-green-600 font-medium' : ''}>
                                                        {String.fromCharCode(65 + optIndex)}. {option.text}
                                                        {option.isCorrect && ' ✓'}
                                                    </div>
                                                ))}
                                            </div>
                                            {question.explanation && (
                                                <div className={`${isMobile() ? 'text-xs' : 'text-xs'} theme-text-secondary mt-2`}>
                                                    <strong>Explanation:</strong> {question.explanation}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`flex ${isMobile() ? 'flex-col gap-1 ml-2' : 'gap-2 ml-4'}`}>
                                            <button
                                                onClick={() => {
                                                    setEditingQuestion(question);
                                                    setNewQuestion(question.question);
                                                    setNewOptions(question.options.map(opt => opt.text));
                                                    setCorrectOption(question.options.findIndex(opt => opt.isCorrect));
                                                    setNewExplanation(question.explanation || '');
                                                    setNewCategory(question.category || '');
                                                    setMode('add');
                                                }}
                                                className={`${isMobile() ? 'p-1 text-xs' : 'p-2'} theme-text-secondary hover:theme-text theme-transition`}
                                                title="Edit Question"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const updated = mcqQuestions.filter(q => q.id !== question.id);
                                                    saveMcqQuestions(updated);
                                                }}
                                                className={`${isMobile() ? 'p-1 text-xs' : 'p-2'} text-red-400 hover:text-red-600 theme-transition`}
                                                title="Delete Question"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MCQManager;
