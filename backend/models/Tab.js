import mongoose from 'mongoose';

const TabContentSchema = new mongoose.Schema({
    tabType: {
        type: String,
        required: true,
        enum: ['text', 'mcq', 'qa', 'notes', 'mindmap', 'flashcards', 'videos', 'custom']
    },
    content: {
        // For text/notes tabs - rich text content
        text: String,
        
        // For MCQ tabs
        questions: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            explanation: String,
            marks: { type: Number, default: 1 },
            difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
        }],
        
        // For Q&A tabs
        qna: [{
            question: String,
            answer: String,
            category: String,
            tags: [String]
        }],
        
        // For flashcards
        flashcards: [{
            front: String,
            back: String,
            category: String,
            difficulty: Number,
            lastReviewed: Date,
            nextReview: Date,
            repetitions: { type: Number, default: 0 },
            easeFactor: { type: Number, default: 2.5 }
        }],
        
        // For mind maps and media
        media: [{
            type: { type: String, enum: ['image', 'pdf', 'video', 'audio'] },
            url: String,
            title: String,
            description: String
        }],
        
        // For custom content (HTML/Rich Text)
        html: String,
        
        // For videos
        videos: [{
            title: String,
            url: String,
            duration: String,
            description: String,
            thumbnail: String
        }]
    }
});

const TabSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    unitId: {
        type: String,
        required: true
    },
    chapterId: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tabContent: TabContentSchema,
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for efficient queries
TabSchema.index({ bookId: 1, unitId: 1, chapterId: 1, userId: 1 });
TabSchema.index({ userId: 1, updatedAt: -1 });

const Tab = mongoose.model('Tab', TabSchema);

export default Tab;