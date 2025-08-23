import express from 'express';
import Book from '../models/Book.js';

const router = express.Router();

// Get units for a specific book
router.get('/book/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { subjectId } = req.query;
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        if (subjectId) {
            const subject = book.subjects.id(subjectId);
            if (!subject) {
                return res.status(404).json({ message: 'Subject not found' });
            }
            return res.json(subject.units);
        }
        
        // Return all units from all subjects
        const allUnits = book.subjects.flatMap(subject => 
            subject.units.map(unit => ({
                ...unit.toObject(),
                subjectId: subject._id,
                subjectTitle: subject.title
            }))
        );
        
        res.json(allUnits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get specific unit
router.get('/:unitId', async (req, res) => {
    try {
        const { unitId } = req.params;
        const { bookId, subjectId } = req.query;
        
        if (!bookId || !subjectId) {
            return res.status(400).json({ message: 'bookId and subjectId are required' });
        }
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        const unit = subject.units.id(unitId);
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        res.json(unit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new unit in a subject
router.post('/', async (req, res) => {
    try {
        const { bookId, subjectId } = req.body;
        
        if (!bookId || !subjectId) {
            return res.status(400).json({ message: 'bookId and subjectId are required' });
        }
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        const unitData = {
            title: req.body.title,
            description: req.body.description || '',
            chapters: []
        };
        
        subject.units.push(unitData);
        await book.save();
        
        const newUnit = subject.units[subject.units.length - 1];
        res.status(201).json(newUnit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update unit
router.put('/:unitId', async (req, res) => {
    try {
        const { unitId } = req.params;
        const { bookId, subjectId } = req.body;
        
        if (!bookId || !subjectId) {
            return res.status(400).json({ message: 'bookId and subjectId are required' });
        }
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        const unit = subject.units.id(unitId);
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        // Update unit properties
        if (req.body.title !== undefined) unit.title = req.body.title;
        if (req.body.description !== undefined) unit.description = req.body.description;
        
        await book.save();
        
        res.json(unit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete unit
router.delete('/:unitId', async (req, res) => {
    try {
        const { unitId } = req.params;
        const { bookId, subjectId } = req.query;
        
        if (!bookId || !subjectId) {
            return res.status(400).json({ message: 'bookId and subjectId are required' });
        }
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        subject.units.id(unitId).deleteOne();
        await book.save();
        
        res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get chapters for a specific unit
router.get('/:unitId/chapters', async (req, res) => {
    try {
        const { unitId } = req.params;
        const { bookId, subjectId } = req.query;
        
        if (!bookId || !subjectId) {
            return res.status(400).json({ message: 'bookId and subjectId are required' });
        }
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        const unit = subject.units.id(unitId);
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        res.json(unit.chapters);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add chapter to unit
router.post('/:unitId/chapters', async (req, res) => {
    try {
        const { unitId } = req.params;
        const { bookId, subjectId } = req.body;
        
        if (!bookId || !subjectId) {
            return res.status(400).json({ message: 'bookId and subjectId are required' });
        }
        
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        const subject = book.subjects.id(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        
        const unit = subject.units.id(unitId);
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        const chapterData = {
            title: req.body.title,
            content: req.body.content || '',
            media: req.body.media || [],
            subtopics: req.body.subtopics || []
        };
        
        unit.chapters.push(chapterData);
        await book.save();
        
        const newChapter = unit.chapters[unit.chapters.length - 1];
        res.status(201).json(newChapter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;