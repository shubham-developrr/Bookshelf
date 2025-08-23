import express from 'express';
import Highlight from '../models/Highlight.js';

const router = express.Router();

// Search highlights (moved before parameterized routes)
router.get('/search', async (req, res) => {
    try {
        const { query, userId, bookId } = req.query;
        
        if (!query || !userId) {
            return res.status(400).json({ message: 'query and userId are required' });
        }
        
        const searchQuery = {
            userId,
            $or: [
                { text: { $regex: query, $options: 'i' } },
                { notes: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        };
        
        if (bookId) searchQuery.bookId = bookId;
        
        const highlights = await Highlight.find(searchQuery)
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('bookId', 'title author');
        
        res.json(highlights);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk delete highlights (moved before parameterized routes)
router.delete('/bulk', async (req, res) => {
    try {
        const { highlightIds } = req.body;
        
        if (!highlightIds || !Array.isArray(highlightIds)) {
            return res.status(400).json({ message: 'Invalid highlightIds array' });
        }
        
        const result = await Highlight.deleteMany({ _id: { $in: highlightIds } });
        
        res.json({ 
            message: `${result.deletedCount} highlights deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get highlights by color (moved before parameterized routes)
router.get('/color/:color', async (req, res) => {
    try {
        const { color } = req.params;
        const { userId, bookId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        
        const query = { userId, color };
        if (bookId) query.bookId = bookId;
        
        const highlights = await Highlight.find(query)
            .sort({ createdAt: -1 })
            .populate('bookId', 'title author');
        
        res.json(highlights);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get highlight statistics (moved before parameterized routes)  
router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { bookId } = req.query;
        
        const mongoose = await import('mongoose');
        const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
        if (bookId) matchStage.bookId = new mongoose.Types.ObjectId(bookId);
        
        const stats = await Highlight.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalHighlights: { $sum: 1 },
                    colorBreakdown: {
                        $push: '$color'
                    },
                    averageTextLength: { $avg: { $strLenCP: '$text' } },
                    highlightsWithNotes: {
                        $sum: {
                            $cond: [{ $ne: ['$notes', null] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalHighlights: 1,
                    averageTextLength: { $round: ['$averageTextLength', 2] },
                    highlightsWithNotes: 1,
                    colorBreakdown: {
                        $reduce: {
                            input: '$colorBreakdown',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $arrayToObject: [[{
                                            k: '$$this',
                                            v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                                        }]]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        
        res.json(stats[0] || {
            totalHighlights: 0,
            averageTextLength: 0,
            highlightsWithNotes: 0,
            colorBreakdown: {}
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all highlights for a user
router.get('/', async (req, res) => {
    try {
        const { userId, bookId, chapterId, page = 1, limit = 50 } = req.query;
        
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        
        const query = { userId };
        if (bookId) query.bookId = bookId;
        if (chapterId) query.chapterId = chapterId;
        
        const highlights = await Highlight.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('bookId', 'title author');
        
        const total = await Highlight.countDocuments(query);
        
        res.json({
            highlights,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get specific highlight
router.get('/:id', async (req, res) => {
    try {
        const highlight = await Highlight.findById(req.params.id)
            .populate('bookId', 'title author')
            .populate('userId', 'username profile.firstName profile.lastName');
        
        if (!highlight) {
            return res.status(404).json({ message: 'Highlight not found' });
        }
        
        res.json(highlight);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new highlight
router.post('/', async (req, res) => {
    try {
        const highlightData = {
            text: req.body.text,
            color: req.body.color || 'yellow',
            bookId: req.body.bookId,
            chapterId: req.body.chapterId,
            userId: req.body.userId,
            position: req.body.position,
            context: req.body.context,
            notes: req.body.notes,
            tags: req.body.tags || []
        };
        
        const highlight = new Highlight(highlightData);
        const savedHighlight = await highlight.save();
        
        res.status(201).json(savedHighlight);
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

// Update highlight
router.put('/:id', async (req, res) => {
    try {
        const updateData = {};
        
        if (req.body.color) updateData.color = req.body.color;
        if (req.body.notes !== undefined) updateData.notes = req.body.notes;
        if (req.body.tags) updateData.tags = req.body.tags;
        
        const highlight = await Highlight.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!highlight) {
            return res.status(404).json({ message: 'Highlight not found' });
        }
        
        res.json(highlight);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete highlight
router.delete('/:id', async (req, res) => {
    try {
        const highlight = await Highlight.findByIdAndDelete(req.params.id);
        
        if (!highlight) {
            return res.status(404).json({ message: 'Highlight not found' });
        }
        
        res.json({ message: 'Highlight deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;