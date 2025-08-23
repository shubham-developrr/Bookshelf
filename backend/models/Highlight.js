import mongoose from 'mongoose';

const HighlightSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true,
        default: 'yellow'
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
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
    position: {
        start: Number,
        end: Number,
        startOffset: Number,
        endOffset: Number
    },
    context: {
        before: String,
        after: String
    },
    notes: String,
    tags: [String]
}, {
    timestamps: true
});

// Index for efficient queries
HighlightSchema.index({ userId: 1, bookId: 1, chapterId: 1 });
HighlightSchema.index({ userId: 1, createdAt: -1 });

const Highlight = mongoose.model('Highlight', HighlightSchema);

export default Highlight;