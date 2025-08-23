import mongoose from 'mongoose';

const MediaAssetSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['image', 'video', 'pdf', 'audio'],
        required: true
    },
    src: {
        type: String,
        required: true
    },
    title: String,
    alt: String,
    caption: String
}, { _id: true });

const SubtopicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    media: [MediaAssetSchema]
}, { _id: true });

const ChapterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    media: [MediaAssetSchema],
    subtopics: [SubtopicSchema]
}, { _id: true });

const UnitSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    chapters: [ChapterSchema]
}, { _id: true });

const SubjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    units: [UnitSchema]
}, { _id: true });

const BookMetadataSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    },
    tags: [String],
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
    },
    language: {
        type: String,
        default: 'en'
    },
    estimatedHours: {
        type: Number,
        default: 0
    },
    rating: Number,
    downloads: {
        type: Number,
        default: 0
    }
});

const CustomThemeSchema = new mongoose.Schema({
    colors: {
        primary: String,
        secondary: String,
        accent: String,
        background: String,
        surface: String,
        text: String
    },
    fonts: {
        heading: String,
        body: String,
        code: String
    },
    layout: {
        borderRadius: String,
        spacing: String
    }
});

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    version: {
        type: String,
        default: '1.0.0'
    },
    curriculum: String,
    description: String,
    subjects: [SubjectSchema],
    theme: CustomThemeSchema,
    metadata: BookMetadataSchema,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    bookCoverImage: {
        type: String,
        default: null
    },
    semester: String,
    subjectCode: String
}, {
    timestamps: true
});

// Pre-save middleware to update the updated timestamp in metadata
BookSchema.pre('save', function(next) {
    this.metadata.updated = new Date();
    next();
});

// Index for search functionality
BookSchema.index({ title: 'text', description: 'text', 'subjects.title': 'text' });

const Book = mongoose.model('Book', BookSchema);

export default Book;