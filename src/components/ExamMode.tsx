import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface ExamModeProps {
    isOpen: boolean;
    onClose: () => void;
    currentBook: string;
    currentChapter: string;
}

const ExamMode: React.FC<ExamModeProps> = ({ isOpen, onClose, currentBook, currentChapter }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    
    const [examStarted, setExamStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
    const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes
    const [showResults, setShowResults] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // Sample categories and questions
    const categories = [
        'All Topics',
        'Fundamentals',
        'Advanced Concepts',
        'Practice Problems',
        'Previous Year Questions'
    ];

    // Sample questions (in a real app, these would come from an API or local storage)
    const sampleQuestions: Question[] = [
        {
            id: '1',
            question: 'What is the primary purpose of object-oriented programming?',
            options: [
                'To make code faster',
                'To organize code into reusable objects',
                'To reduce memory usage',
                'To improve graphics performance'
            ],
            correctAnswer: 1,
            explanation: 'Object-oriented programming helps organize code into reusable, maintainable objects that encapsulate data and behavior.'
        },
        {
            id: '2',
            question: 'Which of the following is NOT a principle of OOP?',
            options: [
                'Encapsulation',
                'Inheritance',
                'Compilation',
                'Polymorphism'
            ],
            correctAnswer: 2,
            explanation: 'Compilation is a process of converting code to machine language, not a principle of OOP.'
        },
        {
            id: '3',
            question: 'What does the "private" access modifier mean in C++?',
            options: [
                'The member can be accessed from anywhere',
                'The member can only be accessed within the same class',
                'The member can be accessed by derived classes',
                'The member is public by default'
            ],
            correctAnswer: 1,
            explanation: 'Private members can only be accessed within the same class where they are declared.'
        }
    ];

    // Timer effect
    useEffect(() => {
        if (examStarted && !showResults && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleFinishExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [examStarted, showResults, timeRemaining]);

    // Format time display
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleStartExam = () => {
        if (!selectedCategory) return;
        setQuestions(sampleQuestions);
        setExamStarted(true);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setTimeRemaining(30 * 60);
    };

    const handleAnswerSelect = (answerIndex: number) => {
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: answerIndex
        }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleFinishExam = () => {
        setShowResults(true);
    };

    const calculateScore = () => {
        let correct = 0;
        questions.forEach((question, index) => {
            if (userAnswers[index] === question.correctAnswer) {
                correct++;
            }
        });
        return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
    };

    const handleExitExam = () => {
        setShowExitConfirm(false);
        setExamStarted(false);
        setShowResults(false);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setSelectedCategory('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="theme-bg theme-text rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-700 dark:text-red-300">EXAM MODE</h2>
                            <p className="text-sm text-red-600 dark:text-red-400">{currentChapter} - {currentBook}</p>
                        </div>
                    </div>
                    
                    {examStarted && !showResults && (
                        <div className="flex items-center gap-4">
                            <div className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-lg">
                                <span className="text-red-700 dark:text-red-300 font-mono font-bold">
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                            <span className="text-sm text-red-600 dark:text-red-400">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                        </div>
                    )}
                    
                    <button
                        onClick={() => examStarted ? setShowExitConfirm(true) : onClose()}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg theme-transition"
                    >
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Category Selection */}
                    {!examStarted && !showResults && (
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold theme-text mb-2">Select Exam Category</h3>
                                <p className="theme-text-secondary">Choose a category to start your timed examination</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`p-4 rounded-lg border-2 theme-transition text-left ${
                                            selectedCategory === category
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'theme-border theme-surface hover:theme-surface2'
                                        }`}
                                    >
                                        <div className="font-semibold theme-text">{category}</div>
                                        <div className="text-sm theme-text-secondary mt-1">
                                            {category === 'All Topics' ? 'Comprehensive test covering all topics' :
                                             category === 'Fundamentals' ? 'Basic concepts and principles' :
                                             category === 'Advanced Concepts' ? 'Complex topics and applications' :
                                             category === 'Practice Problems' ? 'Hands-on problem solving' :
                                             'Questions from previous examinations'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Exam Instructions:</h4>
                                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                    <li>• Duration: 30 minutes</li>
                                    <li>• Total Questions: {sampleQuestions.length}</li>
                                    <li>• No negative marking</li>
                                    <li>• You can review and change answers before submitting</li>
                                    <li>• Exam will auto-submit when time expires</li>
                                </ul>
                            </div>
                            
                            <button
                                onClick={handleStartExam}
                                disabled={!selectedCategory}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg theme-transition"
                            >
                                Start Exam
                            </button>
                        </div>
                    )}

                    {/* Exam Questions */}
                    {examStarted && !showResults && questions.length > 0 && (
                        <div className="p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold theme-text mb-4">
                                    Question {currentQuestionIndex + 1}
                                </h3>
                                <p className="text-base theme-text leading-relaxed">
                                    {questions[currentQuestionIndex].question}
                                </p>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                                {questions[currentQuestionIndex].options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelect(index)}
                                        className={`w-full p-4 text-left rounded-lg border theme-transition ${
                                            userAnswers[currentQuestionIndex] === index
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'theme-border theme-surface hover:theme-surface2'
                                        }`}
                                    >
                                        <span className="font-semibold mr-3">
                                            {String.fromCharCode(65 + index)}.
                                        </span>
                                        {option}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={handlePreviousQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-4 py-2 theme-surface theme-text rounded-lg hover:theme-surface2 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                                >
                                    Previous
                                </button>
                                
                                <div className="flex gap-2">
                                    {questions.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentQuestionIndex(index)}
                                            className={`w-8 h-8 rounded text-sm font-semibold theme-transition ${
                                                index === currentQuestionIndex
                                                    ? 'bg-blue-500 text-white'
                                                    : userAnswers[index] !== undefined
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                        : 'theme-surface2 theme-text hover:theme-surface'
                                            }`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>
                                
                                {currentQuestionIndex === questions.length - 1 ? (
                                    <button
                                        onClick={handleFinishExam}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg theme-transition"
                                    >
                                        Finish Exam
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNextQuestion}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg theme-transition"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {showResults && (
                        <div className="p-6 text-center">
                            <div className="mb-6">
                                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold theme-text mb-2">Exam Completed!</h3>
                                <p className="theme-text-secondary">Your results are ready</p>
                            </div>
                            
                            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-6">
                                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                                    {calculateScore().percentage}%
                                </div>
                                <div className="text-lg theme-text">
                                    {calculateScore().correct} out of {calculateScore().total} correct
                                </div>
                            </div>
                            
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={handleExitExam}
                                    className="px-6 py-3 theme-surface theme-text rounded-lg hover:theme-surface2 theme-transition"
                                >
                                    Exit
                                </button>
                                <button
                                    onClick={() => {
                                        setShowResults(false);
                                        setExamStarted(false);
                                        setSelectedCategory('');
                                    }}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg theme-transition"
                                >
                                    Take Another Exam
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-60 flex items-center justify-center p-4">
                    <div className="theme-bg rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold theme-text mb-4">Exit Exam?</h3>
                        <p className="theme-text-secondary mb-6">
                            Are you sure you want to exit the exam? Your progress will be lost.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 px-4 py-2 theme-surface theme-text rounded-lg hover:theme-surface2 theme-transition"
                            >
                                Continue Exam
                            </button>
                            <button
                                onClick={handleExitExam}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg theme-transition"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamMode;
