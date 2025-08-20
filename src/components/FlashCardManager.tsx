import React, { useState, useEffect } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon } from './icons';
import { processAIImport } from '../utils/aiImportService';
import { OCRService } from '../utils/ocrService';

interface FlashCard {
    id: string;
    question: string;
    answer: string;
    created: Date;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface FlashCardManagerProps {
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const FlashCardManager: React.FC<FlashCardManagerProps> = ({
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [mode, setMode] = useState<'study' | 'create' | 'manage' | 'import'>('study');
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('tab');
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [isAIProcessing, setIsAIProcessing] = useState(false);

    const storageKey = `flashcards_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load flashcards from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const cards = JSON.parse(saved).map((card: any) => ({
                ...card,
                created: new Date(card.created)
            }));
            setFlashCards(cards);
        }
    }, [storageKey]);

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

            if (isImageFile) {
                // Use OCR for image files
                const ocrService = new OCRService();
                const ocrResult = await ocrService.extractTextFromFile(file, (progress) => {
                    // Progress can be shown to user if needed
                    console.log(`OCR Progress: ${Math.round(progress.progress * 100)}%`);
                });

                if (!ocrResult.success || !ocrResult.text.trim()) {
                    alert('Could not extract text from the image. Please try a clearer image or different file.');
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
            const result = await processAIImport(text, 'flashcard');
            
            if (result.success && result.data.length > 0) {
                const updatedCards = [...flashCards, ...result.data];
                saveFlashCards(updatedCards);
                alert(`🤖 AI Import Success! Extracted ${result.data.length} flash cards from your ${isImageFile || isPDFFile ? (isPDFFile ? 'PDF' : 'image') : 'text'} content.`);
                setMode('study');
            } else {
                alert(result.message || 'No flash cards could be extracted from the content. Please ensure your content contains questions and answers or term-definition pairs.');
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
    
    // Create FlashCard from smart processing
    const createSmartFlashCard = (question: string, answer: string): FlashCard | null => {
        if (!question.trim() || !answer.trim()) return null;
        
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            question: question.trim(),
            answer: answer.trim(),
            created: new Date(),
            difficulty: 'medium'
        };
    };

    // Save flashcards to localStorage
    const saveFlashCards = (cards: FlashCard[]) => {
        localStorage.setItem(storageKey, JSON.stringify(cards));
        setFlashCards(cards);
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
        const importedCards: FlashCard[] = [];
        
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
                    const card: FlashCard = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        question: parts[0],
                        answer: parts[1],
                        created: new Date(),
                        difficulty: 'medium'
                    };
                    importedCards.push(card);
                }
            } catch (err) {
                console.warn('Skipping invalid line:', line);
            }
        }
        
        if (importedCards.length > 0) {
            const updatedCards = [...flashCards, ...importedCards];
            saveFlashCards(updatedCards);
            alert(`Successfully imported ${importedCards.length} flash cards!`);
            setMode('study');
        } else {
            alert('No valid flash cards found. Please check your format.');
        }
    };

    // Process manual text input
    const handleManualImport = async () => {
        const textarea = document.querySelector('textarea[placeholder*="Question 1"]') as HTMLTextAreaElement;
        if (textarea && textarea.value.trim()) {
            await processTextImport(textarea.value);
            textarea.value = '';
        }
    };

    // Copy format to clipboard
    const copyFormatToClipboard = async () => {
        const formats = {
            tab: "Question[TAB]Answer",
            semicolon: "Question;Answer", 
            pipe: "Question|Answer"
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

    // Add new flashcard
    const handleAddCard = () => {
        if (newQuestion.trim() && newAnswer.trim()) {
            const newCard: FlashCard = {
                id: Date.now().toString(),
                question: newQuestion.trim(),
                answer: newAnswer.trim(),
                created: new Date(),
                difficulty: 'medium'
            };
            const updatedCards = [...flashCards, newCard];
            saveFlashCards(updatedCards);
            setNewQuestion('');
            setNewAnswer('');
            setMode('study');
        }
    };

    // Delete flashcard
    const handleDeleteCard = (cardId: string) => {
        const updatedCards = flashCards.filter(card => card.id !== cardId);
        saveFlashCards(updatedCards);
        if (currentCardIndex >= updatedCards.length && updatedCards.length > 0) {
            setCurrentCardIndex(updatedCards.length - 1);
        }
    };

    // Navigate cards
    const nextCard = () => {
        setCurrentCardIndex((prev) => (prev + 1) % flashCards.length);
        setShowAnswer(false);
    };

    const prevCard = () => {
        setCurrentCardIndex((prev) => (prev - 1 + flashCards.length) % flashCards.length);
        setShowAnswer(false);
    };

    const currentCard = flashCards[currentCardIndex];

    // Format example modal
    const FormatExampleModal = () => {
        if (!showFormatModal) return null;
        
        const examples = {
            tab: `What is HTML?	HyperText Markup Language - the standard markup language for creating web pages
What is CSS?	Cascading Style Sheets - used for styling and layout of web pages
What is JavaScript?	A programming language for web development and interactive features`,
            semicolon: `What is React?;A JavaScript library for building user interfaces and web applications
What is Node.js?;A JavaScript runtime environment for server-side development
What is MongoDB?;A NoSQL document database for modern applications`,
            pipe: `What is Python?|A high-level programming language known for its simplicity and readability
What is Git?|A version control system for tracking changes in source code
What is Docker?|A platform for developing and running applications in containers`
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
                        <pre className="theme-surface2 p-4 rounded-lg text-sm font-mono theme-text whitespace-pre-wrap overflow-x-auto">
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

    return (
        <div className={`p-6 theme-surface rounded-lg ${className}`}>
            <FormatExampleModal />
            {mode === 'import' ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            Import Flash Cards
                        </h2>
                        <button
                            onClick={() => setMode('study')}
                            className="btn-secondary text-sm"
                        >
                            Back to Study
                        </button>
                    </div>

                    {/* Format selection */}
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
                            Format: Question{selectedFormat === 'tab' ? '[TAB]' : selectedFormat === 'semicolon' ? ';' : '|'}Answer
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

                    {/* AI Smart Import - Anki Style */}
                    <div className="border theme-border rounded-lg p-4">
                        <h3 className="font-medium theme-text mb-3">🤖 ANKI-Style AI Import</h3>
                        <p className="text-sm theme-text-secondary mb-4">
                            Best-in-class flash card generator using ANKI principles with OCR support for maximum learning effectiveness!
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">✨ ANKI Best Practices Applied:</h4>
                            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <li>• <strong>Atomic Principle:</strong> One concept per card</li>
                                <li>• <strong>Active Recall:</strong> Questions that test understanding</li>
                                <li>• <strong>Minimum Information:</strong> Concise but complete answers</li>
                                <li>• <strong>Spaced Repetition Ready:</strong> Optimized for long-term retention</li>
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <input
                                type="file"
                                accept=".txt,.jpg,.jpeg,.png,.bmp,.webp,.pdf"
                                onChange={handleSmartImport}
                                className="hidden"
                                disabled={isAIProcessing}
                                id="ai-import-file-input"
                            />
                            <button 
                                onClick={() => {
                                    const input = document.getElementById('ai-import-file-input') as HTMLInputElement;
                                    input?.click();
                                }}
                                className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                                disabled={isAIProcessing}
                            >
                                {isAIProcessing ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Generating ANKI cards...
                                    </>
                                ) : (
                                    <>
                                        � Generate ANKI-Style Flash Cards
                                    </>
                                )}
                            </button>
                            <p className="text-xs theme-text-secondary">
                                Upload any text and AI will create optimized flash cards following ANKI methodology. Perfect for medical, technical, and academic content!
                            </p>
                        </div>
                    </div>

                    {/* Manual import */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Or paste flash cards manually:
                        </label>
                        <textarea
                            placeholder="Question 1[TAB]Answer 1&#10;Question 2[TAB]Answer 2"
                            className="w-full h-32 p-3 theme-surface border rounded-lg theme-text font-mono text-sm"
                        />
                        <button 
                            onClick={handleManualImport}
                            className="mt-3 btn-primary"
                        >
                            Import Flash Cards
                        </button>
                    </div>
                </div>
            ) : flashCards.length === 0 ? (
                // Empty state with proper flash card structure
                <div className="text-center py-12">
                    <SparklesIcon className="w-16 h-16 mx-auto mb-4 theme-text-secondary" />
                    <h3 className="text-xl font-semibold mb-2 theme-text">Create Your Flash Cards</h3>
                    <p className="theme-text-secondary mb-4">Build effective study cards with question/answer format</p>
                    
                    {/* Example Flash Card Structure */}
                    <div className="mb-6 p-4 theme-surface2 rounded-lg max-w-lg mx-auto">
                        <div className="text-sm theme-text-secondary mb-3 font-medium">Example Flash Card Structure:</div>
                        <div className="space-y-3">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                                <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs mr-2">Q</span>
                                    Question (Front)
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-200 pl-8">
                                    "What is a Database Management System?"
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                                <div className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center">
                                    <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mr-2">A</span>
                                    Answer (Back)
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-200 pl-8">
                                    "A software system that stores, retrieves, and runs queries on data in databases."
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setMode('create')}
                        className="px-6 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition mr-3"
                    >
                        <PlusIcon className="w-5 h-5 inline mr-2" />
                        Create Your First Flash Card
                    </button>
                    <button
                        onClick={() => setMode('import')}
                        className="px-6 py-3 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition"
                    >
                        Import Flash Cards
                    </button>
                </div>
            ) : (
                <div>
                    {/* Mobile-First Header */}
                    <div className="mb-4">
                        {/* Mobile Header */}
                        <div className="block sm:hidden">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-lg font-bold theme-text flex items-center">
                                        <SparklesIcon className="w-5 h-5 mr-2" />
                                        Flash Cards
                                    </h2>
                                    <p className="text-sm theme-text-secondary">
                                        {flashCards.length} cards • Card {currentCardIndex + 1}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setMode('create')}
                                    className="p-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                    title="Add Card"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {/* Mobile Action Buttons */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                <button
                                    onClick={() => setMode(mode === 'study' ? 'manage' : 'study')}
                                    className="flex-shrink-0 px-3 py-2 text-sm theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition"
                                >
                                    {mode === 'study' ? 'Manage' : 'Study'}
                                </button>
                                <button
                                    onClick={() => setMode('import')}
                                    className="flex-shrink-0 px-3 py-2 text-sm theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition"
                                >
                                    Import
                                </button>
                            </div>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden sm:flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold theme-text flex items-center">
                                    <SparklesIcon className="w-6 h-6 mr-2" />
                                    Flash Cards
                                </h2>
                                <p className="theme-text-secondary">
                                    {flashCards.length} card{flashCards.length !== 1 ? 's' : ''} • 
                                    Card {currentCardIndex + 1} of {flashCards.length}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setMode(mode === 'study' ? 'manage' : 'study')}
                                    className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition"
                                >
                                    {mode === 'study' ? 'Manage' : 'Study Mode'}
                                </button>
                                <button
                                    onClick={() => setMode('import')}
                                    className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition"
                                >
                                    Import
                                </button>
                                <button
                                    onClick={() => setMode('create')}
                                    className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                >
                                    <PlusIcon className="w-4 h-4 inline mr-1" />
                                    Add Card
                                </button>
                            </div>
                        </div>
                    </div>

                    {mode === 'study' && (
                        <div className="space-y-4">
                            {/* Mobile-Optimized Flash Card Display */}
                            <div className="theme-surface rounded-lg p-3 sm:p-8 shadow-lg min-h-[250px] sm:min-h-[300px] flex flex-col justify-center border-2 theme-border mx-1 sm:mx-0">
                                <div className="text-center">
                                    {/* Question Section - Always Visible */}
                                    <div className="mb-4 sm:mb-6">
                                        <div className="mb-2 sm:mb-3">
                                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                Question
                                            </span>
                                        </div>
                                        <div className="text-base sm:text-xl font-medium theme-text leading-relaxed px-2 sm:px-0">
                                            {currentCard.question}
                                        </div>
                                    </div>

                                    {/* Answer Section - Shown When Revealed */}
                                    {showAnswer && (
                                        <div className="mb-4 sm:mb-6 pt-3 sm:pt-4 border-t theme-border">
                                            <div className="mb-2 sm:mb-3">
                                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                    Answer
                                                </span>
                                            </div>
                                            <div className="text-base sm:text-xl font-medium theme-text leading-relaxed px-2 sm:px-0">
                                                {currentCard.answer}
                                            </div>
                                        </div>
                                    )}

                                    {!showAnswer ? (
                                        <button
                                            onClick={() => setShowAnswer(true)}
                                            className="px-4 sm:px-6 py-2 sm:py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition text-sm sm:text-base"
                                        >
                                            Show Answer
                                        </button>
                                    ) : (
                                        <div className="space-y-3 sm:space-y-4">
                                            <button
                                                onClick={() => setShowAnswer(false)}
                                                className="block mx-auto px-3 sm:px-4 py-1 sm:py-2 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition text-sm"
                                            >
                                                Hide Answer
                                            </button>
                                            <div className="flex justify-center gap-2 sm:gap-3 px-2">
                                                <button
                                                    onClick={nextCard}
                                                    className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 theme-transition text-xs sm:text-sm"
                                                >
                                                    Got it! ✓
                                                </button>
                                                <button
                                                    onClick={nextCard}
                                                    className="px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 theme-transition text-xs sm:text-sm"
                                                >
                                                    Review again
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile-Optimized Navigation */}
                            <div className="flex justify-between items-center px-2 sm:px-0">
                                <button
                                    onClick={prevCard}
                                    className="px-3 sm:px-4 py-2 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition text-sm"
                                >
                                    ← Previous
                                </button>
                                
                                <div className="text-xs sm:text-sm theme-text-secondary">
                                    Card {currentCardIndex + 1} of {flashCards.length}
                                </div>

                                <button
                                    onClick={nextCard}
                                    className="px-3 sm:px-4 py-2 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition text-sm"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'manage' && (
                        <div className="space-y-4">
                            <div className="grid gap-4">
                                {flashCards.map((card, index) => (
                                    <div key={card.id} className="theme-surface2 rounded-lg p-4 border theme-border">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-medium theme-text mb-2">{card.question}</div>
                                                <div className="text-sm theme-text-secondary">{card.answer}</div>
                                                <div className="text-xs theme-text-secondary mt-2">
                                                    Created: {card.created.toLocaleDateString()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCard(card.id)}
                                                className="ml-4 p-2 text-red-400 hover:text-red-600 theme-transition"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {mode === 'create' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold theme-text">Create New Flash Card</h3>
                        <button
                            onClick={() => setMode('study')}
                            className="px-3 py-1 theme-surface2 theme-text rounded hover:theme-accent-bg hover:text-white theme-transition"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Question (Front of card)
                            </label>
                            <textarea
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="Enter your question here..."
                                className="w-full p-3 theme-surface2 border theme-border rounded-lg theme-text resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Answer (Back of card)
                            </label>
                            <textarea
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                placeholder="Enter the answer here..."
                                className="w-full p-3 theme-surface2 border theme-border rounded-lg theme-text resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleAddCard}
                                disabled={!newQuestion.trim() || !newAnswer.trim()}
                                className="px-6 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Flash Card
                            </button>
                            <button
                                onClick={() => {
                                    setNewQuestion('');
                                    setNewAnswer('');
                                    setMode('study');
                                }}
                                className="px-6 py-2 theme-surface2 theme-text rounded-lg hover:theme-accent-bg hover:text-white theme-transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashCardManager;
