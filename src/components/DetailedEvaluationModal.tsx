import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface EvaluationQuestion {
    questionId: string;
    questionNumber: number;
    questionType: 'mcq' | 'long-answer';
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    score: number;
    maxScore: number;
    feedback: string;
    isCorrect: boolean;
    sectionName: string;
    selectedOptionIndex?: number;
    allOptions?: any[];
}

interface DetailedEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    evaluationResults: {
        paperTitle: string;
        obtainedMarks: number;
        totalMarks: number;
        percentage: number;
        questionResults: EvaluationQuestion[];
    };
    selectedExamPaper: any;
    examAnswers: { [questionId: string]: any };
    onBackToSummary: () => void;
}

const DetailedEvaluationModal: React.FC<DetailedEvaluationModalProps> = ({
    isOpen,
    onClose,
    evaluationResults,
    selectedExamPaper,
    examAnswers,
    onBackToSummary
}) => {
    const { theme } = useTheme();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    if (!isOpen || !evaluationResults) return null;

    const currentResult = evaluationResults.questionResults[currentQuestionIndex];
    const totalQuestions = evaluationResults.questionResults.length;

    // Find the original question to get all options
    const originalQuestion = selectedExamPaper?.sections
        .flatMap((section: any) => section.questions)
        .find((q: any) => q.id === currentResult.questionId);

    const userAnswer = examAnswers[currentResult.questionId];
    const selectedOptionIndex = userAnswer?.selectedOption || 0;
    const selectedOption = originalQuestion?.questionOptions[selectedOptionIndex];

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const goToNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    // Mobile detection
    const isMobile = () => window.innerWidth <= 768;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="theme-bg rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
                <div className={`${isMobile() ? 'p-3' : 'p-6'}`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between ${isMobile() ? 'mb-3' : 'mb-6'}`}>
                        <div>
                            <h2 className={`${isMobile() ? 'text-lg' : 'text-2xl'} font-bold theme-text`}>Detailed Evaluation</h2>
                            <p className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary`}>
                                Question {currentQuestionIndex + 1} of {totalQuestions} | Total Marks: {evaluationResults.totalMarks} | {evaluationResults.paperTitle}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`${isMobile() ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 theme-transition`}
                        >
                            <svg className={`${isMobile() ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation Controls */}
                    <div className={`flex items-center justify-between ${isMobile() ? 'mb-3 p-2' : 'mb-6 p-4'} theme-surface border theme-border rounded-lg`}>
                        <button
                            onClick={goToPrevious}
                            disabled={currentQuestionIndex === 0}
                            className={`flex items-center gap-1 ${isMobile() ? 'px-2 py-1 text-xs' : 'px-4 py-2'} theme-surface theme-text border theme-border rounded hover:theme-surface2 disabled:opacity-50 disabled:cursor-not-allowed theme-transition`}
                        >
                            <svg className={`${isMobile() ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {!isMobile() && 'Previous'}
                        </button>

                        <div className="text-center">
                            <div className={`${isMobile() ? 'text-sm' : 'text-lg'} font-semibold theme-text`}>
                                Question {currentResult.questionNumber}
                            </div>
                            <div className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary`}>
                                {currentResult.sectionName}
                            </div>
                        </div>

                        <button
                            onClick={goToNext}
                            disabled={currentQuestionIndex === totalQuestions - 1}
                            className={`flex items-center gap-1 ${isMobile() ? 'px-2 py-1 text-xs' : 'px-4 py-2'} theme-surface theme-text border theme-border rounded hover:theme-surface2 disabled:opacity-50 disabled:cursor-not-allowed theme-transition`}
                        >
                            {!isMobile() && 'Next'}
                            <svg className={`${isMobile() ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Question Content */}
                    <div className={`theme-surface rounded-lg ${isMobile() ? 'p-3' : 'p-6'} border theme-border ${isMobile() ? 'mb-3' : 'mb-6'}`}>
                        {/* Question Header */}
                        <div className={`${isMobile() ? 'mb-2' : 'mb-4'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className={`${isMobile() ? 'text-sm' : 'text-lg'} font-semibold theme-text`}>
                                    Question {currentResult.questionNumber}
                                    {originalQuestion?.questionOptions.length > 1 && 
                                        ` - Option ${String.fromCharCode(65 + selectedOptionIndex)}`
                                    }
                                </h3>
                                
                                {/* Compact Score Display */}
                                <div className={`${isMobile() ? 'text-sm' : 'text-base'} font-semibold ${currentResult.isCorrect ? 'text-green-600' : currentResult.score > 0 ? 'text-yellow-600' : 'text-red-600'} px-2 py-1 rounded ${currentResult.isCorrect ? 'bg-green-100 dark:bg-green-900/30' : currentResult.score > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                    {currentResult.score}/{currentResult.maxScore}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary px-2 py-1 theme-surface2 rounded`}>
                                    {currentResult.questionType === 'mcq' ? 'Multiple Choice' : 'Long Answer'} • {currentResult.maxScore} total marks
                                </span>
                                <div className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text-secondary font-medium`}>
                                    {Math.round((currentResult.score / currentResult.maxScore) * 100)}%
                                </div>
                            </div>
                        </div>

                        {/* Question Text */}
                        <div className={`${isMobile() ? 'mb-3' : 'mb-4'}`}>
                            <h4 className={`${isMobile() ? 'text-xs' : 'text-sm'} font-medium theme-text ${isMobile() ? 'mb-1' : 'mb-2'}`}>Question:</h4>
                            <div className={`${isMobile() ? 'p-2' : 'p-3'} theme-surface2 rounded border-l-4 border-blue-500`}>
                                <p className={`theme-text ${isMobile() ? 'text-sm' : ''}`}>{selectedOption?.text || currentResult.questionText}</p>
                            </div>
                        </div>

                        {/* Display all question options if internal choice */}
                        {originalQuestion?.questionOptions.length > 1 && (
                            <div className={`${isMobile() ? 'mb-3' : 'mb-4'}`}>
                                <h4 className={`${isMobile() ? 'text-xs' : 'text-sm'} font-medium theme-text ${isMobile() ? 'mb-1' : 'mb-2'}`}>Available Options:</h4>
                                <div className={`space-y-${isMobile() ? '1' : '2'}`}>
                                    {originalQuestion.questionOptions.map((option: any, optionIndex: number) => (
                                        <div 
                                            key={option.id} 
                                            className={`${isMobile() ? 'p-2' : 'p-3'} rounded border-l-4 ${
                                                optionIndex === selectedOptionIndex 
                                                    ? 'border-blue-500 theme-accent-light' 
                                                    : 'border-gray-300 theme-surface2'
                                            }`}
                                        >
                                            <div className={`flex items-center gap-2 ${isMobile() ? 'mb-0.5' : 'mb-1'}`}>
                                                <span className={`${isMobile() ? 'text-xs' : 'text-sm'} font-medium theme-text`}>
                                                    Option {String.fromCharCode(65 + optionIndex)}
                                                </span>
                                                {optionIndex === selectedOptionIndex && (
                                                    <span className={`${isMobile() ? 'text-xs px-1 py-0.5' : 'text-xs px-2 py-1'} bg-blue-600 text-white rounded`}>
                                                        Selected
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`${isMobile() ? 'text-xs' : 'text-sm'} theme-text`}>{option.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MCQ Options Display */}
                        {currentResult.questionType === 'mcq' && selectedOption?.options && (
                            <div className="mb-4">
                                <h4 className="text-sm font-medium theme-text mb-2">Answer Choices:</h4>
                                <div className="space-y-2">
                                    {selectedOption.options.map((choice: string, choiceIndex: number) => {
                                        const isUserChoice = userAnswer?.answer === choiceIndex;
                                        const isCorrectChoice = selectedOption.correctAnswer === choiceIndex;
                                        
                                        return (
                                            <div 
                                                key={choiceIndex}
                                                className={`p-3 rounded border-l-4 ${
                                                    isCorrectChoice 
                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                                        : isUserChoice && !isCorrectChoice
                                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                        : 'border-gray-300 theme-surface2'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="theme-text">
                                                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        {isCorrectChoice && (
                                                            <span className="text-xs px-2 py-1 bg-green-600 text-white rounded">
                                                                Correct
                                                            </span>
                                                        )}
                                                        {isUserChoice && (
                                                            <span className={`text-xs px-2 py-1 rounded ${
                                                                isCorrectChoice 
                                                                    ? 'bg-green-600 text-white' 
                                                                    : 'bg-red-600 text-white'
                                                            }`}>
                                                                Your Answer
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* User Answer for All Question Types */}
                        <div className={`${isMobile() ? 'mb-3' : 'mb-4'}`}>
                            <h4 className={`${isMobile() ? 'text-xs' : 'text-sm'} font-medium theme-text ${isMobile() ? 'mb-1' : 'mb-2'}`}>Your Answer:</h4>
                            <div className={`${isMobile() ? 'p-2' : 'p-3'} theme-surface2 rounded border-l-4 border-blue-500`}>
                                {currentResult.questionType === 'long-answer' ? (
                                    <p className={`theme-text whitespace-pre-wrap ${isMobile() ? 'text-sm' : ''}`}>
                                        {userAnswer?.answer || currentResult.userAnswer || 'No answer provided'}
                                    </p>
                                ) : (
                                    // For MCQ questions, show the selected choice
                                    <p className={`theme-text ${isMobile() ? 'text-sm' : ''}`}>
                                        {userAnswer && selectedOption?.options && userAnswer.answer !== undefined 
                                            ? `${String.fromCharCode(65 + userAnswer.answer)}. ${selectedOption.options[userAnswer.answer]}`
                                            : userAnswer?.answer || currentResult.userAnswer || 'No answer provided'
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Model Answer */}
                        {selectedOption?.explanation && (
                            <div className={`${isMobile() ? 'mb-3' : 'mb-4'}`}>
                                <h4 className={`${isMobile() ? 'text-xs' : 'text-sm'} font-medium theme-text ${isMobile() ? 'mb-1' : 'mb-2'}`}>Model Answer:</h4>
                                <div className={`${isMobile() ? 'p-2' : 'p-3'} bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-500`}>
                                    <p className={`text-green-700 dark:text-green-300 ${isMobile() ? 'text-sm' : ''}`}>
                                        {selectedOption.explanation}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* AI Feedback */}
                        <div>
                            <h4 className={`${isMobile() ? 'text-xs' : 'text-sm'} font-medium theme-text ${isMobile() ? 'mb-1' : 'mb-2'}`}>Evaluation Feedback:</h4>
                            <div className={`${isMobile() ? 'p-2' : 'p-3'} rounded border-l-4 ${
                                currentResult.isCorrect 
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                    : currentResult.score > 0
                                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            }`}>
                                <p className={`${isMobile() ? 'text-sm' : ''} ${
                                    currentResult.isCorrect 
                                        ? 'text-green-700 dark:text-green-300' 
                                        : currentResult.score > 0
                                        ? 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-red-700 dark:text-red-300'
                                }`}>
                                    {currentResult.feedback}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={`flex ${isMobile() ? 'flex-col gap-2' : 'gap-4 justify-center'}`}>
                        <button
                            onClick={onBackToSummary}
                            className={`${isMobile() ? 'w-full px-4 py-2 text-sm' : 'px-6 py-2'} theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition`}
                        >
                            Back to Summary
                        </button>
                        
                        {/* Quick navigation - Hide on mobile to save space */}
                        {!isMobile() && (
                            <div className="flex gap-2">
                                {evaluationResults.questionResults.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentQuestionIndex(index)}
                                        className={`w-10 h-10 rounded border theme-border ${
                                            index === currentQuestionIndex
                                                ? 'theme-accent text-white'
                                                : 'theme-surface theme-text hover:theme-surface2'
                                        } theme-transition`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailedEvaluationModal;
