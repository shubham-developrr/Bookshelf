import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface QuestionEditorProps {
    paper: {
        id: string;
        title: string;
        category: 'previous-year' | 'mock' | 'custom';
        year?: string;
        customCategory?: string;
        questions: Question[];
        duration: number;
        createdAt: Date;
    };
    onClose: () => void;
    onSave: (updatedPaper: any) => void;
}

interface Question {
    id: string;
    questionNumber: number;
    section: string;
    question: string;
    options: string[];
    correctAnswer: number;
    marks: number;
    explanation?: string;
    isOptional?: boolean;
    optionalGroup?: string;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ paper, onClose, onSave }) => {
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [activeTab, setActiveTab] = useState<'manage' | 'import'>('manage');
    const [questions, setQuestions] = useState<Question[]>(paper.questions);
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    
    // Add/Edit Question Form States
    const [questionNumber, setQuestionNumber] = useState(1);
    const [section, setSection] = useState('Section A');
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState(0);
    const [marks, setMarks] = useState(1);
    const [explanation, setExplanation] = useState('');
    const [isOptional, setIsOptional] = useState(false);
    const [optionalGroup, setOptionalGroup] = useState('');
    
    // Import States
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [ocrText, setOcrText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            questionNumber,
            section,
            question: questionText,
            options: options.filter(opt => opt.trim() !== ''),
            correctAnswer,
            marks,
            explanation: explanation || undefined,
            isOptional: isOptional || undefined,
            optionalGroup: (isOptional && optionalGroup) ? optionalGroup : undefined
        };

        if (editingQuestion) {
            setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? newQuestion : q));
        } else {
            setQuestions(prev => [...prev, newQuestion]);
        }

        resetForm();
        setShowAddQuestion(false);
        setEditingQuestion(null);
    };

    const resetForm = () => {
        setQuestionNumber(questions.length + 1);
        setSection('Section A');
        setQuestionText('');
        setOptions(['', '', '', '']);
        setCorrectAnswer(0);
        setMarks(1);
        setExplanation('');
        setIsOptional(false);
        setOptionalGroup('');
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setQuestionNumber(question.questionNumber);
        setSection(question.section);
        setQuestionText(question.question);
        setOptions([...question.options, '', '', '', ''].slice(0, 4));
        setCorrectAnswer(question.correctAnswer);
        setMarks(question.marks);
        setExplanation(question.explanation || '');
        setIsOptional(question.isOptional || false);
        setOptionalGroup(question.optionalGroup || '');
        setShowAddQuestion(true);
    };

    const handleDeleteQuestion = (questionId: string) => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    const handleSave = () => {
        const updatedPaper = {
            ...paper,
            questions
        };
        onSave(updatedPaper);
        onClose();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setUploadedFiles(files);
    };

    const processWithOCR = async () => {
        setIsProcessing(true);
        // Simulate OCR processing
        setTimeout(() => {
            const mockOcrText = `
SECTION A - Multiple Choice Questions (1 mark each)

1. What is the time complexity of binary search?
   a) O(n)
   b) O(log n)
   c) O(n²)
   d) O(1)
   Answer: b

2. Which data structure follows LIFO principle?
   a) Queue
   b) Stack
   c) Array
   d) Linked List
   Answer: b

SECTION B - Optional Questions (Answer any TWO) (5 marks each)

3. Option A: Explain the concept of recursion with example.
   OR
   Option B: Describe the difference between array and linked list.

4. Option A: What is dynamic programming? Give an example.
   OR
   Option B: Explain sorting algorithms and their complexities.
            `;
            setOcrText(mockOcrText);
            setIsProcessing(false);
        }, 2000);
    };

    const processWithAI = async () => {
        setIsProcessing(true);
        // Simulate AI processing of OCR text
        setTimeout(() => {
            const mockExtractedQuestions: Question[] = [
                {
                    id: 'ai_1',
                    questionNumber: 1,
                    section: 'Section A',
                    question: 'What is the time complexity of binary search?',
                    options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
                    correctAnswer: 1,
                    marks: 1,
                    isOptional: false
                },
                {
                    id: 'ai_2',
                    questionNumber: 2,
                    section: 'Section A',
                    question: 'Which data structure follows LIFO principle?',
                    options: ['Queue', 'Stack', 'Array', 'Linked List'],
                    correctAnswer: 1,
                    marks: 1,
                    isOptional: false
                },
                {
                    id: 'ai_3',
                    questionNumber: 3,
                    section: 'Section B',
                    question: 'Explain the concept of recursion with example.',
                    options: [],
                    correctAnswer: 0,
                    marks: 5,
                    isOptional: true,
                    optionalGroup: 'Group1'
                },
                {
                    id: 'ai_4',
                    questionNumber: 3,
                    section: 'Section B',
                    question: 'Describe the difference between array and linked list.',
                    options: [],
                    correctAnswer: 0,
                    marks: 5,
                    isOptional: true,
                    optionalGroup: 'Group1'
                }
            ];
            setExtractedQuestions(mockExtractedQuestions);
            setIsProcessing(false);
        }, 3000);
    };

    const importExtractedQuestions = () => {
        setQuestions(prev => [...prev, ...extractedQuestions]);
        setExtractedQuestions([]);
        setOcrText('');
        setUploadedFiles([]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="theme-bg rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border">
                    <div>
                        <h2 className="text-xl font-bold theme-text">Edit Questions</h2>
                        <p className="text-sm theme-text-secondary">{paper.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                    >
                        <svg className="w-6 h-6 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b theme-border">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                            activeTab === 'manage'
                                ? 'theme-accent text-white border-b-2 border-current'
                                : 'theme-text hover:theme-surface2'
                        } theme-transition`}
                    >
                        Manage Questions
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                            activeTab === 'import'
                                ? 'theme-accent text-white border-b-2 border-current'
                                : 'theme-text hover:theme-surface2'
                        } theme-transition`}
                    >
                        Import from File
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    {activeTab === 'manage' && (
                        <div className="p-6">
                            {/* Header with Add Question Button */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold theme-text">
                                    Questions ({questions.length})
                                </h3>
                                <button
                                    onClick={() => {
                                        resetForm();
                                        setShowAddQuestion(true);
                                    }}
                                    className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                                >
                                    Add Question
                                </button>
                            </div>

                            {/* Add/Edit Question Form */}
                            {showAddQuestion && (
                                <div className="mb-6 p-4 theme-surface2 rounded-lg border theme-border">
                                    <h4 className="font-medium theme-text mb-4">
                                        {editingQuestion ? 'Edit Question' : 'Add New Question'}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium theme-text mb-2">Question Number</label>
                                            <input
                                                type="number"
                                                value={questionNumber}
                                                onChange={(e) => setQuestionNumber(Number(e.target.value))}
                                                className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium theme-text mb-2">Section</label>
                                            <select
                                                value={section}
                                                onChange={(e) => setSection(e.target.value)}
                                                className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text"
                                            >
                                                <option value="Section A">Section A</option>
                                                <option value="Section B">Section B</option>
                                                <option value="Section C">Section C</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium theme-text mb-2">Marks</label>
                                            <input
                                                type="number"
                                                value={marks}
                                                onChange={(e) => setMarks(Number(e.target.value))}
                                                min="1"
                                                className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium theme-text mb-2">Question</label>
                                        <textarea
                                            value={questionText}
                                            onChange={(e) => setQuestionText(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text"
                                            placeholder="Enter your question here..."
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium theme-text mb-2">Options</label>
                                        {options.map((option, index) => (
                                            <div key={index} className="flex items-center gap-2 mb-2">
                                                <span className="w-8 text-sm theme-text">{String.fromCharCode(97 + index)})</span>
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...options];
                                                        newOptions[index] = e.target.value;
                                                        setOptions(newOptions);
                                                    }}
                                                    className="flex-1 px-3 py-2 theme-surface border theme-border rounded-lg theme-text"
                                                    placeholder={`Option ${String.fromCharCode(97 + index)}`}
                                                />
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    checked={correctAnswer === index}
                                                    onChange={() => setCorrectAnswer(index)}
                                                    className="w-4 h-4"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isOptional}
                                                    onChange={(e) => setIsOptional(e.target.checked)}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm theme-text">Optional Question</span>
                                            </label>
                                            {isOptional && (
                                                <input
                                                    type="text"
                                                    value={optionalGroup}
                                                    onChange={(e) => setOptionalGroup(e.target.value)}
                                                    placeholder="Optional Group (e.g., Group1)"
                                                    className="px-3 py-1 text-sm theme-surface border theme-border rounded-lg theme-text"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium theme-text mb-2">Explanation (Optional)</label>
                                        <textarea
                                            value={explanation}
                                            onChange={(e) => setExplanation(e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text"
                                            placeholder="Explain the correct answer..."
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowAddQuestion(false);
                                                setEditingQuestion(null);
                                                resetForm();
                                            }}
                                            className="px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddQuestion}
                                            disabled={!questionText.trim()}
                                            className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                                        >
                                            {editingQuestion ? 'Update Question' : 'Add Question'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Questions List */}
                            <div className="space-y-4">
                                {questions.length === 0 ? (
                                    <div className="text-center py-8 theme-surface2 rounded-lg">
                                        <p className="theme-text-secondary">No questions added yet</p>
                                    </div>
                                ) : (
                                    questions
                                        .sort((a, b) => a.questionNumber - b.questionNumber)
                                        .map((question) => (
                                            <div key={question.id} className="p-4 theme-surface rounded-lg border theme-border">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                                                Q{question.questionNumber} - {question.section}
                                                            </span>
                                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                                                                {question.marks} mark{question.marks > 1 ? 's' : ''}
                                                            </span>
                                                            {question.isOptional && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                                                    Optional ({question.optionalGroup})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-medium theme-text mb-2">{question.question}</p>
                                                        {question.options.length > 0 && (
                                                            <div className="text-sm theme-text-secondary space-y-1">
                                                                {question.options.map((option, index) => (
                                                                    <div key={index} className={`${index === question.correctAnswer ? 'font-medium text-green-600 dark:text-green-400' : ''}`}>
                                                                        {String.fromCharCode(97 + index)}) {option}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleEditQuestion(question)}
                                                            className="p-2 text-blue-600 hover:text-blue-800 theme-transition"
                                                            title="Edit Question"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuestion(question.id)}
                                                            className="p-2 text-red-600 hover:text-red-800 theme-transition"
                                                            title="Delete Question"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'import' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold theme-text mb-6">Import Questions from File</h3>
                            
                            {/* File Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium theme-text mb-2">Upload PDF or Image</label>
                                <div className="border-2 border-dashed theme-border rounded-lg p-6 text-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                                    >
                                        Choose Files
                                    </button>
                                    <p className="text-sm theme-text-secondary mt-2">
                                        Support: PDF, PNG, JPG, JPEG
                                    </p>
                                </div>
                                
                                {uploadedFiles.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 theme-surface2 rounded">
                                                <span className="text-sm theme-text">{file.name}</span>
                                                <span className="text-xs theme-text-secondary">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                            </div>
                                        ))}
                                        <button
                                            onClick={processWithOCR}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 theme-transition"
                                        >
                                            {isProcessing ? 'Processing...' : 'Extract Text with OCR'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* OCR Text */}
                            {ocrText && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium theme-text mb-2">Extracted Text</label>
                                    <textarea
                                        value={ocrText}
                                        onChange={(e) => setOcrText(e.target.value)}
                                        rows={10}
                                        className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text text-sm"
                                    />
                                    <button
                                        onClick={processWithAI}
                                        disabled={isProcessing}
                                        className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 theme-transition"
                                    >
                                        {isProcessing ? 'Processing with AI...' : 'Process with AI'}
                                    </button>
                                </div>
                            )}

                            {/* Extracted Questions */}
                            {extractedQuestions.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-medium theme-text">Extracted Questions ({extractedQuestions.length})</h4>
                                        <button
                                            onClick={importExtractedQuestions}
                                            className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                                        >
                                            Import All Questions
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {extractedQuestions.map((question) => (
                                            <div key={question.id} className="p-4 theme-surface2 rounded-lg border theme-border">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                                        Q{question.questionNumber} - {question.section}
                                                    </span>
                                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                                                        {question.marks} mark{question.marks > 1 ? 's' : ''}
                                                    </span>
                                                    {question.isOptional && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                                            Optional ({question.optionalGroup})
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-medium theme-text mb-2">{question.question}</p>
                                                {question.options.length > 0 && (
                                                    <div className="text-sm theme-text-secondary space-y-1">
                                                        {question.options.map((option, index) => (
                                                            <div key={index} className={`${index === question.correctAnswer ? 'font-medium text-green-600 dark:text-green-400' : ''}`}>
                                                                {String.fromCharCode(97 + index)}) {option}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4 border-t theme-border">
                    <div className="text-sm theme-text-secondary">
                        Total Questions: {questions.length} | Total Marks: {questions.reduce((sum, q) => sum + q.marks, 0)}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionEditor;
