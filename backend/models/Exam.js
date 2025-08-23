import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['mcq', 'true_false', 'short_answer', 'essay', 'numerical'],
        required: true
    },
    question: {
        type: String,
        required: true
    },
    options: [String], // For MCQ and True/False
    correctAnswer: mongoose.Schema.Types.Mixed, // String for essay, Number for MCQ index, etc.
    explanation: String,
    marks: {
        type: Number,
        required: true,
        default: 1
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    topics: [String],
    keywords: [String]
});

const QuestionPaperSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    instructions: String,
    questions: [QuestionSchema],
    settings: {
        shuffleQuestions: {
            type: Boolean,
            default: false
        },
        shuffleOptions: {
            type: Boolean,
            default: false
        },
        showResults: {
            type: Boolean,
            default: true
        },
        allowRetake: {
            type: Boolean,
            default: true
        },
        passingScore: {
            type: Number,
            default: 50
        }
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: Date
}, {
    timestamps: true
});

// Auto-calculate total marks when questions are added/modified
QuestionPaperSchema.pre('save', function(next) {
    this.totalMarks = this.questions.reduce((total, question) => total + question.marks, 0);
    next();
});

const EvaluationReportSchema = new mongoose.Schema({
    questionPaperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionPaper',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    responses: [{
        questionId: mongoose.Schema.Types.ObjectId,
        answer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        marksAwarded: Number,
        timeTaken: Number // in seconds
    }],
    score: {
        obtained: Number,
        total: Number,
        percentage: Number
    },
    timeTaken: Number, // total time in minutes
    startedAt: Date,
    completedAt: Date,
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'in_progress'
    },
    analytics: {
        topicWiseScore: [{
            topic: String,
            scored: Number,
            total: Number
        }],
        difficultyWiseScore: [{
            level: String,
            scored: Number,
            total: Number
        }],
        correctAnswers: Number,
        incorrectAnswers: Number,
        unanswered: Number
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate scores
EvaluationReportSchema.pre('save', function(next) {
    if (this.responses && this.responses.length > 0) {
        const obtained = this.responses.reduce((sum, response) => sum + (response.marksAwarded || 0), 0);
        const total = this.responses.reduce((sum, response) => sum + (response.questionId ? 1 : 0), 0); // Simplified
        
        this.score = {
            obtained,
            total,
            percentage: total > 0 ? (obtained / total) * 100 : 0
        };
    }
    next();
});

// Indexes
QuestionPaperSchema.index({ bookId: 1, createdBy: 1 });
QuestionPaperSchema.index({ isPublished: 1, createdAt: -1 });

EvaluationReportSchema.index({ userId: 1, questionPaperId: 1 });
EvaluationReportSchema.index({ userId: 1, completedAt: -1 });

const QuestionPaper = mongoose.model('QuestionPaper', QuestionPaperSchema);
const EvaluationReport = mongoose.model('EvaluationReport', EvaluationReportSchema);

export { QuestionPaper, EvaluationReport };