import React, { useState, useEffect } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon, UploadIcon } from './icons';

interface FlashCard {
    id: string;
    front: string;
    back: string;
    difficulty: 0 | 1 | 2 | 3; // 0=Again, 1=Hard, 2=Good, 3=Easy
    nextReview: Date;
    reviewCount: number;
    easeFactor: number;
    interval: number;
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
    const [mode, setMode] = useState<'study' | 'manage' | 'add'>('study');
    const [newFront, setNewFront] = useState('');
    const [newBack, setNewBack] = useState('');
    const [importText, setImportText] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [separator, setSeparator] = useState<'tab' | 'semicolon' | 'pipe'>('tab');

    const storageKey = `flashcards_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load flashcards from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const cards = JSON.parse(saved).map((card: any) => ({
                ...card,
                nextReview: new Date(card.nextReview)
            }));
            setFlashCards(cards);
        }
    }, [storageKey]);

    // Save flashcards to localStorage
    const saveFlashCards = (cards: FlashCard[]) => {
        localStorage.setItem(storageKey, JSON.stringify(cards));
        setFlashCards(cards);
    };

    // Create new flashcard
    const createFlashCard = (front: string, back: string): FlashCard => {
        return {
            id: Date.now().toString(),
            front: front.trim(),
            back: back.trim(),
            difficulty: 2,
            nextReview: new Date(),
            reviewCount: 0,
            easeFactor: 2.5,
            interval: 1
        };
    };

    // Add single flashcard
    const handleAddCard = () => {
        if (newFront.trim() && newBack.trim()) {
            const newCard = createFlashCard(newFront, newBack);
            const updatedCards = [...flashCards, newCard];
            saveFlashCards(updatedCards);
            setNewFront('');
            setNewBack('');
        }
    };

    // Import flashcards from text
    const handleImportCards = () => {
        if (!importText.trim()) return;

        const separatorMap = {
            'tab': '\t',
            'semicolon': ';',
            'pipe': '|'
        };

        const lines = importText.split('\n').filter(line => line.trim());
        const newCards: FlashCard[] = [];

        lines.forEach(line => {
            const parts = line.split(separatorMap[separator]);
            if (parts.length >= 2) {
                const front = parts[0].trim();
                const back = parts.slice(1).join(' ').trim(); // Join remaining parts for back
                if (front && back) {
                    newCards.push(createFlashCard(front, back));
                }
            }
        });

        if (newCards.length > 0) {
            const updatedCards = [...flashCards, ...newCards];
            saveFlashCards(updatedCards);
            setImportText('');
            setShowImport(false);
        }
    };

    // Delete flashcard
    const handleDeleteCard = (id: string) => {
        const updatedCards = flashCards.filter(card => card.id !== id);
        saveFlashCards(updatedCards);
        if (currentCardIndex >= updatedCards.length && updatedCards.length > 0) {
            setCurrentCardIndex(updatedCards.length - 1);
        }
    };

    // Spaced repetition algorithm (simplified Anki SM-2)
    const calculateNextReview = (card: FlashCard, rating: 0 | 1 | 2 | 3): FlashCard => {
        let { easeFactor, interval, reviewCount } = card;
        const now = new Date();

        reviewCount += 1;

        if (rating < 2) {
            // Again or Hard - reset interval
            interval = 1;
        } else {
            // Good or Easy
            if (reviewCount === 1) {
                interval = 1;
            } else if (reviewCount === 2) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }

            // Adjust ease factor based on rating
            easeFactor = easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
            easeFactor = Math.max(1.3, easeFactor); // Minimum ease factor
        }

        const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

        return {
            ...card,
            difficulty: rating,
            easeFactor,
            interval,
            reviewCount,
            nextReview
        };
    };

    // Handle rating submission
    const handleRating = (rating: 0 | 1 | 2 | 3) => {
        if (flashCards.length === 0) return;

        const currentCard = flashCards[currentCardIndex];
        const updatedCard = calculateNextReview(currentCard, rating);
        const updatedCards = flashCards.map(card => 
            card.id === currentCard.id ? updatedCard : card
        );

        saveFlashCards(updatedCards);
        setShowAnswer(false);

        // Move to next card
        if (currentCardIndex < flashCards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
        } else {
            setCurrentCardIndex(0);
        }
    };

    // Get cards due for review
    const getDueCards = () => {
        const now = new Date();
        return flashCards.filter(card => card.nextReview <= now);
    };

    const dueCards = getDueCards();
    const currentCard = flashCards[currentCardIndex];

    if (mode === 'add') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <SparklesIcon />
                        Add Flash Card
                    </h2>
                    <button
                        onClick={() => setMode('study')}
                        className="btn-secondary text-sm"
                    >
                        Back to Study
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Front (Question/Prompt):
                        </label>
                        <textarea
                            value={newFront}
                            onChange={(e) => setNewFront(e.target.value)}
                            placeholder="Enter the question or prompt..."
                            className="w-full h-24 p-3 theme-surface border rounded-lg theme-text resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Back (Answer):
                        </label>
                        <textarea
                            value={newBack}
                            onChange={(e) => setNewBack(e.target.value)}
                            placeholder="Enter the answer..."
                            className="w-full h-24 p-3 theme-surface border rounded-lg theme-text resize-none"
                        />
                    </div>

                    <button
                        onClick={handleAddCard}
                        disabled={!newFront.trim() || !newBack.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Card
                    </button>
                </div>

                {/* Import Section */}
                <div className="mt-8 pt-6 border-t theme-border">
                    <button
                        onClick={() => setShowImport(!showImport)}
                        className="flex items-center gap-2 btn-secondary mb-4"
                    >
                        <UploadIcon />
                        Import from Text File
                    </button>

                    {showImport && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">
                                    Separator:
                                </label>
                                <select
                                    value={separator}
                                    onChange={(e) => setSeparator(e.target.value as any)}
                                    className="p-2 theme-surface border rounded theme-text"
                                >
                                    <option value="tab">Tab</option>
                                    <option value="semicolon">Semicolon (;)</option>
                                    <option value="pipe">Pipe (|)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">
                                    Import Text (Front{separator === 'tab' ? '[TAB]' : separator === 'semicolon' ? ';' : '|'}Back format):
                                </label>
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder={`Example:\nWhat is React?${separator === 'tab' ? '\t' : separator === 'semicolon' ? ';' : '|'}A JavaScript library for building user interfaces\nWhat is JSX?${separator === 'tab' ? '\t' : separator === 'semicolon' ? ';' : '|'}A syntax extension for JavaScript`}
                                    className="w-full h-32 p-3 theme-surface border rounded-lg theme-text resize-none font-mono text-sm"
                                />
                            </div>

                            <button
                                onClick={handleImportCards}
                                disabled={!importText.trim()}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Import Cards
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (mode === 'manage') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text">
                        Manage Cards ({flashCards.length} total)
                    </h2>
                    <button
                        onClick={() => setMode('study')}
                        className="btn-secondary text-sm"
                    >
                        Back to Study
                    </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {flashCards.map((card, index) => (
                        <div key={card.id} className="p-4 border theme-border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="text-sm font-medium theme-text mb-1">Front:</div>
                                    <div className="text-sm theme-text-secondary mb-2">{card.front}</div>
                                    <div className="text-sm font-medium theme-text mb-1">Back:</div>
                                    <div className="text-sm theme-text-secondary">{card.back}</div>
                                </div>
                                <button
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="text-red-500 hover:text-red-700 ml-4"
                                    title="Delete card"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                            <div className="text-xs theme-text-secondary">
                                Reviews: {card.reviewCount} | Next: {card.nextReview.toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Study mode
    return (
        <div className={`theme-surface rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    <SparklesIcon />
                    Flash Cards
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('add')}
                        className="btn-secondary text-sm flex items-center gap-2"
                    >
                        <PlusIcon />
                        Add
                    </button>
                    <button
                        onClick={() => setMode('manage')}
                        className="btn-secondary text-sm"
                    >
                        Manage ({flashCards.length})
                    </button>
                </div>
            </div>

            {flashCards.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                        <SparklesIcon />
                    </div>
                    <h3 className="text-lg font-medium theme-text mb-2">No flash cards yet</h3>
                    <p className="theme-text-secondary mb-4">Create your first flash card to start studying</p>
                    <button
                        onClick={() => setMode('add')}
                        className="btn-primary flex items-center gap-2 mx-auto"
                    >
                        <PlusIcon />
                        Add First Card
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Study Progress */}
                    <div className="flex items-center justify-between text-sm theme-text-secondary">
                        <span>Card {currentCardIndex + 1} of {flashCards.length}</span>
                        <span>{dueCards.length} cards due for review</span>
                    </div>

                    {/* Flash Card */}
                    <div className="min-h-48 theme-surface-secondary rounded-lg p-6 border border-2 theme-border">
                        <div className="text-center">
                            <div className="text-lg font-medium theme-text mb-4">
                                {currentCard.front}
                            </div>
                            
                            {showAnswer && (
                                <div className="mt-6 pt-6 border-t theme-border">
                                    <div className="text-lg theme-text">
                                        {currentCard.back}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    {!showAnswer ? (
                        <div className="text-center">
                            <button
                                onClick={() => setShowAnswer(true)}
                                className="btn-primary text-lg px-8 py-3"
                            >
                                Show Answer
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={() => handleRating(0)}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Again (&lt;1min)
                            </button>
                            <button
                                onClick={() => handleRating(1)}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                Hard (&lt;6min)
                            </button>
                            <button
                                onClick={() => handleRating(2)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Good (&lt;10min)
                            </button>
                            <button
                                onClick={() => handleRating(3)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Easy (4d)
                            </button>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-center gap-4 pt-4">
                        <button
                            onClick={() => {
                                setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                                setShowAnswer(false);
                            }}
                            disabled={currentCardIndex === 0}
                            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                setCurrentCardIndex(Math.min(flashCards.length - 1, currentCardIndex + 1));
                                setShowAnswer(false);
                            }}
                            disabled={currentCardIndex === flashCards.length - 1}
                            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashCardManager;
