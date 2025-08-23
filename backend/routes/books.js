import express from 'express';
import Book from '../models/Book.js';

const router = express.Router();

// Get all books
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search, author, difficulty } = req.query;
        
        const query = {};
        
        // Add search functionality
        if (search) {
            query.$text = { $search: search };
        }
        
        if (author) {
            query.author = new RegExp(author, 'i');
        }
        
        if (difficulty) {
            query['metadata.difficulty'] = difficulty;
        }
        
        const books = await Book.find(query)
            .select('-subjects.units.chapters.content') // Exclude heavy content for list view
            .sort({ 'metadata.created': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'username profile.firstName profile.lastName');
            
        const total = await Book.countDocuments(query);
        
        res.json({
            books,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single book by ID
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate('createdBy', 'username profile.firstName profile.lastName');
            
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new book
router.post('/', async (req, res) => {
    try {
        const bookData = {
            ...req.body,
            createdBy: req.body.userId // Will be replaced with actual user ID from auth middleware
        };
        
        const book = new Book(bookData);
        const savedBook = await book.save();
        
        res.status(201).json(savedBook);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                errors: Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }))
            });
        }
        res.status(500).json({ message: error.message });
    }
});

// Update book
router.put('/:id', async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(book);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                errors: Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }))
            });
        }
        res.status(500).json({ message: error.message });
    }
});

// Delete book
router.delete('/:id', async (req, res) => {
    try {
        const book = await Book.findByIdAndDelete(req.params.id);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get book subjects
router.get('/:id/subjects', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).select('subjects');
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(book.subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add subject to book
router.post('/:id/subjects', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        book.subjects.push(req.body);
        await book.save();
        
        res.status(201).json(book.subjects[book.subjects.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update subject
router.put('/:bookId/subjects/:subjectId', async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(req.params.subjectId);
        
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        Object.assign(subject, req.body);
        await book.save();
        
        res.json(subject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete subject
router.delete('/:bookId/subjects/:subjectId', async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        book.subjects.id(req.params.subjectId).deleteOne();
        await book.save();
        
        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;