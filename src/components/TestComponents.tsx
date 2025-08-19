import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, SparklesIcon } from './icons';

// Types for test functionality
interface TestQuestion {
    id: string;
    question: string;
    correctAnswer: string;
    marks: number;
    category?: string;
    type: 'qa' | 'mcq';
    options?: { id: string; text: string; isCorrect: boolean }[]; // For MCQ
}

interface TestAnswer {
    questionId: string;
    answer: string;
    isCorrect?: boolean; // For MCQ - immediate evaluation
    aiScore?: number; // For QA - AI evaluation
    aiEvaluation?: string; // AI feedback
}

interface TestResult {
    score: number;
    totalMarks: number;
    percentage: number;
    answers: TestAnswer[];
    aiEvaluations?: { [questionId: string]: { score: number; feedback: string } };
}

// Q&A Test Component
interface QATestProps {
    questions: any[];
    currentBook: string;
    currentChapter: string;
    onBack: () => void;
}

export const QATest: React.FC<QATestProps> = ({ questions, currentBook, currentChapter, onBack }) => {
    const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string }>({});
    const [isTestStarted, setIsTestStarted] = useState(false);
    const [isTestCompleted, setIsTestCompleted] = useState(false);
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);

    const isMobile = () => window.innerWidth <= 768;

    // Initialize test questions from the available Q&A questions
    useEffect(() => {
        if (questions.length > 0) {
            const shuffled = [...questions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, numberOfQuestions).map(q => ({
                id: q.id,
                question: q.question,
                correctAnswer: q.answer,
                marks: q.marks,
                category: q.category,
                type: 'qa' as const
            }));
            setTestQuestions(selected);
        }
    }, [questions, numberOfQuestions]);

    const startTest = () => {
        setIsTestStarted(true);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
    };

    const handleAnswerChange = (answer: string) => {
        setUserAnswers(prev => ({
            ...prev,
            [testQuestions[currentQuestionIndex].id]: answer
        }));
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < testQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            finishTest();
        }
    };

    const previousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const finishTest = async () => {
        setIsTestCompleted(true);
        setIsEvaluating(true);

        try {
            // Use AI to evaluate each answer
            const evaluations: { [questionId: string]: { score: number; feedback: string } } = {};
            let totalScore = 0;
            let totalMarks = 0;

            for (const question of testQuestions) {
                const userAnswer = userAnswers[question.id] || '';
                totalMarks += question.marks;

                if (userAnswer.trim()) {
                    // AI evaluation using a simple scoring system (this would be replaced with actual AI service)
                    const evaluation = await evaluateAnswer(question.question, question.correctAnswer, userAnswer, question.marks);
                    evaluations[question.id] = evaluation;
                    totalScore += evaluation.score;
                } else {
                    evaluations[question.id] = { score: 0, feedback: 'No answer provided.' };
                }
            }

            const result: TestResult = {
                score: totalScore,
                totalMarks,
                percentage: Math.round((totalScore / totalMarks) * 100),
                answers: testQuestions.map(q => ({
                    questionId: q.id,
                    answer: userAnswers[q.id] || '',
                    aiScore: evaluations[q.id]?.score || 0,
                    aiEvaluation: evaluations[q.id]?.feedback || 'No evaluation available.'
                })),
                aiEvaluations: evaluations
            };

            setTestResult(result);
        } catch (error) {
            console.error('Error evaluating answers:', error);
            // Fallback to simple evaluation
            const totalMarks = testQuestions.reduce((sum, q) => sum + q.marks, 0);
            const result: TestResult = {
                score: 0,
                totalMarks,
                percentage: 0,
                answers: testQuestions.map(q => ({
                    questionId: q.id,
                    answer: userAnswers[q.id] || '',
                    aiScore: 0,
                    aiEvaluation: 'Evaluation service unavailable.'
                }))
            };
            setTestResult(result);
        } finally {
            setIsEvaluating(false);
        }
    };

    // Simple AI evaluation function (would be replaced with actual AI service)
    const evaluateAnswer = async (question: string, correctAnswer: string, userAnswer: string, maxMarks: number): Promise<{ score: number; feedback: string }> => {
        // This is a placeholder - would use actual AI evaluation service
        const similarity = calculateSimilarity(correctAnswer.toLowerCase(), userAnswer.toLowerCase());
        const score = Math.round(similarity * maxMarks);
        
        let feedback = '';
        if (similarity >= 0.8) {
            feedback = 'Excellent answer! Very comprehensive and accurate.';
        } else if (similarity >= 0.6) {
            feedback = 'Good answer with most key points covered.';
        } else if (similarity >= 0.4) {
            feedback = 'Partial answer. Some important points are missing.';
        } else {
            feedback = 'Answer needs improvement. Please review the correct answer.';
        }

        return { score, feedback };
    };

    // Simple similarity calculation (would be replaced with better AI comparison)
    const calculateSimilarity = (str1: string, str2: string): number => {
        const words1 = str1.split(' ').filter(word => word.length > 3);
        const words2 = str2.split(' ').filter(word => word.length > 3);
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    };

    // Test setup screen
    if (!isTestStarted) {
        return (
            <div className={`theme-surface rounded-lg ${isMobile() ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
                    <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
                        🧪 Q&A Test Mode
                    </h2>
                    <button onClick={onBack} className="btn-secondary text-sm">
                        Back to Practice
                    </button>
                </div>

                <div className="max-w-md mx-auto space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 theme-accent-bg rounded-full flex items-center justify-center">
                            🎯
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">Ready to Test Your Knowledge?</h3>
                        <p className="theme-text-secondary">
                            Answer questions one by one and get AI-powered evaluation
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Number of Questions:
                            </label>
                            <select
                                value={numberOfQuestions}
                                onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                                className="w-full p-3 theme-surface border rounded-lg theme-text"
                            >
                                {[5, 10, 15, 20, Math.min(questions.length, 50)].filter(n => n <= questions.length).map(num => (
                                    <option key={num} value={num}>{num} question{num > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="theme-surface2 rounded-lg p-4 text-center">
                            <p className="theme-text-secondary text-sm">
                                Available Questions: <span className="font-medium">{questions.length}</span>
                            </p>
                            <p className="theme-text-secondary text-sm">
                                Total Marks: <span className="font-medium">
                                    {testQuestions.reduce((sum, q) => sum + q.marks, 0)}
                                </span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={startTest}
                        disabled={questions.length === 0}
                        className="w-full btn-primary py-3 text-lg disabled:opacity-50"
                    >
                        Start Test 🚀
                    </button>
                </div>
            </div>
        );
    }

    // Test results screen
    if (isTestCompleted && testResult) {
        return (
            <div className={`theme-surface rounded-lg ${isMobile() ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
                    <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
                        📊 Test Results
                    </h2>
                    <button onClick={onBack} className="btn-secondary text-sm">
                        Back to Practice
                    </button>
                </div>

                {isEvaluating ? (
                    <div className="text-center py-8">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="theme-text">AI is evaluating your answers...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Score Summary */}
                        <div className={`text-center ${isMobile() ? 'p-4' : 'p-6'} theme-surface2 rounded-lg`}>
                            <div className={`${isMobile() ? 'text-3xl' : 'text-4xl'} font-bold mb-2 ${
                                testResult.percentage >= 80 ? 'text-green-600' : 
                                testResult.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                                {testResult.percentage}%
                            </div>
                            <p className="theme-text-secondary">
                                {testResult.score} out of {testResult.totalMarks} marks
                            </p>
                            <p className={`mt-2 font-medium ${
                                testResult.percentage >= 80 ? 'text-green-600' : 
                                testResult.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                                {testResult.percentage >= 80 ? '🎉 Excellent!' : 
                                 testResult.percentage >= 60 ? '👍 Good Job!' : '📚 Keep Practicing!'}
                            </p>
                        </div>

                        {/* Detailed Results */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold theme-text">Question-wise Results</h3>
                            {testQuestions.map((question, index) => {
                                const answer = testResult.answers.find(a => a.questionId === question.id);
                                const aiEval = testResult.aiEvaluations?.[question.id];
                                
                                return (
                                    <div key={question.id} className={`border theme-border rounded-lg ${isMobile() ? 'p-3' : 'p-4'}`}>
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium theme-text">Question {index + 1}</span>
                                                <span className={`text-sm px-2 py-1 rounded ${
                                                    (aiEval?.score || 0) >= question.marks * 0.8 ? 'bg-green-100 text-green-800' :
                                                    (aiEval?.score || 0) >= question.marks * 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {aiEval?.score || 0}/{question.marks} marks
                                                </span>
                                            </div>
                                            <p className="theme-text font-medium">{question.question}</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-sm font-medium theme-text mb-1">Your Answer:</h4>
                                                <p className={`text-sm theme-text-secondary ${isMobile() ? 'p-2' : 'p-3'} theme-surface2 rounded`}>
                                                    {answer?.answer || 'No answer provided'}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-medium theme-text mb-1">Correct Answer:</h4>
                                                <p className={`text-sm text-green-700 dark:text-green-300 ${isMobile() ? 'p-2' : 'p-3'} bg-green-50 dark:bg-green-900/20 rounded`}>
                                                    {question.correctAnswer}
                                                </p>
                                            </div>

                                            {aiEval?.feedback && (
                                                <div>
                                                    <h4 className="text-sm font-medium theme-text mb-1">AI Evaluation:</h4>
                                                    <p className={`text-sm theme-text-secondary ${isMobile() ? 'p-2' : 'p-3'} bg-blue-50 dark:bg-blue-900/20 rounded`}>
                                                        {aiEval.feedback}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setIsTestStarted(false);
                                    setIsTestCompleted(false);
                                    setCurrentQuestionIndex(0);
                                    setUserAnswers({});
                                    setTestResult(null);
                                }}
                                className="btn-primary"
                            >
                                Take Another Test
                            </button>
                            <button onClick={onBack} className="btn-secondary">
                                Back to Practice
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Test in progress screen
    const currentQuestion = testQuestions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div className={`theme-surface rounded-lg ${isMobile() ? 'p-4' : 'p-6'}`}>
            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold theme-text">🧪 Test Mode</h2>
                    <span className="text-sm theme-text-secondary">
                        Question {currentQuestionIndex + 1} of {testQuestions.length}
                    </span>
                </div>
                <button onClick={onBack} className="btn-secondary text-sm">
                    Exit Test
                </button>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%` }}
                    ></div>
                </div>

                {/* Question */}
                <div className={`${isMobile() ? 'p-4' : 'p-6'} theme-surface2 rounded-lg`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium theme-text">
                            Marks: {currentQuestion.marks}
                        </span>
                        {currentQuestion.category && (
                            <span className="text-xs theme-text-secondary theme-surface px-2 py-1 rounded">
                                {currentQuestion.category}
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-medium theme-text mb-4">
                        {currentQuestion.question}
                    </h3>
                </div>

                {/* Answer input */}
                <div>
                    <label className="block text-sm font-medium theme-text mb-2">
                        Your Answer:
                    </label>
                    <textarea
                        value={userAnswers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="Type your answer here..."
                        className={`w-full ${isMobile() ? 'h-32' : 'h-40'} p-4 theme-surface border rounded-lg theme-text resize-none`}
                    />
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <button
                        onClick={previousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="btn-secondary disabled:opacity-50"
                    >
                        Previous
                    </button>
                    
                    <button
                        onClick={nextQuestion}
                        className="btn-primary"
                    >
                        {currentQuestionIndex === testQuestions.length - 1 ? 'Finish Test' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// MCQ Test Component
interface MCQTestProps {
    questions: any[];
    currentBook: string;
    currentChapter: string;
    onBack: () => void;
}

export const MCQTest: React.FC<MCQTestProps> = ({ questions, currentBook, currentChapter, onBack }) => {
    const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string }>({});
    const [isTestStarted, setIsTestStarted] = useState(false);
    const [isTestCompleted, setIsTestCompleted] = useState(false);
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(10);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    const isMobile = () => window.innerWidth <= 768;

    // Initialize test questions from the available MCQ questions
    useEffect(() => {
        if (questions.length > 0) {
            const shuffled = [...questions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, numberOfQuestions).map(q => ({
                id: q.id,
                question: q.question,
                correctAnswer: q.options.find((opt: any) => opt.isCorrect)?.text || '',
                marks: 1, // Default 1 mark per MCQ question
                category: q.category,
                type: 'mcq' as const,
                options: q.options
            }));
            setTestQuestions(selected);
        }
    }, [questions, numberOfQuestions]);

    const startTest = () => {
        setIsTestStarted(true);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
    };

    const handleAnswerChange = (optionId: string) => {
        setUserAnswers(prev => ({
            ...prev,
            [testQuestions[currentQuestionIndex].id]: optionId
        }));
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < testQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            finishTest();
        }
    };

    const previousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const finishTest = () => {
        setIsTestCompleted(true);

        // Evaluate MCQ answers immediately (no AI needed)
        let totalScore = 0;
        let totalMarks = 0;

        const answers: TestAnswer[] = testQuestions.map(question => {
            const userAnswerOptionId = userAnswers[question.id];
            const correctOption = question.options?.find(opt => opt.isCorrect);
            const isCorrect = userAnswerOptionId === correctOption?.id;
            
            totalMarks += 1; // Each MCQ question is worth 1 mark
            if (isCorrect) {
                totalScore += 1; // Award 1 mark for correct answer
            }

            return {
                questionId: question.id,
                answer: question.options?.find(opt => opt.id === userAnswerOptionId)?.text || 'Not answered',
                isCorrect
            };
        });

        const result: TestResult = {
            score: totalScore,
            totalMarks,
            percentage: Math.round((totalScore / totalMarks) * 100),
            answers
        };

        setTestResult(result);
    };

    // Test setup screen
    if (!isTestStarted) {
        return (
            <div className={`theme-surface rounded-lg ${isMobile() ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
                    <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
                        🧪 MCQ Test Mode
                    </h2>
                    <button onClick={onBack} className="btn-secondary text-sm">
                        Back to Practice
                    </button>
                </div>

                <div className="max-w-md mx-auto space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 theme-accent-bg rounded-full flex items-center justify-center">
                            ✓
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">Ready to Test Your Knowledge?</h3>
                        <p className="theme-text-secondary">
                            Choose the correct option for each question
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Number of Questions:
                            </label>
                            <select
                                value={numberOfQuestions}
                                onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                                className="w-full p-3 theme-surface border rounded-lg theme-text"
                            >
                                {[5, 10, 15, 20, Math.min(questions.length, 50)].filter(n => n <= questions.length).map(num => (
                                    <option key={num} value={num}>{num} question{num > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="theme-surface2 rounded-lg p-4 text-center">
                            <p className="theme-text-secondary text-sm">
                                Available Questions: <span className="font-medium">{questions.length}</span>
                            </p>
                            <p className="theme-text-secondary text-sm">
                                Total Marks: <span className="font-medium">
                                    {numberOfQuestions}
                                </span> (1 mark per question)
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={startTest}
                        disabled={questions.length === 0}
                        className="w-full btn-primary py-3 text-lg disabled:opacity-50"
                    >
                        Start Test 🚀
                    </button>
                </div>
            </div>
        );
    }

    // Test results screen
    if (isTestCompleted && testResult) {
        return (
            <div className={`theme-surface rounded-lg ${isMobile() ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
                    <h2 className="text-xl font-semibold theme-text flex items-center gap-2">
                        📊 Test Results
                    </h2>
                    <button onClick={onBack} className="btn-secondary text-sm">
                        Back to Practice
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Score Summary */}
                    <div className={`text-center ${isMobile() ? 'p-4' : 'p-6'} theme-surface2 rounded-lg`}>
                        <div className={`${isMobile() ? 'text-3xl' : 'text-4xl'} font-bold mb-2 ${
                            testResult.percentage >= 80 ? 'text-green-600' : 
                            testResult.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                            {testResult.percentage}%
                        </div>
                        <p className="theme-text-secondary">
                            {testResult.score} out of {testResult.totalMarks} marks
                        </p>
                        <div className="mt-2">
                            <p className={`font-medium ${
                                testResult.percentage >= 80 ? 'text-green-600' : 
                                testResult.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                                {testResult.percentage >= 80 ? '🎉 Excellent!' : 
                                 testResult.percentage >= 60 ? '👍 Good Job!' : '📚 Keep Practicing!'}
                            </p>
                            <p className="text-sm theme-text-secondary mt-1">
                                Correct: {testResult.answers.filter(a => a.isCorrect).length} / {testQuestions.length}
                            </p>
                        </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold theme-text">Question-wise Results</h3>
                        {testQuestions.map((question, index) => {
                            const answer = testResult.answers.find(a => a.questionId === question.id);
                            const correctOption = question.options?.find(opt => opt.isCorrect);
                            
                            return (
                                <div key={question.id} className={`border rounded-lg ${isMobile() ? 'p-3' : 'p-4'} ${
                                    answer?.isCorrect ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                                }`}>
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium theme-text">Question {index + 1}</span>
                                            <span className={`text-sm px-2 py-1 rounded ${
                                                answer?.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {answer?.isCorrect ? `✓ ${question.marks}` : '✗ 0'} / {question.marks} marks
                                            </span>
                                        </div>
                                        <p className="theme-text font-medium">{question.question}</p>
                                    </div>

                                    <div className="space-y-2">
                                        {question.options?.map((option, optIndex) => (
                                            <div key={option.id} className={`p-2 rounded text-sm ${
                                                option.isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                userAnswers[question.id] === option.id ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                'theme-surface2 theme-text'
                                            }`}>
                                                <span className="font-medium mr-2">
                                                    {String.fromCharCode(65 + optIndex)}.
                                                </span>
                                                {option.text}
                                                {option.isCorrect && <span className="ml-2">✓ Correct</span>}
                                                {userAnswers[question.id] === option.id && !option.isCorrect && <span className="ml-2">✗ Your choice</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => {
                                setIsTestStarted(false);
                                setIsTestCompleted(false);
                                setCurrentQuestionIndex(0);
                                setUserAnswers({});
                                setTestResult(null);
                            }}
                            className="btn-primary"
                        >
                            Take Another Test
                        </button>
                        <button onClick={onBack} className="btn-secondary">
                            Back to Practice
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Test in progress screen
    const currentQuestion = testQuestions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div className={`theme-surface rounded-lg ${isMobile() ? 'p-4' : 'p-6'}`}>
            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold theme-text">🧪 MCQ Test</h2>
                    <span className="text-sm theme-text-secondary">
                        Question {currentQuestionIndex + 1} of {testQuestions.length}
                    </span>
                </div>
                <button onClick={onBack} className="btn-secondary text-sm">
                    Exit Test
                </button>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%` }}
                    ></div>
                </div>

                {/* Question */}
                <div className={`${isMobile() ? 'p-4' : 'p-6'} theme-surface2 rounded-lg`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium theme-text">
                            Marks: 1
                        </span>
                        {currentQuestion.category && (
                            <span className="text-xs theme-text-secondary theme-surface px-2 py-1 rounded">
                                {currentQuestion.category}
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-medium theme-text mb-6">
                        {currentQuestion.question}
                    </h3>

                    {/* Options */}
                    <div className="space-y-3">
                        {currentQuestion.options?.map((option, index) => (
                            <button
                                key={option.id}
                                onClick={() => handleAnswerChange(option.id)}
                                className={`w-full text-left ${isMobile() ? 'p-3 text-sm' : 'p-4'} rounded-lg border theme-transition ${
                                    userAnswers[currentQuestion.id] === option.id
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
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <button
                        onClick={previousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="btn-secondary disabled:opacity-50"
                    >
                        Previous
                    </button>
                    
                    <button
                        onClick={nextQuestion}
                        className="btn-primary"
                    >
                        {currentQuestionIndex === testQuestions.length - 1 ? 'Finish Test' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};
