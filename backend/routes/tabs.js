import express from 'express';
import Tab from '../models/Tab.js';

const router = express.Router();

// Search tabs by content (moved before parameterized routes)
router.get('/search', async (req, res) => {
    try {
        const { query, userId, tabType, bookId } = req.query;
        
        if (!query || !userId) {
            return res.status(400).json({ message: 'query and userId are required' });
        }
        
        const searchQuery = {
            userId,
            isActive: true,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { 'tabContent.content.text': { $regex: query, $options: 'i' } }
            ]
        };
        
        if (tabType) searchQuery['tabContent.tabType'] = tabType;
        if (bookId) searchQuery.bookId = bookId;
        
        const tabs = await Tab.find(searchQuery)
            .sort({ updatedAt: -1 })
            .limit(20)
            .populate('bookId', 'title author');
        
        res.json(tabs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk update tab order (moved before parameterized routes)
router.put('/reorder', async (req, res) => {
    try {
        const { tabs } = req.body; // Array of { id, order }
        
        if (!tabs || !Array.isArray(tabs)) {
            return res.status(400).json({ message: 'Invalid tabs array' });
        }
        
        const updatePromises = tabs.map(({ id, order }) => 
            Tab.findByIdAndUpdate(id, { order }, { new: true })
        );
        
        const updatedTabs = await Promise.all(updatePromises);
        
        res.json(updatedTabs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get tabs by type (moved before parameterized routes)
router.get('/type/:tabType', async (req, res) => {
    try {
        const { tabType } = req.params;
        const { bookId, userId, limit = 10, page = 1 } = req.query;
        
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        
        const query = { 
            'tabContent.tabType': tabType, 
            userId, 
            isActive: true 
        };
        
        if (bookId) query.bookId = bookId;
        
        const tabs = await Tab.find(query)
            .sort({ updatedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('bookId', 'title author');
        
        const total = await Tab.countDocuments(query);
        
        res.json({
            tabs,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all tabs for a specific chapter
router.get('/', async (req, res) => {
    try {
        const { bookId, unitId, chapterId, userId } = req.query;
        
        if (!bookId || !chapterId || !userId) {
            return res.status(400).json({ message: 'bookId, chapterId, and userId are required' });
        }
        
        const query = { bookId, chapterId, userId, isActive: true };
        if (unitId) query.unitId = unitId;
        
        const tabs = await Tab.find(query)
            .sort({ order: 1, createdAt: 1 })
            .populate('bookId', 'title author');
        
        res.json(tabs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get specific tab
router.get('/:id', async (req, res) => {
    try {
        const tab = await Tab.findById(req.params.id)
            .populate('bookId', 'title author')
            .populate('userId', 'username profile.firstName profile.lastName');
        
        if (!tab) {
            return res.status(404).json({ message: 'Tab not found' });
        }
        
        res.json(tab);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new tab
router.post('/', async (req, res) => {
    try {
        const tabData = {
            title: req.body.title,
            bookId: req.body.bookId,
            unitId: req.body.unitId,
            chapterId: req.body.chapterId,
            userId: req.body.userId,
            tabContent: {
                tabType: req.body.tabType,
                content: req.body.content || {}
            },
            order: req.body.order || 0
        };
        
        const tab = new Tab(tabData);
        const savedTab = await tab.save();
        
        res.status(201).json(savedTab);
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

// Update tab
router.put('/:id', async (req, res) => {
    try {
        const updateData = {};
        
        if (req.body.title) updateData.title = req.body.title;
        if (req.body.content) updateData['tabContent.content'] = req.body.content;
        if (req.body.order !== undefined) updateData.order = req.body.order;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
        
        const tab = await Tab.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!tab) {
            return res.status(404).json({ message: 'Tab not found' });
        }
        
        res.json(tab);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete tab (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const tab = await Tab.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        
        if (!tab) {
            return res.status(404).json({ message: 'Tab not found' });
        }
        
        res.json({ message: 'Tab deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Hard delete tab
router.delete('/:id/permanent', async (req, res) => {
    try {
        const tab = await Tab.findByIdAndDelete(req.params.id);
        
        if (!tab) {
            return res.status(404).json({ message: 'Tab not found' });
        }
        
        res.json({ message: 'Tab permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;