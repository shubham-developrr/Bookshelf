import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { extractTextFromFile, extractTextFromMultipleFiles, OCRProgress } from '../utils/ocrService';
import { processAIImport } from '../utils/aiImportService';
import AILoadingAnimation from './AILoadingAnimation';

interface QuestionEditorProps {
    paper: {
        id: string;
        title: string;
        category: 'previous-year' | 'mock' | 'custom';
        year?: string;
        customCategory?: string;
        sections: Section[];
        duration: number;
        createdAt: Date;
    };
    onClose: () => void;
    onSave: (updatedPaper: any) => void;
}

interface Section {
    id: string;
    name: string;
    totalQuestions: number;
    requiredAnswers: number;
    questions: Question[];
}

interface QuestionOption {
    id: string;
    text: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
}

interface Question {
    id: string;
    questionNumber: number;
    questionType: 'mcq' | 'long-answer';
    marks: number;
    questionOptions: QuestionOption[]; // Array of internal choice options (A, B, etc.)
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ paper, onClose, onSave }) => {
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Helper function to ensure questions have the new structure
    const ensureQuestionStructure = (question: any): Question => {
        if (question.questionOptions) {
            return question; // Already has new structure
        }
        
        // Convert old structure to new structure
        return {
            ...question,
            questionOptions: [{
                id: question.id + '-option-0',
                text: question.question || '',
                options: question.options,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation,
            }]
        };
    };
    
    const [activeTab, setActiveTab] = useState<'manage' | 'import'>('manage');
    const [sections, setSections] = useState<Section[]>(
        paper.sections.map(section => ({
            ...section,
            questions: section.questions.map(ensureQuestionStructure)
        }))
    );
    const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showSectionSettings, setShowSectionSettings] = useState(false);
    const [showQuestionList, setShowQuestionList] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);
    const [showRenameSection, setShowRenameSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [renameSectionName, setRenameSectionName] = useState('');
    
    // Question Form States
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [currentOptionIndex, setCurrentOptionIndex] = useState(0); // For navigating between question options
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [questionType, setQuestionType] = useState<'mcq' | 'long-answer'>('long-answer');
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState(0);
    const [marks, setMarks] = useState(1);
    const [explanation, setExplanation] = useState('');
    
    // Section Settings States
    const [sectionRequiredAnswers, setSectionRequiredAnswers] = useState(0);
    
    // Import States
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [ocrText, setOcrText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const getCurrentSection = () => sections.find(s => s.id === activeSection);
    const getCurrentQuestions = () => getCurrentSection()?.questions || [];

    const handleAddSection = () => {
        if (!newSectionName.trim()) return;
        
        const newSection: Section = {
            id: Date.now().toString(),
            name: newSectionName.trim(),
            totalQuestions: 0,
            requiredAnswers: 0,
            questions: []
        };
        
        setSections(prev => [...prev, newSection]);
        setActiveSection(newSection.id);
        setNewSectionName('');
        setShowAddSection(false);
    };

    const handleDeleteSection = (sectionId: string) => {
        if (sections.length <= 1) return; // Keep at least one section
        
        setSections(prev => prev.filter(s => s.id !== sectionId));
        if (activeSection === sectionId) {
            setActiveSection(sections.filter(s => s.id !== sectionId)[0]?.id || '');
        }
    };

    const handleSectionSettings = () => {
        const section = getCurrentSection();
        if (section) {
            // Set required answers from section data, defaulting to actual question count
            const actualQuestionCount = section.questions.length;
            setSectionRequiredAnswers(section.requiredAnswers || actualQuestionCount);
            setShowSectionSettings(true);
        }
    };

    const handleRenameSection = () => {
        const section = getCurrentSection();
        if (section) {
            setRenameSectionName(section.name);
            setShowRenameSection(true);
        }
    };

    const saveRenameSection = () => {
        if (!renameSectionName.trim()) return;
        
        setSections(prev => prev.map(section => 
            section.id === activeSection 
                ? { ...section, name: renameSectionName.trim() }
                : section
        ));
        setShowRenameSection(false);
        setRenameSectionName('');
    };

    const saveSectionSettings = () => {
        // Get the actual number of questions in the current section
        const currentSection = sections.find(section => section.id === activeSection);
        const actualQuestionCount = currentSection ? currentSection.questions.length : 0;
        
        // Validate that required answers doesn't exceed actual number of questions
        const validatedRequiredAnswers = Math.min(sectionRequiredAnswers, actualQuestionCount);
        
        if (sectionRequiredAnswers > actualQuestionCount) {
            alert(`Required answers (${sectionRequiredAnswers}) cannot be greater than actual questions in section (${actualQuestionCount}). Setting required answers to ${validatedRequiredAnswers}.`);
        }
        
        // Update sections with auto-calculated total questions and validated required answers
        const updatedSections = sections.map(section => 
            section.id === activeSection 
                ? { 
                    ...section, 
                    totalQuestions: actualQuestionCount, // Auto-calculated from actual questions
                    requiredAnswers: validatedRequiredAnswers 
                }
                : section
        );
        
        // Use direct state update to ensure persistence
        setSections(updatedSections);
        
        // Update the local state to reflect the validated value
        setSectionRequiredAnswers(validatedRequiredAnswers);
        setShowSectionSettings(false);
    };

    const handleAddQuestion = () => {
        resetQuestionForm();
        setShowQuestionForm(true);
    };

    const resetQuestionForm = () => {
        setEditingQuestion(null);
        setQuestionType('long-answer');
        setQuestionText('');
        setOptions(['', '', '', '']);
        setCorrectAnswer(0);
        setMarks(1);
        setExplanation('');
    };

    const saveQuestion = () => {
        const currentSection = getCurrentSection();
        if (!currentSection || !questionText.trim()) return;

        const newQuestionOption: QuestionOption = {
            id: Date.now().toString(),
            text: questionText,
            options: questionType === 'mcq' ? options.filter(opt => opt.trim() !== '') : undefined,
            correctAnswer: questionType === 'mcq' ? correctAnswer : undefined,
            explanation: explanation || undefined,
        };

        setSections(prev => prev.map(section => {
            if (section.id === activeSection) {
                let updatedQuestions;
                let newQuestionIndex = -1;
                
                if (editingQuestion) {
                    // Update existing question option
                    updatedQuestions = section.questions.map(q => {
                        if (q.id === editingQuestion.id) {
                            const updatedOptions = [...q.questionOptions];
                            updatedOptions[currentOptionIndex] = newQuestionOption;
                            return { 
                                ...q, 
                                questionType,
                                marks,
                                questionOptions: updatedOptions 
                            };
                        }
                        return q;
                    });
                } else {
                    // Create new question with first option
                    const questions = getCurrentQuestions();
                    const questionNumber = questions.length + 1;
                    
                    const newQuestion: Question = {
                        id: Date.now().toString(),
                        questionNumber,
                        questionType,
                        marks,
                        questionOptions: [newQuestionOption],
                    };
                    
                    updatedQuestions = [...section.questions, newQuestion];
                    newQuestionIndex = updatedQuestions.length - 1; // Set to last question
                }
                
                // Navigate to the newly added question
                if (newQuestionIndex >= 0) {
                    setTimeout(() => setCurrentQuestionIndex(newQuestionIndex), 100);
                }
                
                return { ...section, questions: updatedQuestions };
            }
            return section;
        }));

        setShowQuestionForm(false);
        resetQuestionForm();
    };

    const handleEditQuestion = (question: Question, optionIndex: number = 0) => {
        setEditingQuestion(question);
        setCurrentOptionIndex(optionIndex);
        setQuestionType(question.questionType);
        setMarks(question.marks);
        
        // Load the specific question option data
        const currentOption = question.questionOptions[optionIndex];
        if (currentOption) {
            setQuestionText(currentOption.text);
            setOptions(currentOption.options ? [...currentOption.options, '', '', '', ''].slice(0, 4) : ['', '', '', '']);
            setCorrectAnswer(currentOption.correctAnswer || 0);
            setExplanation(currentOption.explanation || '');
        } else {
            // Reset form if no option exists
            setQuestionText('');
            setOptions(['', '', '', '']);
            setCorrectAnswer(0);
            setExplanation('');
        }
        setShowQuestionForm(true);
    };

    const handleDeleteQuestion = (questionId: string) => {
        setSections(prev => prev.map(section => ({
            ...section,
            questions: section.questions.filter(q => q.id !== questionId)
        })));
    };

    const handleDeleteQuestionOption = (questionId: string, optionIndex: number) => {
        setSections(prev => prev.map(section => {
            if (section.id === activeSection) {
                const updatedQuestions = section.questions.map(q => {
                    if (q.id === questionId && q.questionOptions.length > 1) {
                        const updatedOptions = q.questionOptions.filter((_, index) => index !== optionIndex);
                        return {
                            ...q,
                            questionOptions: updatedOptions
                        };
                    }
                    return q;
                });
                return { ...section, questions: updatedQuestions };
            }
            return section;
        }));

        // Adjust current option index if needed
        if (currentOptionIndex >= optionIndex && currentOptionIndex > 0) {
            setCurrentOptionIndex(currentOptionIndex - 1);
        }
        
        // Close the form if we deleted the last option or if no options remain
        const question = getCurrentQuestions().find(q => q.id === questionId);
        if (question && question.questionOptions.length <= 1) {
            setShowQuestionForm(false);
            setEditingQuestion(null);
        }
    };

    const handleAddOrOption = (questionId: string) => {
        const question = getCurrentQuestions().find(q => q.id === questionId);
        if (!question) return;

        // Add a new question option to the existing question
        const newQuestionOption: QuestionOption = {
            id: Date.now().toString(),
            text: '',
            options: question.questionType === 'mcq' ? ['', '', '', ''] : undefined,
            correctAnswer: question.questionType === 'mcq' ? 0 : undefined,
            explanation: undefined,
        };

        setSections(prev => prev.map(section => {
            if (section.id === activeSection) {
                const updatedQuestions = section.questions.map(q => {
                    if (q.id === questionId) {
                        return {
                            ...q,
                            questionOptions: [...q.questionOptions, newQuestionOption]
                        };
                    }
                    return q;
                });
                return { ...section, questions: updatedQuestions };
            }
            return section;
        }));

        // Navigate to the new question option for editing
        const newOptionIndex = question.questionOptions.length;
        setCurrentOptionIndex(newOptionIndex);
        
        // Auto-open edit form for the new option
        setTimeout(() => {
            const updatedQuestion = { ...question, questionOptions: [...question.questionOptions, newQuestionOption] };
            handleEditQuestion(updatedQuestion, newOptionIndex);
        }, 100);
    };

    const navigateQuestion = (direction: 'prev' | 'next') => {
        const questions = getCurrentQuestions();
        if (direction === 'prev' && currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        } else if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleSave = () => {
        const updatedPaper = {
            ...paper,
            sections
        };
        onSave(updatedPaper);
        onClose();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setUploadedFiles(files);
    };

    const processWithOCR = async () => {
        if (!uploadedFiles || uploadedFiles.length === 0) {
            alert('Please upload files first.');
            return;
        }

        setIsProcessing(true);
        setOcrText(''); // Clear previous text
        
        try {
            let extractedText = '';
            
            if (uploadedFiles.length === 1) {
                // Single file processing
                const result = await extractTextFromFile(uploadedFiles[0], (progress: OCRProgress) => {
                    console.log(`OCR Progress: ${progress.status} - ${Math.round(progress.progress)}%`);
                });
                
                if (result.success) {
                    extractedText = result.text;
                } else {
                    throw new Error(result.error || 'OCR processing failed');
                }
            } else {
                // Multiple files processing
                const result = await extractTextFromMultipleFiles(uploadedFiles, (progress: OCRProgress) => {
                    console.log(`OCR Progress: ${progress.status} - ${Math.round(progress.progress)}%`);
                });
                
                if (result.success) {
                    extractedText = result.text;
                } else {
                    throw new Error(result.error || 'OCR processing failed');
                }
            }
            
            if (!extractedText.trim()) {
                throw new Error('No text could be extracted from the uploaded files. Please ensure the images contain clear, readable text.');
            }
            
            setOcrText(extractedText);
            alert(`✅ OCR completed successfully! Extracted ${extractedText.length} characters of text.`);
            
        } catch (error) {
            console.error('OCR processing failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
            alert(`❌ OCR Error: ${errorMessage}`);
            
            // Fallback: Show a sample text for testing
            setOcrText(`OCR processing failed. Here's a sample for testing:

1. What is a data structure?
A data structure is a way of organizing and storing data so that it can be accessed and worked with efficiently.

2. Explain the difference between arrays and linked lists.
Arrays store elements in contiguous memory locations, while linked lists store elements in nodes that are connected through pointers.

3. What is the time complexity of binary search?
a) O(1)
b) O(log n)
c) O(n)
d) O(n²)
Answer: b) O(log n)

4. Define recursion and provide an example.
Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const parseQuestionsFromText = (text: string) => {
        const questions: any[] = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        let currentQuestion: any = null;
        let questionCounter = 1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if line starts with a number (new question)
            const questionMatch = line.match(/^(\d+)\.\s*(.*)/);
            if (questionMatch) {
                // Save previous question if exists
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                
                // Start new question
                currentQuestion = {
                    id: Date.now() + questionCounter,
                    questionNumber: parseInt(questionMatch[1]),
                    questionType: 'long-answer',
                    marks: 5, // Default marks
                    questionOptions: [{
                        id: Date.now() + questionCounter + '-option-0',
                        text: questionMatch[2],
                        explanation: '',
                    }]
                };
                questionCounter++;
            }
            // Check for MCQ options (a), b), c), d))
            else if (line.match(/^[a-d]\)\s*/)) {
                if (currentQuestion) {
                    // Convert to MCQ if not already
                    if (currentQuestion.questionType === 'long-answer') {
                        currentQuestion.questionType = 'mcq';
                        currentQuestion.questionOptions[0].options = [];
                        currentQuestion.questionOptions[0].correctAnswer = 0;
                    }
                    
                    const optionText = line.replace(/^[a-d]\)\s*/, '');
                    currentQuestion.questionOptions[0].options.push(optionText);
                }
            }
            // Check for answer line
            else if (line.toLowerCase().startsWith('answer:')) {
                if (currentQuestion && currentQuestion.questionType === 'mcq') {
                    const answerMatch = line.match(/answer:\s*([a-d])/i);
                    if (answerMatch) {
                        const answerLetter = answerMatch[1].toLowerCase();
                        const answerIndex = answerLetter.charCodeAt(0) - 'a'.charCodeAt(0);
                        currentQuestion.questionOptions[0].correctAnswer = answerIndex;
                    }
                }
            }
            // Add to explanation/description
            else if (currentQuestion && line.length > 0) {
                if (currentQuestion.questionOptions[0].explanation) {
                    currentQuestion.questionOptions[0].explanation += ' ' + line;
                } else {
                    currentQuestion.questionOptions[0].explanation = line;
                }
            }
        }
        
        // Add the last question
        if (currentQuestion) {
            questions.push(currentQuestion);
        }
        
        return questions;
    };

    const handleAutoGenerateQuestions = async () => {
        if (!ocrText.trim()) {
            alert('Please extract text first or enter text manually.');
            return;
        }
        
        setIsProcessing(true);
        
        try {
            // First try to parse manually for immediate feedback
            const manuallyParsed = parseQuestionsFromText(ocrText);
            
            // Then enhance with AI processing for better structure
            const aiResult = await processAIImport(ocrText, 'qa');
            
            let questionsToAdd: any[] = [];
            
            if (aiResult.success && aiResult.data.length > 0) {
                // Use AI-processed questions (more accurate)
                questionsToAdd = aiResult.data.map((item: any, index: number) => ({
                    id: Date.now().toString() + '_ai_' + index,
                    questionNumber: index + 1,
                    questionType: item.options ? 'mcq' : 'long-answer',
                    marks: item.marks || (item.options ? 1 : 5),
                    isOptional: false,
                    optionalGroup: null,
                    questionOptions: [{
                        id: Date.now().toString() + '_option_' + index,
                        text: item.question,
                        options: item.options?.map((opt: any) => opt.text),
                        correctAnswer: item.options?.findIndex((opt: any) => opt.isCorrect),
                        explanation: item.answer || item.explanation || undefined,
                    }]
                }));
                
                alert(`🤖 AI processing successful! Generated ${questionsToAdd.length} well-structured questions.`);
            } else if (manuallyParsed.length > 0) {
                // Fallback to manual parsing
                questionsToAdd = manuallyParsed;
                alert(`📝 Manual parsing successful! Generated ${questionsToAdd.length} questions. (AI processing was not available)`);
            } else {
                throw new Error('No questions could be extracted. Please check the text format.');
            }
            
            if (questionsToAdd.length === 0) {
                throw new Error('No questions found in the text. Please check the format or try manual entry.');
            }
            
            // Add questions to current section
            setSections(prev => prev.map(section => {
                if (section.id === activeSection) {
                    return {
                        ...section,
                        questions: [...section.questions, ...questionsToAdd]
                    };
                }
                return section;
            }));
            
            // Clear the text and files
            setOcrText('');
            setUploadedFiles([]);
            setActiveTab('manage');
            
        } catch (error) {
            console.error('Question generation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Question generation failed';
            alert(`❌ Error: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="theme-bg rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
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

                {/* Action Bar */}
                <div className="flex items-center justify-between p-3 border-b theme-border theme-surface2">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium theme-text">Sections:</h3>
                        <div className="flex items-center gap-2">
                            {sections.map((section) => (
                                <div key={section.id} className="flex items-center">
                                    <button
                                        onClick={() => {
                                            setActiveSection(section.id);
                                            setCurrentQuestionIndex(0);
                                        }}
                                        className={`px-2 py-1 text-xs rounded ${
                                            activeSection === section.id
                                                ? 'theme-accent text-white'
                                                : 'theme-surface theme-text border theme-border hover:theme-surface2'
                                        } theme-transition`}
                                    >
                                        {section.name} ({section.questions.length})
                                    </button>
                                    {sections.length > 1 && activeSection === section.id && (
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="ml-1 w-4 h-4 flex items-center justify-center text-red-600 hover:text-red-800 theme-transition"
                                            title="Delete Section"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setShowAddSection(true)}
                                className="w-6 h-6 flex items-center justify-center theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition"
                                title="Add Section"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('import')}
                        className="px-3 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition"
                    >
                        Import
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    {activeTab === 'import' ? (
                        <div className="p-4">
                            <h3 className="text-lg font-semibold theme-text mb-4">Import Questions from File</h3>
                            
                            {/* File Upload */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium theme-text mb-2">Upload PDF or Image</label>
                                <div className="border-2 border-dashed theme-border rounded-lg p-4 text-center">
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
                                        className="px-3 py-2 text-sm theme-accent text-white rounded hover:opacity-90 theme-transition"
                                    >
                                        Choose Files
                                    </button>
                                    <p className="text-xs theme-text-secondary mt-2">
                                        Support: PDF, PNG, JPG, JPEG
                                    </p>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mt-2">
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            <strong>⚡ Note:</strong> Text files process instantly. PDF and Image files may take 1-2 minutes for OCR processing. Large PDFs not supported - should contain less than 10,000 characters.
                                        </p>
                                    </div>
                                </div>
                                
                                {uploadedFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 theme-surface2 rounded text-sm">
                                                <span className="theme-text">{file.name}</span>
                                            </div>
                                        ))}
                                        <button
                                            onClick={processWithOCR}
                                            disabled={isProcessing}
                                            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 theme-transition"
                                        >
                                            {isProcessing ? (
                                                <AILoadingAnimation 
                                                    message="Extracting text..." 
                                                    emoji="📖"
                                                    size="sm"
                                                />
                                            ) : (
                                                'Extract Text with OCR'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Manual Text Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium theme-text mb-2">Or Enter Text Manually</label>
                                <textarea
                                    value={ocrText}
                                    onChange={(e) => setOcrText(e.target.value)}
                                    placeholder="Paste or type questions here...&#10;&#10;Format example:&#10;1. What is a data structure?&#10;A data structure is...&#10;&#10;2. Multiple choice question?&#10;a) Option A&#10;b) Option B&#10;c) Option C&#10;d) Option D&#10;Answer: b"
                                    className="w-full h-40 p-3 theme-surface border theme-border rounded theme-text text-sm"
                                />
                            </div>

                            {/* Auto Generate Button */}
                            {ocrText.trim() && (
                                <div className="mb-4">
                                    <button
                                        onClick={handleAutoGenerateQuestions}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded theme-transition disabled:opacity-50"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <AILoadingAnimation 
                                                message="Generating questions..." 
                                                emoji="🤖"
                                                size="md"
                                            />
                                        ) : (
                                            'Auto Generate Questions'
                                        )}
                                    </button>
                                    <p className="text-xs theme-text-secondary mt-2">
                                        This will parse the text above and create questions automatically.
                                    </p>
                                </div>
                            )}

                            {/* Import Instructions */}
                            <div className="theme-surface2 p-3 rounded text-sm">
                                <h4 className="font-medium theme-text mb-2">Import Instructions:</h4>
                                <ul className="text-xs theme-text-secondary space-y-1">
                                    <li>• Number questions like "1.", "2.", etc.</li>
                                    <li>• For MCQ, use a), b), c), d) format</li>
                                    <li>• Add "Answer: a" for correct option</li>
                                    <li>• Questions will be added to the current section</li>
                                    <li>• You can edit imported questions after generation</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4">
                            {/* Add Section Modal Inline */}
                            {showAddSection && (
                                <div className="mb-4 p-3 theme-surface2 rounded border theme-border">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newSectionName}
                                            onChange={(e) => setNewSectionName(e.target.value)}
                                            placeholder="Section name"
                                            className="flex-1 px-2 py-1 text-sm theme-surface border theme-border rounded theme-text"
                                        />
                                        <button
                                            onClick={handleAddSection}
                                            className="px-2 py-1 text-xs theme-accent text-white rounded hover:opacity-90"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddSection(false);
                                                setNewSectionName('');
                                            }}
                                            className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {getCurrentSection() && (
                                <>
                                    {/* Section Header - Compact Mobile Layout */}
                                    <div className="flex flex-col gap-2 mb-4">
                                        {/* Single Line Button Layout for Mobile and Desktop */}
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <button
                                                onClick={() => {
                                                    const currentSectionData = getCurrentSection();
                                                    setRenameSectionName(currentSectionData?.name || '');
                                                    setShowRenameSection(true);
                                                }}
                                                className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition flex-shrink-0"
                                            >
                                                Rename
                                            </button>
                                            <button
                                                onClick={handleSectionSettings}
                                                className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition flex-shrink-0"
                                            >
                                                Settings
                                            </button>
                                            <button
                                                onClick={() => setShowQuestionList(true)}
                                                className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition flex-shrink-0"
                                            >
                                                List
                                            </button>
                                            <button
                                                onClick={handleAddQuestion}
                                                className="px-2 py-1 text-xs theme-accent text-white rounded hover:opacity-90 theme-transition flex-shrink-0"
                                            >
                                                Add Question
                                            </button>
                                            {getCurrentQuestions().length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const questions = getCurrentQuestions();
                                                        const lastQuestion = questions[questions.length - 1];
                                                        if (lastQuestion) {
                                                            handleAddOrOption(lastQuestion.id);
                                                        }
                                                    }}
                                                    className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded theme-transition flex-shrink-0"
                                                >
                                                    Add OR
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question Display */}
                                    {getCurrentQuestions().length > 0 ? (
                                        <div className="space-y-4">
                                            {/* Question Navigation */}
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs theme-text-secondary">
                                                    Question {currentQuestionIndex + 1} of {getCurrentQuestions().length}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => navigateQuestion('prev')}
                                                        disabled={currentQuestionIndex === 0}
                                                        className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded disabled:opacity-50 hover:theme-surface2 theme-transition"
                                                    >
                                                        ←
                                                    </button>
                                                    <button
                                                        onClick={() => navigateQuestion('next')}
                                                        disabled={currentQuestionIndex === getCurrentQuestions().length - 1}
                                                        className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded disabled:opacity-50 hover:theme-surface2 theme-transition"
                                                    >
                                                        →
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Current Question */}
                                            {getCurrentQuestions()[currentQuestionIndex] && (
                                                <div className="p-3 theme-surface rounded border theme-border">
                                                    {(() => {
                                                        const question = getCurrentQuestions()[currentQuestionIndex];
                                                        return (
                                                            <div>
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-1 mb-2">
                                                                            <span className="px-1 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                                                                Q{question.questionNumber}
                                                                            </span>
                                                                            <span className="px-1 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                                                                                {question.marks}m
                                                                            </span>
                                                                            <span className="px-1 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                                                                                {question.questionType === 'mcq' ? 'MCQ' : 'LA'}
                                                                            </span>
                                                                            {question.questionOptions.length > 1 && (
                                                                                <span className="px-1 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                                                                    OR
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Display all question options */}
                                                                        {question.questionOptions.map((option, optionIndex) => (
                                                                            <div key={option.id} className="mb-3 p-2 border-l-2 border-gray-300 dark:border-gray-600">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <span className="text-xs font-medium theme-text">
                                                                                        Question {question.questionNumber}{question.questionOptions.length > 1 ? String.fromCharCode(65 + optionIndex) : ''}:
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-sm font-medium theme-text mb-2">{option.text || 'No text added yet'}</p>
                                                                                {option.options && option.options.length > 0 && (
                                                                                    <div className="text-xs theme-text-secondary space-y-1">
                                                                                        {option.options.map((opt, index) => (
                                                                                            <div key={index} className={`${index === option.correctAnswer ? 'font-medium text-green-600 dark:text-green-400' : ''}`}>
                                                                                                {String.fromCharCode(97 + index)}) {opt}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-1 ml-2">
                                                                        <button
                                                                            onClick={() => handleEditQuestion(question, 0)}
                                                                            className="p-1 text-blue-600 hover:text-blue-800 theme-transition"
                                                                            title="Edit Question"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 theme-surface2 rounded">
                                            <p className="text-sm theme-text-secondary mb-3">No questions added yet</p>
                                            <button
                                                onClick={handleAddQuestion}
                                                className="px-3 py-2 text-sm theme-accent text-white rounded hover:opacity-90 theme-transition"
                                            >
                                                Add First Question
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Modals */}
                
                {/* Question Form Modal */}
                {showQuestionForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
                        <div className="theme-bg rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-base font-medium theme-text">
                                        {editingQuestion 
                                            ? `Edit Question ${editingQuestion.questionNumber}${editingQuestion.questionOptions.length > 1 ? String.fromCharCode(65 + currentOptionIndex) : ''}` 
                                            : 'Add New Question'
                                        }
                                    </h4>
                                    
                                    {/* Question Option Navigation */}
                                    {editingQuestion && editingQuestion.questionOptions.length > 1 && (
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (currentOptionIndex > 0) {
                                                            handleEditQuestion(editingQuestion, currentOptionIndex - 1);
                                                        }
                                                    }}
                                                    disabled={currentOptionIndex === 0}
                                                    className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2 disabled:opacity-50 theme-transition"
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-xs theme-text">
                                                    {currentOptionIndex + 1} of {editingQuestion.questionOptions.length}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (currentOptionIndex < editingQuestion.questionOptions.length - 1) {
                                                            handleEditQuestion(editingQuestion, currentOptionIndex + 1);
                                                        }
                                                    }}
                                                    disabled={currentOptionIndex === editingQuestion.questionOptions.length - 1}
                                                    className="px-2 py-1 text-xs theme-surface theme-text border theme-border rounded hover:theme-surface2 disabled:opacity-50 theme-transition"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                            
                                            {/* Delete Current Option Button */}
                                            {editingQuestion.questionOptions.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Delete question option ${editingQuestion.questionNumber}${String.fromCharCode(65 + currentOptionIndex)}?`)) {
                                                            handleDeleteQuestionOption(editingQuestion.id, currentOptionIndex);
                                                        }
                                                    }}
                                                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded theme-transition self-start md:self-auto"
                                                    title={`Delete Option ${String.fromCharCode(65 + currentOptionIndex)}`}
                                                >
                                                    Delete Option
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Question Type Toggle */}
                                <div className="mb-3">
                                    <label className="block text-xs font-medium theme-text mb-2">Question Type</label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="questionType"
                                                value="mcq"
                                                checked={questionType === 'mcq'}
                                                onChange={(e) => setQuestionType(e.target.value as 'mcq' | 'long-answer')}
                                                className="mr-2"
                                            />
                                            <span className="text-xs theme-text">Multiple Choice</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="questionType"
                                                value="long-answer"
                                                checked={questionType === 'long-answer'}
                                                onChange={(e) => setQuestionType(e.target.value as 'mcq' | 'long-answer')}
                                                className="mr-2"
                                            />
                                            <span className="text-xs theme-text">Long Answer</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-xs font-medium theme-text mb-1">Marks</label>
                                    <input
                                        type="number"
                                        value={marks}
                                        onChange={(e) => setMarks(Number(e.target.value))}
                                        min="1"
                                        className="w-full px-2 py-1 text-sm theme-surface border theme-border rounded theme-text"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="block text-xs font-medium theme-text mb-1">Question</label>
                                    <textarea
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                        rows={3}
                                        className="w-full px-2 py-1 text-sm theme-surface border theme-border rounded theme-text"
                                        placeholder="Enter your question here..."
                                    />
                                </div>

                                {questionType === 'mcq' && (
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium theme-text mb-1">Options</label>
                                        {options.map((option, index) => (
                                            <div key={index} className="flex items-center gap-2 mb-1">
                                                <span className="w-6 text-xs theme-text">{String.fromCharCode(97 + index)})</span>
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...options];
                                                        newOptions[index] = e.target.value;
                                                        setOptions(newOptions);
                                                    }}
                                                    className="flex-1 px-2 py-1 text-sm theme-surface border theme-border rounded theme-text"
                                                    placeholder={`Option ${String.fromCharCode(97 + index)}`}
                                                />
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    checked={correctAnswer === index}
                                                    onChange={() => setCorrectAnswer(index)}
                                                    className="w-3 h-3"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="block text-xs font-medium theme-text mb-1">Explanation (Optional)</label>
                                    <textarea
                                        value={explanation}
                                        onChange={(e) => setExplanation(e.target.value)}
                                        rows={2}
                                        className="w-full px-2 py-1 text-sm theme-surface border theme-border rounded theme-text"
                                        placeholder="Explain the correct answer..."
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowQuestionForm(false);
                                            resetQuestionForm();
                                        }}
                                        className="px-3 py-1 text-sm theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition"
                                    >
                                        Cancel
                                    </button>
                                    {editingQuestion && (
                                        <button
                                            onClick={() => {
                                                handleAddOrOption(editingQuestion.id);
                                                setShowQuestionForm(false);
                                                resetQuestionForm();
                                            }}
                                            className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded theme-transition"
                                        >
                                            Add Optional Question
                                        </button>
                                    )}
                                    <button
                                        onClick={saveQuestion}
                                        disabled={!questionText.trim()}
                                        className="px-3 py-1 text-sm theme-accent text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                                    >
                                        {editingQuestion ? 'Update' : 'Add'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section Settings Modal */}
                {showSectionSettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
                        <div className="modal-responsive theme-bg rounded-lg shadow-2xl">
                            <div className="modal-content-responsive">
                                <h4 className="text-base font-medium theme-text mb-3">Section Settings</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium theme-text mb-1">Total Questions</label>
                                        <div className="w-full px-3 py-2 text-sm theme-surface border theme-border rounded theme-text bg-opacity-50 backdrop-blur-sm">
                                            <span className="font-semibold text-base">
                                                {(() => {
                                                    const currentSection = sections.find(section => section.id === activeSection);
                                                    return currentSection ? currentSection.questions.length : 0;
                                                })()}
                                            </span>
                                            <span className="ml-2 text-xs theme-text-secondary">(auto-calculated)</span>
                                        </div>
                                        <p className="text-xs theme-text-secondary mt-1">
                                            Automatically calculated from the number of questions in this section
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium theme-text mb-1">Required Answers</label>
                                        <input
                                            type="number"
                                            value={sectionRequiredAnswers}
                                            onChange={(e) => {
                                                const newRequired = Number(e.target.value);
                                                // Get actual question count for validation
                                                const currentSection = sections.find(section => section.id === activeSection);
                                                const actualQuestionCount = currentSection ? currentSection.questions.length : 0;
                                                // Ensure required answers doesn't exceed actual question count
                                                const validatedRequired = Math.min(newRequired, actualQuestionCount);
                                                setSectionRequiredAnswers(validatedRequired);
                                            }}
                                            min="0"
                                            max={(() => {
                                                const currentSection = sections.find(section => section.id === activeSection);
                                                return currentSection ? currentSection.questions.length : 0;
                                            })()}
                                            className="w-full px-2 py-1 text-sm theme-surface border theme-border rounded theme-text"
                                        />
                                        <p className="text-xs theme-text-secondary mt-1">
                                            Maximum: {(() => {
                                                const currentSection = sections.find(section => section.id === activeSection);
                                                const actualQuestionCount = currentSection ? currentSection.questions.length : 0;
                                                return actualQuestionCount;
                                            })()} (cannot exceed actual questions in section)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setShowSectionSettings(false)}
                                        className="flex-1 px-3 py-1 text-sm theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveSectionSettings}
                                        className="flex-1 px-3 py-1 text-sm theme-accent text-white rounded hover:opacity-90 theme-transition"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Question List Modal */}
                {showQuestionList && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
                        <div className="theme-bg rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                            <div className="p-3 border-b theme-border">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-base font-medium theme-text">Question List - {getCurrentSection()?.name}</h4>
                                    <button
                                        onClick={() => setShowQuestionList(false)}
                                        className="p-1 hover:theme-surface2 rounded theme-transition"
                                    >
                                        <svg className="w-4 h-4 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto max-h-[60vh] p-3">
                                {getCurrentQuestions().length === 0 ? (
                                    <div className="text-center py-6 theme-surface2 rounded">
                                        <p className="text-sm theme-text-secondary">No questions in this section</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {getCurrentQuestions().map((question, index) => (
                                            <div key={question.id} className="p-3 theme-surface rounded border theme-border">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <span className="px-1 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                                                Q{question.questionNumber}
                                                            </span>
                                                            <span className="px-1 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                                                                {question.marks}m
                                                            </span>
                                                            <span className="px-1 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                                                                {question.questionType === 'mcq' ? 'MCQ' : 'LA'}
                                                            </span>
                                                            {question.questionOptions.length > 1 && (
                                                                <span className="px-1 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                                                    OR
                                                                </span>
                                                            )}
                                                        </div>
                                                        {question.questionOptions.map((option, optIndex) => (
                                                            <div key={option.id} className="mb-2">
                                                                <p className="text-sm font-medium theme-text mb-1">
                                                                    {question.questionOptions.length > 1 ? String.fromCharCode(65 + optIndex) + ': ' : ''}{option.text || 'No text added yet'}
                                                                </p>
                                                                {option.options && option.options.length > 0 && (
                                                                    <div className="text-xs theme-text-secondary space-y-0.5">
                                                                        {option.options.map((opt, index) => (
                                                                            <div key={index} className={`${index === option.correctAnswer ? 'font-medium text-green-600 dark:text-green-400' : ''}`}>
                                                                                {String.fromCharCode(97 + index)}) {opt}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-1 ml-2">
                                                        <button
                                                            onClick={() => {
                                                                setCurrentQuestionIndex(index);
                                                                setShowQuestionList(false);
                                                            }}
                                                            className="p-1 text-blue-600 hover:text-blue-800 theme-transition"
                                                            title="View Question"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleEditQuestion(question);
                                                                setShowQuestionList(false);
                                                            }}
                                                            className="p-1 text-green-600 hover:text-green-800 theme-transition"
                                                            title="Edit Question"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuestion(question.id)}
                                                            className="p-1 text-red-600 hover:text-red-800 theme-transition"
                                                            title="Delete Question"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center p-3 border-t theme-border">
                    <div className="text-xs theme-text-secondary">
                        {sections.length} section{sections.length > 1 ? 's' : ''} • {sections.reduce((total, section) => total + section.questions.length, 0)} question{sections.reduce((total, section) => total + section.questions.length, 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={onClose}
                            className="px-3 py-1 text-sm theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-3 py-1 text-sm theme-accent text-white rounded hover:opacity-90 theme-transition"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Rename Section Modal */}
            {showRenameSection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="theme-surface theme-border border rounded-lg shadow-lg p-4 md:p-6 w-full max-w-96">
                        <h3 className="text-base md:text-lg font-medium theme-text mb-4">Rename Section</h3>
                        <input
                            type="text"
                            value={renameSectionName}
                            onChange={(e) => setRenameSectionName(e.target.value)}
                            placeholder="Enter new section name"
                            className="w-full px-3 py-2 theme-surface theme-text theme-border border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex flex-col gap-2 md:flex-row md:justify-end md:gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowRenameSection(false);
                                    setRenameSectionName('');
                                }}
                                className="px-4 py-2 theme-surface theme-text border theme-border rounded hover:theme-surface2 theme-transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (renameSectionName.trim()) {
                                        const updatedSections = sections.map(section => 
                                            section.id === activeSection 
                                                ? { ...section, name: renameSectionName.trim() }
                                                : section
                                        );
                                        setSections(updatedSections);
                                        setShowRenameSection(false);
                                        setRenameSectionName('');
                                    }
                                }}
                                disabled={!renameSectionName.trim()}
                                className="px-4 py-2 theme-accent text-white rounded hover:opacity-90 disabled:opacity-50 theme-transition"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionEditor;
