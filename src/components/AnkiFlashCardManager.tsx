import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon, FileIcon } from './icons';

interface AnkiCard {
    id: string;
    front: string;
    back: string;
    created: Date;
    lastReviewed?: Date;
    difficulty: 'new' | 'learning' | 'review';
    interval: number; // Days until next review
    easeFactor: number; // Anki ease factor (default 2.5)
    reviews: number;
    lapses: number;
    tags?: string[];
    deck?: string;
}

interface AnkiFlashCardManagerProps {
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const AnkiFlashCardManager: React.FC<AnkiFlashCardManagerProps> = ({
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [flashCards, setFlashCards] = useState<AnkiCard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [mode, setMode] = useState<'study' | 'create' | 'manage' | 'import'>('study');
    const [newFront, setNewFront] = useState('');
    const [newBack, setNewBack] = useState('');
    const [newTags, setNewTags] = useState('');
    const [studyQueue, setStudyQueue] = useState<AnkiCard[]>([]);
    const [isStudying, setIsStudying] = useState(false);
    const [importText, setImportText] = useState('');
    const [separator, setSeparator] = useState('|');
    const [showImportGuide, setShowImportGuide] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const storageKey = `anki_cards_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load flashcards from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const cards = JSON.parse(saved).map((card: any) => ({
                ...card,
                created: new Date(card.created),
                lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined
            }));
            setFlashCards(cards);
        }
    }, [storageKey]);

    // Save flashcards to localStorage
    const saveFlashCards = (cards: AnkiCard[]) => {
        localStorage.setItem(storageKey, JSON.stringify(cards));
        setFlashCards(cards);
    };

    // Create new Anki card
    const createAnkiCard = (front: string, back: string, tags: string[] = []): AnkiCard => {
        return {
            id: Date.now().toString() + Math.random(),
            front: front.trim(),
            back: back.trim(),
            created: new Date(),
            difficulty: 'new',
            interval: 0,
            easeFactor: 2.5,
            reviews: 0,
            lapses: 0,
            tags,
            deck: currentChapter
        };
    };

    // Add new flashcard
    const handleAddCard = () => {
        if (newFront.trim() && newBack.trim()) {
            const tags = newTags.split(',').map(t => t.trim()).filter(t => t);
            const newCard = createAnkiCard(newFront, newBack, tags);
            const updatedCards = [...flashCards, newCard];
            saveFlashCards(updatedCards);
            setNewFront('');
            setNewBack('');
            setNewTags('');
            setMode('study');
        }
    };

    // Import cards from text
    const handleTextImport = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n').filter(line => line.trim());
        const newCards: AnkiCard[] = [];

        lines.forEach(line => {
            const parts = line.split(separator).map(part => part.trim());
            if (parts.length >= 2) {
                const front = parts[0];
                const back = parts[1];
                const tags = parts.length > 2 ? parts.slice(2) : [];
                newCards.push(createAnkiCard(front, back, tags));
            }
        });

        if (newCards.length > 0) {
            const updatedCards = [...flashCards, ...newCards];
            saveFlashCards(updatedCards);
            setImportText('');
            setMode('study');
            alert(`Successfully imported ${newCards.length} cards!`);
        }
    };

    // Import from file
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setImportText(text);
        };
        reader.readAsText(file);
    };

    // Anki SM-2 algorithm for scheduling
    const scheduleCard = (card: AnkiCard, quality: number): AnkiCard => {
        let { interval, easeFactor, reviews, lapses } = card;
        
        if (quality < 3) {
            // Failed review
            lapses += 1;
            interval = 1;
            easeFactor = Math.max(1.3, easeFactor - 0.2);
        } else {
            // Passed review
            reviews += 1;
            
            if (reviews === 1) {
                interval = 1;
            } else if (reviews === 2) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            
            easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            easeFactor = Math.max(1.3, easeFactor);
        }

        return {
            ...card,
            interval,
            easeFactor,
            reviews,
            lapses,
            lastReviewed: new Date(),
            difficulty: quality < 3 ? 'learning' : (reviews < 3 ? 'learning' : 'review')
        };
    };

    // Handle review response
    const handleReview = (quality: number) => {
        if (currentCardIndex < studyQueue.length) {
            const card = studyQueue[currentCardIndex];
            const updatedCard = scheduleCard(card, quality);
            
            // Update in main cards array
            const updatedCards = flashCards.map(c => 
                c.id === updatedCard.id ? updatedCard : c
            );
            saveFlashCards(updatedCards);
            
            // Move to next card in study queue
            if (currentCardIndex < studyQueue.length - 1) {
                setCurrentCardIndex(currentCardIndex + 1);
                setShowAnswer(false);
            } else {
                setIsStudying(false);
                setCurrentCardIndex(0);
                alert('Study session complete!');
            }
        }
    };

    // Start study session
    const startStudySession = () => {
        const cardsToReview = flashCards.filter(card => 
            !card.lastReviewed || 
            (Date.now() - card.lastReviewed.getTime()) >= (card.interval * 24 * 60 * 60 * 1000)
        );
        
        if (cardsToReview.length === 0) {
            alert('No cards due for review! Come back later.');
            return;
        }

        setStudyQueue(cardsToReview);
        setCurrentCardIndex(0);
        setIsStudying(true);
        setShowAnswer(false);
    };

    // Delete card
    const handleDeleteCard = (cardId: string) => {
        const updatedCards = flashCards.filter(card => card.id !== cardId);
        saveFlashCards(updatedCards);
    };

    const currentCard = isStudying ? studyQueue[currentCardIndex] : flashCards[currentCardIndex];
    const dueCards = flashCards.filter(card => 
        !card.lastReviewed || 
        (Date.now() - card.lastReviewed.getTime()) >= (card.interval * 24 * 60 * 60 * 1000)
    );

    if (mode === 'import') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold theme-text flex items-center gap-2">
                            <FileIcon className="w-6 h-6" />
                            Import Flash Cards
                        </h2>
                        <p className="theme-text-secondary">Import cards from text files or manual entry</p>
                    </div>
                    <button
                        onClick={() => setMode('study')}
                        className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition"
                    >
                        Back to Study
                    </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Text File Import */}
                    <div className="space-y-4">
                        <div className="border theme-border rounded-lg p-4">
                            <h3 className="font-semibold theme-text mb-3 flex items-center gap-2">
                                📄 Text File Import
                            </h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium theme-text mb-1">
                                        Separator:
                                    </label>
                                    <select 
                                        value={separator}
                                        onChange={(e) => setSeparator(e.target.value)}
                                        className="w-full p-2 theme-surface border theme-border rounded theme-text text-sm"
                                    >
                                        <option value="|">Pipe (|)</option>
                                        <option value=";">Semicolon (;)</option>
                                        <option value=",">Comma (,)</option>
                                        <option value="\t">Tab</option>
                                    </select>
                                </div>
                                
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.csv"
                                    onChange={handleFileImport}
                                    className="w-full p-2 theme-surface border theme-border rounded theme-text text-sm"
                                />
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                >
                                    Choose File
                                </button>
                            </div>
                        </div>

                        <div className="border theme-border rounded-lg p-4">
                            <h3 className="font-semibold theme-text mb-3">✍️ Manual Text Entry</h3>
                            <textarea
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder={`Enter cards, one per line:\nWhat is HTML?${separator}HyperText Markup Language${separator}web,basics\nWhat is CSS?${separator}Cascading Style Sheets${separator}styling,web`}
                                className="w-full h-32 p-3 theme-surface border theme-border rounded theme-text text-sm resize-none"
                            />
                            
                            <button
                                onClick={handleTextImport}
                                disabled={!importText.trim()}
                                className="mt-3 w-full px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50"
                            >
                                Import Cards
                            </button>
                        </div>
                    </div>

                    {/* Import Guide */}
                    <div className="space-y-4">
                        <div className="border theme-border rounded-lg p-4">
                            <h3 className="font-semibold theme-text mb-3">📋 Format Guide</h3>
                            <div className="space-y-3 text-sm theme-text-secondary">
                                <div>
                                    <strong className="theme-text">Basic Format:</strong>
                                    <div className="mt-1 p-2 theme-surface2 rounded font-mono text-xs">
                                        Front{separator}Back
                                    </div>
                                </div>
                                
                                <div>
                                    <strong className="theme-text">With Tags:</strong>
                                    <div className="mt-1 p-2 theme-surface2 rounded font-mono text-xs">
                                        Front{separator}Back{separator}tag1{separator}tag2
                                    </div>
                                </div>
                                
                                <div>
                                    <strong className="theme-text">Example:</strong>
                                    <div className="mt-1 p-2 theme-surface2 rounded font-mono text-xs">
                                        What is React?{separator}A JavaScript library for building user interfaces{separator}javascript{separator}frontend
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border theme-border rounded-lg p-4">
                            <h3 className="font-semibold theme-text mb-3">✨ Features</h3>
                            <ul className="space-y-2 text-sm theme-text-secondary">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Anki-style spaced repetition algorithm</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Multiple separator support</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Tag-based organization</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Difficulty tracking</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Bulk import from text files</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'create') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold theme-text">Create New Card</h2>
                    <button
                        onClick={() => setMode('study')}
                        className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition"
                    >
                        Cancel
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Front (Question)
                        </label>
                        <textarea
                            value={newFront}
                            onChange={(e) => setNewFront(e.target.value)}
                            placeholder="Enter your question here..."
                            className="w-full h-24 p-3 theme-surface border theme-border rounded theme-text resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Back (Answer)
                        </label>
                        <textarea
                            value={newBack}
                            onChange={(e) => setNewBack(e.target.value)}
                            placeholder="Enter the answer here..."
                            className="w-full h-24 p-3 theme-surface border theme-border rounded theme-text resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Tags (comma-separated, optional)
                        </label>
                        <input
                            type="text"
                            value={newTags}
                            onChange={(e) => setNewTags(e.target.value)}
                            placeholder="e.g., javascript, frontend, react"
                            className="w-full p-3 theme-surface border theme-border rounded theme-text"
                        />
                    </div>

                    <button
                        onClick={handleAddCard}
                        disabled={!newFront.trim() || !newBack.trim()}
                        className="w-full px-4 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50 font-medium"
                    >
                        Add Flash Card
                    </button>
                </div>
            </div>
        );
    }

    if (flashCards.length === 0) {
        return (
            <div className={`theme-surface rounded-lg p-6 text-center ${className}`}>
                <SparklesIcon className="w-16 h-16 mx-auto mb-4 theme-text-secondary" />
                <h3 className="text-xl font-semibold mb-2 theme-text">Create Your Anki Flash Cards</h3>
                <p className="theme-text-secondary mb-6">
                    Build an effective spaced repetition study system with our Anki-style flash cards
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => setMode('create')}
                        className="px-6 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition font-medium"
                    >
                        <PlusIcon className="w-4 h-4 inline mr-2" />
                        Create Your First Card
                    </button>
                    <button
                        onClick={() => setMode('import')}
                        className="px-6 py-3 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition font-medium"
                    >
                        <FileIcon className="w-4 h-4 inline mr-2" />
                        Import from Text
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`theme-surface rounded-lg p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold theme-text flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6" />
                        Anki Flash Cards
                    </h2>
                    <p className="theme-text-secondary">
                        {flashCards.length} cards • {dueCards.length} due for review
                    </p>
                </div>
                <div className="flex gap-2">
                    {dueCards.length > 0 && !isStudying && (
                        <button
                            onClick={startStudySession}
                            className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                        >
                            ▶️ Study ({dueCards.length})
                        </button>
                    )}
                    <button
                        onClick={() => setMode('create')}
                        className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition"
                    >
                        <PlusIcon className="w-4 h-4 inline mr-2" />
                        Add Card
                    </button>
                    <button
                        onClick={() => setMode('import')}
                        className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition"
                    >
                        <FileIcon className="w-4 h-4 inline mr-2" />
                        Import
                    </button>
                </div>
            </div>

            {/* Study Interface */}
            {currentCard && (
                <div className="max-w-2xl mx-auto">
                    <div className="border theme-border rounded-lg p-6 mb-6 min-h-[200px]">
                        <div className="text-center">
                            <div className="text-sm theme-text-secondary mb-4">
                                {isStudying ? 'Studying' : 'Browsing'} • Card {currentCardIndex + 1} of {isStudying ? studyQueue.length : flashCards.length}
                            </div>
                            
                            <div className="mb-6">
                                <div className="text-sm font-medium theme-text-secondary mb-2">
                                    {showAnswer ? 'Answer' : 'Question'}
                                </div>
                                <div className="text-lg theme-text">
                                    {showAnswer ? currentCard.back : currentCard.front}
                                </div>
                            </div>

                            {!showAnswer ? (
                                <button
                                    onClick={() => setShowAnswer(true)}
                                    className="px-6 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                >
                                    Show Answer
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowAnswer(false)}
                                        className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition text-sm"
                                    >
                                        Hide Answer
                                    </button>
                                    
                                    {isStudying && (
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <button
                                                onClick={() => handleReview(1)}
                                                className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 theme-transition"
                                            >
                                                Hard
                                            </button>
                                            <button
                                                onClick={() => handleReview(3)}
                                                className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 theme-transition"
                                            >
                                                Good
                                            </button>
                                            <button
                                                onClick={() => handleReview(4)}
                                                className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 theme-transition"
                                            >
                                                Easy
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    {!isStudying && (
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                                    setShowAnswer(false);
                                }}
                                disabled={currentCardIndex === 0}
                                className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50"
                            >
                                ← Previous
                            </button>
                            
                            <div className="text-sm theme-text-secondary">
                                Card {currentCardIndex + 1} of {flashCards.length}
                            </div>
                            
                            <button
                                onClick={() => {
                                    setCurrentCardIndex(Math.min(flashCards.length - 1, currentCardIndex + 1));
                                    setShowAnswer(false);
                                }}
                                disabled={currentCardIndex === flashCards.length - 1}
                                className="px-4 py-2 theme-surface2 theme-text rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>
                    )}

                    {/* Card Info */}
                    {currentCard.tags && currentCard.tags.length > 0 && (
                        <div className="mt-4 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                                {currentCard.tags.map((tag, index) => (
                                    <span key={index} className="px-2 py-1 theme-accent-soft text-xs rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnkiFlashCardManager;
