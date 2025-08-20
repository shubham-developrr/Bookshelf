import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CloseIcon, FileTextIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, TrashIcon } from './icons';

export interface EvaluationReport {
    id: string;
    paperTitle: string;
    subjectName: string;
    chapterName: string;
    submittedAt: Date;
    status: 'processing' | 'completed' | 'failed';
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    questionResults: Array<{
        questionId: string;
        questionNumber: number;
        questionType: string;
        questionText: string;
        userAnswer: string;
        correctAnswer: string;
        score: number;
        maxScore: number;
        feedback: string;
        isCorrect: boolean;
        sectionName: string;
    }>;
    processingProgress?: number;
    error?: string;
}

interface EvaluationReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reports: EvaluationReport[];
    onDeleteReport: (reportId: string) => void;
    onViewReport: (report: EvaluationReport) => void;
}

const EvaluationReportsModal: React.FC<EvaluationReportsModalProps> = ({
    isOpen,
    onClose,
    reports,
    onDeleteReport,
    onViewReport
}) => {
    const { theme } = useTheme();
    const [sortBy, setSortBy] = useState<'date' | 'score' | 'title'>('date');
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'processing':
                return <ClockIcon className="w-4 h-4 text-yellow-500 animate-spin" />;
            case 'failed':
                return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
            default:
                return <FileTextIcon className="w-4 h-4 theme-text-secondary" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'processing':
                return 'Processing...';
            case 'failed':
                return 'Failed';
            default:
                return 'Unknown';
        }
    };

    const filteredAndSortedReports = reports
        .filter(report => filterStatus === 'all' || report.status === filterStatus)
        .sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
                case 'score':
                    return b.percentage - a.percentage;
                case 'title':
                    return a.paperTitle.localeCompare(b.paperTitle);
                default:
                    return 0;
            }
        });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="theme-surface w-full max-w-6xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b theme-border">
                    <div className="flex items-center gap-3">
                        <FileTextIcon className="w-6 h-6 theme-accent-text" />
                        <div>
                            <h2 className="text-xl font-bold theme-text">Previous Evaluation Reports</h2>
                            <p className="text-sm theme-text-secondary">
                                {reports.length} report{reports.length !== 1 ? 's' : ''} • 
                                {reports.filter(r => r.status === 'processing').length} processing
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg hover:theme-surface2 theme-transition"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Filters and Sort */}
                <div className="p-4 border-b theme-border flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm theme-text-secondary">Sort by:</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-1 rounded-lg theme-surface2 theme-text text-sm border theme-border"
                        >
                            <option value="date">Date</option>
                            <option value="score">Score</option>
                            <option value="title">Title</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm theme-text-secondary">Filter:</label>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-3 py-1 rounded-lg theme-surface2 theme-text text-sm border theme-border"
                        >
                            <option value="all">All</option>
                            <option value="completed">Completed</option>
                            <option value="processing">Processing</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Reports List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredAndSortedReports.length === 0 ? (
                        <div className="text-center py-12">
                            <FileTextIcon className="w-12 h-12 mx-auto theme-text-secondary mb-4" />
                            <p className="theme-text-secondary">No evaluation reports found</p>
                            <p className="text-sm theme-text-secondary mt-1">
                                {filterStatus !== 'all' ? 'Try changing the filter' : 'Take an exam to see reports here'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredAndSortedReports.map((report) => (
                                <div 
                                    key={report.id}
                                    className="theme-surface2 rounded-lg p-4 border theme-border hover:theme-surface3 theme-transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                {getStatusIcon(report.status)}
                                                <h3 className="font-semibold theme-text">{report.paperTitle}</h3>
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    report.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    report.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {getStatusText(report.status)}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                                <div>
                                                    <p className="text-sm theme-text-secondary">Subject</p>
                                                    <p className="text-sm theme-text">{report.subjectName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm theme-text-secondary">Chapter</p>
                                                    <p className="text-sm theme-text">{report.chapterName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm theme-text-secondary">Submitted</p>
                                                    <p className="text-sm theme-text">
                                                        {new Date(report.submittedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {report.status === 'completed' && (
                                                <div className="flex items-center gap-6 mb-3">
                                                    <div>
                                                        <p className="text-sm theme-text-secondary">Score</p>
                                                        <p className="text-lg font-semibold theme-text">
                                                            {report.obtainedMarks}/{report.totalMarks}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm theme-text-secondary">Percentage</p>
                                                        <p className={`text-lg font-semibold ${
                                                            report.percentage >= 75 ? 'text-green-600' :
                                                            report.percentage >= 50 ? 'text-yellow-600' :
                                                            'text-red-600'
                                                        }`}>
                                                            {report.percentage}%
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm theme-text-secondary">Questions</p>
                                                        <p className="text-sm theme-text">
                                                            {report.questionResults.filter(q => q.isCorrect).length}/{report.questionResults.length} correct
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {report.status === 'processing' && report.processingProgress !== undefined && (
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-sm theme-text-secondary mb-1">
                                                        <span>Processing...</span>
                                                        <span>{report.processingProgress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${report.processingProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            {report.status === 'failed' && report.error && (
                                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-700">{report.error}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            {report.status === 'completed' && (
                                                <button
                                                    onClick={() => onViewReport(report)}
                                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 theme-transition text-sm"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDeleteReport(report.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg theme-transition"
                                                title="Delete Report"
                                            >
                                                <TrashIcon className="w-4 h-4" />
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
    );
};

export default EvaluationReportsModal;
