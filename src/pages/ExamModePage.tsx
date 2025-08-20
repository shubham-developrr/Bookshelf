import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { PlusIcon } from '../components/icons';
import QuestionEditor from '../components/QuestionEditorNew';
import DetailedEvaluationModal from '../components/DetailedEvaluationModal';
import EvaluationReportsModal, { EvaluationReport } from '../components/EvaluationReportsModal';
// import { generateAIGuruResponse } from '../services/githubModelsService';
import Groq from 'groq-sdk';

interface QuestionPaper {
    id: string;
    title: string;
    category: 'previous-year' | 'mock' | 'custom';
    year?: string; // For previous year papers
    customCategory?: string; // For custom category
    sections: Section[];
    duration: number; // in minutes
    createdAt: Date;
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

const ExamModePage: React.FC = () => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    // Get current book information for AI context
    const getCurrentBookInfo = () => {
        try {
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const currentBook = savedBooks.find((book: any) => book.title === subjectName);
            
            if (currentBook) {
                const chapters = currentBook.chapters || [];
                const currentChapter = chapters.find((chapter: any) => chapter.title === chapterName);
                return {
                    bookTitle: currentBook.title,
                    chapters: chapters.map((ch: any) => ch.title),
                    currentChapter: currentChapter,
                    subtopics: currentChapter?.subtopics || []
                };
            }
        } catch (error) {
            console.error('Error getting book info:', error);
        }
        return null;
    };
    
    const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
    const [showAddPaper, setShowAddPaper] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
    
    // Exam Interface States
    const [showInstructions, setShowInstructions] = useState(false);
    const [selectedExamPaper, setSelectedExamPaper] = useState<QuestionPaper | null>(null);
    const [examStarted, setExamStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [examAnswers, setExamAnswers] = useState<{ [questionId: string]: any }>({});
    const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
    
    // Evaluation States
    const [showResults, setShowResults] = useState(false);
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [evaluationResults, setEvaluationResults] = useState<any>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    
    // Evaluation Reports States
    const [evaluationReports, setEvaluationReports] = useState<EvaluationReport[]>([]);
    const [showReports, setShowReports] = useState(false);
    const [backgroundEvaluations, setBackgroundEvaluations] = useState<Map<string, any>>(new Map());
    
    // Add Paper Form States
    const [paperTitle, setPaperTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'previous-year' | 'mock' | 'custom'>('previous-year');
    const [selectedYear, setSelectedYear] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [paperDuration, setPaperDuration] = useState(30);

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';

    // Generate year options (current year to 10 years back)
    const yearOptions = Array.from({ length: 11 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return year.toString();
    });

    const handleExitExam = () => {
        navigate(`/reader/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`);
    };

    const handleAddPaper = () => {
        if (!paperTitle.trim()) return;
        
        if (selectedCategory === 'previous-year' && !selectedYear) return;
        if (selectedCategory === 'custom' && !customCategory.trim()) return;

        const newPaper: QuestionPaper = {
            id: Date.now().toString(),
            title: paperTitle.trim(),
            category: selectedCategory,
            year: selectedCategory === 'previous-year' ? selectedYear : undefined,
            customCategory: selectedCategory === 'custom' ? customCategory.trim() : undefined,
            sections: [
                {
                    id: 'section_1',
                    name: 'Section A',
                    totalQuestions: 0,
                    requiredAnswers: 0,
                    questions: []
                }
            ], // Default section
            duration: paperDuration,
            createdAt: new Date()
        };

        setQuestionPapers(prev => [...prev, newPaper]);
        
        // Reset form
        setPaperTitle('');
        setSelectedYear('');
        setCustomCategory('');
        setPaperDuration(30);
        setShowAddPaper(false);
    };

    const handleDeletePaper = (paperId: string) => {
        setQuestionPapers(prev => prev.filter(paper => paper.id !== paperId));
    };

    const handleEditQuestions = (paper: QuestionPaper) => {
        setEditingPaper(paper);
    };

    const handleStartExam = (paper: QuestionPaper) => {
        setSelectedExamPaper(paper);
        setShowInstructions(true);
    };

    const handleConfirmStartExam = () => {
        setShowInstructions(false);
        setExamStarted(true);
        setCurrentQuestionIndex(0);
        setExamAnswers({});
        if (selectedExamPaper) {
            setTimeRemaining(selectedExamPaper.duration * 60); // Convert minutes to seconds
        }
    };

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (examStarted && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        // Time's up - auto submit exam
                        handleExitExamInterface();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [examStarted, timeRemaining]);

    // Load evaluation reports from localStorage on mount
    useEffect(() => {
        const savedReports = localStorage.getItem(`evaluationReports_${currentBook}_${currentChapter}`);
        if (savedReports) {
            try {
                const reports = JSON.parse(savedReports);
                setEvaluationReports(reports.map((report: any) => ({
                    ...report,
                    submittedAt: new Date(report.submittedAt)
                })));
            } catch (error) {
                console.error('Error loading evaluation reports:', error);
            }
        }
    }, [currentBook, currentChapter]);

    // Save evaluation reports to localStorage whenever they change
    useEffect(() => {
        if (evaluationReports.length > 0) {
            localStorage.setItem(
                `evaluationReports_${currentBook}_${currentChapter}`,
                JSON.stringify(evaluationReports)
            );
        }
    }, [evaluationReports, currentBook, currentChapter]);

    // Load question papers from localStorage on mount
    useEffect(() => {
        const savedPapers = localStorage.getItem(`questionPapers_${currentBook}_${currentChapter}`);
        if (savedPapers) {
            try {
                const parsedPapers = JSON.parse(savedPapers);
                // Convert date strings back to Date objects
                const papersWithDates = parsedPapers.map((paper: any) => ({
                    ...paper,
                    createdAt: new Date(paper.createdAt)
                }));
                setQuestionPapers(papersWithDates);
            } catch (error) {
                console.error('Error loading question papers:', error);
            }
        }
    }, [currentBook, currentChapter]);

    // Save question papers to localStorage whenever they change
    useEffect(() => {
        if (questionPapers.length > 0) {
            localStorage.setItem(
                `questionPapers_${currentBook}_${currentChapter}`,
                JSON.stringify(questionPapers)
            );
        }
    }, [questionPapers, currentBook, currentChapter]);

    // Background evaluation checker
    useEffect(() => {
        const checkBackgroundEvaluations = () => {
            setEvaluationReports(prev => prev.map(report => {
                if (report.status === 'processing' && backgroundEvaluations.has(report.id)) {
                    const evaluation = backgroundEvaluations.get(report.id);
                    if (evaluation.completed) {
                        return {
                            ...report,
                            status: 'completed' as const,
                            ...evaluation.results,
                            processingProgress: 100
                        };
                    } else if (evaluation.error) {
                        return {
                            ...report,
                            status: 'failed' as const,
                            error: evaluation.error,
                            processingProgress: 0
                        };
                    } else {
                        return {
                            ...report,
                            processingProgress: evaluation.progress || 0
                        };
                    }
                }
                return report;
            }));
        };

        const interval = setInterval(checkBackgroundEvaluations, 1000);
        return () => clearInterval(interval);
    }, [backgroundEvaluations]);

    // Format time for display
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handleExitExamInterface = () => {
        setExamStarted(false);
        setSelectedExamPaper(null);
        setCurrentQuestionIndex(0);
        setExamAnswers({});
        setTimeRemaining(0);
        setShowResults(false);
        setShowEvaluation(false);
        setEvaluationResults(null);
    };

    const handleSubmitExam = async () => {
        if (!selectedExamPaper) return;
        
        // Create evaluation report immediately
        const reportId = `eval_${Date.now()}`;
        const newReport: EvaluationReport = {
            id: reportId,
            paperTitle: selectedExamPaper.title,
            subjectName: currentBook,
            chapterName: currentChapter,
            submittedAt: new Date(),
            status: 'processing',
            totalMarks: 0,
            obtainedMarks: 0,
            percentage: 0,
            questionResults: [],
            processingProgress: 0
        };

        // Add to reports list immediately
        setEvaluationReports(prev => [newReport, ...prev]);
        
        // Start background evaluation
        startBackgroundEvaluation(reportId, selectedExamPaper, examAnswers);
        
        // Reset exam interface
        setExamStarted(false);
        setSelectedExamPaper(null);
        setCurrentQuestionIndex(0);
        setExamAnswers({});
        setTimeRemaining(0);
        
        // Show success message
        alert('Exam submitted! Evaluation is running in the background. You can check the progress in "Previous Reports".');
    };

    const startBackgroundEvaluation = async (reportId: string, paper: QuestionPaper, answers: { [questionId: string]: any }) => {
        try {
            // Set initial progress
            setBackgroundEvaluations(prev => new Map(prev.set(reportId, { progress: 10, completed: false })));
            
            // Simulate progress updates while actual evaluation happens
            const progressInterval = setInterval(() => {
                setBackgroundEvaluations(prev => {
                    const current = prev.get(reportId);
                    if (current && !current.completed && current.progress < 90) {
                        return new Map(prev.set(reportId, { ...current, progress: current.progress + 10 }));
                    }
                    return prev;
                });
            }, 2000);

            // Run actual evaluation
            const results = await evaluateExam(paper, answers);
            
            // Clear progress interval
            clearInterval(progressInterval);
            
            // Mark as completed
            setBackgroundEvaluations(prev => new Map(prev.set(reportId, {
                progress: 100,
                completed: true,
                results: results
            })));
            
        } catch (error) {
            console.error('Background evaluation failed:', error);
            setBackgroundEvaluations(prev => new Map(prev.set(reportId, {
                progress: 0,
                completed: false,
                error: error instanceof Error ? error.message : 'Evaluation failed'
            })));
        }
    };

    const evaluateExam = async (paper: QuestionPaper, answers: { [questionId: string]: any }) => {
        let totalMarks = 0;
        let obtainedMarks = 0;
        const questionResults: any[] = [];

        // Calculate total marks - use simple approach first
        paper.sections.forEach(section => {
            section.questions.forEach(question => {
                totalMarks += question.marks;
            });
        });

        // If using section limits, adjust total marks
        if (paper.sections.some(section => section.requiredAnswers > 0 && section.requiredAnswers < section.questions.length)) {
            totalMarks = 0;
            paper.sections.forEach(section => {
                if (section.requiredAnswers > 0) {
                    // Take the maximum marks from questions in this section
                    const sortedQuestions = section.questions.sort((a, b) => b.marks - a.marks);
                    for (let i = 0; i < Math.min(section.requiredAnswers, section.questions.length); i++) {
                        totalMarks += sortedQuestions[i].marks;
                    }
                } else {
                    // If no specific requirement, include all questions
                    section.questions.forEach(question => {
                        totalMarks += question.marks;
                    });
                }
            });
        }

        // Evaluate each section
        for (const section of paper.sections) {
            // Get all answered questions in this section
            const answeredQuestions = section.questions.filter(question => {
                const userAnswer = answers[question.id];
                return userAnswer && (userAnswer.answer !== undefined && userAnswer.answer !== null && userAnswer.answer !== '');
            });

            // If section has required answers limit, take only the required number
            let questionsToEvaluate = answeredQuestions;
            if (section.requiredAnswers > 0 && section.requiredAnswers < section.questions.length) {
                // Sort by marks (highest first) and take required number
                questionsToEvaluate = answeredQuestions
                    .sort((a, b) => b.marks - a.marks)
                    .slice(0, section.requiredAnswers);
            }

            for (const question of questionsToEvaluate) {
                const userAnswer = answers[question.id];
                let questionScore = 0;
                let feedback = '';
                let isCorrect = false;

                if (userAnswer) {
                    const selectedOption = question.questionOptions[userAnswer.selectedOption || 0];
                    
                    if (question.questionType === 'mcq' && selectedOption) {
                        // MCQ evaluation
                        if (userAnswer.answer === selectedOption.correctAnswer) {
                            questionScore = question.marks;
                            isCorrect = true;
                            feedback = 'Correct answer';
                        } else {
                            questionScore = 0;
                            feedback = 'Incorrect answer';
                        }
                    } else if (question.questionType === 'long-answer' && selectedOption) {
                        // Long answer evaluation using AI
                        try {
                            const aiEvaluation = await evaluateLongAnswer(
                                selectedOption.text,
                                selectedOption.explanation || '',
                                userAnswer.answer || '',
                                question.marks
                            );
                            questionScore = aiEvaluation.score;
                            feedback = aiEvaluation.feedback;
                            isCorrect = questionScore === question.marks;
                        } catch (error) {
                            questionScore = question.marks * 0.5; // Give 50% for attempt
                            feedback = 'Unable to evaluate automatically. Partial marks awarded.';
                        }
                    }
                } else {
                    feedback = 'Not attempted';
                }

                obtainedMarks += questionScore;
                questionResults.push({
                    questionId: question.id,
                    questionNumber: question.questionNumber,
                    questionType: question.questionType,
                    questionText: question.questionOptions[userAnswer?.selectedOption || 0]?.text || '',
                    userAnswer: userAnswer?.answer || 'Not attempted',
                    correctAnswer: question.questionOptions[userAnswer?.selectedOption || 0]?.explanation || 'Not provided',
                    score: questionScore,
                    maxScore: question.marks,
                    feedback,
                    isCorrect,
                    sectionName: section.name
                });
            }
        }

        // Ensure we don't have division by zero
        const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

        return {
            totalMarks,
            obtainedMarks,
            percentage,
            questionResults,
            paperTitle: paper.title
        };
    };

    const evaluateLongAnswer = async (question: string, correctAnswer: string, userAnswer: string, maxMarks: number) => {
        try {
            const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
            if (!API_KEY) {
                throw new Error("Groq API key not configured");
            }

            // Get current book information for context
            const bookInfo = getCurrentBookInfo();
            
            // Prepare enhanced subject context
            let subjectContext = `
**Academic Context:**
- Subject: ${subjectName || 'General Studies'}
- Chapter/Module: ${chapterName || 'General Topics'}`;

            if (bookInfo) {
                subjectContext += `
- Book: ${bookInfo.bookTitle}
- Available Chapters: ${bookInfo.chapters.slice(0, 5).join(', ')}${bookInfo.chapters.length > 5 ? '...' : ''}`;
                
                if (bookInfo.subtopics.length > 0) {
                    subjectContext += `
- Chapter Subtopics: ${bookInfo.subtopics.slice(0, 8).join(', ')}${bookInfo.subtopics.length > 8 ? '...' : ''}`;
                }
            }

            subjectContext += `
- This question belongs to the academic curriculum for ${subjectName || 'this subject'}
- Evaluate based on the specific subject domain and academic standards
`;

            const prompt = `You are a fair and professional university professor evaluating a student's answer. You must provide constructive feedback and accurate scoring.

${subjectContext}

**Question:** ${question}

**Model Answer:** ${correctAnswer}

**Student Answer:** ${userAnswer}

**Maximum Marks:** ${maxMarks}

**Evaluation Criteria:**
1. **Accuracy & Correctness** (40%): How factually correct is the answer?
2. **Completeness** (30%): Does it cover the key points from the model answer?
3. **Understanding** (20%): Does the student demonstrate conceptual understanding?
4. **Clarity & Structure** (10%): Is the answer well-organized and clearly written?

**Instructions:**
- Award marks proportionally based on the criteria above
- Give partial credit for partially correct answers
- Be fair but maintain academic standards
- If the student answer is completely off-topic or blank, award 0 marks
- If the answer shows some understanding but has errors, award 20-60% of marks
- If the answer is mostly correct with minor issues, award 60-90% of marks
- Award full marks only for excellent, complete answers

**CRITICAL: You MUST respond in this EXACT format (no deviation):**

SCORE: [number between 0 and ${maxMarks}]
FEEDBACK: [detailed explanation of why this score was awarded, highlighting strengths and areas for improvement]

**Example format:**
SCORE: 7
FEEDBACK: The student demonstrates a good understanding of the concept but missed some key details...`;

            const groq = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a university professor expert in fair academic evaluation. Always follow the EXACT response format requested with SCORE: and FEEDBACK: labels.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: 'moonshotai/kimi-k2-instruct',
                temperature: 0.3,
                max_tokens: 500
            });

            const aiResponse = response.choices[0]?.message?.content || '';

            // Comment out GitHub Models code for fallback
            /*
            const aiResponse = await generateAIGuruResponse(
                prompt,
                'You are a university professor expert in fair academic evaluation. Always follow the exact response format requested.'
            );
            */

            // Parse the AI response with improved pattern matching
            console.log('AI Response received:', aiResponse); // Debug log
            
            // Try multiple patterns for score detection
            let scoreMatch = aiResponse.match(/SCORE:\s*(\d+(?:\.\d+)?)/i) || 
                           aiResponse.match(/Score:\s*(\d+(?:\.\d+)?)/i) ||
                           aiResponse.match(/(\d+(?:\.\d+)?)\s*\/\s*\d+/i) ||
                           aiResponse.match(/(\d+(?:\.\d+)?)\s*out\s*of\s*\d+/i) ||
                           aiResponse.match(/(\d+(?:\.\d+)?)\s*marks/i);
            
            // Try multiple patterns for feedback detection
            let feedbackMatch = aiResponse.match(/FEEDBACK:\s*(.+)/is) || 
                              aiResponse.match(/Feedback:\s*(.+)/is) ||
                              aiResponse.match(/Explanation:\s*(.+)/is);

            let score = 0;
            let feedback = 'Unable to parse AI evaluation properly.';

            if (scoreMatch) {
                score = Math.min(Math.max(0, Math.round(parseFloat(scoreMatch[1]))), maxMarks);
                console.log(`Parsed score: ${score} from match: ${scoreMatch[1]}`); // Debug log
            } else {
                console.log('No score pattern matched in response:', aiResponse); // Debug log
            }

            if (feedbackMatch) {
                feedback = feedbackMatch[1].trim();
            } else {
                // If no feedback pattern matched, use the entire response as feedback
                feedback = aiResponse || 'No feedback provided by AI.';
                console.log('Using entire response as feedback due to no pattern match'); // Debug log
            }

            // Fallback scoring if AI response is invalid
            if (score === 0 && userAnswer.trim().length > 0) {
                const wordCount = userAnswer.split(' ').length;
                const hasKeywords = correctAnswer.toLowerCase().split(' ').some(word => 
                    word.length > 3 && userAnswer.toLowerCase().includes(word.toLowerCase())
                );
                
                if (wordCount >= 10 && hasKeywords) {
                    score = Math.round(maxMarks * 0.4);
                    feedback += ' (Automatic partial scoring applied due to parsing issues)';
                }
            }

            return { score, feedback };

        } catch (error) {
            console.error('AI evaluation error:', error);
            
            // Fallback evaluation logic
            const wordCount = userAnswer.split(' ').length;
            const hasKeywords = correctAnswer.toLowerCase().split(' ').some(word => 
                word.length > 3 && userAnswer.toLowerCase().includes(word.toLowerCase())
            );
            
            let score = 0;
            let feedback = '';
            
            if (userAnswer.trim().length === 0) {
                score = 0;
                feedback = 'No answer provided.';
            } else if (wordCount < 5) {
                score = Math.round(maxMarks * 0.1);
                feedback = 'Answer is too brief. More detailed explanation required.';
            } else if (hasKeywords && wordCount >= 30) {
                score = Math.round(maxMarks * 0.7);
                feedback = 'Good answer with relevant content. Shows understanding of the concept.';
            } else if (hasKeywords && wordCount >= 15) {
                score = Math.round(maxMarks * 0.5);
                feedback = 'Partially correct answer. Some key points covered but could be more comprehensive.';
            } else if (hasKeywords) {
                score = Math.round(maxMarks * 0.3);
                feedback = 'Basic understanding shown but answer needs more detail and accuracy.';
            } else {
                score = Math.round(maxMarks * 0.2);
                feedback = 'Answer lacks key concepts. Please review the topic and provide more relevant content.';
            }
            
            return { 
                score, 
                feedback: feedback + ' (AI evaluation unavailable - using automatic scoring)' 
            };
        }
    };

    // Evaluation Reports handlers
    const handleDeleteReport = (reportId: string) => {
        setEvaluationReports(prev => prev.filter(report => report.id !== reportId));
        // Also clear from background evaluations if it exists
        setBackgroundEvaluations(prev => {
            const newMap = new Map(prev);
            newMap.delete(reportId);
            return newMap;
        });
    };

    const handleViewReport = (report: EvaluationReport) => {
        setEvaluationResults(report);
        setShowEvaluation(true);
        setShowReports(false);
    };

    // Group papers by category in the desired order
    const groupedPapers = () => {
        const groups: { [key: string]: QuestionPaper[] } = {};
        
        // Initialize with standard categories
        groups['Previous Year Papers'] = [];
        groups['Mock Papers'] = [];

        questionPapers.forEach(paper => {
            if (paper.category === 'previous-year') {
                groups['Previous Year Papers'].push(paper);
            } else if (paper.category === 'mock') {
                groups['Mock Papers'].push(paper);
            } else if (paper.category === 'custom' && paper.customCategory) {
                // Create a group for each custom category
                if (!groups[paper.customCategory]) {
                    groups[paper.customCategory] = [];
                }
                groups[paper.customCategory].push(paper);
            }
        });

        // Sort papers within each category
        Object.keys(groups).forEach(categoryName => {
            if (categoryName === 'Previous Year Papers') {
                groups[categoryName].sort((a, b) => (b.year || '').localeCompare(a.year || ''));
            } else {
                groups[categoryName].sort((a, b) => a.title.localeCompare(b.title));
            }
        });

        // Return only categories that have papers, in the desired order
        const orderedCategories = ['Previous Year Papers'];
        
        // Add custom categories
        Object.keys(groups).forEach(categoryName => {
            if (categoryName !== 'Previous Year Papers' && categoryName !== 'Mock Papers' && groups[categoryName].length > 0) {
                orderedCategories.push(categoryName);
            }
        });
        
        // Add mock papers at the end
        orderedCategories.push('Mock Papers');
        
        return orderedCategories
            .filter(categoryName => groups[categoryName] && groups[categoryName].length > 0)
            .map(categoryName => [categoryName, groups[categoryName]] as [string, QuestionPaper[]]);
    };

    const getCategoryDisplay = (paper: QuestionPaper) => {
        switch (paper.category) {
            case 'previous-year':
                return `Previous Year ${paper.year}`;
            case 'mock':
                return 'Mock Paper';
            case 'custom':
                return paper.customCategory;
            default:
                return paper.category;
        }
    };

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case 'previous-year':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'mock':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'custom':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    return (
        <div className="theme-bg min-h-screen theme-text theme-transition">
            {/* Header */}
            <header className="sticky top-0 theme-surface backdrop-blur-sm z-10 p-4 border-b theme-border">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Exit Button - Top Left */}
                    <button
                        onClick={() => setShowExitConfirm(true)}
                        className="btn-responsive flex items-center gap-2 p-2 rounded-lg hover:theme-surface2 theme-transition"
                        title="Exit Exam Mode"
                    >
                        <svg className="w-6 h-6 theme-text btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="btn-text theme-text">Exit Exam Mode</span>
                    </button>

                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-xl sm:text-2xl font-bold theme-text">Exam Mode</h1>
                        <p className="text-sm theme-text-secondary">{currentChapter} - {currentBook}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        {/* Previous Reports Button */}
                        <button
                            onClick={() => setShowReports(true)}
                            className="btn-responsive flex items-center gap-2 px-4 py-2 theme-surface2 theme-text rounded-lg hover:theme-surface3 theme-transition border theme-border"
                        >
                            <svg className="w-4 h-4 btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="btn-text">Previous Reports</span>
                            {evaluationReports.filter(r => r.status === 'processing').length > 0 && (
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        {/* Add Question Paper Button */}
                        <button
                            onClick={() => setShowAddPaper(true)}
                            className="btn-responsive flex items-center gap-2 px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                        >
                            <PlusIcon className="btn-icon" />
                            <span className="btn-text">Add Paper</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6">
                {/* Add Paper Modal */}
                {showAddPaper && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="theme-bg rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <h3 className="text-lg font-bold theme-text mb-4">Add Question Paper</h3>
                                
                                {/* Paper Title */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium theme-text mb-2">Paper Title</label>
                                    <input
                                        type="text"
                                        value={paperTitle}
                                        onChange={(e) => setPaperTitle(e.target.value)}
                                        placeholder="e.g., Data Structures Final Exam"
                                        className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Category Selection */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium theme-text mb-2">Category</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="category"
                                                value="previous-year"
                                                checked={selectedCategory === 'previous-year'}
                                                onChange={(e) => setSelectedCategory(e.target.value as 'previous-year')}
                                                className="mr-2"
                                            />
                                            <span className="theme-text">Previous Year Paper</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="category"
                                                value="mock"
                                                checked={selectedCategory === 'mock'}
                                                onChange={(e) => setSelectedCategory(e.target.value as 'mock')}
                                                className="mr-2"
                                            />
                                            <span className="theme-text">Mock Paper</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="category"
                                                value="custom"
                                                checked={selectedCategory === 'custom'}
                                                onChange={(e) => setSelectedCategory(e.target.value as 'custom')}
                                                className="mr-2"
                                            />
                                            <span className="theme-text">Custom Category</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Year Selection for Previous Year Papers */}
                                {selectedCategory === 'previous-year' && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium theme-text mb-2">Year</label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Year</option>
                                            {yearOptions.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Custom Category Input */}
                                {selectedCategory === 'custom' && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium theme-text mb-2">Custom Category</label>
                                        <input
                                            type="text"
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                            placeholder="e.g., Weekly Test, Practice Set"
                                            className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}

                                {/* Duration */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium theme-text mb-2">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={paperDuration}
                                        onChange={(e) => setPaperDuration(Number(e.target.value))}
                                        min="5"
                                        max="300"
                                        className="w-full px-3 py-2 theme-surface border theme-border rounded-lg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAddPaper(false)}
                                        className="flex-1 px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddPaper}
                                        disabled={!paperTitle.trim() || (selectedCategory === 'previous-year' && !selectedYear) || (selectedCategory === 'custom' && !customCategory.trim())}
                                        className="flex-1 px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                                    >
                                        Add Paper
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Question Papers List - Grouped by Category */}
                <div className="space-y-8">
                    {questionPapers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium theme-text mb-2">No Question Papers</h3>
                            <p className="theme-text-secondary mb-4">
                                Create your first question paper to get started with exam practice
                            </p>
                            <button
                                onClick={() => setShowAddPaper(true)}
                                className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                            >
                                Add Your First Paper
                            </button>
                        </div>
                    ) : (
                        groupedPapers().map(([categoryName, papers]) => (
                            <div key={categoryName} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold theme-text">{categoryName}</h2>
                                    <span className="text-sm theme-text-secondary">
                                        {papers.length} paper{papers.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                
                                <div className="space-y-3">
                                    {papers.map((paper) => (
                                        <div key={paper.id} className="theme-surface rounded-lg p-4 border theme-border hover:theme-surface2 theme-transition">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold theme-text">{paper.title}</h3>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(paper.category)}`}>
                                                            {getCategoryDisplay(paper)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 text-sm theme-text-secondary">
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{paper.duration} min</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{paper.sections.reduce((total, section) => total + section.questions.length, 0)} questions</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                            </svg>
                                                            <span>{paper.sections.reduce((total, section) => total + section.questions.reduce((sum, q) => sum + q.marks, 0), 0)} marks</span>
                                                        </div>
                                                        <span className="text-xs">
                                                            {paper.createdAt.toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button
                                                        onClick={() => handleEditQuestions(paper)}
                                                        className="px-3 py-2 text-sm theme-accent border border-current rounded-lg hover:theme-accent hover:text-white theme-transition"
                                                    >
                                                        Edit Questions
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStartExam(paper)}
                                                        className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg theme-transition"
                                                    >
                                                        Start Exam
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePaper(paper.id)}
                                                        className="p-2 text-red-500 hover:text-red-700 theme-transition"
                                                        title="Delete Paper"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="theme-bg rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold theme-text mb-4">Exit Exam Mode?</h3>
                        <p className="theme-text-secondary mb-6">
                            Are you sure you want to exit exam mode? You'll return to the reader page.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                            >
                                Cancel
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

            {/* Instructions Dialog */}
            {showInstructions && selectedExamPaper && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="theme-bg rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold theme-text mb-4">Exam Instructions</h2>
                            <div className="theme-text space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Paper: {selectedExamPaper.title}</h3>
                                    <p className="text-sm theme-text-secondary">Duration: {selectedExamPaper.duration} minutes</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium mb-2">Section Details:</h4>
                                    {selectedExamPaper.sections.map((section, index) => (
                                        <div key={section.id} className="ml-4 mb-2 p-2 theme-surface rounded">
                                            <p className="font-medium">{section.name}</p>
                                            <p className="text-sm theme-text-secondary">
                                                Total Questions: {section.questions.length} | 
                                                Required to Answer: {section.requiredAnswers}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="theme-surface border theme-border p-3 rounded">
                                    <p className="text-sm theme-text">
                                        <strong>Note:</strong> Some questions may have internal choices. You can choose which option to answer.
                                    </p>
                                </div>

                                <div className="text-sm theme-text-secondary">
                                    <p>• Navigate between questions using the question panel on the left</p>
                                    <p>• You can skip questions and return to them later</p>
                                    <p>• Make sure to answer the required number of questions in each section</p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setShowInstructions(false)}
                                    className="flex-1 px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleConfirmStartExam}
                                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg theme-transition"
                                >
                                    Start Exam
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exam Interface */}
            {examStarted && selectedExamPaper && (
                <div className="fixed inset-0 theme-bg z-40">
                    {/* Header with Timer */}
                    <div className="h-16 border-b theme-border flex items-center justify-between px-6">
                        <h1 className="text-lg font-semibold theme-text">{selectedExamPaper.title}</h1>
                        <div className="flex items-center gap-4">
                            <div className={`text-lg font-mono ${timeRemaining < 300 ? 'text-red-600' : 'theme-text'}`}>
                                {formatTime(timeRemaining)}
                            </div>
                            <button
                                onClick={handleExitExamInterface}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded theme-transition"
                            >
                                End Exam
                            </button>
                        </div>
                    </div>

                    <div className="flex h-[calc(100vh-64px)]">
                        {/* Question Navigation Panel */}
                        <div className="w-80 border-r theme-border theme-surface overflow-y-auto">
                            <div className="p-4">
                                <h3 className="font-semibold theme-text mb-4">Questions</h3>
                                {selectedExamPaper.sections.map((section) => (
                                    <div key={section.id} className="mb-4">
                                        <h4 className="font-medium theme-text mb-2">{section.name}</h4>
                                        <p className="text-xs theme-text-secondary mb-2">
                                            Answer {section.requiredAnswers} out of {section.questions.length}
                                        </p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {section.questions.map((question) => (
                                                <button
                                                    key={question.id}
                                                    onClick={() => {
                                                        // Find global question index
                                                        let globalIndex = 0;
                                                        for (const sect of selectedExamPaper.sections) {
                                                            if (sect.id === section.id) {
                                                                globalIndex += sect.questions.findIndex(q => q.id === question.id);
                                                                break;
                                                            }
                                                            globalIndex += sect.questions.length;
                                                        }
                                                        setCurrentQuestionIndex(globalIndex);
                                                    }}
                                                    className={`
                                                        w-8 h-8 text-xs rounded border theme-border
                                                        ${examAnswers[question.id] 
                                                            ? 'bg-green-500 text-white' 
                                                            : 'theme-surface theme-text hover:theme-surface2'
                                                        }
                                                        ${(() => {
                                                            let globalIndex = 0;
                                                            for (const sect of selectedExamPaper.sections) {
                                                                if (sect.id === section.id) {
                                                                    globalIndex += sect.questions.findIndex(q => q.id === question.id);
                                                                    break;
                                                                }
                                                                globalIndex += sect.questions.length;
                                                            }
                                                            return globalIndex === currentQuestionIndex ? 'ring-2 ring-blue-500' : '';
                                                        })()}
                                                        theme-transition
                                                    `}
                                                >
                                                    {question.questionNumber}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Question Display Area */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Navigation Buttons - Moved to Top */}
                            <div className="flex gap-4 mb-6 p-4 theme-surface border theme-border rounded-lg">
                                <button
                                    onClick={() => {
                                        if (currentQuestionIndex > 0) {
                                            setCurrentQuestionIndex(currentQuestionIndex - 1);
                                        }
                                    }}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-4 py-2 theme-surface theme-text border theme-border rounded hover:theme-surface2 disabled:opacity-50 theme-transition"
                                >
                                    Previous
                                </button>
                                
                                <div className="flex-1 text-center">
                                    <span className="text-sm theme-text-secondary">
                                        Question {currentQuestionIndex + 1} of {selectedExamPaper.sections.reduce((total, section) => total + section.questions.length, 0)}
                                    </span>
                                </div>
                                
                                {currentQuestionIndex < selectedExamPaper.sections.reduce((total, section) => total + section.questions.length, 0) - 1 ? (
                                    <button
                                        onClick={() => {
                                            const totalQuestions = selectedExamPaper.sections.reduce((total, section) => total + section.questions.length, 0);
                                            if (currentQuestionIndex < totalQuestions - 1) {
                                                setCurrentQuestionIndex(currentQuestionIndex + 1);
                                            }
                                        }}
                                        className="px-4 py-2 theme-accent text-white rounded hover:opacity-90 theme-transition"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmitExam}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold theme-transition"
                                    >
                                        Submit Exam
                                    </button>
                                )}
                            </div>

                            {(() => {
                                // Get current question
                                let questionIndex = 0;
                                let currentQuestion = null;
                                let currentSection = null;

                                for (const section of selectedExamPaper.sections) {
                                    for (const question of section.questions) {
                                        if (questionIndex === currentQuestionIndex) {
                                            currentQuestion = question;
                                            currentSection = section;
                                            break;
                                        }
                                        questionIndex++;
                                    }
                                    if (currentQuestion) break;
                                }

                                if (!currentQuestion || !currentSection) {
                                    return <div className="text-center theme-text">No question found</div>;
                                }

                                return (
                                    <div className="max-w-4xl">
                                        <div className="mb-4">
                                            <span className="text-sm theme-text-secondary">{currentSection.name}</span>
                                            <h2 className="text-lg font-semibold theme-text">
                                                Question {currentQuestion.questionNumber} ({currentQuestion.marks} marks)
                                            </h2>
                                        </div>

                                        {/* Display all question options if internal choice */}
                                        {currentQuestion.questionOptions.map((option, optionIndex) => (
                                            <div key={option.id}>
                                                {/* OR separator */}
                                                {optionIndex > 0 && (
                                                    <div className="text-center my-4">
                                                        <span className="px-3 py-1 theme-accent text-white text-sm font-medium rounded">
                                                            OR
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div 
                                                    className={`mb-4 p-4 border rounded-lg cursor-pointer theme-transition
                                                        ${examAnswers[currentQuestion.id]?.selectedOption === optionIndex 
                                                            ? 'border-blue-500 theme-surface2' 
                                                            : 'theme-border hover:border-blue-300 theme-surface'
                                                        }
                                                    `}
                                                    onClick={() => {
                                                        if (currentQuestion.questionOptions.length > 1) {
                                                            setExamAnswers(prev => ({
                                                                ...prev,
                                                                [currentQuestion.id]: { 
                                                                    selectedOption: optionIndex,
                                                                    answer: null 
                                                                }
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    {currentQuestion.questionOptions.length > 1 && (
                                                        <div className="flex items-center mb-3">
                                                            <input
                                                                type="radio"
                                                                name={`question-${currentQuestion.id}-choice`}
                                                                id={`option-${option.id}`}
                                                                checked={examAnswers[currentQuestion.id]?.selectedOption === optionIndex}
                                                                onChange={() => {}} // Handled by div onClick
                                                                className="mr-2"
                                                            />
                                                            <label htmlFor={`option-${option.id}`} className="font-medium theme-text">
                                                                Question {currentQuestion.questionNumber}{String.fromCharCode(65 + optionIndex)}
                                                            </label>
                                                        </div>
                                                    )}

                                                <p className="theme-text mb-4">{option.text}</p>

                                                {currentQuestion.questionType === 'mcq' && option.options && (
                                                    <div className="space-y-2">
                                                        {option.options.map((choice, choiceIndex) => (
                                                            <label key={choiceIndex} className="flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name={`answer-${option.id}`}
                                                                    onChange={() => {
                                                                        setExamAnswers(prev => ({
                                                                            ...prev,
                                                                            [currentQuestion.id]: {
                                                                                ...prev[currentQuestion.id],
                                                                                selectedOption: currentQuestion.questionOptions.length > 1 ? optionIndex : 0,
                                                                                answer: choiceIndex
                                                                            }
                                                                        }));
                                                                    }}
                                                                    checked={
                                                                        examAnswers[currentQuestion.id]?.selectedOption === optionIndex &&
                                                                        examAnswers[currentQuestion.id]?.answer === choiceIndex
                                                                    }
                                                                    disabled={currentQuestion.questionOptions.length > 1 && examAnswers[currentQuestion.id]?.selectedOption !== optionIndex}
                                                                    className="mr-2"
                                                                />
                                                                <span className="theme-text">{String.fromCharCode(97 + choiceIndex)}) {choice}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {currentQuestion.questionType === 'long-answer' && (
                                                    <textarea
                                                        placeholder="Write your answer here..."
                                                        onChange={(e) => {
                                                            setExamAnswers(prev => ({
                                                                ...prev,
                                                                [currentQuestion.id]: {
                                                                    selectedOption: currentQuestion.questionOptions.length > 1 ? optionIndex : 0,
                                                                    answer: e.target.value
                                                                }
                                                            }));
                                                        }}
                                                        value={
                                                            examAnswers[currentQuestion.id]?.selectedOption === optionIndex
                                                                ? examAnswers[currentQuestion.id]?.answer || ''
                                                                : ''
                                                        }
                                                        disabled={currentQuestion.questionOptions.length > 1 && examAnswers[currentQuestion.id]?.selectedOption !== optionIndex}
                                                        className="w-full h-32 p-3 border theme-border rounded theme-surface theme-text"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Question Editor Modal */}
            {editingPaper && (
                <QuestionEditor
                    paper={editingPaper}
                    onClose={() => setEditingPaper(null)}
                    onSave={(updatedPaper) => {
                        setQuestionPapers(prev => 
                            prev.map(paper => 
                                paper.id === updatedPaper.id ? updatedPaper : paper
                            )
                        );
                        setEditingPaper(null);
                    }}
                />
            )}

            {/* Results Display */}
            {showResults && evaluationResults && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="theme-bg rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold theme-text mb-6">Exam Results</h2>
                            
                            {/* Overall Score */}
                            <div className="theme-surface rounded-lg p-6 mb-6">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold theme-text mb-2">{evaluationResults.paperTitle}</h3>
                                    <div className="text-4xl font-bold mb-2">
                                        <span className={evaluationResults.percentage >= 60 ? 'text-green-600' : evaluationResults.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                                            {evaluationResults.percentage}%
                                        </span>
                                    </div>
                                    <p className="theme-text-secondary">
                                        {evaluationResults.obtainedMarks} out of {evaluationResults.totalMarks} marks
                                    </p>
                                    <div className="mt-2 text-sm">
                                        <span className={`px-3 py-1 rounded-full ${
                                            evaluationResults.percentage >= 80 ? 'bg-green-100 text-green-800' :
                                            evaluationResults.percentage >= 60 ? 'bg-blue-100 text-blue-800' :
                                            evaluationResults.percentage >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {evaluationResults.percentage >= 80 ? 'Excellent' :
                                             evaluationResults.percentage >= 60 ? 'Good' :
                                             evaluationResults.percentage >= 40 ? 'Average' : 'Needs Improvement'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Information */}
                            <div className="theme-surface rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold theme-text">{evaluationResults.questionResults.length}</div>
                                        <div className="text-sm theme-text-secondary">Questions Answered</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {evaluationResults.questionResults.filter(r => r.isCorrect).length}
                                        </div>
                                        <div className="text-sm theme-text-secondary">Correct Answers</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {evaluationResults.questionResults.filter(r => !r.isCorrect && r.userAnswer !== 'Not attempted').length}
                                        </div>
                                        <div className="text-sm theme-text-secondary">Incorrect Answers</div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => {
                                        setShowResults(false);
                                        setShowEvaluation(false);
                                        setEvaluationResults(null);
                                        setSelectedExamPaper(null);
                                        setCurrentQuestionIndex(0);
                                        setExamAnswers({});
                                    }}
                                    className="px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowResults(false);
                                        setShowEvaluation(true);
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg theme-transition"
                                >
                                    View Detailed Evaluation
                                </button>
                                <button
                                    onClick={() => {
                                        // Export results as PDF or share functionality can be added here
                                        const resultText = `Exam Results\n\nPaper: ${evaluationResults.paperTitle}\nScore: ${evaluationResults.obtainedMarks}/${evaluationResults.totalMarks} (${evaluationResults.percentage}%)\n\nDetailed Results:\n${evaluationResults.questionResults.map(r => `Q${r.questionNumber}: ${r.score}/${r.maxScore} - ${r.feedback}`).join('\n')}`;
                                        navigator.clipboard.writeText(resultText);
                                        alert('Results copied to clipboard!');
                                    }}
                                    className="px-4 py-2 theme-accent text-white rounded-lg hover:opacity-90 theme-transition"
                                >
                                    Export Results
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Evaluation Modal */}
            <DetailedEvaluationModal
                isOpen={showEvaluation}
                onClose={() => setShowEvaluation(false)}
                evaluationResults={evaluationResults}
                selectedExamPaper={selectedExamPaper}
                examAnswers={examAnswers}
                onBackToSummary={() => {
                    setShowEvaluation(false);
                    setShowResults(true);
                }}
            />

            {/* Loading/Evaluation Modal */}
            {isEvaluating && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="theme-bg rounded-lg p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold theme-text mb-2">Evaluating Your Answers</h3>
                        <p className="theme-text-secondary">This may take a few moments...</p>
                    </div>
                </div>
            )}

            {/* Evaluation Reports Modal */}
            <EvaluationReportsModal
                isOpen={showReports}
                onClose={() => setShowReports(false)}
                reports={evaluationReports}
                onDeleteReport={handleDeleteReport}
                onViewReport={handleViewReport}
            />

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="theme-bg rounded-lg shadow-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold theme-text mb-4">Exit Exam Mode?</h3>
                        <p className="theme-text-secondary mb-6">
                            Are you sure you want to exit exam mode? All unsaved progress will be lost.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 px-4 py-2 theme-surface theme-text border theme-border rounded-lg hover:theme-surface2 theme-transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowExitConfirm(false);
                                    navigate(-1);
                                }}
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

export default ExamModePage;
