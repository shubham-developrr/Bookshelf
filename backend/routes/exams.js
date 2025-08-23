import express from 'express';
import { QuestionPaper, EvaluationReport } from '../models/Exam.js';

const router = express.Router();

// ===== QUESTION PAPER ROUTES =====

// Get all question papers
router.get('/papers', async (req, res) => {
    try {
        const { bookId, createdBy, isPublished, page = 1, limit = 10 } = req.query;
        
        const query = {};
        if (bookId) query.bookId = bookId;
        if (createdBy) query.createdBy = createdBy;
        if (isPublished !== undefined) query.isPublished = isPublished === 'true';
        
        const papers = await QuestionPaper.find(query)
            .select('-questions') // Exclude questions for list view
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('bookId', 'title author')
            .populate('createdBy', 'username profile.firstName profile.lastName');
        
        const total = await QuestionPaper.countDocuments(query);
        
        res.json({
            papers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get specific question paper
router.get('/papers/:id', async (req, res) => {
    try {
        const paper = await QuestionPaper.findById(req.params.id)
            .populate('bookId', 'title author')
            .populate('createdBy', 'username profile.firstName profile.lastName');
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        res.json(paper);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new question paper (shell)
router.post('/papers', async (req, res) => {
    try {
        const paperData = {
            title: req.body.title,
            category: req.body.category,
            bookId: req.body.bookId,
            createdBy: req.body.createdBy,
            duration: req.body.duration,
            instructions: req.body.instructions || '',
            settings: req.body.settings || {},
            questions: []
        };
        
        const paper = new QuestionPaper(paperData);
        const savedPaper = await paper.save();
        
        res.status(201).json(savedPaper);
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

// Update question paper
router.put('/papers/:id', async (req, res) => {
    try {
        const paper = await QuestionPaper.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        res.json(paper);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete question paper
router.delete('/papers/:id', async (req, res) => {
    try {
        const paper = await QuestionPaper.findByIdAndDelete(req.params.id);
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        // Also delete related evaluation reports
        await EvaluationReport.deleteMany({ questionPaperId: req.params.id });
        
        res.json({ message: 'Question paper and related reports deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add questions to paper
router.post('/papers/:id/questions', async (req, res) => {
    try {
        const paper = await QuestionPaper.findById(req.params.id);
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        const { questions } = req.body;
        
        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({ message: 'Invalid questions array' });
        }
        
        paper.questions.push(...questions);
        await paper.save();
        
        res.json(paper);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update specific question
router.put('/papers/:paperId/questions/:questionId', async (req, res) => {
    try {
        const paper = await QuestionPaper.findById(req.params.paperId);
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        const question = paper.questions.id(req.params.questionId);
        
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        
        Object.assign(question, req.body);
        await paper.save();
        
        res.json(question);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete question
router.delete('/papers/:paperId/questions/:questionId', async (req, res) => {
    try {
        const paper = await QuestionPaper.findById(req.params.paperId);
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        paper.questions.id(req.params.questionId).deleteOne();
        await paper.save();
        
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Publish/Unpublish question paper
router.patch('/papers/:id/publish', async (req, res) => {
    try {
        const { isPublished } = req.body;
        
        const updateData = { isPublished };
        if (isPublished) {
            updateData.publishedAt = new Date();
        }
        
        const paper = await QuestionPaper.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }
        
        res.json(paper);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ===== EVALUATION REPORT ROUTES =====

// Start exam (create evaluation report)
router.post('/reports', async (req, res) => {
    try {
        const reportData = {
            questionPaperId: req.body.questionPaperId,
            userId: req.body.userId,
            responses: [],
            startedAt: new Date(),
            status: 'in_progress'
        };
        
        const report = new EvaluationReport(reportData);
        const savedReport = await report.save();
        
        res.status(201).json(savedReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit exam response
router.put('/reports/:id', async (req, res) => {
    try {
        const { responses, status } = req.body;
        
        const updateData = {};
        if (responses) updateData.responses = responses;
        if (status) updateData.status = status;
        if (status === 'completed') updateData.completedAt = new Date();
        
        const report = await EvaluationReport.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!report) {
            return res.status(404).json({ message: 'Evaluation report not found' });
        }
        
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's reports
router.get('/reports', async (req, res) => {
    try {
        const { userId, questionPaperId, status, page = 1, limit = 10 } = req.query;
        
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        
        const query = { userId };
        if (questionPaperId) query.questionPaperId = questionPaperId;
        if (status) query.status = status;
        
        const reports = await EvaluationReport.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('questionPaperId', 'title category duration totalMarks')
            .populate('userId', 'username profile.firstName profile.lastName');
        
        const total = await EvaluationReport.countDocuments(query);
        
        res.json({
            reports,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get specific evaluation report
router.get('/reports/:id', async (req, res) => {
    try {
        const report = await EvaluationReport.findById(req.params.id)
            .populate('questionPaperId')
            .populate('userId', 'username profile.firstName profile.lastName');
        
        if (!report) {
            return res.status(404).json({ message: 'Evaluation report not found' });
        }
        
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get analytics for a question paper
router.get('/papers/:id/analytics', async (req, res) => {
    try {
        const { id } = req.params;
        
        const mongoose = await import('mongoose');
        const analytics = await EvaluationReport.aggregate([
            { $match: { questionPaperId: new mongoose.Types.ObjectId(id), status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    averageScore: { $avg: '$score.percentage' },
                    highestScore: { $max: '$score.percentage' },
                    lowestScore: { $min: '$score.percentage' },
                    averageTime: { $avg: '$timeTaken' }
                }
            }
        ]);
        
        res.json(analytics[0] || {
            totalAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            averageTime: 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;